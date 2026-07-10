import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { createInvoice, createBatchInvoice } from '../services/qbInvoices.ts';
import logger from '../services/logger.ts';
import { logActivity } from '../services/activityLog.ts';

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
        const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]) as any[];
        const invoice = await createInvoice(orderRows[0], qbItemId, req.user?.qb_class_id ?? null);
        const invoiceId = invoice.Invoice?.Id;

        await pool.query(
          "UPDATE orders SET status = 'SENT', qb_invoice_id = ? WHERE id = ?",
          [invoiceId ?? null, orderId]
        );

        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
          [orderId, invoiceId ?? null]
        );

        status = 'SENT';
        logger.info(`Pedido ${orderId} sincronizado a QBO al instante`);
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

    let query = 'SELECT o.id, o.barcode, o.product_name, o.price, o.quantity, o.total, o.status, o.batch_id, o.qb_invoice_id, o.device_id, o.user_id, o.customer_id, o.customer_name, o.created_at, u.email AS user_email, u.name AS user_name FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1';
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
    const { items, customer_id, customer_name, signature, damage_items, payment_method } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de items' });
      return;
    }

    const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const inserted: { id: number; barcode: string; product_name: string; price: number; quantity: number; total: number; qb_item_id: string | null }[] = [];

    for (const item of items) {
      const { barcode, product_name, price, quantity, total } = item;
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
        "INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, user_id, customer_id, customer_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
        [barcode, product_name, price, quantity, total ?? price * quantity, batchId, req.user?.id ?? null, customer_id ?? null, customer_name ?? null]
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

    // Guardar damage items en batch_damage
    logger.info(`[damage] batch=${batchId} damage_items recibidos: ${JSON.stringify(damage_items)}`);
    if (Array.isArray(damage_items) && damage_items.length > 0) {
      const toInsert = (damage_items as any[]).filter(d => Number(d.qty) > 0);
      logger.info(`[damage] a insertar: ${toInsert.length} items con qty>0`);
      try {
        for (const dmg of toInsert) {
          await pool.query(
            'INSERT INTO batch_damage (batch_id, barcode, product_name, qty) VALUES (?, ?, ?, ?)',
            [batchId, String(dmg.barcode), String(dmg.product_name), Number(dmg.qty)]
          );
        }
        logger.info(`[damage] ${toInsert.length} damage item(s) guardados en batch_damage`);
      } catch (dmgErr: any) {
        logger.warn(`[damage] ERROR al guardar: ${dmgErr.message}`);
      }
    } else {
      logger.info(`[damage] sin damage_items — batch_damage no modificado`);
    }

    // Try immediate sync to QBO as batch
    try {
      const validItems = inserted.filter(i => i.qb_item_id) as { id: number; qb_item_id: string; product_name: string; price: number; quantity: number; total: number }[];

      if (validItems.length > 0) {
        const invoice = await createBatchInvoice(validItems, customer_id ?? null, damage_items ?? [], payment_method ?? null, req.user?.qb_class_id ?? null);
        const invoiceId = invoice.Invoice?.Id;

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

        logger.info(`Batch ${batchId} enviado a QBO, invoice ${invoiceId}`);
      } else {
        logger.warn(`Batch ${batchId}: ningún item tiene qb_item_id, quedan PENDING`);
      }

      logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_CREATED', entityType: 'batch', entityId: batchId, details: `${inserted.length} items, customer: ${customer_name ?? 'N/A'}`, ip: req.ip });

      // Leer el invoiceId real que quedó guardado en la DB
      const [[firstOrder]] = await pool.query(
        'SELECT qb_invoice_id FROM orders WHERE batch_id = ? AND qb_invoice_id IS NOT NULL LIMIT 1',
        [batchId]
      ) as any[];

      res.status(201).json({
        batchId,
        invoiceId: firstOrder?.qb_invoice_id ?? null,
        orders: inserted.map(i => ({ id: i.id, barcode: i.barcode, status: i.qb_item_id ? 'SENT' : 'PENDING' })),
      });
    } catch (syncErr) {
      logger.warn(`Batch ${batchId}: sync falló, items quedan PENDING para SyncEngine:`, syncErr);
      res.status(201).json({ batchId, invoiceId: null, orders: inserted.map(i => ({ id: i.id, barcode: i.barcode, status: 'PENDING' })) });
    }
  } catch (err) {
    logger.error('createBatch error:', err);
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
    const header = ['Batch','Producto','Barcode','Cliente','Precio/lb','Cantidad (lb)','Total','Estado','Fecha','Operador'];
    const lines  = (rows as any[]).map(r => [
      escape(r.batch_id ?? r.id),
      escape(r.product_name),
      escape(r.barcode),
      escape(r.customer_name ?? ''),
      escape(Number(r.price).toFixed(2)),
      escape(Number(r.quantity).toFixed(2)),
      escape(Number(r.total).toFixed(2)),
      escape(r.status),
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
      'SELECT barcode, product_name, qty FROM batch_damage WHERE batch_id = ? AND qty > 0 ORDER BY id',
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
