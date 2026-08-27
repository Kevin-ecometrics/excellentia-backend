import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';

// Orden forward-only: PLANNED -> IN_PROGRESS -> COMPLETED, sin poder retroceder.
// CANCELLED es terminal — se puede llegar desde PLANNED/IN_PROGRESS (no desde
// COMPLETED) y, una vez ahí, la ruta queda inmutable (ver checkNotLocked).
const STATUS_RANK: Record<string, number> = { PLANNED: 0, IN_PROGRESS: 1, COMPLETED: 2 };

function canTransitionStatus(current: string, next: string): boolean {
  if (current === next) return true;
  if (current === 'CANCELLED') return false;
  if (next === 'CANCELLED') return current !== 'COMPLETED';
  const currentRank = STATUS_RANK[current];
  const nextRank = STATUS_RANK[next];
  if (currentRank === undefined || nextRank === undefined) return false;
  return nextRank > currentRank;
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      scheduled_date  DATE NOT NULL,
      driver_user_id  INT DEFAULT NULL,
      status          ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
      notes           TEXT DEFAULT NULL,
      created_by      INT DEFAULT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_stops (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      route_id      INT NOT NULL,
      position      INT NOT NULL,
      stop_type     ENUM('BATCH','PRE_ORDER') NOT NULL,
      batch_id      VARCHAR(50) DEFAULT NULL,
      pre_order_id  INT DEFAULT NULL,
      customer_id   VARCHAR(50) DEFAULT NULL,
      customer_name VARCHAR(255) DEFAULT NULL,
      status        ENUM('PENDING','DELIVERED','SKIPPED') DEFAULT 'PENDING',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )
  `);
}

export async function createRoute(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { name, scheduled_date, driver_user_id, notes } = req.body;
    if (!name || !scheduled_date) {
      res.status(400).json({ error: 'name y scheduled_date son requeridos' });
      return;
    }
    const [result] = await pool.query(
      'INSERT INTO routes (name, scheduled_date, driver_user_id, notes, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, scheduled_date, driver_user_id ?? null, notes ?? null, req.user?.id ?? null]
    ) as any;
    res.status(201).json({ id: result.insertId, status: 'PLANNED' });
  } catch (err) {
    logger.error('createRoute error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listRoutes(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { date, driver_user_id, status } = req.query;
    let query = `
      SELECT r.id, r.name, r.scheduled_date, r.driver_user_id, u.name AS driver_name,
             r.status, r.notes, r.created_by, r.created_at, r.updated_at,
             COUNT(rs.id) AS stop_count
      FROM routes r
      LEFT JOIN users u ON u.id = r.driver_user_id
      LEFT JOIN route_stops rs ON rs.route_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (date)            { query += ' AND r.scheduled_date = ?';   params.push(date); }
    if (driver_user_id)  { query += ' AND r.driver_user_id = ?';   params.push(driver_user_id); }
    if (status)          { query += ' AND r.status = ?';           params.push(status); }
    query += ' GROUP BY r.id ORDER BY r.scheduled_date DESC, r.created_at DESC';

    const [rows] = await pool.query(query, params) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listRoutes error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getRoute(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS driver_name
       FROM routes r LEFT JOIN users u ON u.id = r.driver_user_id
       WHERE r.id = ?`, [id]
    ) as any[];
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    const route = (rows as any[])[0];

    const [stopRows] = await pool.query(
      'SELECT * FROM route_stops WHERE route_id = ? ORDER BY position', [id]
    ) as any[];

    const stops = [];
    for (const stop of stopRows as any[]) {
      if (stop.stop_type === 'BATCH') {
        const [batchRows] = await pool.query(
          `SELECT batch_id, customer_id, customer_name, SUM(total) AS total,
                  MAX(status) AS status, MAX(qb_invoice_id) AS qb_invoice_id,
                  COUNT(*) AS item_count, MIN(created_at) AS created_at
           FROM orders WHERE batch_id = ? GROUP BY batch_id, customer_id, customer_name`,
          [stop.batch_id]
        ) as any[];
        stops.push({ ...stop, batch: (batchRows as any[])[0] ?? null });
      } else {
        const [preOrderRows] = await pool.query(
          'SELECT * FROM pre_orders WHERE id = ?', [stop.pre_order_id]
        ) as any[];
        stops.push({ ...stop, preOrder: (preOrderRows as any[])[0] ?? null });
      }
    }

    res.json({ data: { ...route, stops } });
  } catch (err) {
    logger.error('getRoute error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateRoute(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { name, scheduled_date, driver_user_id, status, notes } = req.body;

    const [existing] = await pool.query('SELECT id, status FROM routes WHERE id = ?', [id]) as any[];
    if ((existing as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    const currentStatus = (existing as any[])[0].status;
    if (currentStatus === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (status !== undefined && !canTransitionStatus(currentStatus, status)) {
      res.status(400).json({ error: `No se puede pasar de '${currentStatus}' a '${status}'` });
      return;
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    if (name            !== undefined) { updates.push('name = ?');            params.push(name); }
    if (scheduled_date   !== undefined) { updates.push('scheduled_date = ?');  params.push(scheduled_date); }
    if (driver_user_id   !== undefined) { updates.push('driver_user_id = ?');  params.push(driver_user_id === null ? null : Number(driver_user_id)); }
    if (status           !== undefined) { updates.push('status = ?');          params.push(status); }
    if (notes            !== undefined) { updates.push('notes = ?');           params.push(notes); }
    params.push(id);

    await pool.query(`UPDATE routes SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Ruta actualizada' });
  } catch (err) {
    logger.error('updateRoute error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteRoute(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id, status FROM routes WHERE id = ?', [id]) as any[];
    if ((existing as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    const currentStatus = (existing as any[])[0].status;
    if (!canTransitionStatus(currentStatus, 'CANCELLED')) {
      res.status(400).json({ error: `No se puede cancelar una ruta en estado '${currentStatus}'` });
      return;
    }
    await pool.query("UPDATE routes SET status = 'CANCELLED' WHERE id = ?", [id]);
    res.json({ message: 'Ruta cancelada' });
  } catch (err) {
    logger.error('deleteRoute error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function addStop(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { stop_type, batch_id, pre_order_id } = req.body;

    if (stop_type !== 'BATCH' && stop_type !== 'PRE_ORDER') {
      res.status(400).json({ error: "stop_type debe ser 'BATCH' o 'PRE_ORDER'" });
      return;
    }

    const [routeRows] = await pool.query('SELECT id, status FROM routes WHERE id = ?', [id]) as any[];
    if ((routeRows as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if ((routeRows as any[])[0].status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }

    let customerId: string | null = null;
    let customerName: string | null = null;

    if (stop_type === 'BATCH') {
      if (!batch_id) {
        res.status(400).json({ error: 'batch_id es requerido para stop_type BATCH' });
        return;
      }
      const [batchRows] = await pool.query(
        'SELECT customer_id, customer_name FROM orders WHERE batch_id = ? LIMIT 1', [batch_id]
      ) as any[];
      if ((batchRows as any[]).length === 0) {
        res.status(404).json({ error: 'Pedido no encontrado' });
        return;
      }
      customerId = (batchRows as any[])[0].customer_id;
      customerName = (batchRows as any[])[0].customer_name;
    } else {
      if (!pre_order_id) {
        res.status(400).json({ error: 'pre_order_id es requerido para stop_type PRE_ORDER' });
        return;
      }
      const [preOrderRows] = await pool.query(
        'SELECT customer_id, customer_name FROM pre_orders WHERE id = ?', [pre_order_id]
      ) as any[];
      if ((preOrderRows as any[]).length === 0) {
        res.status(404).json({ error: 'Pre-orden no encontrada' });
        return;
      }
      customerId = (preOrderRows as any[])[0].customer_id;
      customerName = (preOrderRows as any[])[0].customer_name;
    }

    const [[posRow]] = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM route_stops WHERE route_id = ?', [id]
    ) as any[];

    const [result] = await pool.query(
      'INSERT INTO route_stops (route_id, position, stop_type, batch_id, pre_order_id, customer_id, customer_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, posRow.pos, stop_type, stop_type === 'BATCH' ? batch_id : null, stop_type === 'PRE_ORDER' ? pre_order_id : null, customerId, customerName]
    ) as any;

    res.status(201).json({ id: result.insertId, position: posRow.pos });
  } catch (err) {
    logger.error('addStop error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function reorderStops(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { stop_ids } = req.body;
    if (!Array.isArray(stop_ids) || stop_ids.length === 0) {
      res.status(400).json({ error: 'stop_ids debe ser un array no vacío' });
      return;
    }
    const [[routeRow]] = await pool.query('SELECT status FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    for (let i = 0; i < stop_ids.length; i++) {
      await pool.query(
        'UPDATE route_stops SET position = ? WHERE id = ? AND route_id = ?',
        [i + 1, stop_ids[i], id]
      );
    }
    res.json({ message: 'Paradas reordenadas' });
  } catch (err) {
    logger.error('reorderStops error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function removeStop(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id, stopId } = req.params;
    const [[routeRow]] = await pool.query('SELECT status FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    const [result] = await pool.query(
      'DELETE FROM route_stops WHERE id = ? AND route_id = ?', [stopId, id]
    ) as any;
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: 'Parada no encontrada' });
      return;
    }
    res.json({ message: 'Parada eliminada' });
  } catch (err) {
    logger.error('removeStop error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listAvailable(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { date } = req.query;

    let orderQuery = `
      SELECT batch_id, customer_id, customer_name, SUM(total) AS total,
             MAX(status) AS status, COUNT(*) AS item_count, MIN(created_at) AS created_at
      FROM orders
      WHERE batch_id IS NOT NULL
        AND status != 'CANCELLED'
        AND batch_id NOT IN (
          SELECT rs.batch_id FROM route_stops rs
          JOIN routes r ON r.id = rs.route_id
          WHERE rs.batch_id IS NOT NULL AND r.status != 'CANCELLED'
        )
    `;
    const orderParams: any[] = [];
    if (date) { orderQuery += ' AND DATE(created_at) = ?'; orderParams.push(date); }
    orderQuery += ' GROUP BY batch_id, customer_id, customer_name ORDER BY MIN(created_at) DESC';

    let preOrderQuery = `
      SELECT p.id, p.customer_id, p.customer_name, p.scheduled_date, p.salesperson_name,
             p.status, p.created_at, COUNT(pi.id) AS item_count, COALESCE(SUM(pi.total), 0) AS total
      FROM pre_orders p
      LEFT JOIN pre_order_items pi ON pi.pre_order_id = p.id
      WHERE p.status = 'CONFIRMED'
        AND p.id NOT IN (
          SELECT rs.pre_order_id FROM route_stops rs
          JOIN routes r ON r.id = rs.route_id
          WHERE rs.pre_order_id IS NOT NULL AND r.status != 'CANCELLED'
        )
    `;
    const preOrderParams: any[] = [];
    if (date) { preOrderQuery += ' AND p.scheduled_date = ?'; preOrderParams.push(date); }
    preOrderQuery += ' GROUP BY p.id ORDER BY p.scheduled_date ASC';

    const [orderRows] = await pool.query(orderQuery, orderParams) as any[];
    const [preOrderRows] = await pool.query(preOrderQuery, preOrderParams) as any[];

    res.json({ orders: orderRows, preOrders: preOrderRows });
  } catch (err) {
    logger.error('listAvailable error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
