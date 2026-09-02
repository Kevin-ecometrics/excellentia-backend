import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { getCustomerBalance, applyCustomerCredit } from '../services/creditController.ts';
import { reserveInvoiceNumber } from '../services/invoiceCounter.ts';

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

    const [result] = await pool.query(
      'INSERT INTO pre_orders (user_id, assigned_user_id, customer_id, customer_name, salesperson_name, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user?.id ?? null, assignedUserId, customer_id, customer_name, salesperson_name ?? null, scheduled_date ?? null, notes ?? null]
    ) as any;
    const preOrderId = result.insertId;

    for (const item of items) {
      const { barcode, product_name, price, quantity, unit, case_qty } = item;
      const hasPricing = price != null && quantity != null;
      const total = hasPricing ? (item.total ?? price * quantity) : null;
      await pool.query(
        'INSERT INTO pre_order_items (pre_order_id, barcode, product_name, price, quantity, total, unit, case_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [preOrderId, barcode, product_name, hasPricing ? price : null, hasPricing ? quantity : null, total, unit ?? null, case_qty ?? null]
      );
    }

    res.status(201).json({ id: preOrderId, status: 'DRAFT' });
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
    const [items] = await pool.query(
      'SELECT * FROM pre_order_items WHERE pre_order_id = ? ORDER BY id',
      [id]
    ) as any[];
    res.json({ data: { ...preOrder, items } });
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
      await pool.query('DELETE FROM pre_order_items WHERE pre_order_id = ?', [id]);
      for (const item of items) {
        const { barcode, product_name, price, quantity, unit, case_qty } = item;
        const hasPricing = price != null && quantity != null;
        const total = hasPricing ? (item.total ?? price * quantity) : null;
        await pool.query(
          'INSERT INTO pre_order_items (pre_order_id, barcode, product_name, price, quantity, total, unit, case_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, barcode, product_name, hasPricing ? price : null, hasPricing ? quantity : null, total, unit ?? null, case_qty ?? null]
        );
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

    for (const item of items as any[]) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      const finalTotal = total ?? (price != null && quantity != null ? price * quantity : 0);
      const [result] = await pool.query(
        "INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, unit, case_qty, payment_method, check_number, credit_applied, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
        [barcode, product_name, price ?? 0, quantity ?? 0, finalTotal,
         batchId, req.user?.id ?? null, preOrder.customer_id, preOrder.customer_name, unit ?? null, case_qty ?? null, payment_method ?? null, check_number ?? null, null]
      ) as any;
      inserted.push({ id: result.insertId, barcode, product_name, price: price ?? 0, quantity: quantity ?? 0, total: finalTotal });
    }

    // Persistir el detalle finalizado de vuelta en pre_order_items — así
    // GET /api/preorders/:id (y por lo tanto "Reusar pre-orden" y la pantalla de
    // detalle post-conversión en el app) reflejan lo que realmente se entregó, no el
    // borrador vacío original (sin precio) que había al crear la pre-orden.
    await pool.query('DELETE FROM pre_order_items WHERE pre_order_id = ?', [id]);
    for (const item of items as any[]) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      const finalTotal = total ?? (price != null && quantity != null ? price * quantity : null);
      await pool.query(
        'INSERT INTO pre_order_items (pre_order_id, barcode, product_name, price, quantity, total, unit, case_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, barcode, product_name, price ?? null, quantity ?? null, finalTotal, unit ?? null, case_qty ?? null]
      );
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
