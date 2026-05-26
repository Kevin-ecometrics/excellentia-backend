import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';

export async function registerDevice(req: Request, res: Response): Promise<void> {
  try {
    const { name, model, serial_number } = req.body;
    if (!serial_number) {
      res.status(400).json({ error: 'Serial number requerido' });
      return;
    }

    const [existing] = await pool.query('SELECT id FROM devices WHERE serial_number = ?', [serial_number]) as any[];
    if (existing.length > 0) {
      await pool.query('UPDATE devices SET name = ?, model = ?, last_connection = NOW(), status = ? WHERE serial_number = ?',
        [name ?? null, model ?? null, 'ONLINE', serial_number]);
      res.json({ id: existing[0].id, message: 'Dispositivo actualizado' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO devices (name, model, serial_number, last_connection, status) VALUES (?, ?, ?, NOW(), ?)',
      [name ?? null, model ?? null, serial_number, 'ONLINE']
    ) as any;

    res.status(201).json({ id: result.insertId, serial_number });
  } catch (err) {
    logger.error('registerDevice error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listDevices(req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query('SELECT * FROM devices ORDER BY last_connection DESC') as any[];
    res.json({ data: rows });
  } catch (err) {
    logger.error('listDevices error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function heartbeat(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE devices SET last_connection = NOW(), status = ? WHERE id = ?',
      ['ONLINE', id]
    ) as any[];
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Dispositivo no encontrado' });
      return;
    }
    res.json({ message: 'Heartbeat recibido' });
  } catch (err) {
    logger.error('heartbeat error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
