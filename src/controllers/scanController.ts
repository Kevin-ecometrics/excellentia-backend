import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';

export async function createScan(req: Request, res: Response): Promise<void> {
  try {
    const { barcode, device_id } = req.body;
    if (!barcode) {
      res.status(400).json({ error: 'Barcode requerido' });
      return;
    }

    const [product] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]) as any[];

    const [result] = await pool.query(
      'INSERT INTO scan_entries (barcode, product_id, device_id, scanned_by) VALUES (?, ?, ?, ?)',
      [barcode, product[0]?.id ?? null, device_id ?? null, req.user?.id ?? null]
    ) as any;

    res.status(201).json({ id: result.insertId, barcode });
  } catch (err) {
    logger.error('createScan error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listScans(req: Request, res: Response): Promise<void> {
  try {
    const { barcode, device_id, date_from, date_to, page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT s.*, p.name as product_name FROM scan_entries s LEFT JOIN products p ON s.product_id = p.id WHERE 1=1';
    const params: any[] = [];

    if (barcode) { query += ' AND s.barcode = ?'; params.push(barcode); }
    if (device_id) { query += ' AND s.device_id = ?'; params.push(device_id); }
    if (date_from) { query += ' AND s.created_at >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND s.created_at <= ?'; params.push(date_to); }

    const countQuery = query.replace('SELECT s.*, p.name as product_name', 'SELECT COUNT(*) as total').split('ORDER BY')[0] ?? query;
    const [countResult] = await pool.query(countQuery, params) as any[];

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await pool.query(query, params) as any[];

    res.json({
      data: rows,
      meta: { page: pageNum, limit: limitNum, total: countResult[0].total },
    });
  } catch (err) {
    logger.error('listScans error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
