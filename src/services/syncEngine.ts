import pool from '../db/connection.ts';
import { findItemsUpdatedSince } from './qbItems.ts';
import { createInvoice } from './qbInvoices.ts';
import { hasQboTokens } from './qbAuth.ts';
import logger from './logger.ts';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startSyncEngine(): void {
  processPendingOrders();
  syncProductsFromQbo();

  intervalId = setInterval(() => {
    processPendingOrders();
    syncProductsFromQbo();
  }, 5 * 60 * 1000);
}

export function stopSyncEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function processPendingOrders(): Promise<void> {
  if (!hasQboTokens()) return;
  try {
    const [pending] = await pool.query(
      "SELECT o.*, p.qb_item_id, p.qb_active, u.qb_class_id FROM orders o LEFT JOIN products p ON o.barcode = p.barcode LEFT JOIN users u ON o.user_id = u.id WHERE o.status = 'PENDING'"
    ) as any[];

    for (const order of pending) {
      try {
        if (!order.qb_item_id) {
          await pool.query(
            "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id = ?",
            ['Producto sin qb_item_id en QBO', order.id]
          );
          continue;
        }

        if (order.qb_active === 0) {
          await pool.query(
            "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id = ?",
            ['Item inactivo en QuickBooks — hay que reactivarlo en QBO antes de reintentar', order.id]
          );
          continue;
        }

        const [[{ invoice_counter }]] = await pool.query(
          'SELECT invoice_counter FROM company_settings WHERE id = 1'
        ) as any[];

        const invoice = await createInvoice(order, order.qb_item_id, order.qb_class_id ?? null, invoice_counter);
        const invoiceId = invoice.Invoice?.DocNumber;

        if (invoiceId) {
          await pool.query(
            'UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1'
          );
        }

        await pool.query(
          "UPDATE orders SET status = 'SENT', qb_invoice_id = ? WHERE id = ?",
          [invoiceId ?? null, order.id]
        );

        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, qb_id) VALUES ('order', ?, 'create_invoice', 'SUCCESS', ?)",
          [order.id, invoiceId ?? null]
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (order.retry_count >= 3) {
          await pool.query(
            "UPDATE orders SET status = 'FAILED', error_log = ? WHERE id = ?",
            [message, order.id]
          );
        } else {
          await pool.query(
            'UPDATE orders SET retry_count = retry_count + 1 WHERE id = ?',
            [order.id]
          );
        }

        await pool.query(
          "INSERT INTO sync_log (entity_type, entity_id, action, qb_status, error) VALUES ('order', ?, 'create_invoice', 'FAILED', ?)",
          [order.id, message]
        );
      }
    }
  } catch (err) {
    logger.error('Sync engine error (orders):', err);
  }
}

async function syncProductsFromQbo(): Promise<void> {
  if (!hasQboTokens()) return;
  try {
    const [rows] = await pool.query("SELECT last_sync_at FROM sync_meta WHERE entity = 'product'") as any[];
    const lastSync = rows[0]?.last_sync_at ?? '2000-01-01T00:00:00-07:00';

    const items = await findItemsUpdatedSince(lastSync);

    if (items.length === 0) return;

    let upserted = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        const active = item.Active === false ? 0 : 1;
        const [existing] = await pool.query(
          'SELECT id FROM products WHERE qb_item_id = ?',
          [item.Id]
        ) as any[];

        if (existing.length > 0) {
          await pool.query(
            'UPDATE products SET name = ?, price = ?, stock = ?, qb_active = ?, updated_at = NOW() WHERE qb_item_id = ?',
            [item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, active, item.Id]
          );
        } else {
          await pool.query(
            'INSERT INTO products (barcode, name, price, stock, qb_item_id, qb_active) VALUES (?, ?, ?, ?, ?, ?)',
            [null, item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, item.Id, active]
          );
        }
        upserted++;
      } catch (itemErr) {
        skipped++;
        logger.warn(`syncProductsFromQbo: item ${item.Id} (${item.Name}) omitido:`, itemErr);
      }
    }

    logger.info(`syncProductsFromQbo: ${upserted} procesados, ${skipped} omitidos`);

    const latestTime = items.reduce((latest: string, item: any) => {
      return item.Metadata?.LastUpdatedTime > latest ? item.Metadata.LastUpdatedTime : latest;
    }, lastSync);

    const [existingMeta] = await pool.query("SELECT id FROM sync_meta WHERE entity = 'product'") as any[];
    if (existingMeta.length > 0) {
      await pool.query("UPDATE sync_meta SET last_sync_at = ? WHERE entity = 'product'", [latestTime]);
    } else {
      await pool.query("INSERT INTO sync_meta (entity, last_sync_at) VALUES ('product', ?)", [latestTime]);
    }
  } catch (err) {
    logger.error('Sync engine error (products):', err);
  }
}
