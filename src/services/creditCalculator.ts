import pool from '../db/connection.ts';
import logger from './logger.ts';

export interface DamageInput {
  // Uno de los dos identifica el producto — barcode para los call sites
  // históricos (batch_damage, créditos standalone, que solo tienen barcode a
  // mano), product_id para route_returns (createReturns, Fase 116), que solo
  // tiene el id local. Si viene product_id se usa ese; si no, barcode.
  barcode?: string;
  product_id?: number;
  product_name: string;
  qty: number;
}

export interface DamageComputed extends DamageInput {
  unit_price: number;
  amount: number;
  qb_item_id: string | null;
  unit: string | null;
}

// true si el producto se vende por peso (Lbs) — mismo criterio que
// isWeightTicketCategory()/unitLabel() en el ticket de Android: unit vacío o
// "Lbs" es peso, cualquier otro valor (Case/Unit, Bucket, "Unit"/"Case"
// legacy) no lo es.
export function isLbsUnit(unit: string | null | undefined): boolean {
  return !unit || unit === 'Lbs';
}

// Texto legible de una cantidad dañada/creditada, coherente con el resto del
// ticket: peso real en lb con 2 decimales, o conteo entero de unidades para
// cualquier otro tipo de venta.
// Number(qty): batch_damage.qty es DECIMAL(10,2) — mysql2 devuelve columnas
// DECIMAL como string (sin decimalNumbers configurado en db/connection.ts,
// mismo gotcha ya documentado para TINYINT(1)/qb_active), así que un valor
// leído directo de una fila de la tabla puede llegar como "2.35" en vez de
// 2.35. Sin este cast, ${qty.toFixed(2)} revienta con "qty.toFixed is not a
// function" porque los strings no tienen ese método.
export function formatDamageQty(qty: number, unit: string | null | undefined): string {
  const q = Number(qty) || 0;
  return isLbsUnit(unit) ? `${q.toFixed(2)} lb` : `${Math.round(q)} unit(s)`;
}

// Valor por unidad de un producto dañado, consultado fresco en `products` al
// momento de crear el batch (nunca se confía en un precio mandado por el
// cliente para esto). Distinto según cómo se vende el producto:
//   - Case/Unit (fusionados en un solo tipo — se aceptan igual los valores
//     viejos "Case"/"Unit" que puedan quedar en catálogos sin migrar):
//     products.price ya es el precio del paquete/caja completa, se divide
//     por el tamaño de paquete para obtener el valor de una sola unidad
//     dañada (mismo criterio que usa ProductDetailActivity en Android).
//     `products` no tiene columna case_qty — el tamaño real de paquete viaja
//     en products.qty.
//   - Lbs / sin unit: products.price ya es $/lb — el `qty` de un damage item
//     de un producto Lbs es directamente el peso real dañado (mismo
//     significado que `orders.quantity` en una venta normal), así que el
//     valor por "unidad" es el precio tal cual, sin ajustar por
//     weight_per_unit — antes se multiplicaba por weight_per_unit asumiendo
//     que `qty` era un conteo de piezas de peso promedio; eso quedó
//     reemplazado por pedir el peso real (ver excellentia-webapp/CLAUDE.md y
//     la app Android, AndroidStudioProjects/test).
//   - Bucket: products.price ya es el precio por unidad, directo.
function unitValueOf(product: { price: number; unit: string | null; qty: number | null }): number {
  const price = Number(product.price) || 0;
  if (product.unit === 'Case' || product.unit === 'Unit' || product.unit === 'Case/Unit') {
    const caseSize = Number(product.qty) || 1;
    return price / caseSize;
  }
  // Bucket y Lbs: products.price ya es el valor por unidad/lb, directo.
  return price;
}

// Calcula el crédito en dólares de una lista de damage_items — busca cada
// producto fresco en `products`, aplica unitValueOf() y suma. Se usa al crear
// un batch (createBatch, preOrderController.convert) y en el alta standalone
// (routes/credits.ts); los reintentos NO llaman esto — reusan el `amount` ya
// persistido en batch_damage para que el crédito no derive si el precio del
// catálogo cambió después de la venta.
export async function computeDamageCredit(items: DamageInput[]): Promise<{ rows: DamageComputed[]; creditsTotal: number }> {
  const rows: DamageComputed[] = [];
  let creditsTotal = 0;

  for (const item of items) {
    if (!(item.qty > 0)) continue;
    try {
      const [productRows] = item.product_id != null
        ? await pool.query('SELECT price, unit, qty, qb_item_id FROM products WHERE id = ?', [item.product_id]) as any[]
        : await pool.query('SELECT price, unit, qty, qb_item_id FROM products WHERE barcode = ?', [item.barcode]) as any[];
      const product = productRows[0];
      if (!product) {
        logger.warn(`computeDamageCredit: producto no encontrado para ${item.product_id != null ? `product_id ${item.product_id}` : `barcode ${item.barcode}`}, crédito omitido para esa línea`);
        rows.push({ ...item, unit_price: 0, amount: 0, qb_item_id: null, unit: null });
        continue;
      }
      const qbItemId = product.qb_item_id ?? null;
      const unitPrice = unitValueOf(product);
      const amount = Math.round(unitPrice * item.qty * 100) / 100;
      rows.push({ ...item, unit_price: unitPrice, amount, qb_item_id: qbItemId, unit: product.unit ?? null });
      creditsTotal += amount;
    } catch (err) {
      logger.warn(`computeDamageCredit: error calculando crédito para ${item.product_id ?? item.barcode}:`, err);
      rows.push({ ...item, unit_price: 0, amount: 0, qb_item_id: null, unit: null });
    }
  }

  return { rows, creditsTotal: Math.round(creditsTotal * 100) / 100 };
}
