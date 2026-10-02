import pool from '../db/connection.ts';
import { summarizePreOrderItems, type PreOrderSummaryLine } from './preOrderQuantities.ts';

// Resumen por producto (cajas pedidas) de una pre-orden — lo usan getPreOrder,
// getRoute (parada PRE_ORDER) y getExpectedStopItems. La unidad se resuelve
// contra products: una pre-orden sin detallar trae pre_order_items.unit NULL,
// y isLbsUnit(null) es true, así que sin resolverla todo borrador pasaría por
// Lbs. Subconsultas con LIMIT 1 para que un barcode repetido en products no
// multiplique filas.
export async function loadPreOrderSummary(preOrderId: number | string): Promise<PreOrderSummaryLine[]> {
  const [rows] = await pool.query(
    `SELECT pi.barcode, pi.product_name, pi.quantity,
            COALESCE(pi.unit, (SELECT p.unit FROM products p WHERE p.barcode = pi.barcode LIMIT 1)) AS unit,
            COALESCE(pi.case_qty, (SELECT p.qty FROM products p WHERE p.barcode = pi.barcode LIMIT 1)) AS case_qty
     FROM pre_order_items pi WHERE pi.pre_order_id = ? ORDER BY pi.id`,
    [preOrderId]
  ) as any[];
  return summarizePreOrderItems(rows as any[]);
}
