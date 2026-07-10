import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { paginatedQuery } from '../services/qbAuth.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';
import logger from '../services/logger.ts';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cached_customers (
      id VARCHAR(50) PRIMARY KEY,
      display_name VARCHAR(255) NOT NULL,
      active TINYINT(1) DEFAULT 1,
      address_line1 VARCHAR(255) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      state_code VARCHAR(20) DEFAULT NULL,
      postal_code VARCHAR(20) DEFAULT NULL,
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  // Add columns for existing installs
  const migrations = [
    'ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS state_code VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT NULL',
  ];
  for (const sql of migrations) {
    await pool.query(sql).catch(() => {});
  }
}

async function fetchFromQb(): Promise<any[]> {
  return paginatedQuery('select * from Customer where Active = true', 'Customer');
}

async function refreshCache(customers: any[]) {
  if (customers.length === 0) return;
  await pool.query('DELETE FROM cached_customers');
  const values = customers.map(c => [
    c.Id,
    c.DisplayName ?? '',
    c.Active ? 1 : 0,
    c.BillAddr?.Line1 ?? null,
    c.BillAddr?.City ?? null,
    c.BillAddr?.CountrySubDivisionCode ?? null,
    c.BillAddr?.PostalCode ?? null,
  ]);
  await pool.query(
    'INSERT INTO cached_customers (id, display_name, active, address_line1, city, state_code, postal_code) VALUES ?',
    [values]
  );
}

const router = Router();

// GET /api/customers — cache-first, fallback a QB
router.get('/', auth, async (_req: Request, res: Response) => {
  await ensureTable();
  try {
    // Verificar si el cache está vigente
    const [[meta]] = await pool.query(
      'SELECT MIN(cached_at) AS oldest FROM cached_customers'
    ) as any[];
    const oldest = meta?.oldest ? new Date(meta.oldest).getTime() : 0;
    const cacheValid = oldest && (Date.now() - oldest < CACHE_TTL_MS);

    if (cacheValid) {
      const [rows] = await pool.query(
        'SELECT id AS Id, display_name AS DisplayName, active AS Active, address_line1 AS AddressLine1, city AS City, state_code AS StateCode, postal_code AS PostalCode FROM cached_customers WHERE active = 1 ORDER BY display_name'
      ) as any[];
      const mapped = (rows as any[]).map(r => ({ ...r, Active: r.Active === 1 || r.Active === true }));
      return res.json({ QueryResponse: { Customer: mapped }, source: 'cache' });
    }

    // Cache expirado o vacío → ir a QB
    const customers = await fetchFromQb();
    await refreshCache(customers).catch(e => logger.warn('Cache refresh failed:', e));
    const normalized = customers.map((c: any) => ({
      Id: c.Id,
      DisplayName: c.DisplayName,
      Active: c.Active,
      AddressLine1: c.BillAddr?.Line1 ?? null,
      City: c.BillAddr?.City ?? null,
      StateCode: c.BillAddr?.CountrySubDivisionCode ?? null,
      PostalCode: c.BillAddr?.PostalCode ?? null,
    }));
    return res.json({ QueryResponse: { Customer: normalized }, source: 'live' });
  } catch (err) {
    // QB falló — intentar devolver cache aunque esté expirado
    try {
      const [rows] = await pool.query(
        'SELECT id AS Id, display_name AS DisplayName, 1 AS Active, address_line1 AS AddressLine1, city AS City, state_code AS StateCode, postal_code AS PostalCode FROM cached_customers ORDER BY display_name'
      ) as any[];
      if ((rows as any[]).length > 0) {
        logger.warn('QB falló, devolviendo cache expirado');
        const mapped = (rows as any[]).map(r => ({ ...r, Active: true }));
        return res.json({ QueryResponse: { Customer: mapped }, source: 'stale_cache' });
      }
    } catch {}
    const message = err instanceof Error ? err.message : 'Error';
    return res.status(500).json({ error: message });
  }
});

// POST /api/customers/refresh — forzar actualización del cache (admin)
router.post('/refresh', auth, adminOnly, async (_req: Request, res: Response) => {
  await ensureTable();
  try {
    const customers = await fetchFromQb();
    await refreshCache(customers);
    res.json({ message: `Cache actualizado: ${customers.length} clientes`, count: customers.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

// GET /api/customers/stats — clientes con totales de pedidos enviados
router.get('/stats', auth, adminOnly, async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(`
      SELECT
        o.customer_id,
        o.customer_name,
        COUNT(DISTINCT o.batch_id) AS batch_count,
        COALESCE(SUM(o.total), 0) AS total_spent,
        MAX(o.created_at) AS last_order_at
      FROM orders o
      WHERE o.customer_id IS NOT NULL AND o.status = 'SENT'
      GROUP BY o.customer_id, o.customer_name
      ORDER BY total_spent DESC
    `) as any[];
    res.json({ data: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

// GET /api/customers/:customerId/orders — batches agrupados por cliente
router.get('/:customerId/orders', auth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = parseInt(req.query.limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    const [[countRow]] = await pool.query(
      'SELECT COUNT(DISTINCT batch_id) as total FROM orders WHERE customer_id = ? AND batch_id IS NOT NULL',
      [customerId]
    ) as any[];

    const [rows] = await pool.query(`
      SELECT
        batch_id,
        customer_id,
        customer_name,
        MIN(created_at)       AS created_at,
        SUM(total)            AS total,
        MAX(qb_invoice_id)    AS qb_invoice_id,
        COUNT(*)              AS item_count,
        MAX(status)           AS status
      FROM orders
      WHERE customer_id = ? AND batch_id IS NOT NULL
      GROUP BY batch_id, customer_id, customer_name
      ORDER BY MIN(created_at) DESC
      LIMIT ? OFFSET ?
    `, [customerId, limitNum, offset]) as any[];

    res.json({ data: rows, meta: { page: pageNum, limit: limitNum, total: countRow.total } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

export default router;
