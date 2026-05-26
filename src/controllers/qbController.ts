import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { findAllItems } from '../services/qbItems.ts';
import { oauthClient, getAuthUri, handleCallback } from '../services/qbAuth.ts';
import logger from '../services/logger.ts';

export async function qbStatus(_req: Request, res: Response): Promise<void> {
  try {
    const valid = oauthClient.isAccessTokenValid();
    const [rows] = await pool.query("SELECT last_sync_at FROM sync_meta WHERE entity = 'product'") as any[];

    res.json({
      connected: true,
      token_valid: valid,
      environment: process.env.ENVIRONMENT,
      realm_id: process.env.REALM_ID,
      last_product_sync: rows[0]?.last_sync_at ?? null,
    });
  } catch (err) {
    logger.error('qbStatus error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function qbAuth(_req: Request, res: Response): Promise<void> {
  try {
    const authUri = getAuthUri();
    res.redirect(authUri);
  } catch (err) {
    logger.error('qbAuth error:', err);
    res.status(500).json({ error: 'Error al iniciar autenticación OAuth' });
  }
}

export async function qbCallback(req: Request, res: Response): Promise<void> {
  try {
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const result = await handleCallback(fullUrl);
    res.json({
      message: 'Autenticación con QuickBooks completada exitosamente',
      realm_id: result.realmId,
    });
  } catch (err) {
    logger.error('qbCallback error:', err);
    res.status(500).json({ error: 'Error en callback OAuth de QuickBooks' });
  }
}

export async function syncProducts(_req: Request, res: Response): Promise<void> {
  try {
    const items = await findAllItems();

    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const barcode = item.Sku?.trim() || `QBO-${item.Id}`;
      const category = item.IncomeAccountRef?.name ?? null;
      const description = item.Description ?? null;
      const [existing] = await pool.query(
        'SELECT id FROM products WHERE qb_item_id = ?',
        [item.Id]
      ) as any[];

      if (existing.length > 0) {
        await pool.query(
          'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, description = ?, updated_at = NOW() WHERE qb_item_id = ?',
          [item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, category, description, item.Id]
        );
        updated++;
      } else {
        await pool.query(
          'INSERT INTO products (barcode, name, price, stock, qb_item_id, category, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [barcode, item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, item.Id, category, description]
        );
        inserted++;
      }
    }

    await pool.query(
      "UPDATE sync_meta SET last_sync_at = ? WHERE entity = 'product'",
      [new Date().toISOString()]
    );

    res.json({
      message: `Sync completado. ${items.length} items en QBO, ${inserted} nuevos, ${updated} actualizados.`,
      total_qbo: items.length,
      inserted,
      updated,
    });
  } catch (err) {
    logger.error('syncProducts error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
