import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { createBatchInvoice, findInvoiceByDocNumber } from '../services/qbInvoices.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { getCustomerBalance, applyCustomerCredit } from '../services/creditController.ts';
import { withInvoiceNumber, reserveInvoiceNumber } from '../services/invoiceCounter.ts';
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

    // batch_id propio aunque sea un solo item — mismo generador que
    // createBatch — así esta orden se aprueba con el mismo
    // approveBatch/POST /api/orders/batch/:batchId/approve en vez de
    // necesitar un endpoint de aprobación aparte para el caso "sin batch".
    const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const [result] = await pool.query(
      "INSERT INTO orders (barcode, product_name, price, quantity, total, batch_id, device_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [barcode, product_name, price, quantity, finalTotal, batchId, device_id ?? null, req.user?.id ?? null]
    ) as any;

    const orderId = result.insertId;

    // El número de factura se reserva al instante (el ticket sale con un
    // número real y secuencial), pero la venta queda AWAITING_APPROVAL — el
    // push real a QBO recién pasa cuando un admin aprueba
    // (POST /api/orders/batch/:batchId/approve, ver approveBatch más abajo).
    const invoiceNumber = await reserveInvoiceNumber();
    await pool.query(
      "UPDATE orders SET status = 'AWAITING_APPROVAL', reserved_invoice_number = ? WHERE id = ?",
      [invoiceNumber, orderId]
    );

    res.status(201).json({ id: orderId, barcode, batchId, status: 'AWAITING_APPROVAL', invoiceNumber });
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

    let query = `SELECT o.id, o.barcode, o.product_name, o.price, o.quantity, o.total, o.status, o.batch_id, o.qb_invoice_id, o.reserved_invoice_number, o.device_id, o.user_id, o.customer_id, o.customer_name, o.unit, o.case_qty, o.payment_method, o.check_number, o.credit_applied, o.created_at, u.email AS user_email, u.name AS user_name,
      (SELECT COALESCE(SUM(bd.amount), 0) FROM batch_damage bd WHERE bd.batch_id = o.batch_id AND bd.qty > 0) AS damage_credits,
      (SELECT r.id FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.batch_id = o.batch_id AND rs.stop_type = 'BATCH' LIMIT 1) AS route_id,
      (SELECT r.name FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.batch_id = o.batch_id AND rs.stop_type = 'BATCH' LIMIT 1) AS route_name,
      (SELECT r.scheduled_date FROM route_stops rs JOIN routes r ON r.id = rs.route_id WHERE rs.batch_id = o.batch_id AND rs.stop_type = 'BATCH' LIMIT 1) AS route_date
      FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1`;
    const params: any[] = [];

    if (req.user?.role === 'operator') { query += ' AND o.user_id = ?'; params.push(req.user.id); }
    if (status)    { query += ' AND o.status = ?';     params.push(status); }
    if (barcode)   { query += ' AND o.barcode = ?';    params.push(barcode); }
    if (device_id)   { query += ' AND o.device_id = ?';   params.push(device_id); }
    if (customer_id) { query += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (date_from)   { query += ' AND o.created_at >= ?'; params.push(date_from); }
    if (date_to)   { query += ' AND o.created_at <= ?'; params.push(date_to); }

    let countQuery = query.replace(/^SELECT .* FROM orders/s, 'SELECT COUNT(*) as total FROM orders');
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
    const validStatuses = ['AWAITING_APPROVAL', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'];

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
    const { items, customer_id, customer_name, signature, damage_items, payment_method, check_number, apply_credit, route_id, stop_id } = req.body;
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

    // Descontar stock: 1 unidad por línea de ítem vendido — salvo que el
    // producto ya se haya descontado al cargar esta ruta (route_id viene
    // del cliente cuando hay una venta "por scratch"/de ruta en curso, ver
    // MyRouteDetailActivity.kt → OrderRepository.sendBatch()). Sin este
    // check, un producto route-loaded quedaba descontado DOS veces: una al
    // cargar la ruta (addRouteItem) y otra acá — con una ruta 100% vendida,
    // el stock terminaba el doble de bajo de lo real.
    let routeLoadedBarcodes: Set<string> | null = null;
    if (route_id) {
      const [routeItemRows] = await pool.query(
        'SELECT barcode FROM route_items WHERE route_id = ? AND barcode IS NOT NULL',
        [route_id]
      ) as any[];
      routeLoadedBarcodes = new Set((routeItemRows as any[]).map(r => r.barcode));
    }
    for (const item of inserted) {
      if (routeLoadedBarcodes?.has(item.barcode)) continue;
      await pool.query(
        'UPDATE products SET stock = GREATEST(stock - 1, 0) WHERE barcode = ?',
        [item.barcode]
      );
    }

    // Vincula esta venta a la parada de ruta que la originó (solo paradas
    // CUSTOMER — las BATCH ya nacen con batch_id seteado en addStop, las
    // PRE_ORDER usan pre_order_id, no batch_id). Sin esto, getExpectedReturns
    // nunca contaba estas ventas como "vendido" para la ruta — la cantidad
    // "esperada de vuelta" en Revisar Devoluciones quedaba inflada.
    if (stop_id) {
      await pool.query(
        "UPDATE route_stops SET batch_id = ? WHERE id = ? AND stop_type = 'CUSTOMER' AND batch_id IS NULL",
        [batchId, stop_id]
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

    // Crédito de cliente aplicado (apply_credit) — se aplica de inmediato,
    // igual que el crédito EARNED de arriba, con invoiceId=NULL por ahora.
    // approveBatch() backfillea credit_transactions.invoice_id cuando la
    // factura real de QBO exista (mismo patrón que ya usa EARNED más abajo).
    let creditApplied = 0;
    if (apply_credit && apply_credit > 0 && customer_id) {
      try {
        const { balance } = await getCustomerBalance(customer_id);
        creditApplied = Math.round(Math.min(Number(apply_credit), balance) * 100) / 100;
        if (creditApplied > 0) {
          await applyCustomerCredit(customer_id, customer_name ?? null, creditApplied, batchId, null);
          await pool.query(
            "UPDATE orders SET credit_applied = ? WHERE batch_id = ?",
            [creditApplied, batchId]
          );
        }
      } catch (creditErr: any) {
        logger.warn(`[credit] Error al aplicar crédito para batch ${batchId}: ${creditErr.message}`);
        creditApplied = 0;
      }
    }

    // El envío real a QBO se difiere hasta que un admin apruebe (approveBatch,
    // POST /api/orders/batch/:batchId/approve) — acá solo se reserva el
    // número de factura, para que el ticket salga con un número real.
    const invoiceNumber = await reserveInvoiceNumber();
    await pool.query(
      "UPDATE orders SET status = 'AWAITING_APPROVAL', reserved_invoice_number = ? WHERE batch_id = ?",
      [invoiceNumber, batchId]
    );

    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_CREATED', entityType: 'batch', entityId: batchId, details: `${inserted.length} items, customer: ${customer_name ?? 'N/A'}`, ip: req.ip });

    res.status(201).json({
      batchId,
      invoiceId: null,
      invoiceNumber,
      orders: inserted.map(i => ({ id: i.id, barcode: i.barcode, status: 'AWAITING_APPROVAL' })),
      creditsTotal,
      creditApplied,
    });
  } catch (err) {
    logger.error('createBatch error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/orders/batch/:batchId/approve — admin-only. Único lugar que
// llama de verdad a QBO para un batch AWAITING_APPROVAL (createBatch/
// createOrder/convertPreOrder solo reservan el número e insertan localmente
// — ver esos controllers). Usa reserved_invoice_number ya guardado, no
// reserva uno nuevo (el contador ya avanzó al crear el batch, cuando se
// imprimió el ticket). Mismas validaciones de qb_item_id/qb_active que
// retryBatchSync, que es lo que se usa para reintentar si esto falla.
export async function approveBatch(req: Request, res: Response): Promise<void> {
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

    const toApprove = orderRows.filter((o: any) => o.status === 'AWAITING_APPROVAL');
    if (toApprove.length === 0) {
      res.status(400).json({ error: `Este batch no está esperando aprobación (status actual: ${orderRows[0].status})` });
      return;
    }

    const missingQbItem = toApprove.filter((o: any) => !o.qb_item_id);
    if (missingQbItem.length > 0) {
      await pool.query(
        "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id IN (?)",
        ['Producto sin qb_item_id en QBO', missingQbItem.map((o: any) => o.id)]
      );
    }

    const inactiveInQbo = toApprove.filter((o: any) => o.qb_item_id && o.qb_active === 0);
    if (inactiveInQbo.length > 0) {
      await pool.query(
        "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id IN (?)",
        ['Item inactivo en QuickBooks — hay que reactivarlo en QBO antes de reintentar', inactiveInQbo.map((o: any) => o.id)]
      );
    }

    const validItems = toApprove.filter((o: any) => o.qb_item_id && o.qb_active !== 0);
    if (validItems.length === 0) {
      if (inactiveInQbo.length > 0) {
        res.status(400).json({ error: 'El producto está inactivo en QuickBooks. Reactivalo en QBO (Products and Services) y volvé a intentar.' });
      } else {
        res.status(400).json({ error: 'Ningún producto de este pedido está vinculado a QuickBooks (falta qb_item_id). Contactá al administrador.' });
      }
      return;
    }

    const reservedInvoiceNumber = validItems[0].reserved_invoice_number ?? await reserveInvoiceNumber();

    const [damageRows] = await pool.query(
      'SELECT barcode, product_name, qty, unit, unit_price, amount, qb_item_id FROM batch_damage WHERE batch_id = ? AND qty > 0',
      [batchId]
    ) as any[];
    const creditsTotal = (damageRows as any[]).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const creditApplied = Number(validItems[0].credit_applied) || 0;

    const items = validItems.map((o: any) => ({
      qb_item_id: o.qb_item_id,
      product_name: o.product_name,
      price: o.price,
      quantity: o.quantity,
      total: o.total,
    }));

    // Finaliza como SENT — reusado tanto si createBatchInvoice devuelve
    // éxito directo como si, tras un error (típicamente timeout), la
    // reconciliación contra QBO confirma que la factura sí se creó.
    const finalizeApproved = async (invoiceId: string | null) => {
      await pool.query(
        "UPDATE orders SET status = 'SENT', qb_invoice_id = ?, error_log = NULL, approved_by = ?, approved_at = NOW() WHERE batch_id = ?",
        [invoiceId, req.user?.id ?? null, batchId]
      );

      for (const o of validItems) {
        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
          [o.id, invoiceId]
        );
      }

      if (invoiceId && creditApplied > 0) {
        await pool.query(
          "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'USED' AND invoice_id IS NULL",
          [invoiceId, batchId]
        );
      }
      if (invoiceId && creditsTotal > 0) {
        await pool.query(
          "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'EARNED' AND invoice_id IS NULL",
          [invoiceId, batchId]
        );
      }

      logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_APPROVED', entityType: 'batch', entityId: String(batchId), details: `${validItems.length} items aprobados y enviados a QBO`, ip: req.ip });

      res.json({ batchId, status: 'SENT', invoiceId, invoiceNumber: reservedInvoiceNumber });
    };

    try {
      const invoice = await createBatchInvoice(
        items, validItems[0].customer_id ?? null, damageRows, validItems[0].payment_method ?? null,
        validItems[0].check_number ?? null, req.user?.qb_class_id ?? null, reservedInvoiceNumber,
        creditsTotal, damageRows as any[], creditApplied > 0 ? creditApplied : undefined
      );
      const invoiceId = invoice.Invoice?.DocNumber ?? null;
      await finalizeApproved(invoiceId);
    } catch (syncErr) {
      const message = extractQboErrorMessage(syncErr);

      // El error (típicamente un timeout) no confirma que QBO haya
      // rechazado la factura — puede haberla creado igual, con la
      // respuesta perdida en el camino. Se verifica por DocNumber antes de
      // declarar la venta como fallida, para no arriesgar un duplicado si
      // más tarde se reintenta.
      let reconciled: { Id: string; DocNumber: string } | null = null;
      try {
        reconciled = await findInvoiceByDocNumber(reservedInvoiceNumber);
      } catch (lookupErr) {
        logger.warn(`approveBatch: no se pudo verificar contra QBO si la factura #${reservedInvoiceNumber} ya existe:`, lookupErr);
      }

      if (reconciled) {
        logger.info(`approveBatch: batch ${batchId} había fallado (${message}) pero la factura #${reservedInvoiceNumber} sí existe en QBO — se toma como éxito`);
        await finalizeApproved(reconciled.DocNumber ?? String(reservedInvoiceNumber));
        return;
      }

      await pool.query(
        "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id IN (?)",
        [message, validItems.map((o: any) => o.id)]
      );

      for (const o of validItems) {
        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, error) VALUES ('order', ?, 'create_invoice', 'FAILED', ?)",
          [o.id, message]
        );
      }

      logger.warn(`approveBatch: batch ${batchId} falló al enviar a QBO:`, syncErr);
      res.status(502).json({ error: message });
    }
  } catch (err) {
    logger.error('approveBatch error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/orders/batch/:batchId/reconcile — admin-only. Chequeo de solo
// lectura contra QBO para un batch FAILED/PENDING: pregunta si ya existe una
// factura con el DocNumber reservado, sin reintentar el envío (cero riesgo
// de duplicado). Pensado para el caso "un timeout dejó la venta en
// FAILED/PENDING pero en QBO sí está" cuando ni approveBatch ni
// retryBatchSync llegaron a correr su reconciliación automática (ej.
// "Forzar sync" solo reencola, no llama a QBO al instante — ver forceSync).
export async function reconcileBatch(req: Request, res: Response): Promise<void> {
  try {
    const { batchId } = req.params;

    const [orderRows] = await pool.query(
      'SELECT * FROM orders WHERE batch_id = ?',
      [batchId]
    ) as any[];

    if (orderRows.length === 0) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    if (orderRows.every((o: any) => o.status === 'SENT')) {
      res.json({ batchId, status: 'SENT', invoiceId: orderRows[0].qb_invoice_id ?? null, reconciled: false, message: 'Esta venta ya estaba marcada como enviada.' });
      return;
    }

    if (orderRows.some((o: any) => o.status === 'AWAITING_APPROVAL')) {
      res.status(400).json({ error: 'Esta venta todavía no se intentó enviar — no hay nada que verificar en QBO todavía.' });
      return;
    }

    const docNumber = orderRows[0].reserved_invoice_number ?? orderRows[0].qb_invoice_id ?? null;
    if (!docNumber) {
      res.status(400).json({ error: 'Esta orden no tiene un número de factura reservado para verificar contra QuickBooks.' });
      return;
    }

    let found: { Id: string; DocNumber: string } | null = null;
    try {
      found = await findInvoiceByDocNumber(docNumber);
    } catch (lookupErr) {
      logger.warn(`reconcileBatch: error consultando QBO para batch ${batchId}:`, lookupErr);
      res.status(502).json({ error: 'No se pudo consultar QuickBooks en este momento. Probá de nuevo en unos minutos.' });
      return;
    }

    if (!found) {
      res.json({ batchId, reconciled: false, message: `No se encontró ninguna factura #${docNumber} en QuickBooks todavía — es seguro reintentar el envío.` });
      return;
    }

    const invoiceId = found.DocNumber ?? String(docNumber);

    await pool.query(
      "UPDATE orders SET status = 'SENT', qb_invoice_id = ?, error_log = NULL WHERE batch_id = ?",
      [invoiceId, batchId]
    );

    for (const o of orderRows) {
      await pool.query(
        "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
        [o.id, invoiceId]
      );
    }

    // Backfill de invoice_id en credit_transactions — mismo criterio que
    // approveBatch, por si el batch tenía crédito por daño (EARNED) o
    // crédito de cliente aplicado (USED) esperando el número real.
    const [damageRows] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM batch_damage WHERE batch_id = ? AND qty > 0',
      [batchId]
    ) as any[];
    const creditsTotal = Number(damageRows[0]?.total) || 0;
    const creditApplied = Number(orderRows[0].credit_applied) || 0;

    if (creditApplied > 0) {
      await pool.query(
        "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'USED' AND invoice_id IS NULL",
        [invoiceId, batchId]
      );
    }
    if (creditsTotal > 0) {
      await pool.query(
        "UPDATE credit_transactions SET invoice_id = ? WHERE reference_batch_id = ? AND type = 'EARNED' AND invoice_id IS NULL",
        [invoiceId, batchId]
      );
    }

    logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_RECONCILED', entityType: 'batch', entityId: String(batchId), details: `Factura #${invoiceId} encontrada en QBO y sincronizada localmente`, ip: req.ip });

    res.json({ batchId, status: 'SENT', invoiceId, reconciled: true, message: `Factura #${invoiceId} encontrada en QuickBooks — actualizada a Enviado.` });
  } catch (err) {
    logger.error('reconcileBatch error:', err);
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

    // Guard: un batch AWAITING_APPROVAL no se puede "reintentar" — todavía
    // no se intentó nada, está esperando al admin a propósito. Sin este
    // check, un operador (retryBatchSync no es admin-only, es para el dueño
    // del batch) podría llamar este endpoint y saltarse por completo la
    // aprobación — createBatchInvoice se dispararía igual, solo que desde
    // acá en vez de approveBatch.
    if (orderRows.some((o: any) => o.status === 'AWAITING_APPROVAL')) {
      res.status(400).json({ error: 'Esta venta está esperando aprobación del administrador antes de poder enviarse a QuickBooks.' });
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

    // Declarado ANTES del try (no adentro): el catch de abajo lo necesita
    // para la reconciliación contra QBO, y un `let` de un try no es visible
    // en su catch — mismo gotcha ya documentado en createBatch más arriba
    // (bloques hermanos, no anidados).
    let docNumber: number | null = null;
    try {
      const creditAppliedRetry = Number(validItems[0].credit_applied) || 0;
      // Si el batch ya tiene un número reservado (flujo de aprobación —
      // ver approveBatch), se reusa tal cual: el contador ya avanzó cuando
      // se creó/imprimió el ticket, así que reservar uno nuevo acá
      // reservaría un SEGUNDO número para la misma venta. Solo se reserva
      // uno nuevo (withInvoiceNumber, con su semántica "no quema el número
      // si QBO falla") para batches viejos que nunca pasaron por ese flujo.
      const alreadyReserved: number | null = validItems[0].reserved_invoice_number ?? null;
      docNumber = alreadyReserved;
      let invoiceId: string | undefined;

      if (alreadyReserved) {
        const invoice = await createBatchInvoice(
          items, validItems[0].customer_id ?? null, damageRows, validItems[0].payment_method ?? null, validItems[0].check_number ?? null, req.user?.qb_class_id ?? null, alreadyReserved, creditAmount, damageRows as any[], creditAppliedRetry > 0 ? creditAppliedRetry : undefined
        );
        invoiceId = invoice.Invoice?.DocNumber;
      } else {
        invoiceId = await withInvoiceNumber(async (invoiceNumber, markSuccess) => {
          docNumber = invoiceNumber;
          const invoice = await createBatchInvoice(
            items, validItems[0].customer_id ?? null, damageRows, validItems[0].payment_method ?? null, validItems[0].check_number ?? null, req.user?.qb_class_id ?? null, invoiceNumber, creditAmount, damageRows as any[], creditAppliedRetry > 0 ? creditAppliedRetry : undefined
          );
          const id = invoice.Invoice?.DocNumber;
          if (id) await markSuccess();
          return id;
        });
      }

      await pool.query(
        "UPDATE orders SET status = 'SENT', qb_invoice_id = ?, error_log = NULL WHERE batch_id = ?",
        [invoiceId ?? null, batchId]
      );

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
        invoiceNumber: invoiceId ? docNumber : null,
      });
    } catch (syncErr) {
      const message = extractQboErrorMessage(syncErr);

      // El error (típicamente un timeout) no confirma que QBO haya
      // rechazado la factura — puede haberla creado igual, con la
      // respuesta perdida en el camino (ver approveBatch, mismo criterio).
      // Se verifica por DocNumber antes de declarar el reintento fallido.
      // Nota: si el número se reservó recién acá (rama sin
      // reserved_invoice_number previo), un éxito reconciliado no vuelve a
      // incrementar invoice_counter — ese contador ya quedó "atrás" en un
      // caso así (edge case pre-existente, no introducido por este fix).
      let reconciled: { Id: string; DocNumber: string } | null = null;
      if (docNumber) {
        try {
          reconciled = await findInvoiceByDocNumber(docNumber);
        } catch (lookupErr) {
          logger.warn(`retryBatchSync: no se pudo verificar contra QBO si la factura #${docNumber} ya existe:`, lookupErr);
        }
      }

      if (reconciled) {
        logger.info(`retryBatchSync: batch ${batchId} había fallado (${message}) pero la factura #${docNumber} sí existe en QBO — se toma como éxito`);
        const confirmedInvoiceId = reconciled.DocNumber ?? String(docNumber);
        await pool.query(
          "UPDATE orders SET status = 'SENT', qb_invoice_id = ?, error_log = NULL WHERE batch_id = ?",
          [confirmedInvoiceId, batchId]
        );
        for (const o of validItems) {
          await pool.query(
            "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
            [o.id, confirmedInvoiceId]
          );
        }
        logActivity({ userId: req.user?.id, userEmail: req.user?.email, action: 'BATCH_RETRY_SUCCESS', entityType: 'batch', entityId: String(batchId), details: `${validItems.length} items reenviados a QBO (reconciliado tras timeout)`, ip: req.ip });
        res.json({ batchId, status: 'SENT', invoiceId: confirmedInvoiceId, invoiceNumber: docNumber });
        return;
      }

      // Con número ya reservado (flujo de aprobación), un reintento fallido
      // vuelve a FAILED — no PENDING — para que el SyncEngine (que solo
      // procesa PENDING) no lo levante solo y reserve un número nuevo por
      // accidente. Sin número reservado (batches viejos), se mantiene el
      // comportamiento previo: PENDING, para que el SyncEngine reintente.
      const nextStatus = validItems[0].reserved_invoice_number ? 'FAILED' : 'PENDING';
      await pool.query(
        'UPDATE orders SET status = ?, error_log = ?, retry_count = 0 WHERE id IN (?)',
        [nextStatus, message, validItems.map((o: any) => o.id)]
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
    // Igual que retryBatchSync: no dejar que esto reencole para el
    // SyncEngine (que solo procesa PENDING) una orden AWAITING_APPROVAL —
    // eso saltearía la aprobación del admin, que es todo el punto de ese
    // estado. La vía correcta es approveBatch.
    if (rows[0].status === 'AWAITING_APPROVAL') {
      res.status(400).json({ error: 'Esta venta está esperando aprobación del administrador antes de poder enviarse a QuickBooks.' });
      return;
    }
    await pool.query("UPDATE orders SET status = 'PENDING', retry_count = 0 WHERE id = ?", [id]);
    res.json({ message: `Sync forzado para pedido ${id}` });
  } catch (err) {
    logger.error('forceSync error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
