import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { createBatchInvoice } from '../services/qbInvoices.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { getCustomerBalance, applyCustomerCredit } from '../services/creditController.ts';

async function ensureTables() {
  await pool.query("CREATE TABLE IF NOT EXISTS pre_orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, customer_id VARCHAR(100) NOT NULL, customer_name VARCHAR(255) NOT NULL, salesperson_name VARCHAR(255) DEFAULT NULL, scheduled_date DATE, notes TEXT, status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
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

export async function createPreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { customer_id, customer_name, salesperson_name, scheduled_date, notes, items } = req.body;
    if (!customer_id || !customer_name || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'customer_id, customer_name e items son requeridos' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO pre_orders (user_id, customer_id, customer_name, salesperson_name, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user?.id ?? null, customer_id, customer_name, salesperson_name ?? null, scheduled_date ?? null, notes ?? null]
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
      SELECT p.id, p.user_id, p.customer_id, p.customer_name, p.salesperson_name, p.scheduled_date,
             p.notes, p.status, p.created_at, p.updated_at,
             COUNT(pi.id) AS item_count,
             COALESCE(SUM(pi.total), 0) AS total
      FROM pre_orders p
      LEFT JOIN pre_order_items pi ON pi.pre_order_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user?.role === 'operator') { query += ' AND p.user_id = ?'; params.push(req.user.id); }
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
    const [items] = await pool.query(
      'SELECT * FROM pre_order_items WHERE pre_order_id = ? ORDER BY id',
      [id]
    ) as any[];
    res.json({ data: { ...(rows as any[])[0], items } });
  } catch (err) {
    logger.error('getPreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updatePreOrder(req: Request, res: Response): Promise<void> {
  await ensureTables();
  try {
    const { id } = req.params;
    const { scheduled_date, notes, items, status, salesperson_name } = req.body;

    const updates: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];
    if (scheduled_date    !== undefined) { updates.push('scheduled_date = ?');    updateParams.push(scheduled_date); }
    if (notes             !== undefined) { updates.push('notes = ?');             updateParams.push(notes); }
    if (salesperson_name  !== undefined) { updates.push('salesperson_name = ?');  updateParams.push(salesperson_name); }
    if (status      !== undefined)   { updates.push('status = ?');          updateParams.push(status); }
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
    const [result] = await pool.query(
      "UPDATE pre_orders SET status = 'CANCELLED' WHERE id = ?", [id]
    ) as any;
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pre-orden no encontrada' });
      return;
    }
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
    const inserted: { id: number; barcode: string; qb_item_id: string | null; product_name: string; price: number; quantity: number; total: number }[] = [];

    for (const item of items as any[]) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      const [productRows] = await pool.query(
        'SELECT qb_item_id FROM products WHERE barcode = ?', [barcode]
      ) as any[];
      const qbItemId = productRows[0]?.qb_item_id ?? null;
      const finalTotal = total ?? (price != null && quantity != null ? price * quantity : 0);
      const [result] = await pool.query(
        "INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, unit, case_qty, payment_method, check_number, credit_applied, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
        [barcode, product_name, price ?? 0, quantity ?? 0, finalTotal,
         batchId, req.user?.id ?? null, preOrder.customer_id, preOrder.customer_name, unit ?? null, case_qty ?? null, payment_method ?? null, check_number ?? null, null]
      ) as any;
      inserted.push({ id: result.insertId, barcode, qb_item_id: qbItemId, product_name, price: price ?? 0, quantity: quantity ?? 0, total: finalTotal });
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

    // Calcular crédito disponible antes de la factura (necesitamos el monto para QBO)
    let creditApplied = 0;
    if (apply_credit && apply_credit > 0 && preOrder.customer_id) {
      try {
        const { balance } = await getCustomerBalance(preOrder.customer_id);
        creditApplied = Math.round(Math.min(Number(apply_credit), balance) * 100) / 100;
      } catch (creditErr: any) {
        logger.warn(`[credit] Error al consultar saldo en convertPreOrder batch ${batchId}: ${creditErr.message}`);
      }
    }

    let invoiceId: string | null = null;
    let invoiceNumber: number | null = null;
    try {
      const validItems = inserted.filter(i => i.qb_item_id) as { id: number; qb_item_id: string; product_name: string; price: number; quantity: number; total: number }[];
      if (validItems.length > 0) {
        const [[{ invoice_counter }]] = await pool.query(
          'SELECT invoice_counter FROM company_settings WHERE id = 1'
        ) as any[];

        const invoice = await createBatchInvoice(validItems, preOrder.customer_id, damage_items ?? [], payment_method ?? null, check_number ?? null, req.user?.qb_class_id ?? null, invoice_counter, creditsTotal, damageComputed, creditApplied > 0 ? creditApplied : undefined);
        invoiceId = invoice.Invoice?.DocNumber ?? null;
        if (invoiceId) {
          invoiceNumber = invoice_counter;
          await pool.query('UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1');
        }
        await pool.query("UPDATE orders SET status = 'SENT', qb_invoice_id = ? WHERE batch_id = ?", [invoiceId, batchId]);

        // Aplicar crédito DESPUÉS de la factura (necesitamos el invoiceId)
        if (creditApplied > 0 && preOrder.customer_id && invoiceId) {
          try {
            await applyCustomerCredit(preOrder.customer_id, preOrder.customer_name ?? null, creditApplied, batchId, invoiceId);
            await pool.query(
              "UPDATE orders SET credit_applied = ? WHERE batch_id = ?",
              [creditApplied, batchId]
            );
          } catch (creditErr: any) {
            logger.warn(`[credit] Error al persistir crédito en convertPreOrder batch ${batchId}: ${creditErr.message}`);
          }
        }

        // Vincular invoice_id a las transacciones EARNED de este batch
        if (invoiceId && creditsTotal > 0) {
          await pool.query(
            "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'EARNED' AND invoice_id IS NULL",
            [invoiceId, batchId]
          );
        }
      }
    } catch (syncErr) {
      logger.warn(`convertPreOrder batch ${batchId}: sync a QBO falló, queda PENDING`, syncErr);
    }

    res.status(201).json({ batchId, invoiceId, invoiceNumber, preOrderId: id, creditsTotal, creditApplied });
  } catch (err) {
    logger.error('convertPreOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
