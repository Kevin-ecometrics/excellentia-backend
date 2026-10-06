import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { consignmentRemaining, parseSalesDays } from '../services/customerInventory.ts';

// Sub-inventario → pestaña "Clientes". Las dos consultas son de solo lectura.

// Inventario que tenemos en la tienda del cliente: consignación dejada menos lo
// ya vendido/devuelto, sumado sobre todas sus paradas CONSIGNMENT (rutas no
// canceladas), agrupado por producto. Solo productos con saldo > 0.
export async function getCustomerInventory(req: Request, res: Response): Promise<void> {
  try {
    const { customerId } = req.params;
    const [rows] = await pool.query(
      `SELECT p.id AS product_id, p.name AS product_name, p.sku,
              rci.unit, rci.case_qty,
              SUM(rci.quantity_left)     AS quantity_left,
              SUM(rci.quantity_sold)     AS quantity_sold,
              SUM(rci.quantity_returned) AS quantity_returned,
              MAX(rci.created_at)        AS last_left_at
       FROM route_consignment_items rci
       JOIN route_stops rs ON rs.id = rci.route_stop_id
       JOIN routes r       ON r.id = rs.route_id
       JOIN products p     ON p.id = rci.product_id
       WHERE rs.stop_type = 'CONSIGNMENT' AND rs.customer_id = ? AND r.status != 'CANCELLED'
       GROUP BY p.id, p.name, p.sku, rci.unit, rci.case_qty
       ORDER BY p.name`,
      [customerId]
    ) as any[];

    const data = (rows as any[])
      .map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        sku: r.sku ?? null,
        unit: r.unit ?? null,
        case_qty: r.case_qty ?? null,
        quantity_left: Number(r.quantity_left) || 0,
        quantity_sold: Number(r.quantity_sold) || 0,
        quantity_returned: Number(r.quantity_returned) || 0,
        remaining: consignmentRemaining(r.quantity_left, r.quantity_sold, r.quantity_returned),
        last_left_at: r.last_left_at,
      }))
      .filter(r => r.remaining > 0);

    res.json({ data });
  } catch (err) {
    logger.error('getCustomerInventory error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Lo que se le vendió al cliente, agrupado por producto. `?days=` (default 30,
// `all` = sin filtro). Excluye CANCELLED; las líneas que siguen
// AWAITING_APPROVAL (todavía no facturadas en QBO) se cuentan aparte en
// `pending_lines` para que no se confundan con lo ya enviado.
export async function getCustomerSales(req: Request, res: Response): Promise<void> {
  try {
    const { customerId } = req.params;
    const days = parseSalesDays(req.query.days);

    const params: any[] = [customerId];
    let dateClause = '';
    if (days !== null) {
      dateClause = ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(days);
    }

    const [rows] = await pool.query(
      `SELECT product_name, barcode, unit,
              SUM(quantity) AS quantity,
              SUM(total)    AS total,
              MAX(created_at) AS last_sold_at,
              SUM(status = 'AWAITING_APPROVAL') AS pending_lines
       FROM orders
       WHERE customer_id = ? AND status != 'CANCELLED'${dateClause}
       GROUP BY product_name, barcode, unit
       ORDER BY MAX(created_at) DESC`,
      params
    ) as any[];

    const data = (rows as any[]).map(r => ({
      product_name: r.product_name,
      barcode: r.barcode ?? null,
      unit: r.unit ?? null,
      quantity: Number(r.quantity) || 0,
      total: Number(r.total) || 0,
      last_sold_at: r.last_sold_at,
      pending_lines: Number(r.pending_lines) || 0,
    }));
    const totalAmount = Math.round(data.reduce((s, r) => s + r.total, 0) * 100) / 100;

    res.json({ data, total_amount: totalAmount, days });
  } catch (err) {
    logger.error('getCustomerSales error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
