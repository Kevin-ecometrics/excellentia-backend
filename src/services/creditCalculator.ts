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
// cliente para esto).
//
// Fase 122 — `products.price` es el precio de UNA UNIDAD para todos los tipos
// de venta, así que el valor por unidad es SIEMPRE `price`, sin ajustar por
// el tamaño de paquete. Antes para Case/Unit se dividía por `products.qty`
// porque `price` era el precio de la caja completa; con el precio ya en escala
// unitaria esa división dividía dos veces (una unidad de $1.50 en un case de
// 24 se valuaba en $0.0625 en vez de $1.50 — 24x de menos en el crédito).
//
//   - Case/Unit: `price` es el valor de una unidad suelta. El tamaño de
//     paquete (`products.qty` — no hay columna case_qty) ya se aplicó al
//     armar el precio, no hace falta volver a dividir.
//   - Lbs / sin unit: `price` es $/lb — el `qty` de un damage item de un
//     producto Lbs es directamente el peso real dañado (mismo significado
//     que `orders.quantity` en una venta normal), así que el valor por
//     "unidad" es el precio tal cual, sin ajustar por weight_per_unit — antes
//     se multiplicaba por weight_per_unit asumiendo que `qty` era un conteo
//     de piezas de peso promedio; eso quedó reemplazado por pedir el peso
//     real (ver excellentia-webapp/CLAUDE.md y la app Android,
//     AndroidStudioProjects/test).
//   - Bucket: `price` es el precio por balde, directo.
function unitValueOf(product: { price: number; unit: string | null; qty: number | null }): number {
  return Number(product.price) || 0;
}

// Total en dólares de una línea de venta, cuando la app NO lo mandó y hay que
// derivarlo del precio y la cantidad. Fase 122 — `price` es el precio de una
// UNIDAD y `quantity` viene en cajas para Case/Unit, así que el total
// multiplica por el tamaño de caja (1.50 × 24 × 2 = 72.00). Espeja
// `lineTotal()` de la app Android (data/Models.kt) — los dos tienen que dar
// el mismo número o la pantalla y la factura no cierran.
export function lineTotal(
  price: number,
  quantity: number,
  unit: string | null | undefined,
  caseQty: number | null | undefined
): number {
  const p = Number(price) || 0;
  const q = Number(quantity) || 0;
  const isCaseUnit = unit === 'Case' || unit === 'Unit' || unit === 'Case/Unit';
  const caseSize = isCaseUnit ? (Number(caseQty) || 1) : 1;
  return p * caseSize * q;
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
