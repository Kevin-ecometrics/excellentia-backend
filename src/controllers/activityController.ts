import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';

export async function listActivity(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const [rows] = await pool.query(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    ) as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listActivity error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
