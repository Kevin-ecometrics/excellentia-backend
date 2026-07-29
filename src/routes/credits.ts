import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';
import { computeDamageCredit } from '../services/creditCalculator.ts';
import { logActivity } from '../services/activityLog.ts';
import logger from '../services/logger.ts';

const router = Router();

// POST /api/credits/issue — agendar crédito para un cliente sin venta asociada
// (ej. producto dañado/caducado detectado sin que haya un pedido). Reusa
// computeDamageCredit (misma lógica que el crédito por daño dentro de un
// batch) y las tablas batch_damage/credit_transactions ya existentes — el
// batch_id es sintético (prefijo 'cr') porque no hay ninguna fila en `orders`
// detrás. No toca QuickBooks: el crédito solo se refleja ahí cuando se
// aplique en una venta real (flujo apply_credit ya existente).
router.post('/issue', auth, async (req: Request, res: Response) => {
  try {
    const { customer_id, customer_name, items } = req.body;
    if (!customer_id) {
      res.status(400).json({ error: 'Se requiere customer_id' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Se requiere un array de items' });
      return;
    }

    const toInsert = (items as any[]).filter(i => Number(i.qty) > 0);
    if (toInsert.length === 0) {
      res.status(400).json({ error: 'Ningún item tiene cantidad mayor a 0' });
      return;
    }

    const { rows: computed, creditsTotal } = await computeDamageCredit(
      toInsert.map(i => ({ barcode: String(i.barcode), product_name: String(i.product_name), qty: Number(i.qty) }))
    );

    if (creditsTotal <= 0) {
      res.status(400).json({ error: 'No se pudo calcular crédito para los productos ingresados (verificar barcodes)' });
      return;
    }

    const batchId = 'cr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    for (const dmg of computed) {
      await pool.query(
        'INSERT INTO batch_damage (batch_id, barcode, product_name, qty, unit_price, amount, qb_item_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [batchId, dmg.barcode, dmg.product_name, dmg.qty, dmg.unit_price, dmg.amount, dmg.qb_item_id]
      );
    }

    await pool.query(
      "INSERT INTO credit_transactions (customer_id, customer_name, type, amount, reference_batch_id, invoice_id) VALUES (?, ?, 'EARNED', ?, ?, NULL)",
      [customer_id, customer_name ?? null, creditsTotal, batchId]
    );

    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'CREDIT_ISSUED',
      entityType: 'credit',
      entityId: batchId,
      details: `$${creditsTotal.toFixed(2)} para ${customer_name ?? customer_id}, ${computed.length} item(s)`,
      ip: req.ip,
    });

    logger.info(`[credit] ${batchId}: $${creditsTotal.toFixed(2)} agendado para cliente ${customer_id}`);

    res.json({ batchId, creditsTotal, items: computed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    logger.warn(`[credit] issue error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /api/credits — reporte de todos los créditos emitidos (EARNED en credit_transactions)
router.get('/', auth, adminOnly, async (req: Request, res: Response) => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: string[] = ["ct.type = 'EARNED'"];
    const params: any[] = [];
    if (from) { where.push('DATE(ct.created_at) >= ?'); params.push(from); }
    if (to)   { where.push('DATE(ct.created_at) <= ?'); params.push(to); }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(ct.amount), 0) AS total_amount FROM credit_transactions ct ${whereSql}`,
      params
    ) as any[];

    const [rows] = await pool.query(
      `SELECT ct.id, ct.customer_id, ct.customer_name, ct.reference_batch_id AS batch_id, ct.amount, ct.created_at, ct.invoice_id
       FROM credit_transactions ct
       ${whereSql}
       ORDER BY ct.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    ) as any[];

    res.json({
      data: rows,
      meta: { page: pageNum, limit: limitNum, total: countRow.total },
      summary: { count: Number(countRow.total), totalAmount: Number(countRow.total_amount) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

export default router;
