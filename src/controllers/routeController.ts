import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import {
  ensureWarehouseTables,
  ensureRouteLinkedWarehouseTables,
  getDefaultWarehouseId,
  computeFifoAllocation,
  applyFifoAllocation,
  restoreLotQuantity,
  recordMovement,
  InsufficientStockError,
} from './warehouseController.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { reserveInvoiceNumber } from '../services/invoiceCounter.ts';

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

// Requiere que warehouses ya exista (ensureWarehouseTables) — se llama antes
// en cada handler para que la FK de routes.warehouse_id pueda crearse en una
// base nueva. En una base existente sin la columna, esta CREATE TABLE IF NOT
// EXISTS no hace nada — hace falta la migración manual (ver schema.sql).
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      scheduled_date  DATE NOT NULL,
      driver_user_id  INT DEFAULT NULL,
      warehouse_id    INT DEFAULT NULL,
      status          ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
      route_type      ENUM('DIRECT','MULTI_STOP') NOT NULL DEFAULT 'MULTI_STOP',
      notes           TEXT DEFAULT NULL,
      created_by      INT DEFAULT NULL,
      returns_reviewed_at TIMESTAMP DEFAULT NULL,
      returns_reviewed_by INT DEFAULT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_stops (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      route_id      INT NOT NULL,
      position      INT NOT NULL,
      stop_type     ENUM('BATCH','PRE_ORDER','CUSTOMER','CONSIGNMENT') NOT NULL,
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
      quantity     DECIMAL(10,2) NOT NULL DEFAULT 0,
      scanned_by   INT DEFAULT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY route_product (route_id, product_id),
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )
  `);
}

export async function createRoute(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  try {
    const { name, scheduled_date, driver_user_id, notes } = req.body;
    if (!name || !scheduled_date) {
      res.status(400).json({ error: 'name y scheduled_date son requeridos' });
      return;
    }
    // Fase 115 — ruta directa (un solo destino, carga pre-asignada) vs no
    // directa (multi-parada, flujo de siempre). Se hace cumplir en addStop,
    // no acá — este campo solo la etiqueta.
    const routeType = req.body.route_type === 'DIRECT' ? 'DIRECT' : 'MULTI_STOP';

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

    // warehouse_id: hoy hay un solo almacén activo, se usa como default si no
    // se manda uno explícito (Fase 112 — routes queda listo para más de uno).
    const warehouseId = req.body.warehouse_id ?? await getDefaultWarehouseId();

    const [result] = await pool.query(
      'INSERT INTO routes (name, scheduled_date, driver_user_id, warehouse_id, notes, route_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, scheduled_date, driver_user_id ?? null, warehouseId, notes ?? null, routeType, req.user?.id ?? null]
    ) as any;
    res.status(201).json({ id: result.insertId, status: 'PLANNED', route_type: routeType });
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
             r.status, r.route_type, r.notes, r.created_by, r.returns_reviewed_at, r.returns_reviewed_by, r.created_at, r.updated_at,
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

    // min_expiration_date/used_override: resumen de qué lote(s) alimentaron
    // esta línea (route_item_lots, Fase 112) — para que el detalle de la ruta
    // muestre la expiración sin que Android tenga que pedir cada lote aparte.
    // loaded_by_name: solo se puede cargar stock de lotes ACTIVE (nunca
    // dañado/vencido, ver addRouteItem/computeFifoAllocation), así que
    // scanned_by/created_at ya son la confirmación de que esa línea salió en
    // buen estado — se expone el nombre acá para que la webapp la muestre
    // sin una consulta aparte (mismo dato que ya usa Android en la revisión
    // de devoluciones vía getExpectedReturns).
    const [itemRows] = await pool.query(
      `SELECT ri.id, ri.route_id, ri.product_id, ri.barcode, ri.quantity, ri.scanned_by, ri.created_at, ri.updated_at,
              p.name, p.sku, p.unit, u.name AS loaded_by_name,
              MIN(pl.expiration_date) AS min_expiration_date,
              MAX(1 - ril.used_suggested_lot) AS used_override
       FROM route_items ri
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN users u ON u.id = ri.scanned_by
       LEFT JOIN route_item_lots ril ON ril.route_item_id = ri.id
       LEFT JOIN product_lots pl ON pl.id = ril.lot_id
       WHERE ri.route_id = ?
       GROUP BY ri.id, ri.route_id, ri.product_id, ri.barcode, ri.quantity, ri.scanned_by, ri.created_at, ri.updated_at, p.name, p.sku, p.unit, u.name
       ORDER BY ri.created_at`, [id]
    ) as any[];

    // route_items.quantity es DECIMAL (Fase 118, para Lbs por peso real) —
    // mysql2 lo devuelve como string sin decimalNumbers configurado en
    // db/connection.ts (mismo gotcha ya documentado varias veces en este
    // proyecto). Gson tolera un string numérico en un campo Double (no
    // rompe el parseo en Android), pero sin este cast la webapp recibe
    // "3.00" entre comillas donde su tipo (`quantity: number`) espera un
    // número real — se ve como "3.00" en vez de "3" en la UI en lugares que
    // no hacen `Number(...)` antes de mostrarlo (ver WarehouseClient.tsx).
    const items = (itemRows as any[]).map(r => ({ ...r, quantity: Number(r.quantity) }));

    res.json({ data: { ...route, stops, items } });
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

    if (!['BATCH', 'PRE_ORDER', 'CUSTOMER', 'CONSIGNMENT'].includes(stop_type)) {
      res.status(400).json({ error: "stop_type debe ser 'BATCH', 'PRE_ORDER', 'CUSTOMER' o 'CONSIGNMENT'" });
      return;
    }

    const [routeRows] = await pool.query('SELECT id, status, route_type, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if ((routeRows as any[]).length === 0) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if ((routeRows as any[])[0].status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if ((routeRows as any[])[0].returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
      return;
    }
    // Fase 115 — una ruta DIRECT es un solo destino con la carga ya
    // pre-asignada; una 2ª parada la dejaría decorativa sin cambiar nada
    // real. MULTI_STOP (default) sigue sin límite.
    if ((routeRows as any[])[0].route_type === 'DIRECT') {
      const [[stopCount]] = await pool.query(
        'SELECT COUNT(*) AS n FROM route_stops WHERE route_id = ?', [id]
      ) as any[];
      if (stopCount.n > 0) {
        res.status(400).json({ error: 'Ruta directa: ya tiene su único destino asignado' });
        return;
      }
    }

    let customerId: string | null = null;
    let customerName: string | null = null;

    if (stop_type === 'CUSTOMER' || stop_type === 'CONSIGNMENT') {
      // Parada = visitar a este cliente. customer_id/customer_name vienen
      // directo del picker de clientes de QBO en Android, no se resuelven
      // acá. pre_order_id es opcional — si el cliente tiene una pre-orden
      // confirmada pendiente, Android sugiere vincularla (no obligatorio;
      // no aplica a CONSIGNMENT, que nunca se vincula a una pre-orden).
      if (!customer_id || !customer_name) {
        res.status(400).json({ error: `customer_id y customer_name son requeridos para stop_type ${stop_type}` });
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
    const [[routeRow]] = await pool.query('SELECT status, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
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
    const [[routeRow]] = await pool.query('SELECT status, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
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

// El stock local (products.stock/product_lots) se actualiza en el momento —
// es la fuente de verdad del día — y recordMovement() (warehouseController.ts)
// sincroniza QtyOnHand a QBO al toque, sin ningún paso manual de por medio
// (se eliminó la Liquidación diaria que agrupaba esto — a pedido del usuario,
// no hacía falta batchear al volumen de uso real).
export async function addRouteItem(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id } = req.params;
    const { barcode, product_id, lot_id, source } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
    // 'STOCK' salta el FIFO por completo y descuenta products.stock directo —
    // para stock real que todavía no pasó por Recepción (sin lote). Default
    // 'LOT' preserva el comportamiento de siempre.
    const useStock = source === 'STOCK';

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

    const [[routeRow]] = await pool.query('SELECT status, warehouse_id, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
      return;
    }
    const warehouseId = routeRow.warehouse_id ?? await getDefaultWarehouseId();

    const [[product]] = product_id
      ? await pool.query('SELECT id, barcode FROM products WHERE id = ?', [product_id]) as any[]
      : await pool.query('SELECT id, barcode FROM products WHERE barcode = ?', [barcode]) as any[];
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Asignación FIFO: por default el sistema elige el/los lote(s) — puede
    // partir la cantidad entre varios si el primero no alcanza. lot_id es el
    // override manual (el almacenista eligió otro lote a mano) — ahí no se
    // parte entre lotes, tiene que alcanzar con ese solo lote elegido.
    // source: 'STOCK' se salta todo esto — no hay lote de por medio, solo se
    // valida que products.stock alcance (mismo shape de error que
    // InsufficientStockError, para que Android reuse el mismo manejo de 409).
    let allocations: { lot_id: number; qty: number }[] = [];
    if (useStock) {
      const [[stockRow]] = await pool.query('SELECT stock FROM products WHERE id = ?', [product.id]) as any[];
      const currentStock = Number(stockRow?.stock) || 0;
      if (currentStock < quantity) {
        res.status(409).json({
          error: `Stock insuficiente: disponible ${currentStock}, solicitado ${quantity}`,
          available: currentStock, requested: quantity, product_id: product.id,
        });
        return;
      }
    } else if (lot_id) {
      const [[lot]] = await pool.query(
        `SELECT id, remaining_qty FROM product_lots
         WHERE id = ? AND product_id = ? AND warehouse_id = ? AND status = 'ACTIVE'`,
        [lot_id, product.id, warehouseId]
      ) as any[];
      if (!lot) {
        res.status(404).json({ error: 'Lote no encontrado o no disponible en este almacén' });
        return;
      }
      if (Number(lot.remaining_qty) < quantity) {
        res.status(409).json({ error: `El lote elegido solo tiene ${lot.remaining_qty} disponible` });
        return;
      }
      allocations = [{ lot_id: lot.id, qty: quantity }];
    } else {
      try {
        allocations = await computeFifoAllocation(product.id, warehouseId, quantity);
      } catch (allocErr: any) {
        if (allocErr instanceof InsufficientStockError) {
          res.status(409).json({ error: allocErr.message, available: allocErr.available, requested: allocErr.requested, product_id: product.id });
        } else {
          res.status(409).json({ error: allocErr.message });
        }
        return;
      }
    }

    if (!useStock) await applyFifoAllocation(allocations);

    await pool.query(
      `INSERT INTO route_items (route_id, product_id, barcode, quantity, scanned_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()`,
      [id, product.id, product.barcode ?? null, quantity, req.user?.id ?? null]
    );
    await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, product.id]);

    const [[routeItem]] = await pool.query(
      'SELECT id FROM route_items WHERE route_id = ? AND product_id = ?', [id, product.id]
    ) as any[];
    if (useStock) {
      await recordMovement({
        warehouseId, productId: product.id, lotId: null, movementType: 'ROUTE_LOAD',
        quantity: -quantity, routeId: Number(id), createdBy: req.user?.id ?? null,
      });
    } else {
      for (const a of allocations) {
        await pool.query(
          `INSERT INTO route_item_lots (route_item_id, lot_id, quantity, used_suggested_lot)
           VALUES (?, ?, ?, ?)`,
          [routeItem.id, a.lot_id, a.qty, lot_id ? 0 : 1]
        );
        await recordMovement({
          warehouseId, productId: product.id, lotId: a.lot_id, movementType: 'ROUTE_LOAD',
          quantity: -a.qty, routeId: Number(id), createdBy: req.user?.id ?? null,
        });
      }
    }

    const [[itemRow]] = await pool.query(
      `SELECT ri.id, ri.route_id, ri.product_id, ri.barcode, ri.quantity, p.name, p.sku, p.unit
       FROM route_items ri JOIN products p ON p.id = ri.product_id
       WHERE ri.route_id = ? AND ri.product_id = ?`, [id, product.id]
    ) as any[];
    // Mismo cast que getRoute — route_items.quantity es DECIMAL (Fase 118).
    const item = { ...itemRow, quantity: Number(itemRow.quantity) };
    const [[{ stock }]] = await pool.query('SELECT stock FROM products WHERE id = ?', [product.id]) as any[];

    res.status(201).json({
      item, stock, lots: allocations,
      qbSynced: true,
    });
  } catch (err) {
    logger.error('addRouteItem error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function removeRouteItem(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id, itemId } = req.params;
    const [[routeRow]] = await pool.query('SELECT status, warehouse_id, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
      return;
    }
    const warehouseId = routeRow.warehouse_id ?? await getDefaultWarehouseId();

    const [[item]] = await pool.query(
      'SELECT product_id, quantity FROM route_items WHERE id = ? AND route_id = ?', [itemId, id]
    ) as any[];
    if (!item) {
      res.status(404).json({ error: 'Ítem no encontrado' });
      return;
    }

    const [lotRows] = await pool.query(
      'SELECT id, lot_id, quantity FROM route_item_lots WHERE route_item_id = ?', [itemId]
    ) as any[];
    for (const lr of lotRows as any[]) {
      await restoreLotQuantity(lr.lot_id, Number(lr.quantity));
      await recordMovement({
        warehouseId, productId: item.product_id, lotId: lr.lot_id, movementType: 'ROUTE_LOAD',
        quantity: Number(lr.quantity), routeId: Number(id), createdBy: req.user?.id ?? null,
      });
    }
    await pool.query('DELETE FROM route_item_lots WHERE route_item_id = ?', [itemId]);
    // Ítem cargado con source: 'STOCK' (sin lote) — el restore de stock de
    // abajo corre igual, pero sin este movimiento el historial no mostraría
    // que ese stock volvió (el loop de arriba no itera nada si no hay lotes).
    if ((lotRows as any[]).length === 0 && Number(item.quantity) > 0) {
      await recordMovement({
        warehouseId, productId: item.product_id, lotId: null, movementType: 'ROUTE_LOAD',
        quantity: Number(item.quantity), routeId: Number(id), createdBy: req.user?.id ?? null,
      });
    }

    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    await pool.query('DELETE FROM route_items WHERE id = ?', [itemId]);

    const [[{ stock }]] = await pool.query('SELECT stock FROM products WHERE id = ?', [item.product_id]) as any[];

    res.json({ message: 'Ítem eliminado', stock, qbSynced: true });
  } catch (err) {
    logger.error('removeRouteItem error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Fase 115.4 — Consignación: registrar qué se dejó en una parada CONSIGNMENT.
// Resta stock igual que addRouteItem con source: 'STOCK' (sin FIFO por
// lote — no hay tabla de lotes por línea de consignación en el schema
// migrado, a diferencia de route_item_lots) y también inserta/acumula en
// route_items (mismo UNIQUE route_product) para que la reconciliación de la
// Fase 115.2 siga contando esto como "cargado" en el total de la ruta —
// route_consignment_items es la única tabla que trackea por parada/cliente
// (route_items no distingue paradas). Una request puede llamarse varias
// veces para la misma parada/producto antes de liquidar — se acumula en la
// fila sin liquidar existente en vez de crear una nueva.
export async function registerConsignment(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id, stopId } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items debe ser un array no vacío' });
      return;
    }

    const [[routeRow]] = await pool.query(
      'SELECT status, warehouse_id, returns_reviewed_at, driver_user_id FROM routes WHERE id = ?', [id]
    ) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Devoluciones ya revisadas: no se puede modificar esta ruta' });
      return;
    }
    // Acción de campo del repartidor dueño de la ruta — mismo criterio de
    // ownership que updateStopStatus. admin/almacenista sin restricción.
    if (req.user?.role === 'operator' && routeRow.driver_user_id !== req.user.id) {
      res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
      return;
    }
    const [[stop]] = await pool.query(
      `SELECT id FROM route_stops WHERE id = ? AND route_id = ? AND stop_type = 'CONSIGNMENT'`, [stopId, id]
    ) as any[];
    if (!stop) {
      res.status(404).json({ error: 'Parada de consignación no encontrada en esta ruta' });
      return;
    }
    const warehouseId = routeRow.warehouse_id ?? await getDefaultWarehouseId();

    const results: any[] = [];
    for (const line of items) {
      const { barcode, product_id, unit, case_qty } = line;
      const quantity = Number(line.quantity);
      if (!barcode && !product_id) {
        results.push({ error: 'barcode o product_id es requerido', line });
        continue;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        results.push({ error: 'quantity debe ser un número mayor a 0', line });
        continue;
      }
      const [[product]] = product_id
        ? await pool.query('SELECT id, barcode FROM products WHERE id = ?', [product_id]) as any[]
        : await pool.query('SELECT id, barcode FROM products WHERE barcode = ?', [barcode]) as any[];
      if (!product) {
        results.push({ error: 'Producto no encontrado', line });
        continue;
      }
      const [[stockRow]] = await pool.query('SELECT stock FROM products WHERE id = ?', [product.id]) as any[];
      const currentStock = Number(stockRow?.stock) || 0;
      if (currentStock < quantity) {
        results.push({
          error: `Stock insuficiente: disponible ${currentStock}, solicitado ${quantity}`,
          available: currentStock, requested: quantity, product_id: product.id, line,
        });
        continue;
      }

      await pool.query(
        `INSERT INTO route_items (route_id, product_id, barcode, quantity, scanned_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()`,
        [id, product.id, product.barcode ?? null, quantity, req.user?.id ?? null]
      );
      await pool.query('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?', [quantity, product.id]);
      await recordMovement({
        warehouseId, productId: product.id, lotId: null, movementType: 'ROUTE_LOAD',
        quantity: -quantity, routeId: Number(id), createdBy: req.user?.id ?? null,
      });

      const [[existing]] = await pool.query(
        `SELECT id, quantity_left FROM route_consignment_items
         WHERE route_stop_id = ? AND product_id = ? AND settled_at IS NULL`,
        [stopId, product.id]
      ) as any[];
      if (existing) {
        await pool.query(
          'UPDATE route_consignment_items SET quantity_left = quantity_left + ? WHERE id = ?',
          [quantity, existing.id]
        );
      } else {
        await pool.query(
          `INSERT INTO route_consignment_items (route_stop_id, product_id, quantity_left, unit, case_qty)
           VALUES (?, ?, ?, ?, ?)`,
          [stopId, product.id, quantity, unit ?? null, case_qty ?? null]
        );
      }

      const [[{ stock }]] = await pool.query('SELECT stock FROM products WHERE id = ?', [product.id]) as any[];
      results.push({ product_id: product.id, quantity, stock });
    }

    res.status(201).json({ items: results });
  } catch (err) {
    logger.error('registerConsignment error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getConsignment(req: Request, res: Response): Promise<void> {
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id, stopId } = req.params;
    if (req.user?.role === 'operator') {
      const [[routeRow]] = await pool.query('SELECT driver_user_id FROM routes WHERE id = ?', [id]) as any[];
      if (routeRow && routeRow.driver_user_id !== req.user.id) {
        res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
        return;
      }
    }
    const [rows] = await pool.query(
      `SELECT rci.*, p.name, p.sku
       FROM route_consignment_items rci JOIN products p ON p.id = rci.product_id
       WHERE rci.route_stop_id = ? ORDER BY rci.created_at`, [stopId]
    ) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('getConsignment error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Fase 115.4 — Liquidar consignación: por línea, qué se vendió (venta real,
// mismo flujo AWAITING_APPROVAL de la Fase 113 — no se factura al instante,
// un admin la aprueba después como cualquier otra venta) y qué se devolvió
// (restituye stock, igual que route_returns condition_status='GOOD'). No
// vuelve a descontar stock — eso ya pasó en registerConsignment; acá solo se
// mueve entre "vendido"/"devuelto" lo que ya estaba físicamente en manos del
// cliente. No exige que sold+returned agote quantity_left — puede quedar un
// remanente si el conteo real no coincide (mismo criterio "no bloquea" que
// createReturns con route_returns).
export async function settleConsignment(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id, stopId } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items debe ser un array no vacío' });
      return;
    }

    const [[routeRow]] = await pool.query('SELECT status, warehouse_id, driver_user_id FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status === 'CANCELLED') {
      res.status(400).json({ error: 'Ruta cancelada: no se puede modificar' });
      return;
    }
    // Acción de campo del repartidor dueño de la ruta — mismo criterio de
    // ownership que updateStopStatus. admin/almacenista sin restricción.
    if (req.user?.role === 'operator' && routeRow.driver_user_id !== req.user.id) {
      res.status(403).json({ error: 'Acceso denegado: esta ruta no está asignada a vos' });
      return;
    }
    const [[stop]] = await pool.query(
      `SELECT id, customer_id, customer_name FROM route_stops WHERE id = ? AND route_id = ? AND stop_type = 'CONSIGNMENT'`,
      [stopId, id]
    ) as any[];
    if (!stop) {
      res.status(404).json({ error: 'Parada de consignación no encontrada en esta ruta' });
      return;
    }
    const warehouseId = routeRow.warehouse_id ?? await getDefaultWarehouseId();

    const results: any[] = [];
    const soldLines: { barcode: string; product_name: string; price: number; quantity: number; total: number; unit: string | null; case_qty: number | null }[] = [];

    for (const line of items) {
      const { product_id } = line;
      const quantitySold = Number(line.quantity_sold) || 0;
      const quantityReturned = Number(line.quantity_returned) || 0;
      if (!product_id) {
        results.push({ error: 'product_id es requerido', line });
        continue;
      }
      if (quantitySold < 0 || quantityReturned < 0) {
        results.push({ error: 'quantity_sold y quantity_returned no pueden ser negativos', line });
        continue;
      }
      const [[consignmentRow]] = await pool.query(
        `SELECT id, quantity_left, unit, case_qty FROM route_consignment_items
         WHERE route_stop_id = ? AND product_id = ? AND settled_at IS NULL`,
        [stopId, product_id]
      ) as any[];
      if (!consignmentRow) {
        results.push({ error: 'No hay consignación sin liquidar para este producto en esta parada', line });
        continue;
      }
      if (quantitySold + quantityReturned > Number(consignmentRow.quantity_left)) {
        results.push({ error: `quantity_sold + quantity_returned (${quantitySold + quantityReturned}) supera quantity_left (${consignmentRow.quantity_left})`, line });
        continue;
      }

      if (quantitySold > 0) {
        const [[product]] = await pool.query(
          'SELECT barcode, name, price FROM products WHERE id = ?', [product_id]
        ) as any[];
        if (product) {
          const price = Number(product.price) || 0;
          soldLines.push({
            barcode: product.barcode ?? '', product_name: product.name,
            price, quantity: quantitySold, total: Math.round(price * quantitySold * 100) / 100,
            unit: consignmentRow.unit ?? null, case_qty: consignmentRow.case_qty ?? null,
          });
        }
      }
      if (quantityReturned > 0) {
        await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantityReturned, product_id]);
        await recordMovement({
          warehouseId, productId: product_id, lotId: null, movementType: 'RETURN',
          quantity: quantityReturned, routeId: Number(id), createdBy: req.user?.id ?? null,
        });
      }

      await pool.query(
        `UPDATE route_consignment_items
         SET quantity_sold = quantity_sold + ?, quantity_returned = quantity_returned + ?, settled_at = NOW(), settled_by = ?
         WHERE id = ?`,
        [quantitySold, quantityReturned, req.user?.id ?? null, consignmentRow.id]
      );

      results.push({ product_id, quantity_sold: quantitySold, quantity_returned: quantityReturned });
    }

    // Venta real de la parte vendida — mismo batch para todas las líneas de
    // este settle, mismo flujo AWAITING_APPROVAL que createBatch (Fase 113):
    // se registra local e imprime-able al instante, pero el push a QBO queda
    // para que un admin apruebe. No descuenta products.stock (ya se descontó
    // al registrar la consignación) — a propósito, distinto de createBatch.
    let batchId: string | null = null;
    let invoiceNumber: number | null = null;
    if (soldLines.length > 0) {
      batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      for (const item of soldLines) {
        await pool.query(
          `INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, unit, case_qty, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
          [item.barcode, item.product_name, item.price, item.quantity, item.total, batchId, req.user?.id ?? null, stop.customer_id, stop.customer_name, item.unit, item.case_qty]
        );
      }
      invoiceNumber = await reserveInvoiceNumber();
      await pool.query(
        "UPDATE orders SET status = 'AWAITING_APPROVAL', reserved_invoice_number = ? WHERE batch_id = ?",
        [invoiceNumber, batchId]
      );
    }

    res.status(201).json({ items: results, batchId, invoiceNumber });
  } catch (err) {
    logger.error('settleConsignment error:', err);
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

// Fase 112 — revisión de devoluciones. Referencia para el almacenista antes de
// contar físicamente lo que regresó: cargado (route_items) − vendido (orders
// de los stops BATCH de esta ruta, matcheado por barcode) − ya revisado
// (route_returns) = lo que debería volver. Es solo informativo, no bloquea
// createReturns si el conteo real no coincide (el almacén audita lo que
// regresa, no re-valida lo que se vendió).
export async function getExpectedReturns(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id } = req.params;
    const [[routeRow]] = await pool.query('SELECT id FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }

    // scanned_by/created_at ya se graban al cargar (addRouteItem) — como ahí
    // solo se puede cargar stock de lotes ACTIVE (nunca DAMAGED/EXPIRED, ver
    // computeFifoAllocation), esa fila YA es la confirmación de que salió en
    // buen estado. Se expone acá para que la revisión de devoluciones muestre
    // la línea de base ("salió el X, cargado por Y") junto a lo que se cuenta
    // ahora — sin agregar ningún paso ni columna nueva.
    const [loadedRows] = await pool.query(
      `SELECT ri.product_id, ri.barcode, p.name, p.sku, p.unit, ri.quantity AS loaded_qty,
              ri.created_at AS loaded_at, u.name AS loaded_by_name
       FROM route_items ri
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN users u ON u.id = ri.scanned_by
       WHERE ri.route_id = ?`, [id]
    ) as any[];

    // rs.batch_id alcanza solo (sin filtrar por stop_type) — además de las
    // paradas BATCH (batch_id seteado desde que se crea el stop en addStop),
    // ahora también matchea paradas CUSTOMER ya vendidas ("Vender por
    // scratch"), que createBatch vincula recién al momento de la venta (ver
    // orderController.ts). Las PRE_ORDER nunca tienen batch_id, siguen sin
    // aparecer acá — comportamiento sin cambios para ese caso.
    const [soldRows] = await pool.query(
      `SELECT o.barcode, SUM(o.quantity) AS sold_qty
       FROM orders o
       JOIN route_stops rs ON rs.batch_id = o.batch_id
       WHERE rs.route_id = ? AND o.status != 'CANCELLED'
       GROUP BY o.barcode`, [id]
    ) as any[];
    const soldByBarcode = new Map<string, number>();
    for (const r of soldRows as any[]) soldByBarcode.set(r.barcode, Number(r.sold_qty) || 0);

    // Fase 115.2 — antes se sumaba todo `route_returns` junto (una sola
    // cantidad "ya devuelto"); ahora se desglosa por condition_status para
    // que la reconciliación pueda mostrar cuánto volvió bueno vs.
    // dañado/vencido/dañado-en-tránsito, no solo el total.
    const [returnedRows] = await pool.query(
      `SELECT product_id, condition_status, SUM(quantity) AS returned_qty
       FROM route_returns WHERE route_id = ? GROUP BY product_id, condition_status`, [id]
    ) as any[];
    const returnedByProduct = new Map<number, { good: number; damaged: number; expired: number; transporterDamage: number }>();
    for (const r of returnedRows as any[]) {
      const bucket = returnedByProduct.get(r.product_id) ?? { good: 0, damaged: 0, expired: 0, transporterDamage: 0 };
      const qty = Number(r.returned_qty) || 0;
      if (r.condition_status === 'GOOD') bucket.good += qty;
      else if (r.condition_status === 'DAMAGED') bucket.damaged += qty;
      else if (r.condition_status === 'EXPIRED') bucket.expired += qty;
      else if (r.condition_status === 'TRANSPORTER_DAMAGE') bucket.transporterDamage += qty;
      returnedByProduct.set(r.product_id, bucket);
    }

    const data = (loadedRows as any[]).map((row) => {
      const sold = row.barcode ? (soldByBarcode.get(row.barcode) ?? 0) : 0;
      const returned = returnedByProduct.get(row.product_id) ?? { good: 0, damaged: 0, expired: 0, transporterDamage: 0 };
      const alreadyReturned = returned.good + returned.damaged + returned.expired + returned.transporterDamage;
      const expected = Math.max(Number(row.loaded_qty) - sold - alreadyReturned, 0);
      // discrepancy sin clamping (a diferencia de expected_return_qty): un
      // valor negativo significa que se contó/devolvió más de lo que esta
      // ruta cargó de este producto — dato mal ingresado o algo se
      // duplicó. Es solo informativo (ver createReturns/getExpectedReturns
      // más arriba) — nunca bloquea, el admin decide qué hacer con eso.
      const discrepancy = Number(row.loaded_qty) - sold - alreadyReturned;
      return {
        product_id: row.product_id, name: row.name, sku: row.sku, unit: row.unit,
        loaded_qty: Number(row.loaded_qty), sold_qty: sold,
        already_returned_qty: alreadyReturned, expected_return_qty: expected,
        returned_good_qty: returned.good, returned_damaged_qty: returned.damaged,
        returned_expired_qty: returned.expired, returned_transporter_damage_qty: returned.transporterDamage,
        discrepancy,
        loaded_at: row.loaded_at, loaded_by_name: row.loaded_by_name,
      };
    });

    res.json({ data });
  } catch (err) {
    logger.error('getExpectedReturns error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Registra lo que el almacén cuenta físicamente al volver la ruta, con su
// condición. GOOD reintegra al pool FIFO (route_item_lots de esta ruta, el
// lote cargado más reciente primero — no se sabe de qué caja física viene lo
// que regresa) y revierte el descuento de products.stock que hizo la carga.
// DAMAGED/EXPIRED/TRANSPORTER_DAMAGE NO revierten nada: el ROUTE_LOAD
// original ya restó esa cantidad de products.stock al cargarla al camión, y
// esa baja queda firme — sumar otro movimiento acá duplicaría el descuento.
// Esas 3 condiciones sí valorizan la pérdida en unit_price/amount (Fase 116).
export async function createReturns(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id } = req.params;
    const { items } = req.body;
    // items vacío es válido a propósito: es como el almacenista confirma
    // "ya revisé esta ruta y no hay nada que devolver" (ej. se vendió todo).
    // Antes esto se rechazaba, lo que hacía imposible marcar como revisada
    // una ruta 100% vendida — quedaba indistinguible de "todavía no se
    // revisó" (ver returns_reviewed_at más abajo).
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items debe ser un array (puede ir vacío si no hay nada que devolver)' });
      return;
    }

    const [[routeRow]] = await pool.query('SELECT status, warehouse_id, returns_reviewed_at FROM routes WHERE id = ?', [id]) as any[];
    if (!routeRow) {
      res.status(404).json({ error: 'Ruta no encontrada' });
      return;
    }
    if (routeRow.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Solo se pueden revisar devoluciones de una ruta COMPLETED' });
      return;
    }
    // Guarda contra doble revisión: reenviar el mismo formulario (doble tap,
    // reintento de red) volvería a sumar route_returns y a restituir stock de
    // los productos GOOD por segunda vez. returns_reviewed_at ya es la marca
    // que usa el resto del sistema para "esta ruta ya se revisó" — se usa acá
    // también como guarda dura, no solo informativa.
    if (routeRow.returns_reviewed_at) {
      res.status(400).json({ error: 'Esta ruta ya fue revisada — no se puede volver a registrar devoluciones' });
      return;
    }
    const warehouseId = routeRow.warehouse_id ?? await getDefaultWarehouseId();

    const results: any[] = [];
    // Un mismo producto puede volver parte bueno y parte dañado/vencido — el
    // almacén ahora manda hasta 3 líneas por producto (una por condición).
    // Solo GOOD restituye stock/lotes (ver más abajo); si dos líneas GOOD del
    // mismo producto llegaran en la misma request, cada una recalcularía la
    // restitución desde cero sobre los mismos route_item_lots y duplicaría el
    // stock devuelto — se guarda acá aunque la UI de Android nunca debería
    // mandar eso (a lo sumo una línea GOOD por producto).
    const seenGoodProductIds = new Set<number>();
    for (const line of items) {
      const { product_id, notes } = line;
      const quantity = Number(line.quantity);
      const conditionStatus = line.condition_status ?? 'GOOD';
      if (!product_id || !Number.isFinite(quantity) || quantity <= 0) {
        results.push({ error: 'product_id y quantity (>0) son requeridos', line });
        continue;
      }
      if (!['GOOD', 'DAMAGED', 'EXPIRED', 'TRANSPORTER_DAMAGE'].includes(conditionStatus)) {
        results.push({ error: "condition_status debe ser 'GOOD', 'DAMAGED', 'EXPIRED' o 'TRANSPORTER_DAMAGE'", line });
        continue;
      }
      // Como la salida del almacén ya garantiza buen estado (solo se carga
      // stock ACTIVE, ver getExpectedReturns), un producto que vuelve en
      // cualquier condición que no sea GOOD implica que pasó durante la
      // ruta — la nota es lo que documenta qué pasó, para auditoría o
      // reclamo al transportista. TRANSPORTER_DAMAGE (Fase 116) distingue
      // "se rompió en el camino" de DAMAGED genérico ("ya estaba mal"), pero
      // se trata igual que DAMAGED/EXPIRED en todo lo demás (no restituye
      // stock/lotes).
      if (conditionStatus !== 'GOOD' && !notes?.trim()) {
        results.push({ error: 'notes es requerido cuando condition_status no es GOOD', line });
        continue;
      }
      if (conditionStatus === 'GOOD') {
        if (seenGoodProductIds.has(product_id)) {
          results.push({ error: 'Ya se registró una línea GOOD para este producto en esta revisión', line });
          continue;
        }
        seenGoodProductIds.add(product_id);
      }

      // Valuación de pérdida (Fase 116) — solo para líneas que no son GOOD:
      // un producto que vuelve dañado/vencido/dañado-en-tránsito nunca se
      // vendió, así que no hay crédito de cliente detrás (no aplica
      // credit_transactions) — es pérdida de inventario valorizada, mismo
      // cálculo por unidad que computeDamageCredit()/unitValueOf() usa para
      // batch_damage, reusado acá vía el product_id (route_returns no tiene
      // barcode a mano). GOOD no pierde nada, se guarda NULL/NULL.
      let unitPrice: number | null = null;
      let amount: number | null = null;
      if (conditionStatus !== 'GOOD') {
        const { rows: valuation } = await computeDamageCredit([
          { product_id, product_name: '', qty: quantity },
        ]);
        unitPrice = valuation[0]?.unit_price ?? 0;
        amount = valuation[0]?.amount ?? 0;
      }

      await pool.query(
        `INSERT INTO route_returns (route_id, product_id, quantity, condition_status, notes, unit_price, amount, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, product_id, quantity, conditionStatus, notes ?? null, unitPrice, amount, req.user?.id ?? null]
      );

      if (conditionStatus === 'GOOD') {
        const [routeLots] = await pool.query(
          `SELECT ril.lot_id, ril.quantity
           FROM route_item_lots ril
           JOIN route_items ri ON ri.id = ril.route_item_id
           WHERE ri.route_id = ? AND ri.product_id = ?
           ORDER BY ril.id DESC`,
          [id, product_id]
        ) as any[];

        let remaining = quantity;
        for (const rl of routeLots as any[]) {
          if (remaining <= 0) break;
          const restoreQty = Math.min(Number(rl.quantity), remaining);
          if (restoreQty <= 0) continue;
          await restoreLotQuantity(rl.lot_id, restoreQty);
          await recordMovement({
            warehouseId, productId: product_id, lotId: rl.lot_id, movementType: 'RETURN',
            quantity: restoreQty, routeId: Number(id), createdBy: req.user?.id ?? null,
          });
          remaining -= restoreQty;
        }
        // Si se marca como devuelto más de lo que esta ruta registró haber
        // cargado de este producto (dato mal ingresado), el excedente igual
        // entra como movimiento suelto sin lote — no se pierde el registro.
        if (remaining > 0) {
          await recordMovement({
            warehouseId, productId: product_id, lotId: null, movementType: 'RETURN',
            quantity: remaining, routeId: Number(id), createdBy: req.user?.id ?? null,
          });
        }
        await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, product_id]);
      }
      // DAMAGED/EXPIRED/TRANSPORTER_DAMAGE: sin cambios en stock/ledger — ver comentario de la función.

      results.push({ product_id, quantity, condition_status: conditionStatus, unit_price: unitPrice, amount });
    }

    // Marca la ruta como revisada — sea que haya devuelto algo o no. Es lo
    // que la webapp usa para avisarle al admin "ruta COMPLETED sin revisar"
    // en vez de adivinar por si route_returns tiene filas.
    await pool.query(
      'UPDATE routes SET returns_reviewed_at = NOW(), returns_reviewed_by = ? WHERE id = ?',
      [req.user?.id ?? null, id]
    );

    res.status(201).json({ items: results });
  } catch (err) {
    logger.error('createReturns error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listReturns(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  await ensureTables();
  await ensureRouteLinkedWarehouseTables();
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT rr.*, p.name, p.sku
       FROM route_returns rr JOIN products p ON p.id = rr.product_id
       WHERE rr.route_id = ? ORDER BY rr.reviewed_at DESC`, [id]
    ) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listReturns error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
