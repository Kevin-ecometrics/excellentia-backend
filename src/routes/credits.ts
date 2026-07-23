import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

// GET /api/credits — reporte de todos los créditos emitidos (ledger customer_credits)
router.get('/', auth, adminOnly, async (req: Request, res: Response) => {
  try {
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: string[] = [];
    const params: any[] = [];
    if (from) { where.push('DATE(created_at) >= ?'); params.push(from); }
    if (to)   { where.push('DATE(created_at) <= ?'); params.push(to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS total_amount FROM customer_credits ${whereSql}`,
      params
    ) as any[];

    const [rows] = await pool.query(
      `SELECT cc.id, cc.customer_id, cc.customer_name, cc.batch_id, cc.amount, cc.created_at, o.invoice_id
       FROM customer_credits cc
       LEFT JOIN (
         SELECT batch_id, MAX(qb_invoice_id) AS invoice_id
         FROM orders
         WHERE qb_invoice_id IS NOT NULL
         GROUP BY batch_id
       ) o ON o.batch_id = cc.batch_id
       ${whereSql.replace(/created_at/g, 'cc.created_at')}
       ORDER BY cc.created_at DESC
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
