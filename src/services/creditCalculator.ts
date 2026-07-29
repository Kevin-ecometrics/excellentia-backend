import pool from '../db/connection.ts';
import logger from './logger.ts';

export interface DamageInput {
  barcode: string;
  product_name: string;
  qty: number;
}

export interface DamageComputed extends DamageInput {
  unit_price: number;
  amount: number;
  qb_item_id: string | null;
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
//   - Lbs / sin unit: products.price es $/lb — se multiplica por
//     weight_per_unit para obtener el valor de una unidad física.
//   - Bucket: products.price ya es el precio por unidad, directo.
function unitValueOf(product: { price: number; unit: string | null; weight_per_unit: number | null; qty: number | null }): number {
  const price = Number(product.price) || 0;
  if (product.unit === 'Case' || product.unit === 'Unit' || product.unit === 'Case/Unit') {
    const caseSize = Number(product.qty) || 1;
    return price / caseSize;
  }
  if (product.unit === 'Bucket') return price;
  const weightPerUnit = Number(product.weight_per_unit) || 1.0;
  return price * weightPerUnit;
}

// Calcula el crédito en dólares de una lista de damage_items — busca cada
// producto fresco en `products`, aplica unitValueOf() y suma. Se usa al crear
// un batch (createBatch, preOrderController.convert); los reintentos NO
// llaman esto — reusan el `amount` ya persistido en batch_damage para que el
// crédito no derive si el precio del catálogo cambió después de la venta.
export async function computeDamageCredit(items: DamageInput[]): Promise<{ rows: DamageComputed[]; creditsTotal: number }> {
  const rows: DamageComputed[] = [];
  let creditsTotal = 0;

  for (const item of items) {
    if (!(item.qty > 0)) continue;
    try {
      const [productRows] = await pool.query(
        'SELECT price, unit, weight_per_unit, qty, qb_item_id FROM products WHERE barcode = ?',
        [item.barcode]
      ) as any[];
      const product = productRows[0];
      if (!product) {
        logger.warn(`computeDamageCredit: producto no encontrado para barcode ${item.barcode}, crédito omitido para esa línea`);
        rows.push({ ...item, unit_price: 0, amount: 0, qb_item_id: null });
        continue;
      }
      const qbItemId = product.qb_item_id ?? null;
      const unitPrice = unitValueOf(product);
      const amount = Math.round(unitPrice * item.qty * 100) / 100;
      rows.push({ ...item, unit_price: unitPrice, amount, qb_item_id: qbItemId });
      creditsTotal += amount;
    } catch (err) {
      logger.warn(`computeDamageCredit: error calculando crédito para ${item.barcode}:`, err);
      rows.push({ ...item, unit_price: 0, amount: 0, qb_item_id: null });
    }
  }

  return { rows, creditsTotal: Math.round(creditsTotal * 100) / 100 };
}
