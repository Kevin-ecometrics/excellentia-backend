import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { updateItemQtyOnHand } from '../services/qbItems.ts';
import { normalizeQbActive } from './productController.ts';

export type MovementType = 'RECEIPT' | 'ROUTE_LOAD' | 'RETURN' | 'DAMAGE' | 'ADJUSTMENT';

// Distingue "cero recibido para este producto" (available === 0 — la app
// ofrece ir a Recepción) de "hay, pero no alcanza" (available > 0 — solo hay
// que avisar cuánto hay) sin tener que parsear el string del mensaje.
export class InsufficientStockError extends Error {
  constructor(public available: number, public requested: number) {
    super(`Stock insuficiente en el almacén: disponible ${available}, solicitado ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

export interface FifoAllocation {
  lot_id: number;
  qty: number;
  expiration_date: string | null;
  received_at: string;
}

// Tablas nuevas de la Fase 112. `routes.warehouse_id` NO se agrega acá — a
// diferencia de estas tablas (genuinamente nuevas, CREATE TABLE IF NOT EXISTS
// es seguro), alterar una tabla existente en runtime no tiene precedente en el
// resto del código: esa columna se agrega vía la migración manual documentada
// en schema.sql/excellentia_schema.sql (mismo criterio que la Fase 111 con el
// ENUM de role, que el usuario corrió a mano contra MySQL).
//
// Dividida en dos porque route_item_lots/route_returns tienen FK real a
// route_items/routes: en una base completamente nueva esas tablas todavía no
// existen acá, así que routeController crea routes/route_stops/route_items
// (su propio ensureTables()) ENTRE ensureWarehouseTables() y
// ensureRouteLinkedWarehouseTables() — ver el orden de llamadas en
// routeController.ts.
export async function ensureWarehouseTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      is_active   TINYINT(1) NOT NULL DEFAULT 1,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_lots (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      receipt_batch_id VARCHAR(50) NOT NULL,
      warehouse_id     INT NOT NULL,
      product_id       INT NOT NULL,
      barcode          VARCHAR(50) DEFAULT NULL,
      expiration_date  DATE DEFAULT NULL,
      received_qty     DECIMAL(10,2) NOT NULL,
      remaining_qty    DECIMAL(10,2) NOT NULL,
      status           ENUM('ACTIVE','DEPLETED','DAMAGED','EXPIRED') DEFAULT 'ACTIVE',
      received_by      INT DEFAULT NULL,
      received_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      INDEX idx_lots_fifo (product_id, warehouse_id, status, expiration_date, received_at)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      warehouse_id   INT NOT NULL,
      product_id     INT NOT NULL,
      lot_id         INT DEFAULT NULL,
      movement_type  ENUM('RECEIPT','ROUTE_LOAD','RETURN','DAMAGE','ADJUSTMENT') NOT NULL,
      quantity       DECIMAL(10,2) NOT NULL,
      route_id       INT DEFAULT NULL,
      settlement_id  INT DEFAULT NULL,
      created_by     INT DEFAULT NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      INDEX idx_movements_pending (warehouse_id, settlement_id),
      INDEX idx_movements_product (product_id, created_at)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_settlements (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      warehouse_id     INT NOT NULL,
      settlement_date  DATE NOT NULL,
      status           ENUM('DRAFT','CONFIRMED') DEFAULT 'DRAFT',
      confirmed_by     INT DEFAULT NULL,
      confirmed_at     TIMESTAMP DEFAULT NULL,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      UNIQUE KEY uq_settlement_day (warehouse_id, settlement_date)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settlement_lines (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      settlement_id  INT NOT NULL,
      product_id     INT NOT NULL,
      net_quantity   DECIMAL(10,2) NOT NULL,
      stock_before   DECIMAL(10,2) NOT NULL,
      stock_after    DECIMAL(10,2) NOT NULL,
      qbo_synced     TINYINT(1) NOT NULL DEFAULT 0,
      qbo_error      TEXT DEFAULT NULL,
      UNIQUE KEY uq_settlement_product (settlement_id, product_id),
      FOREIGN KEY (settlement_id) REFERENCES daily_settlements(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM warehouses') as any[];
  if (Number(count) === 0) {
    await pool.query(`INSERT INTO warehouses (name, is_active) VALUES ('Almacén Principal', 1)`);
  }
}

// Requiere que routes/route_items ya existan — llamar después del
// ensureTables() de routeController.ts.
export async function ensureRouteLinkedWarehouseTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_item_lots (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      route_item_id      INT NOT NULL,
      lot_id             INT NOT NULL,
      quantity           DECIMAL(10,2) NOT NULL,
      used_suggested_lot TINYINT(1) NOT NULL DEFAULT 1,
      FOREIGN KEY (route_item_id) REFERENCES route_items(id) ON DELETE CASCADE,
      FOREIGN KEY (lot_id) REFERENCES product_lots(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_returns (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      route_id          INT NOT NULL,
      product_id        INT NOT NULL,
      quantity          DECIMAL(10,2) NOT NULL,
      condition_status  ENUM('GOOD','DAMAGED','EXPIRED') NOT NULL DEFAULT 'GOOD',
      notes             TEXT DEFAULT NULL,
      reviewed_by       INT NOT NULL,
      reviewed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
}

export async function getDefaultWarehouseId(): Promise<number> {
  await ensureWarehouseTables();
  const [[row]] = await pool.query('SELECT id FROM warehouses ORDER BY id LIMIT 1') as any[];
  return row.id;
}

// FIFO real: prioriza expiración más próxima y, entre lotes sin expiración
// registrada o con la misma fecha, el que entró primero (received_at). Los
// lotes sin expiration_date quedan al final del orden (no bloquean la salida
// de perecederos por delante) — ver "(expiration_date IS NULL)" en el ORDER BY.
export async function computeFifoAllocation(
  productId: number,
  warehouseId: number,
  quantity: number
): Promise<FifoAllocation[]> {
  const [lots] = await pool.query(
    `SELECT id, remaining_qty, expiration_date, received_at
     FROM product_lots
     WHERE product_id = ? AND warehouse_id = ? AND status = 'ACTIVE' AND remaining_qty > 0
     ORDER BY (expiration_date IS NULL), expiration_date ASC, received_at ASC`,
    [productId, warehouseId]
  ) as any[];

  const allocations: FifoAllocation[] = [];
  let remaining = quantity;
  for (const lot of lots as any[]) {
    if (remaining <= 0) break;
    const available = Number(lot.remaining_qty);
    const take = Math.min(available, remaining);
    if (take <= 0) continue;
    allocations.push({
      lot_id: lot.id,
      qty: take,
      expiration_date: lot.expiration_date,
      received_at: lot.received_at,
    });
    remaining -= take;
  }

  if (remaining > 0.0001) {
    const totalAvailable = quantity - remaining;
    throw new InsufficientStockError(totalAvailable, quantity);
  }
  return allocations;
}

export async function applyFifoAllocation(allocations: { lot_id: number; qty: number }[]): Promise<void> {
  for (const a of allocations) {
    await pool.query(
      `UPDATE product_lots
       SET remaining_qty = remaining_qty - ?,
           status = CASE WHEN remaining_qty - ? <= 0 THEN 'DEPLETED' ELSE status END
       WHERE id = ?`,
      [a.qty, a.qty, a.lot_id]
    );
  }
}

export async function restoreLotQuantity(lotId: number, qty: number): Promise<void> {
  await pool.query(
    `UPDATE product_lots
     SET remaining_qty = remaining_qty + ?,
         status = CASE WHEN status = 'DEPLETED' THEN 'ACTIVE' ELSE status END
     WHERE id = ?`,
    [qty, lotId]
  );
}

export async function recordMovement(params: {
  warehouseId: number;
  productId: number;
  lotId?: number | null;
  movementType: MovementType;
  quantity: number;
  routeId?: number | null;
  createdBy?: number | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO inventory_movements (warehouse_id, product_id, lot_id, movement_type, quantity, route_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.warehouseId,
      params.productId,
      params.lotId ?? null,
      params.movementType,
      params.quantity,
      params.routeId ?? null,
      params.createdBy ?? null,
    ]
  );
  await syncProductStockToQbo(params.productId);
}

// recordMovement() es el único punto de paso de todo cambio de stock del
// módulo Almacén (recepción, carga/descarga de ruta, devolución, daño,
// ajuste) — sincronizar QBO acá adentro cubre los 6 call sites sin tocar
// ninguno. Reemplaza la Liquidación diaria (antes agrupaba todo el día y
// pedía confirmación manual del admin): a este volumen de uso no hace falta
// batchear, así que se sincroniza al toque, mismo patrón "silencioso" que ya
// usa updateProduct (productController.ts) — si QBO falla, no revierte nada
// local, queda logueado como warning nomás. Si una sola acción genera varias
// filas de movimiento para el mismo producto (ej. una carga partida entre 2
// lotes), esto sincroniza QBO más de una vez seguida con el mismo valor
// final — redundante pero inofensivo (manda el stock actual, no un delta).
async function syncProductStockToQbo(productId: number): Promise<void> {
  try {
    const [[product]] = await pool.query('SELECT stock, qb_item_id FROM products WHERE id = ?', [productId]) as any[];
    if (!product?.qb_item_id) return;
    await updateItemQtyOnHand(product.qb_item_id, Number(product.stock) || 0);
  } catch (err) {
    logger.warn(`recordMovement: fallo al sincronizar stock a QBO (producto ${productId}):`, err);
  }
}

export async function listWarehouses(_req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_active, created_at FROM warehouses WHERE is_active = 1 ORDER BY id'
    ) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listWarehouses error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Recepción de productos: cada línea escaneada (barcode o product_id) +
// cantidad + fecha de expiración opcional crea un lote propio. No se agrupan
// líneas del mismo producto/expiración dentro de una misma recepción — cada
// escaneo es su propio lote, más simple y suficientemente granular para FIFO.
export async function createReceipt(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const { items } = req.body;
    let warehouseId = req.body.warehouse_id;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items debe ser un array no vacío' });
      return;
    }
    warehouseId = warehouseId ?? await getDefaultWarehouseId();

    const receiptBatchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const results: any[] = [];

    for (const line of items) {
      const { barcode, product_id, expiration_date } = line;
      const qty = Number(line.quantity);
      if (!barcode && !product_id) {
        results.push({ error: 'barcode o product_id es requerido', line });
        continue;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        results.push({ error: 'quantity debe ser un número mayor a 0', line });
        continue;
      }

      const [[product]] = product_id
        ? await pool.query('SELECT id, barcode, name FROM products WHERE id = ?', [product_id]) as any[]
        : await pool.query('SELECT id, barcode, name FROM products WHERE barcode = ?', [barcode]) as any[];
      if (!product) {
        results.push({ error: 'Producto no encontrado', line });
        continue;
      }

      const [insertResult] = await pool.query(
        `INSERT INTO product_lots (receipt_batch_id, warehouse_id, product_id, barcode, expiration_date, received_qty, remaining_qty, received_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [receiptBatchId, warehouseId, product.id, product.barcode ?? null, expiration_date ?? null, qty, qty, req.user?.id ?? null]
      ) as any;
      const lotId = insertResult.insertId;

      await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, product.id]);
      await recordMovement({
        warehouseId, productId: product.id, lotId, movementType: 'RECEIPT',
        quantity: qty, createdBy: req.user?.id ?? null,
      });

      results.push({
        lot_id: lotId, product_id: product.id, product_name: product.name,
        quantity: qty, expiration_date: expiration_date ?? null,
      });
    }

    res.status(201).json({ receipt_batch_id: receiptBatchId, items: results });
  } catch (err) {
    logger.error('createReceipt error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listLots(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const { warehouse_id, product_id, status } = req.query;
    let query = `
      SELECT pl.id, pl.receipt_batch_id, pl.warehouse_id, pl.product_id, pl.barcode,
             pl.expiration_date, pl.received_qty, pl.remaining_qty, pl.status, pl.received_at,
             p.name AS product_name, p.sku
      FROM product_lots pl JOIN products p ON p.id = pl.product_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (warehouse_id) { query += ' AND pl.warehouse_id = ?'; params.push(warehouse_id); }
    if (product_id)   { query += ' AND pl.product_id = ?';   params.push(product_id); }
    if (status)       { query += ' AND pl.status = ?';       params.push(status); }
    else              { query += " AND pl.status = 'ACTIVE'"; }
    query += ' ORDER BY (pl.expiration_date IS NULL), pl.expiration_date ASC, pl.received_at ASC';
    const [rows] = await pool.query(query, params) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listLots error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Productos con stock recibido disponible (>= 1 lote ACTIVE con remaining_qty
// > 0), agrupados y con la cantidad total sumada — para el picker "Cargar
// desde recepción" de WarehouseRouteDetailActivity (alternativa a escanear
// caja por caja cuando se acaba de recibir un lote grande). Devuelve el mismo
// shape que ProductDto (Android lo reusa tal cual para el flujo de
// addRouteItem) más `available_qty`.
export async function listAvailableProducts(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : await getDefaultWarehouseId();
    const [rows] = await pool.query(
      `SELECT p.id, p.barcode, p.sku, p.name, p.short_name, p.price, p.min_price,
              p.qb_item_id, p.qb_active, p.category, p.brand, p.stock,
              p.weight_per_unit, p.unit, p.qty,
              SUM(pl.remaining_qty) AS available_qty
       FROM product_lots pl
       JOIN products p ON p.id = pl.product_id
       WHERE pl.warehouse_id = ? AND pl.status = 'ACTIVE' AND pl.remaining_qty > 0
       GROUP BY p.id
       ORDER BY p.name`,
      [warehouseId]
    ) as any[];
    res.json({ data: (rows as any[]).map(normalizeQbActive) });
  } catch (err) {
    logger.error('listAvailableProducts error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Backfill de apertura: productos con stock real (products.stock) de antes de
// usar el módulo Almacén, sin ningún lote que lo respalde — computeFifoAllocation
// solo asigna desde product_lots ACTIVE, así que ese stock nunca se puede
// cargar a una ruta aunque products.stock diga que hay de sobra (aunque sí se
// puede vender: createBatch/createOrder/convertPreOrder restan products.stock
// directo, sin pedir lote). Esta corrida crea UN lote por producto con la
// diferencia (gap = stock − lotes ACTIVE ya existentes), para que ese stock
// quede utilizable por FIFO igual que cualquier otro.
//
// A propósito NO toca products.stock (ya está correcto, es lo que se está
// respaldando) ni llama a recordMovement — no fue un movimiento físico real,
// es registrar en el sistema algo que ya existía. Generar un movimiento
// RECEIPT acá lo dejaría pendiente de la próxima liquidación y empujaría
// QtyOnHand a QBO de nuevo sin necesidad, además de aparecer en el historial
// como si hoy hubiera entrado mercadería nueva.
//
// Mismo criterio dry-run/apply que migrateSkuNomenclature (productController.ts):
// sin ?apply=true solo informa qué haría, no escribe nada.
export async function backfillLots(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const apply = req.query.apply === 'true';
    const warehouseId = req.body.warehouse_id ?? await getDefaultWarehouseId();
    const expirationDate = req.body.expiration_date ?? null;
    const productIds: number[] | undefined = Array.isArray(req.body.product_ids) ? req.body.product_ids : undefined;

    let query = `
      SELECT p.id, p.name, p.sku, p.barcode, p.stock,
             COALESCE(SUM(pl.remaining_qty), 0) AS lot_qty
      FROM products p
      LEFT JOIN product_lots pl ON pl.product_id = p.id AND pl.warehouse_id = ? AND pl.status = 'ACTIVE'
      WHERE p.stock > 0
    `;
    const params: any[] = [warehouseId];
    if (productIds && productIds.length > 0) {
      query += ` AND p.id IN (${productIds.map(() => '?').join(',')})`;
      params.push(...productIds);
    }
    query += ' GROUP BY p.id, p.name, p.sku, p.barcode, p.stock HAVING p.stock > COALESCE(SUM(pl.remaining_qty), 0) ORDER BY p.name';

    const [rows] = await pool.query(query, params) as any[];

    const results: any[] = [];
    for (const row of rows as any[]) {
      const gap = Number(row.stock) - Number(row.lot_qty);
      if (apply) {
        const receiptBatchId = 'backfill-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const [insertResult] = await pool.query(
          `INSERT INTO product_lots (receipt_batch_id, warehouse_id, product_id, barcode, expiration_date, received_qty, remaining_qty, received_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [receiptBatchId, warehouseId, row.id, row.barcode ?? null, expirationDate, gap, gap, req.user?.id ?? null]
        ) as any;
        results.push({ product_id: row.id, name: row.name, sku: row.sku, gap, status: 'applied', lot_id: insertResult.insertId });
      } else {
        results.push({ product_id: row.id, name: row.name, sku: row.sku, gap, status: 'dry_run' });
      }
    }

    res.json({
      data: results,
      summary: { count: results.length, total_qty: results.reduce((s, r) => s + r.gap, 0), applied: apply },
    });
  } catch (err) {
    logger.error('backfillLots error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function suggestLots(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const productId = Number(req.query.product_id);
    const quantity = Number(req.query.quantity ?? 1);
    if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'product_id y quantity (>0) son requeridos' });
      return;
    }
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : await getDefaultWarehouseId();

    try {
      const allocations = await computeFifoAllocation(productId, warehouseId, quantity);
      res.json({ data: allocations });
    } catch (allocErr: any) {
      if (allocErr instanceof InsufficientStockError) {
        res.status(409).json({ error: allocErr.message, available: allocErr.available, requested: allocErr.requested });
      } else {
        res.status(409).json({ error: allocErr.message });
      }
    }
  } catch (err) {
    logger.error('suggestLots error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Marca un lote dañado/vencido encontrado en el almacén (fuera del flujo de
// una ruta) — le quita del pool FIFO lo que le quedaba disponible y lo da de
// baja del stock local, dejando registro en el sub-inventario.
export async function setLotCondition(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['DAMAGED', 'EXPIRED'].includes(status)) {
      res.status(400).json({ error: "status debe ser 'DAMAGED' o 'EXPIRED'" });
      return;
    }
    const [[lot]] = await pool.query(
      'SELECT id, warehouse_id, product_id, remaining_qty, status FROM product_lots WHERE id = ?', [id]
    ) as any[];
    if (!lot) {
      res.status(404).json({ error: 'Lote no encontrado' });
      return;
    }
    if (lot.status !== 'ACTIVE') {
      res.status(400).json({ error: `El lote ya está en estado '${lot.status}'` });
      return;
    }

    const qty = Number(lot.remaining_qty);
    await pool.query('UPDATE product_lots SET status = ?, remaining_qty = 0 WHERE id = ?', [status, id]);
    if (qty > 0) {
      await pool.query('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?', [qty, lot.product_id]);
      await recordMovement({
        warehouseId: lot.warehouse_id, productId: lot.product_id, lotId: lot.id,
        movementType: 'DAMAGE', quantity: -qty, createdBy: req.user?.id ?? null,
      });
    }
    res.json({ message: 'Condición del lote actualizada', quantity_written_off: qty });
  } catch (err) {
    logger.error('setLotCondition error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Corrige un lote ya recibido (cantidad y/o fecha de expiración) — pensado
// para arreglar un error de tipeo en la recepción, no para reescribir
// historia: solo se puede editar mientras el lote sigue ACTIVE (si ya se
// dio de baja por daño/vencimiento, o quedó en 0 porque una ruta se llevó
// todo, no se toca más). Si se achica la cantidad, no se puede bajar de lo
// que ya se asignó a una ruta (received_qty - remaining_qty). El delta se
// aplica a products.stock al instante y queda registrado como un movimiento
// ADJUSTMENT (pendiente de liquidar, como cualquier otro) — no se edita ni
// reclasifica el movimiento RECEIPT original, que queda como registro
// histórico de auditoría.
export async function updateLot(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const { id } = req.params;
    const { quantity, expiration_date } = req.body;

    const [[lot]] = await pool.query(
      'SELECT id, warehouse_id, product_id, received_qty, remaining_qty, status FROM product_lots WHERE id = ?', [id]
    ) as any[];
    if (!lot) {
      res.status(404).json({ error: 'Lote no encontrado' });
      return;
    }
    if (lot.status !== 'ACTIVE') {
      res.status(400).json({ error: `No se puede editar: el lote ya está en estado '${lot.status}'` });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let deltaQty = 0;

    if (quantity !== undefined) {
      const newQty = Number(quantity);
      if (!Number.isFinite(newQty) || newQty < 0) {
        res.status(400).json({ error: 'quantity debe ser un número mayor o igual a 0' });
        return;
      }
      const consumed = Number(lot.received_qty) - Number(lot.remaining_qty);
      if (newQty < consumed) {
        res.status(409).json({ error: `No se puede bajar de ${consumed} — ya se asignó esa cantidad a una ruta` });
        return;
      }
      deltaQty = newQty - Number(lot.received_qty);
      updates.push('received_qty = ?', 'remaining_qty = ?');
      params.push(newQty, Number(lot.remaining_qty) + deltaQty);
    }
    if (expiration_date !== undefined) {
      updates.push('expiration_date = ?');
      params.push(expiration_date ?? null);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: 'Nada para actualizar — mandá quantity y/o expiration_date' });
      return;
    }

    params.push(id);
    await pool.query(`UPDATE product_lots SET ${updates.join(', ')} WHERE id = ?`, params);

    if (deltaQty !== 0) {
      // GREATEST(...,0): mismo piso que ya usa cualquier otro camino que resta
      // stock (venta normal, carga de ruta, setLotCondition) — sin esto, bajar
      // la cantidad de un lote por más de lo que products.stock realmente
      // tenía sincronizado podía dejarlo en negativo.
      await pool.query('UPDATE products SET stock = GREATEST(stock + ?, 0) WHERE id = ?', [deltaQty, lot.product_id]);
      await recordMovement({
        warehouseId: lot.warehouse_id, productId: lot.product_id, lotId: lot.id,
        movementType: 'ADJUSTMENT', quantity: deltaQty, createdBy: req.user?.id ?? null,
      });
    }

    res.json({ message: 'Lote actualizado' });
  } catch (err) {
    logger.error('updateLot error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listMovements(req: Request, res: Response): Promise<void> {
  await ensureWarehouseTables();
  try {
    const { warehouse_id, product_id, settled, date } = req.query;
    // LEFT JOIN product_lots: para las líneas RECEIPT trae la expiración y el
    // estado del lote, así la pantalla de sub-inventario puede ofrecer
    // "Editar" sin pedirle al cliente una consulta aparte por cada fila.
    let query = `
      SELECT im.id, im.warehouse_id, im.product_id, im.lot_id, im.movement_type, im.quantity,
             im.route_id, im.settlement_id, im.created_by, im.created_at,
             p.name AS product_name, p.sku,
             pl.expiration_date AS lot_expiration_date, pl.status AS lot_status,
             pl.received_qty AS lot_received_qty
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      LEFT JOIN product_lots pl ON pl.id = im.lot_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (warehouse_id) { query += ' AND im.warehouse_id = ?'; params.push(warehouse_id); }
    if (product_id)   { query += ' AND im.product_id = ?';   params.push(product_id); }
    if (date)         { query += ' AND DATE(im.created_at) = ?'; params.push(date); }
    if (settled === 'true')  query += ' AND im.settlement_id IS NOT NULL';
    if (settled === 'false') query += ' AND im.settlement_id IS NULL';
    query += ' ORDER BY im.created_at DESC LIMIT 500';
    const [rows] = await pool.query(query, params) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listMovements error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

