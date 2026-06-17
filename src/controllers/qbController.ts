import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { findAllItems } from '../services/qbItems.ts';
import { oauthClient, getAuthUri, handleCallback, saveTokensToDb } from '../services/qbAuth.ts';
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
    await handleCallback(fullUrl);
    const dashboardUrl = process.env.DASHBOARD_URL ?? 'https://app.excellentiafoods.com/dashboard';
    res.redirect(dashboardUrl);
  } catch (err) {
    logger.error('qbCallback error:', err);
    res.status(500).json({ error: 'Error en callback OAuth de QuickBooks' });
  }
}

export async function qbDisconnect(_req: Request, res: Response): Promise<void> {
  try {
    // Revocar el token en Intuit si está disponible
    if (oauthClient.isAccessTokenValid()) {
      try {
        await oauthClient.revoke({ token_type_hint: 'access_token' });
        logger.info('Token QBO revocado en Intuit');
      } catch (revokeErr) {
        logger.warn('No se pudo revocar el token en Intuit (ya expirado o inválido):', revokeErr);
      }
    }

    // Limpiar tokens en la base de datos
    await pool.query('DELETE FROM qb_tokens');
    logger.info('Tokens QBO eliminados de la base de datos');

    const disconnectedUrl = process.env.DISCONNECTED_URL ?? 'https://app.excellentiafoods.com/qb-disconnected';
    res.redirect(disconnectedUrl);
  } catch (err) {
    logger.error('qbDisconnect error:', err);
    res.status(500).json({ error: 'Error al desconectar QuickBooks' });
  }
}

export async function syncProducts(_req: Request, res: Response): Promise<void> {
  try {
    const items = await findAllItems();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      try {
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
      } catch (itemErr) {
        skipped++;
        logger.warn(`syncProducts: item ${item.Id} (${item.Name}) omitido:`, itemErr);
      }
    }

    await pool.query(
      `INSERT INTO sync_meta (entity, last_sync_at) VALUES ('product', ?)
       ON DUPLICATE KEY UPDATE last_sync_at = VALUES(last_sync_at)`,
      [new Date().toISOString()]
    );

    res.json({
      message: `Sync completado. ${items.length} items en QBO, ${inserted} nuevos, ${updated} actualizados, ${skipped} omitidos.`,
      total_qbo: items.length,
      inserted,
      updated,
      skipped,
    });
  } catch (err) {
    logger.error('syncProducts error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
