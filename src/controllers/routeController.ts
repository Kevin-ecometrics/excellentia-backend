import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { updateItemQtyOnHand } from '../services/qbItems.ts';

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
      stop_type     ENUM('BATCH','PRE_ORDER','CUSTOMER') NOT NULL,
      batch_id      VARCHAR(50) DEFAULT NULL,
      pre_order_id  INT DEFAULT NULL,
      customer_id   VARCHAR(50) DEFAULT NULL,
      customer_name VARCHAR(255) DEFAULT NULL,
      status        ENUM('PENDING','DELIVERED','SKIPPED') DEFAULT 'PENDING',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_items (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      route_id     INT NOT NULL,
      product_id   INT NOT NULL,
      barcode      VARCHAR(50) DEFAULT NULL,
      quantity     INT NOT NULL DEFAULT 0,
      scanned_by   INT DEFAULT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY route_product (route_id, product_id),
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

    // Un repartidor solo puede tener una ruta activa (PLANNED/IN_PROGRESS) a
    // la vez — evita que le armen dos camiones distintos al mismo tiempo.
    if (driver_user_id) {
      const [[active]] = await pool.query(
        `SELECT id, name FROM routes WHERE driver_user_id = ? AND status IN ('PLANNED','IN_PROGRESS') LIMIT 1`,
        [driver_user_id]
      ) as any[];
      if (active) {
        res.status(400).json({ error: `Este repartidor ya tiene una ruta activa: "${active.name}"` });
        return;
      }
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
    const { date, status } = req.query;
    // Un operator (repartidor) solo ve sus propias rutas — se ignora
    // cualquier driver_user_id que mande, nunca puede espiar las de otro.
    // admin/almacenista sí pueden filtrar libremente (o ver todas).
    const driver_user_id = req.user?.role === 'operator' ? req.user.id : req.query.driver_user_id;
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

    if (req.user?.role === 'operator' && route.driver_user_id !== req.user.id) {
      res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
      return;
    }

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
      } else if (stop.stop_type === 'PRE_ORDER' || stop.pre_order_id) {
        // PRE_ORDER, o CUSTOMER con pre-orden vinculada opcionalmente (ver
        // addStop) — se trae también pre_order_items para que la parada
        // muestre qué contiene sin tener que abrir la pre-orden aparte.
        const [preOrderRows] = await pool.query(
          'SELECT * FROM pre_orders WHERE id = ?', [stop.pre_order_id]
        ) as any[];
        const preOrder = (preOrderRows as any[])[0] ?? null;
        if (preOrder) {
          const [itemRows] = await pool.query(
            'SELECT * FROM pre_order_items WHERE pre_order_id = ? ORDER BY id', [stop.pre_order_id]
          ) as any[];
          preOrder.items = itemRows;
        }
        stops.push({ ...stop, preOrder });
      } else {
        // CUSTOMER sin pedido/pre-orden vinculado.
        stops.push(stop);
      }
    }

    const [itemRows] = await pool.query(
      `SELECT ri.id, ri.route_id, ri.product_id, ri.barcode, ri.quantity, ri.scanned_by, ri.created_at, ri.updated_at,
              p.name, p.sku, p.unit
       FROM route_items ri JOIN products p ON p.id = ri.product_id
       WHERE ri.route_id = ? ORDER BY ri.created_at`, [id]
    ) as any[];

    res.json({ data: { ...route, stops, items: itemRows } });
  } catch (err) {
    logger.error('getRoute error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateRoute(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    let { name, scheduled_date, driver_user_id, status, notes } = req.body;

    const [existing] = await pool.query('SELECT id, status, driver_user_id FROM routes WHERE id = ?', [id]) as any[];
    if ((existing as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    const currentStatus = (existing as any[])[0].status;
    if (currentStatus === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    // COMPLETED no bloqueaba nombre/fecha/repartidor/notas como sí hace
    // CANCELLED — cancelar una ruta completada ya lo impedía
    // canTransitionStatus (deleteRoute), pero editarla quedaba abierto.
    if (currentStatus === 'COMPLETED' && (name !== undefined || scheduled_date !== undefined || driver_user_id !== undefined || notes !== undefined)) {
      res.status(400).json({ error: 'Ruta completada: no se puede editar' });
      return;
    }

    // El repartidor asignado solo puede avanzar el estado de SU ruta (salió
    // a reparto / terminó) — no puede tocar nombre/fecha/notas ni
    // reasignarse otro repartidor. admin/almacenista siguen sin restricción.
    if (req.user?.role === 'operator') {
      if ((existing as any[])[0].driver_user_id !== req.user.id) {
        res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
        return;
      }
      name = undefined; scheduled_date = undefined; driver_user_id = undefined; notes = undefined;
    }

    if (driver_user_id) {
      const [[active]] = await pool.query(
        `SELECT id, name FROM routes WHERE driver_user_id = ? AND status IN ('PLANNED','IN_PROGRESS') AND id != ? LIMIT 1`,
        [driver_user_id, id]
      ) as any[];
      if (active) {
        res.status(400).json({ error: `Este repartidor ya tiene una ruta activa: "${active.name}"` });
        return;
      }
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
    const { stop_type, batch_id, pre_order_id, customer_id, customer_name } = req.body;

    if (stop_type !== 'BATCH' && stop_type !== 'PRE_ORDER' && stop_type !== 'CUSTOMER') {
      res.status(400).json({ error: "stop_type debe ser 'BATCH', 'PRE_ORDER' o 'CUSTOMER'" });
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

    if (stop_type === 'CUSTOMER') {
      // Parada = visitar a este cliente. customer_id/customer_name vienen
      // directo del picker de clientes de QBO en Android, no se resuelven
      // acá. pre_order_id es opcional — si el cliente tiene una pre-orden
      // confirmada pendiente, Android sugiere vincularla (no obligatorio).
      if (!customer_id || !customer_name) {
        res.status(400).json({ error: 'customer_id y customer_name son requeridos para stop_type CUSTOMER' });
        return;
      }
      customerId = customer_id;
      customerName = customer_name;
      if (pre_order_id) {
        const [[po]] = await pool.query(
          `SELECT id FROM pre_orders WHERE id = ? AND status = 'CONFIRMED'`, [pre_order_id]
        ) as any[];
        if (!po) {
          res.status(404).json({ error: 'Pre-orden no encontrada o no confirmada' });
          return;
        }
      }
    } else if (stop_type === 'BATCH') {
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
      [
        id, posRow.pos, stop_type,
        stop_type === 'BATCH' ? batch_id : null,
        (stop_type === 'PRE_ORDER' || stop_type === 'CUSTOMER') ? (pre_order_id ?? null) : null,
        customerId, customerName
      ]
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

// Marca una parada como entregada/saltada — a diferencia de addStop/
// removeStop/reorderStops (solo admin/almacenista, arman la ruta), acá
// también puede el repartidor asignado: es quien va tocando esto mientras
// hace el reparto.
export async function updateStopStatus(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id, stopId } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'DELIVERED', 'SKIPPED'].includes(status)) {
      res.status(400).json({ error: "status debe ser 'PENDING', 'DELIVERED' o 'SKIPPED'" });
      return;
    }
    const [[routeRow]] = await pool.query('SELECT status, driver_user_id FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (req.user?.role === 'operator' && routeRow.driver_user_id !== req.user.id) {
      res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
      return;
    }
    const [result] = await pool.query(
      'UPDATE route_stops SET status = ? WHERE id = ? AND route_id = ?', [status, stopId, id]
    ) as any;
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: 'Parada no encontrada' });
      return;
    }

    const routeStatus = await maybeAutoCloseRoute(id);

    res.json({ message: 'Estado de parada actualizado', routeStatus });
  } catch (err) {
    logger.error('updateStopStatus error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Si esta era la última parada pendiente, la ruta ya no tiene nada más que
// hacer — se cierra sola en vez de quedar en PLANNED/IN_PROGRESS para
// siempre: COMPLETED si hubo al menos una entrega real, CANCELLED si se
// saltearon todas (no sirvió para nada). Una ruta sin paradas no dispara
// nada (no hay de dónde inferir un resultado). Devuelve el status final de
// la ruta para que el cliente actualice sin pedir loadDetail() aparte.
async function maybeAutoCloseRoute(routeId: string): Promise<string | null> {
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'PENDING') AS pending,
            SUM(status = 'DELIVERED') AS delivered
     FROM route_stops WHERE route_id = ?`, [routeId]
  ) as any[];
  // SUM()/COUNT() pueden volver como string vía mysql2 sin decimalNumbers —
  // mismo gotcha ya documentado en el proyecto (ver batch_damage.qty).
  const total = Number(stats.total) || 0;
  const pending = Number(stats.pending) || 0;
  const delivered = Number(stats.delivered) || 0;
  if (total === 0 || pending > 0) return null;

  const newStatus = delivered > 0 ? 'COMPLETED' : 'CANCELLED';
  await pool.query(
    `UPDATE routes SET status = ?, updated_at = NOW() WHERE id = ? AND status IN ('PLANNED','IN_PROGRESS')`,
    [newStatus, routeId]
  );
  return newStatus;
}

// Sincroniza products.stock a QBO QtyOnHand y arma el { qbSynced, qbMessage }
// que devuelven addRouteItem/removeRouteItem — mismo criterio que
// updateProduct (productController.ts): el push a QBO nunca hace fallar la
// operación en MySQL, pero acá sí se reporta el resultado al caller en vez de
// solo loguearlo.
async function syncStockToQbo(productId: number, newStock: number): Promise<{ qbSynced: boolean; qbMessage: string | null }> {
  const [[product]] = await pool.query('SELECT qb_item_id FROM products WHERE id = ?', [productId]) as any[];
  const qbItemId = product?.qb_item_id;
  if (!qbItemId) return { qbSynced: false, qbMessage: 'Producto sin vincular a QBO — stock no sincronizado' };
  try {
    const result = await updateItemQtyOnHand(qbItemId, newStock);
    if (result) return { qbSynced: true, qbMessage: null };
    return { qbSynced: false, qbMessage: 'El ítem no es de tipo Inventory en QBO — stock no sincronizado' };
  } catch (qbErr) {
    logger.warn(`No se pudo sincronizar stock a QBO para producto ${productId}:`, qbErr);
    return { qbSynced: false, qbMessage: 'No se pudo sincronizar el stock a QBO' };
  }
}

export async function addRouteItem(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { barcode, product_id } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);

    // product_id cubre el ingreso manual (productos sin código de barras) —
    // ver "Ingresar manualmente" en WarehouseRouteDetailActivity (Android).
    if (!barcode && !product_id) {
      res.status(400).json({ error: 'barcode o product_id es requerido' });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'quantity debe ser un número mayor a 0' });
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

    const [[product]] = product_id
      ? await pool.query('SELECT id, barcode FROM products WHERE id = ?', [product_id]) as any[]
      : await pool.query('SELECT id, barcode FROM products WHERE barcode = ?', [barcode]) as any[];
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    await pool.query(
      `INSERT INTO route_items (route_id, product_id, barcode, quantity, scanned_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()`,
      [id, product.id, product.barcode ?? null, quantity, req.user?.id ?? null]
    );
    await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, product.id]);

    const [[item]] = await pool.query(
      `SELECT ri.id, ri.route_id, ri.product_id, ri.barcode, ri.quantity, p.name, p.sku, p.unit
       FROM route_items ri JOIN products p ON p.id = ri.product_id
       WHERE ri.route_id = ? AND ri.product_id = ?`, [id, product.id]
    ) as any[];
    const [[{ stock }]] = await pool.query('SELECT stock FROM products WHERE id = ?', [product.id]) as any[];
    const { qbSynced, qbMessage } = await syncStockToQbo(product.id, stock);

    res.status(201).json({ item, stock, qbSynced, qbMessage });
  } catch (err) {
    logger.error('addRouteItem error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function removeRouteItem(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id, itemId } = req.params;
    const [[routeRow]] = await pool.query('SELECT status FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }

    const [[item]] = await pool.query(
      'SELECT product_id, quantity FROM route_items WHERE id = ? AND route_id = ?', [itemId, id]
    ) as any[];
    if (!item) {
      res.status(404).json({ error: 'Ítem no encontrado' });
      return;
    }

    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    await pool.query('DELETE FROM route_items WHERE id = ?', [itemId]);

    const [[{ stock }]] = await pool.query('SELECT stock FROM products WHERE id = ?', [item.product_id]) as any[];
    const { qbSynced, qbMessage } = await syncStockToQbo(item.product_id, stock);

    res.json({ message: 'Ítem eliminado', stock, qbSynced, qbMessage });
  } catch (err) {
    logger.error('removeRouteItem error:', err);
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
             p.assigned_user_id, p.status, p.created_at, COUNT(pi.id) AS item_count, COALESCE(SUM(pi.total), 0) AS total
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
