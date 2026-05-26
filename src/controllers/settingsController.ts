import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';
import { logActivity } from '../services/activityLog.ts';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL DEFAULT 'EXCELLENTIA',
      subtitle VARCHAR(255) NOT NULL DEFAULT 'Ticket de Venta',
      address VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  // Insertar fila por defecto si no existe
  await pool.query(`
    INSERT IGNORE INTO company_settings (id, company_name, subtitle)
    VALUES (1, 'EXCELLENTIA', 'Ticket de Venta')
  `);
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    await ensureTable();
    const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = 1') as any[];
    res.json({ data: (rows as any[])[0] ?? null });
  } catch (err) {
    logger.error('getSettings error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    await ensureTable();
    const { company_name, subtitle, address, phone, city } = req.body;
    if (!company_name?.trim()) {
      res.status(400).json({ error: 'El nombre de la empresa es requerido' });
      return;
    }
    await pool.query(
      `UPDATE company_settings SET
        company_name = ?, subtitle = ?, address = ?, phone = ?, city = ?
       WHERE id = 1`,
      [
        company_name.trim(),
        subtitle?.trim() || 'Ticket de Venta',
        address?.trim() || null,
        phone?.trim() || null,
        city?.trim() || null,
      ]
    );
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'SETTINGS_UPDATED', entityType: 'company_settings', ip: req.ip,
    });
    const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = 1') as any[];
    res.json({ data: (rows as any[])[0] });
  } catch (err) {
    logger.error('updateSettings error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
