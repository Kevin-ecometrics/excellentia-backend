import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { createInvoice, createBatchInvoice } from '../services/qbInvoices.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { getCustomerBalance, applyCustomerCredit } from '../services/creditController.ts';
import logger from '../services/logger.ts';
import { logActivity } from '../services/activityLog.ts';

// intuit-oauth solo expone en `.message` el texto genérico de QBO
// ("A business validation error has occurred..."). El motivo real queda en
// `.description` (o `.fault.errors[0].detail`), que es lo que de verdad sirve
// para diagnosticar (factura duplicada, item inactivo, cliente inválido, etc).
function extractQboErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as any;
    const detail = e.fault?.errors?.[0]?.detail || e.description;
    const base = e.message || 'Error desconocido';
    return detail && detail !== base ? `${base} — ${detail}` : base;
  }
  return 'Error desconocido';
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const { barcode, product_name, price, quantity, total, device_id } = req.body;
    if (!barcode || !product_name || price === undefined || quantity === undefined || quantity <= 0) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const finalTotal = total !== undefined ? total : price * quantity;

    const [result] = await pool.query(
      "INSERT INTO orders (barcode, product_name, price, quantity, total, device_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [barcode, product_name, price, quantity, finalTotal, device_id ?? null, req.user?.id ?? null]
    ) as any;

    const orderId = result.insertId;
    let status = 'PENDING';

    // Try immediate sync to QBO
    try {
      const [productRows] = await pool.query(
        'SELECT qb_item_id FROM products WHERE barcode = ?',
        [barcode]
      ) as any[];
      const qbItemId = productRows[0]?.qb_item_id;

      if (qbItemId) {
        const [[{ invoice_counter }]] = await pool.query(
          'SELECT invoice_counter FROM company_settings WHERE id = 1'
        ) as any[];

        const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]) as any[];
        const invoice = await createInvoice(orderRows[0], qbItemId, req.user?.qb_class_id ?? null, invoice_counter);
        const invoiceId = invoice.Invoice?.DocNumber;

        await pool.query(
          "UPDATE orders SET status = 'SENT', qb_invoice_id = ? WHERE id = ?",
          [invoiceId ?? null, orderId]
        );

        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
          [orderId, invoiceId ?? null]
        );

        if (invoiceId) {
          await pool.query(
            'UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1'
          );
        }

        status = 'SENT';
        logger.info(`Pedido ${orderId} sincronizado a QBO al instante (#${invoice_counter})`);
      } else {
        logger.warn(`Producto ${barcode} sin qb_item_id, pedido ${orderId} queda PENDING`);
      }
    } catch (syncErr) {
      logger.warn(`Sync inmediato falló para pedido ${orderId} (queda PENDING):`, syncErr);
    }

    res.status(201).json({ id: orderId, barcode, status });
  } catch (err) {
    logger.error('createOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  try {
    const { status, barcode, device_id, customer_id, date_from, date_to, page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT o.id, o.barcode, o.product_name, o.price, o.quantity, o.total, o.status, o.batch_id, o.qb_invoice_id, o.device_id, o.user_id, o.customer_id, o.customer_name, o.unit, o.case_qty, o.payment_method, o.check_number, o.credit_applied, o.created_at, u.email AS user_email, u.name AS user_name, (SELECT COALESCE(SUM(bd.amount), 0) FROM batch_damage bd WHERE bd.batch_id = o.batch_id AND bd.qty > 0) AS damage_credits FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1';
    const params: any[] = [];

    if (req.user?.role === 'operator') { query += ' AND o.user_id = ?'; params.push(req.user.id); }
    if (status)    { query += ' AND o.status = ?';     params.push(status); }
    if (barcode)   { query += ' AND o.barcode = ?';    params.push(barcode); }
    if (device_id)   { query += ' AND o.device_id = ?';   params.push(device_id); }
    if (customer_id) { query += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (date_from)   { query += ' AND o.created_at >= ?'; params.push(date_from); }
    if (date_to)   { query += ' AND o.created_at <= ?'; params.push(date_to); }

    let countQuery = query.replace(/^SELECT .* FROM orders/, 'SELECT COUNT(*) as total FROM orders');
    const [countResult] = await pool.query(countQuery, params) as any[];

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await pool.query(query, params) as any[];

    res.json({
      data: rows,
      meta: { page: pageNum, limit: limitNum, total: countResult[0].total },
    });
  } catch (err) {
    logger.error('listOrders error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    logger.error('getOrder error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'SENT', 'FAILED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Status inválido. Valores: ${validStatuses.join(', ')}` });
      return;
    }

    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]) as any[];
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    res.json({ message: `Pedido ${id} actualizado a ${status}` });
  } catch (err) {
    logger.error('updateOrderStatus error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createBatch(req: Request, res: Response): Promise<void> {
  try {
    const { items, customer_id, customer_name, signature, damage_items, payment_method, check_number, apply_credit } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de items' });
      return;
    }

    const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const inserted: { id: number; barcode: string; product_name: string; price: number; quantity: number; total: number; qb_item_id: string | null }[] = [];

    for (const item of items) {
      const { barcode, product_name, price, quantity, total, unit, case_qty } = item;
      const [productRows] = await pool.query('SELECT qb_item_id, min_price, weight_per_unit FROM products WHERE barcode = ?', [barcode]) as any[];
      const product = productRows[0];
      const qbItemId = product?.qb_item_id ?? null;

      if (product?.min_price != null) {
        const weightPerUnit = parseFloat(product.weight_per_unit) || 1.0;
        const totalPerUnit = Math.round(price * weightPerUnit * 100) / 100;
        if (Math.round(totalPerUnit * 100) < Math.round(product.min_price * 100)) {
          res.status(400).json({
            error: `El precio $${Number(totalPerUnit).toFixed(2)} está por debajo del mínimo permitido $${Number(product.min_price).toFixed(2)}`,
          });
          return;
        }
      }

      const [result] = await pool.query(
        "INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, unit, case_qty, payment_method, check_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
        [barcode, product_name, price, quantity, total ?? price * quantity, batchId, req.user?.id ?? null, customer_id ?? null, customer_name ?? null, unit ?? null, case_qty ?? null, payment_method ?? null, check_number ?? null]
      ) as any;
      inserted.push({ id: result.insertId, barcode, product_name, price, quantity, total: total ?? price * quantity, qb_item_id: qbItemId });
    }

    // Descontar stock: 1 unidad por línea de ítem vendido
    for (const item of inserted) {
      await pool.query(
        'UPDATE products SET stock = GREATEST(stock - 1, 0) WHERE barcode = ?',
        [item.barcode]
      );
    }

    // Guardar firma una sola vez por batch
    if (signature) {
      try {
        await pool.query(
          'CREATE TABLE IF NOT EXISTS batch_signatures (batch_id VARCHAR(100) PRIMARY KEY, signature MEDIUMTEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        );
        await pool.query(
          'INSERT INTO batch_signatures (batch_id, signature) VALUES (?, ?)',
          [batchId, signature]
        );
      } catch (sigErr: any) {
        logger.warn(`[signature] No se pudo guardar firma para batch ${batchId}: ${sigErr.message}`);
      }
    }

    // Guardar damage items en batch_damage — calcula el crédito en dólares
    // (fresco desde products, nunca desde un precio mandado por el cliente),
    // lo persiste por línea, y deja un registro agregado en customer_credits.
    logger.info(`[damage] batch=${batchId} damage_items recibidos: ${JSON.stringify(damage_items)}`);
    let creditsTotal = 0;
    let damageComputed: { qb_item_id: string | null; product_name: string; qty: number; unit_price: number; amount: number; unit: string | null }[] = [];
    if (Array.isArray(damage_items) && damage_items.length > 0) {
      const toInsert = (damage_items as any[]).filter(d => Number(d.qty) > 0);
      logger.info(`[damage] a insertar: ${toInsert.length} items con qty>0`);
      try {
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
            [customer_id ?? null, customer_name ?? null, creditsTotal, batchId]
          );
        }
        logger.info(`[damage] ${computed.length} damage item(s) guardados en batch_damage, credit total $${creditsTotal.toFixed(2)}`);
      } catch (dmgErr: any) {
        logger.warn(`[damage] ERROR al guardar: ${dmgErr.message}`);
      }
    } else {
      logger.info(`[damage] sin damage_items — batch_damage no modificado`);
    }

    // Try immediate sync to QBO as batch
    try {
      const validItems = inserted.filter(i => i.qb_item_id) as { id: number; qb_item_id: string; product_name: string; price: number; quantity: number; total: number }[];

      // Calcular crédito disponible antes de la factura (necesitamos el monto para QBO)
      let creditApplied = 0;
      if (apply_credit && apply_credit > 0 && customer_id) {
        try {
          const { balance } = await getCustomerBalance(customer_id);
          creditApplied = Math.round(Math.min(Number(apply_credit), balance) * 100) / 100;
        } catch (creditErr: any) {
          logger.warn(`[credit] Error al consultar saldo para batch ${batchId}: ${creditErr.message}`);
        }
      }

      if (validItems.length > 0) {
        // Leer y reservar número de factura
        const [[{ invoice_counter }]] = await pool.query(
          'SELECT invoice_counter FROM company_settings WHERE id = 1'
        ) as any[];
        const docNumber = invoice_counter;

        const invoice = await createBatchInvoice(
          validItems, customer_id ?? null, damage_items ?? [],
          payment_method ?? null, check_number ?? null, req.user?.qb_class_id ?? null, docNumber, creditsTotal, damageComputed, creditApplied > 0 ? creditApplied : undefined
        );
        const invoiceId = invoice.Invoice?.DocNumber;

        await pool.query(
          "UPDATE orders SET status = 'SENT', qb_invoice_id = ? WHERE batch_id = ?",
          [invoiceId ?? null, batchId]
        );

        for (const item of validItems) {
          await pool.query(
            "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
            [item.id, invoiceId ?? null]
          );
        }

        // Incrementar contador SOLO si QBO respondió con Id
        if (invoiceId) {
          await pool.query(
            'UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1'
          );
        }

        // Aplicar crédito disponible DESPUÉS de la factura (necesitamos el invoiceId)
        if (creditApplied > 0 && customer_id && invoiceId) {
          try {
            await applyCustomerCredit(customer_id, customer_name ?? null, creditApplied, batchId, invoiceId);
            await pool.query(
              "UPDATE orders SET credit_applied = ? WHERE batch_id = ?",
              [creditApplied, batchId]
            );
          } catch (creditErr: any) {
            logger.warn(`[credit] Error al persistir crédito para batch ${batchId}: ${creditErr.message}`);
          }
        }

        // Vincular invoice_id a las transacciones EARNED de este batch
        if (invoiceId && creditsTotal > 0) {
          await pool.query(
            "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'EARNED' AND invoice_id IS NULL",
            [invoiceId, batchId]
          );
        }

        logger.info(`Batch ${batchId} enviado a QBO, invoice ${invoiceId} (#${docNumber})`);
      } else {
        logger.warn(`Batch ${batchId}: ningún item tiene qb_item_id, quedan PENDING`);
      }

      logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_CREATED', entityType: 'batch', entityId: batchId, details: `${inserted.length} items, customer: ${customer_name ?? 'N/A'}`, ip: req.ip });

      // Leer el invoiceId real que quedó guardado en la DB
      const [[firstOrder]] = await pool.query(
        'SELECT qb_invoice_id FROM orders WHERE batch_id = ? AND qb_invoice_id IS NOT NULL LIMIT 1',
        [batchId]
      ) as any[];

      // Leer el invoice_counter actual (ya incrementado si QBO ok)
      const [[{ invoice_counter: currentCounter }]] = await pool.query(
        'SELECT invoice_counter FROM company_settings WHERE id = 1'
      ) as any[];

      res.status(201).json({
        batchId,
        invoiceId: firstOrder?.qb_invoice_id ?? null,
        invoiceNumber: firstOrder?.qb_invoice_id ? currentCounter - 1 : null,
        orders: inserted.map(i => ({ id: i.id, barcode: i.barcode, status: i.qb_item_id ? 'SENT' : 'PENDING' })),
        creditsTotal,
        creditApplied,
      });
    } catch (syncErr) {
      logger.warn(`Batch ${batchId}: sync falló, items quedan PENDING para SyncEngine:`, syncErr);
      res.status(201).json({ batchId, invoiceId: null, invoiceNumber: null, orders: inserted.map(i => ({ id: i.id, barcode: i.barcode, status: 'PENDING' })), creditsTotal, creditApplied });
    }
  } catch (err) {
    logger.error('createBatch error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// PUT /api/orders/batch/:batchId/payment — adjunta el método de pago a un
// batch que ya se mandó a QBO sin conocerlo todavía (Fase 82 — Android
// manda el batch antes del ticket #1, para tener el número de factura real
// ahí, y recién después pregunta el método de pago). Solo actualiza MySQL —
// no toca el CustomerMemo de la factura ya creada en QuickBooks (decisión
// explícita: el ticket impreso es suficiente, evita una llamada extra a QBO
// después de la creación).
export async function updateBatchPayment(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const { payment_method, check_number } = req.body;
    const [result] = await pool.query(
      'UPDATE orders SET payment_method = ?, check_number = ? WHERE batch_id = ?',
      [payment_method ?? null, check_number ?? null, batchId]
    ) as any[];
    res.json({ updated: result.affectedRows });
  } catch (err) {
    logger.error('updateBatchPayment error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  try {
    const { status, date_from, date_to } = req.query;
    const isOperator = req.user?.role === 'operator';

    let query = `SELECT o.*, u.email AS user_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (isOperator)  { query += ' AND o.user_id = ?';      params.push(req.user!.id); }
    if (status)      { query += ' AND o.status = ?';       params.push(status); }
    if (date_from)   { query += ' AND o.created_at >= ?';  params.push(date_from); }
    if (date_to)     { query += ' AND o.created_at <= ?';  params.push(date_to); }
    query += ' ORDER BY o.created_at DESC LIMIT 5000';

    const [rows] = await pool.query(query, params) as any[];

    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Batch','Producto','Barcode','Cliente','Precio/lb','Cantidad (lb)','Total','Estado','Pago','Check #','Fecha','Operador'];
    const lines  = (rows as any[]).map(r => [
      escape(r.batch_id ?? r.id),
      escape(r.product_name),
      escape(r.barcode),
      escape(r.customer_name ?? ''),
      escape(Number(r.price).toFixed(2)),
      escape(Number(r.quantity).toFixed(2)),
      escape(Number(r.total).toFixed(2)),
      escape(r.status),
      escape(r.payment_method ?? ''),
      escape(r.check_number ?? ''),
      escape(new Date(r.created_at).toLocaleString('es-MX')),
      escape(r.user_email ?? ''),
    ].join(','));

    const csv = [header.join(','), ...lines].join('\r\n');
    const filename = `pedidos_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM para Excel
  } catch (err) {
    logger.error('exportCsv error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getBatchDamage(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;
    const [damageRows] = await pool.query(
      'SELECT barcode, product_name, qty, unit, unit_price, amount FROM batch_damage WHERE batch_id = ? AND qty > 0 ORDER BY id',
      [batchId]
    ) as any[];
    const [sigRows] = await pool.query(
      'SELECT signature FROM batch_signatures WHERE batch_id = ?',
      [batchId]
    ) as any[];
    res.json({ data: damageRows, signature: sigRows[0]?.signature ?? null });
  } catch (err) {
    res.json({ data: [], signature: null });
  }
}

// Reintento manual desde la app: reenvía a QBO los items de un batch que
// quedaron PENDING/FAILED. Disponible para el operador dueño del batch (no
// solo admin), a diferencia de forceSync que solo re-encola para el
// SyncEngine automático.
export async function retryBatchSync(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;

    const [orderRows] = await pool.query(
      `SELECT o.*, p.qb_item_id, p.qb_active FROM orders o
       LEFT JOIN products p ON o.barcode = p.barcode
       WHERE o.batch_id = ?`,
      [batchId]
    ) as any[];

    if (orderRows.length === 0) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    if (req.user?.role === 'operator' && orderRows.some((o: any) => o.user_id !== req.user!.id)) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const toRetry = orderRows.filter((o: any) => o.status !== 'SENT');
    if (toRetry.length === 0) {
      res.json({ batchId, status: 'SENT', invoiceId: orderRows[0].qb_invoice_id ?? null });
      return;
    }

    const missingQbItem = toRetry.filter((o: any) => !o.qb_item_id);
    if (missingQbItem.length > 0) {
      await pool.query(
        "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id IN (?)",
        ['Producto sin qb_item_id en QBO', missingQbItem.map((o: any) => o.id)]
      );
    }

    // qb_active = 0 es un estado que ya conocemos con certeza (viene del último
    // sync); qb_active NULL significa "todavía no lo sabemos" (producto nunca
    // re-sincronizado desde que se agregó esta columna) y no bloquea el envío.
    const inactiveInQbo = toRetry.filter((o: any) => o.qb_item_id && o.qb_active === 0);
    if (inactiveInQbo.length > 0) {
      await pool.query(
        "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id IN (?)",
        ['Item inactivo en QuickBooks — hay que reactivarlo en QBO antes de reintentar', inactiveInQbo.map((o: any) => o.id)]
      );
    }

    const validItems = toRetry.filter((o: any) => o.qb_item_id && o.qb_active !== 0);
    if (validItems.length === 0) {
      if (inactiveInQbo.length > 0) {
        res.status(400).json({ error: 'El producto está inactivo en QuickBooks. Reactivalo en QBO (Products and Services) y volvé a intentar.' });
      } else {
        res.status(400).json({ error: 'Ningún producto de este pedido está vinculado a QuickBooks (falta qb_item_id). Contactá al administrador.' });
      }
      return;
    }

    const [[{ invoice_counter }]] = await pool.query(
      'SELECT invoice_counter FROM company_settings WHERE id = 1'
    ) as any[];

    const [damageRows] = await pool.query(
      'SELECT barcode, product_name, qty, unit, unit_price, amount, qb_item_id FROM batch_damage WHERE batch_id = ? AND qty > 0',
      [batchId]
    ) as any[];
    // Reusa el monto ya calculado y persistido al crear el batch — no se
    // recalcula, para que el crédito no derive si el precio del catálogo
    // cambió después de la venta original.
    const creditAmount = (damageRows as any[]).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const items = validItems.map((o: any) => ({
      qb_item_id: o.qb_item_id,
      product_name: o.product_name,
      price: o.price,
      quantity: o.quantity,
      total: o.total,
    }));

    try {
      const creditAppliedRetry = Number(validItems[0].credit_applied) || 0;
      const invoice = await createBatchInvoice(
        items, validItems[0].customer_id ?? null, damageRows, validItems[0].payment_method ?? null, validItems[0].check_number ?? null, req.user?.qb_class_id ?? null, invoice_counter, creditAmount, damageRows as any[], creditAppliedRetry > 0 ? creditAppliedRetry : undefined
      );
      const invoiceId = invoice.Invoice?.DocNumber;

      await pool.query(
        "UPDATE orders SET status = 'SENT', qb_invoice_id = ?, error_log = NULL WHERE batch_id = ?",
        [invoiceId ?? null, batchId]
      );

      if (invoiceId) {
        await pool.query('UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1');
      }

      for (const o of validItems) {
        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
          [o.id, invoiceId ?? null]
        );
      }

      logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_RETRY_SUCCESS', entityType: 'batch', entityId: String(batchId), details: `${validItems.length} items reenviados a QBO`, ip: req.ip });

      res.json({
        batchId,
        status: 'SENT',
        invoiceId: invoiceId ?? null,
        invoiceNumber: invoiceId ? invoice_counter : null,
      });
    } catch (syncErr) {
      const message = extractQboErrorMessage(syncErr);

      await pool.query(
        "UPDATE orders SET status = 'PENDING', error_log = ?, retry_count = 0 WHERE id IN (?)",
        [message, validItems.map((o: any) => o.id)]
      );

      for (const o of validItems) {
        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, error) VALUES ('order', ?, 'create_invoice', 'FAILED', ?)",
          [o.id, message]
        );
      }

      logger.warn(`retryBatchSync: batch ${batchId} falló:`, syncErr);
      res.status(502).json({ error: message });
    }
  } catch (err) {
    logger.error('retryBatchSync error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function forceSync(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    await pool.query("UPDATE orders SET status = 'PENDING', retry_count = 0 WHERE id = ?", [id]);
    res.json({ message: `Sync forzado para pedido ${id}` });
  } catch (err) {
    logger.error('forceSync error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
