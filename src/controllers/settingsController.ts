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
      disclaimer TEXT DEFAULT NULL,
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
    const { company_name, subtitle, address, phone, city, disclaimer } = req.body;
    if (!company_name?.trim()) {
      res.status(400).json({ error: 'El nombre de la empresa es requerido' });
      return;
    }
    await pool.query(
      `UPDATE company_settings SET
        company_name = ?, subtitle = ?, address = ?, phone = ?, city = ?, disclaimer = ?
       WHERE id = 1`,
      [
        company_name.trim(),
        subtitle?.trim() || 'Ticket de Venta',
        address?.trim() || null,
        phone?.trim() || null,
        city?.trim() || null,
        disclaimer?.trim() || null,
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

// invoice_counter es el próximo DocNumber a asignar en QuickBooks (se lee y se
// incrementa en createBatch/retryBatchSync/convertPreOrder/SyncEngine — ver
// CLAUDE.md). Solo se permite avanzarlo, nunca retrocederlo: bajarlo podría
// reasignar un número que QBO ya usó en una factura previa (DocNumber
// duplicado). El único caso de uso real es "se acabó la caja de facturas
// físicas, arrancar en un número más alto".
export async function updateInvoiceCounter(req: Request, res: Response): Promise<void> {
  try {
    await ensureTable();
    const { invoice_counter } = req.body;
    const next = Number(invoice_counter);

    if (!Number.isInteger(next) || next <= 0) {
      res.status(400).json({ error: 'invoice_counter debe ser un número entero positivo' });
      return;
    }

    const [rows] = await pool.query('SELECT invoice_counter FROM company_settings WHERE id = 1') as any[];
    const current = (rows as any[])[0]?.invoice_counter;

    if (current == null) {
      res.status(500).json({ error: 'No se encontró la configuración de la empresa' });
      return;
    }
    if (next <= current) {
      res.status(400).json({
        error: `El nuevo número (#${next}) debe ser mayor al actual (#${current}) — bajarlo podría duplicar un número de factura ya usado en QuickBooks`,
      });
      return;
    }

    await pool.query('UPDATE company_settings SET invoice_counter = ? WHERE id = 1', [next]);
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'INVOICE_COUNTER_UPDATED', entityType: 'company_settings', ip: req.ip,
      details: `#${current} → #${next}`,
    });
    logger.info(`invoice_counter actualizado por ${req.user?.email ?? 'unknown'}: #${current} → #${next}`);

    res.json({ data: { invoice_counter: next } });
  } catch (err) {
    logger.error('updateInvoiceCounter error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
