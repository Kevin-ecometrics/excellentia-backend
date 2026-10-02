import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { computeDamageCredit, lineTotal, isLbsUnit } from '../services/creditCalculator.ts';
import { getCustomerBalance, applyCustomerCredit } from '../services/creditController.ts';
import { reserveInvoiceNumber } from '../services/invoiceCounter.ts';
import { ensureWarehouseTables } from './warehouseController.ts';
import { expandBoxItems } from '../services/preOrderQuantities.ts';
import { loadPreOrderSummary } from '../services/preOrderSummary.ts';

async function ensureTables() {
  await pool.query("CREATE TABLE IF NOT EXISTS pre_orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, assigned_user_id INT DEFAULT NULL, customer_id VARCHAR(100) NOT NULL, customer_name VARCHAR(255) NOT NULL, salesperson_name VARCHAR(255) DEFAULT NULL, scheduled_date DATE, notes TEXT, status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  // price/quantity/total quedan NULL mientras la pre-orden está sin detallar (solo
  // barcode+product_name al crearla) — se llenan recién al convertir, cuando el
  // vendedor detalla peso/case/precio de cada producto (ver convertPreOrder). unit y
  // case_qty tampoco existían antes: se agregan para persistir el detalle finalizado.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pre_order_items (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      pre_order_id INT NOT NULL,
      barcode      VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      price        DECIMAL(10,6) DEFAULT NULL,
      quantity     DECIMAL(10,2) DEFAULT NULL,
      total        DECIMAL(10,2) DEFAULT NULL,
      unit         VARCHAR(20) DEFAULT NULL,
      case_qty     INT DEFAULT NULL,
      FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE
    )
  `);
  // lot_id (backlog cliente #2, 2026-09-28) — caja puntual (product_lots.id)
  // elegida al armar la pre-orden, para productos de peso variable. Solo
  // informativa, NO reserva: sin FK a propósito (un lote borrado por
  // deleteBackfillLot no debe bloquear nada) y `getPreOrder` la resuelve
  // contra product_lots al leer, avisando si ya no está disponible.
  await pool.query('ALTER TABLE pre_order_items ADD COLUMN IF NOT EXISTS lot_id INT DEFAULT NULL');
}

// Inserta una línea de pre_order_items — el mismo INSERT vivía copiado en
// createPreOrder/updatePreOrder/convertPreOrder; ahora que hay una columna
// más (lot_id) se centraliza acá para que las 3 rutas no se desalineen.
async function insertPreOrderItem(
  preOrderId: string | string[] | number | undefined,
  item: { barcode: string; product_name: string; unit?: string | null; case_qty?: number | null; lot_id?: number | null },
  price: number | null,
  quantity: number | null,
  total: number | null,
): Promise<void> {
  await pool.query(
    'INSERT INTO pre_order_items (pre_order_id, barcode, product_name, price, quantity, total, unit, case_qty, lot_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [preOrderId, item.barcode, item.product_name, price, quantity, total, item.unit ?? null, item.case_qty ?? null, item.lot_id ?? null]
  );
}

// Solo admin y quien creó/está asignado a la pre-orden pueden verla o actuar sobre
// ella — el resto de operadores no debe ni listarla ni acceder por ID directo.
function canAccessPreOrder(preOrder: any, user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return preOrder.user_id === user.id || preOrder.assigned_user_id === user.id;
}

export async function createPreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { customer_id, customer_name, salesperson_name, scheduled_date, notes, items, assigned_user_id } = req.body;
    if (!customer_id || !customer_name || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'customer_id, customer_name e items son requeridos' });
      return;
    }

    // assigned_user_id viaja junto con salesperson_name — el picker de "Vendedor" en
    // el app manda el id real del usuario elegido, no solo su nombre. Ese id es el
    // que restringe la visibilidad de la pre-orden (junto con el creador y los
    // admins, ver canAccessPreOrder) al resto del equipo que no fue seleccionado.
    const assignedUserId = assigned_user_id != null ? Number(assigned_user_id) : null;

    // Fase 146 — un ítem Lbs puede venir con `box_count: N` (cajas pedidas) y
    // se guarda como N filas; ver services/preOrderQuantities.ts.
    const expanded = expandBoxItems(items);
    if ('error' in expanded) {
      res.status(400).json({ error: expanded.error });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO pre_orders (user_id, assigned_user_id, customer_id, customer_name, salesperson_name, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user?.id ?? null, assignedUserId, customer_id, customer_name, salesperson_name ?? null, scheduled_date ?? null, notes ?? null]
    ) as any;
    const preOrderId = result.insertId;

    // Backlog cliente #5 (2026-09-21/23) — aviso de stock bajo/agotado al
    // crear una pre-orden. Decisión de alcance (confirmada con el usuario):
    // solo AVISAR, nunca bloquear — una pre-orden es una intención de venta
    // futura (se entrega y detalla recién al convertir, días después), así
    // que no tiene sentido impedir crearla por el stock de HOY. Mismo
    // umbral de "stock bajo" que ya usa la webapp (ProductRow.tsx, <= 5).
    const stockWarnings: { barcode: string; product_name: string; stock: number }[] = [];
    const warnedBarcodes = new Set<string>();
    for (const item of expanded.items as any[]) {
      const { barcode, product_name, price, quantity, unit, case_qty } = item;
      const hasPricing = price != null && quantity != null;
      const total = hasPricing ? (item.total ?? lineTotal(price, quantity, unit, case_qty)) : null;
      // quantity se guarda aunque todavía no haya precio: es la cantidad de
      // cajas/baldes que Warehouse ve en la ruta (Fase 146).
      await insertPreOrderItem(preOrderId, item, hasPricing ? price : null, quantity ?? null, total);

      if (warnedBarcodes.has(barcode)) continue; // N cajas Lbs = N filas, un solo aviso
      warnedBarcodes.add(barcode);
      const [[product]] = await pool.query('SELECT stock FROM products WHERE barcode = ?', [barcode]) as any[];
      if (product && Number(product.stock) <= 5) {
        stockWarnings.push({ barcode, product_name, stock: Number(product.stock) });
      }
    }

    res.status(201).json({ id: preOrderId, status: 'DRAFT', stock_warnings: stockWarnings });
  } catch (err) {
    logger.error('createPreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listPreOrders(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { status, customer_id, page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 30;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT p.id, p.user_id, p.assigned_user_id, p.customer_id, p.customer_name,
             p.salesperson_name, p.scheduled_date,
             p.notes, p.status, p.created_at, p.updated_at,
             COUNT(pi.id) AS item_count,
             COALESCE(SUM(pi.total), 0) AS total
      FROM pre_orders p
      LEFT JOIN pre_order_items pi ON pi.pre_order_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Un operador solo ve pre-órdenes que creó él mismo o que un admin le asignó
    // explícitamente (assigned_user_id) — cualquier otra pre-órden, aunque exista,
    // queda fuera del listado. Admin ve todo, sin filtro.
    if (req.user?.role !== 'admin') {
      query += ' AND (p.user_id = ? OR p.assigned_user_id = ?)';
      params.push(req.user?.id ?? -1, req.user?.id ?? -1);
    }
    if (status)      { query += ' AND p.status = ?';       params.push(status); }
    if (customer_id) { query += ' AND p.customer_id = ?';  params.push(customer_id); }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await pool.query(query, params) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listPreOrders error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getPreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM pre_orders WHERE id = ?', [id]) as any[];
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Pre-orden no encontrada' });
      return;
    }
    const preOrder = (rows as any[])[0];
    if (!canAccessPreOrder(preOrder, req.user)) {
      res.status(403).json({ error: 'No tienes permiso para ver esta pre-orden' });
      return;
    }
    await ensureWarehouseTables(); // product_lots para el LEFT JOIN de abajo
    // lot_* (backlog #2): datos vivos de la caja elegida. `lot_available` es
    // false si la caja ya se consumió/dio de baja/borró desde que se armó la
    // pre-orden — la elección es informativa, el cliente decide qué hacer.
    const [items] = await pool.query(
      `SELECT pi.*,
              pl.received_qty AS lot_weight, pl.remaining_qty AS lot_remaining_qty,
              pl.lot_number AS lot_number, pl.expiration_date AS lot_expiration_date,
              (pl.id IS NOT NULL AND pl.status = 'ACTIVE' AND pl.remaining_qty > 0) AS lot_available
       FROM pre_order_items pi
       LEFT JOIN product_lots pl ON pl.id = pi.lot_id
       WHERE pi.pre_order_id = ? ORDER BY pi.id`,
      [id]
    ) as any[];
    for (const it of items as any[]) {
      // lot_available sale de una expresión booleana de SQL: mysql2 la devuelve
      // como número (0/1), también en ítems sin lote (LEFT JOIN sin match → 0).
      // Gson en Android espera Boolean y revienta con "Expected a boolean but
      // was NUMBER" — se normaliza siempre, no solo cuando hay lot_id.
      it.lot_available = !!it.lot_available;
      if (it.lot_id != null) {
        it.lot_weight = it.lot_weight != null ? Number(it.lot_weight) : null;
        it.lot_remaining_qty = it.lot_remaining_qty != null ? Number(it.lot_remaining_qty) : null;
        it.lot_on_route = false;
      }
    }
    // lot_on_route (backlog #2, paso 3, 2026-09-28) — la caja elegida ya no
    // está "disponible" (remaining_qty = 0) pero eso puede ser justamente
    // porque Warehouse la cargó a una ruta (route_item_lots). Sin esto el
    // detalle mostraba el aviso rojo de "caja no disponible" para una caja que
    // sí va en el camión. Rutas CANCELLED no cuentan (la carga se revierte).
    // Query aparte con try/catch: route_items/routes se crean de forma
    // perezosa en routeController y no deben poder romper getPreOrder.
    const lotIds = (items as any[]).filter(it => it.lot_id != null).map(it => it.lot_id);
    if (lotIds.length > 0) {
      try {
        const [onRoute] = await pool.query(
          `SELECT DISTINCT ril.lot_id, r.id AS route_id
           FROM route_item_lots ril
           JOIN route_items ri ON ri.id = ril.route_item_id
           JOIN routes r ON r.id = ri.route_id
           WHERE ril.lot_id IN (?) AND r.status != 'CANCELLED'`,
          [lotIds]
        ) as any[];
        const routeByLot = new Map<number, number>();
        for (const row of onRoute as any[]) routeByLot.set(row.lot_id, row.route_id);
        for (const it of items as any[]) {
          if (it.lot_id != null && routeByLot.has(it.lot_id)) {
            it.lot_on_route = true;
            it.lot_route_id = routeByLot.get(it.lot_id);
          }
        }
      } catch (routeErr) {
        logger.warn('getPreOrder: no se pudo calcular lot_on_route:', routeErr);
      }
    }
    // Fase 146 — resumen por producto (cajas pedidas) para Warehouse/detalle.
    const summary = await loadPreOrderSummary(id as string);
    res.json({ data: { ...preOrder, items, summary } });
  } catch (err) {
    logger.error('getPreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updatePreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { scheduled_date, notes, items, status, salesperson_name, assigned_user_id } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM pre_orders WHERE id = ?', [id]) as any[];
    if ((existingRows as any[]).length === 0) {
      res.status(404).json({ error: 'Pre-orden no encontrada' });
      return;
    }
    if (!canAccessPreOrder((existingRows as any[])[0], req.user)) {
      res.status(403).json({ error: 'No tienes permiso para modificar esta pre-orden' });
      return;
    }

    // Antes este endpoint pasaba `status` directo al UPDATE sin validar nada
    // (cualquier string, incluso inválido, dependía del ENUM de MySQL para
    // fallar) — ahora que la app realmente lo usa (botón "Confirmar
    // pre-orden"), se valida el valor y se limita a la única transición que
    // corresponde hacer por acá. CONVERTED pasa por convertPreOrder (precios/
    // QBO) y CANCELLED por deletePreOrder — no por este endpoint genérico.
    if (status !== undefined) {
      const validStatuses = ['DRAFT', 'CONFIRMED', 'CONVERTED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `status inválido: '${status}'` });
        return;
      }
      const currentStatus = (existingRows as any[])[0].status;
      const isConfirming = currentStatus === 'DRAFT' && status === 'CONFIRMED';
      if (!isConfirming && status !== currentStatus) {
        res.status(400).json({ error: `No se puede pasar de '${currentStatus}' a '${status}' por acá` });
        return;
      }
    }

    const updates: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];
    if (scheduled_date    !== undefined) { updates.push('scheduled_date = ?');    updateParams.push(scheduled_date); }
    if (notes             !== undefined) { updates.push('notes = ?');             updateParams.push(notes); }
    if (salesperson_name  !== undefined) { updates.push('salesperson_name = ?');  updateParams.push(salesperson_name); }
    if (status      !== undefined)   { updates.push('status = ?');          updateParams.push(status); }
    if (assigned_user_id !== undefined) {
      updates.push('assigned_user_id = ?');
      updateParams.push(assigned_user_id === null ? null : Number(assigned_user_id));
    }
    updateParams.push(id);

    await pool.query(`UPDATE pre_orders SET ${updates.join(', ')} WHERE id = ?`, updateParams);

    if (Array.isArray(items)) {
      const expanded = expandBoxItems(items);
      if ('error' in expanded) {
        res.status(400).json({ error: expanded.error });
        return;
      }
      await pool.query('DELETE FROM pre_order_items WHERE pre_order_id = ?', [id]);
      for (const item of expanded.items as any[]) {
        const { price, quantity, unit, case_qty } = item;
        const hasPricing = price != null && quantity != null;
        const total = hasPricing ? (item.total ?? lineTotal(price, quantity, unit, case_qty)) : null;
        await insertPreOrderItem(id, item, hasPricing ? price : null, quantity ?? null, total);
      }
    }

    res.json({ message: 'Pre-orden actualizada' });
  } catch (err) {
    logger.error('updatePreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deletePreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const [existingRows] = await pool.query('SELECT * FROM pre_orders WHERE id = ?', [id]) as any[];
    if ((existingRows as any[]).length === 0) {
      res.status(404).json({ error: 'Pre-orden no encontrada' });
      return;
    }
    if (!canAccessPreOrder((existingRows as any[])[0], req.user)) {
      res.status(403).json({ error: 'No tienes permiso para cancelar esta pre-orden' });
      return;
    }
    await pool.query("UPDATE pre_orders SET status = 'CANCELLED' WHERE id = ?", [id]);
    res.json({ message: 'Pre-orden cancelada' });
  } catch (err) {
    logger.error('deletePreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function convertPreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { signature, payment_method, damage_items, check_number, apply_credit, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de items con el detalle final (precio, cantidad, unidad)' });
      return;
    }

    const [rows] = await pool.query('SELECT * FROM pre_orders WHERE id = ?', [id]) as any[];
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Pre-orden no encontrada' });
      return;
    }
    const preOrder = (rows as any[])[0];
    if (!canAccessPreOrder(preOrder, req.user)) {
      res.status(403).json({ error: 'No tienes permiso para convertir esta pre-orden' });
      return;
    }
    if (preOrder.status === 'CONVERTED') {
      res.status(400).json({ error: 'La pre-orden ya fue convertida' });
      return;
    }
    if (preOrder.status === 'CANCELLED') {
      res.status(400).json({ error: 'No se puede convertir una pre-orden cancelada' });
      return;
    }

    // Validación de precio mínimo (paridad con createBatch, orderController.ts) — se
    // hace en un pase previo, ANTES de insertar nada, porque convertPreOrder toca más
    // tablas (orders, batch_signatures, batch_damage, credit_transactions) que
    // createBatch y una escritura parcial sería más cara de deshacer. Antes de esta
    // feature nunca había precio en una pre-orden hasta convertir, así que este check
    // nunca corría acá — ahora sí, igual que en el flujo normal de carrito.
    for (const item of items as any[]) {
      const { barcode, price } = item;
      const [productRows] = await pool.query(
        'SELECT min_price, weight_per_unit FROM products WHERE barcode = ?', [barcode]
      ) as any[];
      const product = productRows[0];
      if (product?.min_price != null && price != null) {
        const weightPerUnit = parseFloat(product.weight_per_unit) || 1.0;
        const totalPerUnit = Math.round(price * weightPerUnit * 100) / 100;
        if (Math.round(totalPerUnit * 100) < Math.round(product.min_price * 100)) {
          res.status(400).json({
            error: `El precio $${Number(totalPerUnit).toFixed(2)} está por debajo del mínimo permitido $${Number(product.min_price).toFixed(2)} para ${barcode}`,
          });
          return;
        }
      }
    }

    const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const inserted: { id: number; barcode: string; product_name: string; price: number; quantity: number; total: number }[] = [];

    // Fix (2026-09-07) — convertPreOrder nunca descontaba products.stock,
    // gap documentado desde la Fase 87 (a diferencia de createBatch, que
    // resta 1 unidad por línea vendida). Mismo patrón route-aware que
    // createBatch: si esta pre-orden es la parada de una ruta cuyo contenido
    // ya se cargó al camión (route_items), no se vuelve a descontar acá —
    // a diferencia de createBatch, acá el route_id no lo manda el cliente
    // (no hace falta tocar Android) sino que se resuelve server-side vía
    // route_stops.pre_order_id.
    let routeLoadedBarcodes: Set<string> = new Set();
    const [stopRowsForStock] = await pool.query(
      'SELECT route_id FROM route_stops WHERE pre_order_id = ? LIMIT 1', [id]
    ) as any[];
    if (stopRowsForStock[0]?.route_id) {
      const [routeItemRows] = await pool.query(
        'SELECT barcode FROM route_items WHERE route_id = ? AND barcode IS NOT NULL',
        [stopRowsForStock[0].route_id]
      ) as any[];
      routeLoadedBarcodes = new Set((routeItemRows as any[]).map((r: any) => r.barcode));
    }

    for (const item of items as any[]) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      // Fase 122 — fallback case-aware (lineTotal): `price` es por unidad y
      // `quantity` en cajas, así que sin `× case_qty` salía 24x más bajo.
      const finalTotal = total ?? (price != null && quantity != null ? lineTotal(price, quantity, unit, case_qty) : 0);
      // product_id (2026-09-07) — ver comentario en orderController.ts (createOrder/createBatch).
      const [productRowsForId] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]) as any[];
      const productId = productRowsForId[0]?.id ?? null;
      const decremented = !routeLoadedBarcodes.has(barcode);
      const [result] = await pool.query(
        "INSERT INTO orders (barcode, product_id, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, unit, case_qty, payment_method, check_number, credit_applied, status, stock_decremented) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)",
        [barcode, productId, product_name, price ?? 0, quantity ?? 0, finalTotal,
         batchId, req.user?.id ?? null, preOrder.customer_id, preOrder.customer_name, unit ?? null, case_qty ?? null, payment_method ?? null, check_number ?? null, null, decremented ? 1 : 0]
      ) as any;
      if (decremented) {
        // Fix (2026-09-28) — antes restaba -1 fijo también para Lbs. Para un
        // producto de peso variable el stock va en libras (mismo criterio que
        // createBatch/editBatch): se resta el peso real. Además cancelBatch/
        // editBatch revierten `quantity` para Lbs (stock_decremented=1), así
        // que con -1 acá la reversa inflaba el stock en (peso - 1).
        const stockDelta = isLbsUnit(unit) ? Number(quantity) || 0 : 1;
        await pool.query('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE barcode = ?', [stockDelta, barcode]);
      }
      inserted.push({ id: result.insertId, barcode, product_name, price: price ?? 0, quantity: quantity ?? 0, total: finalTotal });
    }

    // Persistir el detalle finalizado de vuelta en pre_order_items — así
    // GET /api/preorders/:id (y por lo tanto "Reusar pre-orden" y la pantalla de
    // detalle post-conversión en el app) reflejan lo que realmente se entregó, no el
    // borrador vacío original (sin precio) que había al crear la pre-orden.
    await pool.query('DELETE FROM pre_order_items WHERE pre_order_id = ?', [id]);
    for (const item of items as any[]) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      // Fase 122 — mismo fallback case-aware que el INSERT de orders de arriba.
      const finalTotal = total ?? (price != null && quantity != null ? lineTotal(price, quantity, unit, case_qty) : null);
      await insertPreOrderItem(id, item, price ?? null, quantity ?? null, finalTotal);
    }

    // Guardar firma una sola vez por batch
    if (signature) {
      try {
        await pool.query(
          'INSERT IGNORE INTO batch_signatures (batch_id, signature) VALUES (?, ?)',
          [batchId, signature]
        );
      } catch (sigErr: any) {
        logger.warn(`[signature] No se pudo guardar firma para batch ${batchId}: ${sigErr.message}`);
      }
    }

    let creditsTotal = 0;
    let damageComputed: { qb_item_id: string | null; product_name: string; qty: number; unit_price: number; amount: number; unit: string | null }[] = [];
    if (Array.isArray(damage_items)) {
      const toInsert = (damage_items as any[]).filter(d => Number(d.qty) > 0);
      if (toInsert.length > 0) {
        const { rows: computed, creditsTotal: total } = await computeDamageCredit(
          toInsert.map(d => ({ barcode: String(d.barcode), product_name: String(d.product_name), qty: Number(d.qty) }))
        );
        damageComputed = computed;
        creditsTotal = total;
        for (const dmg of computed) {
          await pool.query(
            'INSERT INTO batch_damage (batch_id, barcode, product_name, qty, unit, unit_price, amount, qb_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [batchId, dmg.barcode, dmg.product_name, dmg.qty, dmg.unit, dmg.unit_price, dmg.amount, dmg.qb_item_id]
          );
        }
        if (creditsTotal > 0) {
          await pool.query(
            'INSERT INTO credit_transactions (customer_id, customer_name, type, amount, reference_batch_id, invoice_id) VALUES (?, ?, \'EARNED\', ?, ?, NULL)',
            [preOrder.customer_id ?? null, preOrder.customer_name ?? null, creditsTotal, batchId]
          );
        }
      }
    }

    await pool.query("UPDATE pre_orders SET status = 'CONVERTED' WHERE id = ?", [id]);

    // Crédito de cliente aplicado — igual criterio que createBatch: se
    // aplica de inmediato (invoiceId=NULL por ahora), approveBatch
    // (orderController.ts) backfillea invoice_id cuando la factura real de
    // QBO exista.
    let creditApplied = 0;
    if (apply_credit && apply_credit > 0 && preOrder.customer_id) {
      try {
        const { balance } = await getCustomerBalance(preOrder.customer_id);
        creditApplied = Math.round(Math.min(Number(apply_credit), balance) * 100) / 100;
        if (creditApplied > 0) {
          await applyCustomerCredit(preOrder.customer_id, preOrder.customer_name ?? null, creditApplied, batchId, null);
          await pool.query(
            "UPDATE orders SET credit_applied = ? WHERE batch_id = ?",
            [creditApplied, batchId]
          );
        }
      } catch (creditErr: any) {
        logger.warn(`[credit] Error al aplicar crédito en convertPreOrder batch ${batchId}: ${creditErr.message}`);
        creditApplied = 0;
      }
    }

    // El envío real a QBO se difiere hasta que un admin apruebe
    // (POST /api/orders/batch/:batchId/approve, approveBatch en
    // orderController.ts) — acá solo se reserva el número de factura, para
    // que el ticket salga con un número real.
    const invoiceNumber = await reserveInvoiceNumber();
    await pool.query(
      "UPDATE orders SET status = 'AWAITING_APPROVAL', reserved_invoice_number = ? WHERE batch_id = ?",
      [invoiceNumber, batchId]
    );

    res.status(201).json({ batchId, invoiceId: null, invoiceNumber, preOrderId: id, creditsTotal, creditApplied });
  } catch (err) {
    logger.error('convertPreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
