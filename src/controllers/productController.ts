import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { AppError } from '../types/index.ts';
import logger from '../services/logger.ts';
import { updateItemQtyOnHand, updateItemMeta, getItemById } from '../services/qbItems.ts';
import skuMigrationInput from '../data/sku-migration-input.json';

// mysql2 devuelve TINYINT(1) como number (0/1), no como boolean JS/JSON.
// Android (Gson, Boolean estricto) tira excepción al parsear un número donde
// espera true/false — rompe silenciosamente cualquier response que incluya
// qb_active sin normalizar (findByBarcode, búsqueda por nombre, etc).
export function normalizeQbActive<T extends { qb_active?: unknown }>(row: T): T {
  return { ...row, qb_active: row.qb_active == null ? null : !!row.qb_active };
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const qb = req.query.qb as string;
    const stock = req.query.stock as string;
    const sort = req.query.sort as string;
    const offset = (page - 1) * limit;

    // qb_active = 0 → el item está inactivo/borrado en QuickBooks. NULL significa
    // "nunca sincronizado desde que existe este campo" y no se excluye.
    const conditions: string[] = ['hidden = 0', '(qb_active IS NULL OR qb_active = 1)'];
    const params: any[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR barcode LIKE ? OR sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (qb === 'synced') {
      conditions.push('qb_item_id IS NOT NULL');
    } else if (qb === 'unsynced') {
      conditions.push('qb_item_id IS NULL');
    }

    if (stock === 'outofstock') {
      conditions.push('stock = 0');
    } else if (stock === 'lowstock') {
      conditions.push('stock BETWEEN 1 AND 5');
    } else if (stock === 'instock') {
      conditions.push('stock > 5');
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    // sort=sku → secuencia NEW_SKU (prefijo de marca A-Z, luego número 001, 002...);
    // filas sin sku con formato válido van al final. Default: más recientes primero.
    let orderBy = 'ORDER BY created_at DESC';
    if (sort === 'sku') {
      orderBy = `ORDER BY
        (sku IS NULL OR sku NOT REGEXP '^[A-Z]{3,4}[0-9]{3}$'),
        CASE WHEN sku REGEXP '^[A-Z]{3,4}[0-9]{3}$' THEN LEFT(sku, LENGTH(sku) - 3) END,
        CASE WHEN sku REGEXP '^[A-Z]{3,4}[0-9]{3}$' THEN CAST(RIGHT(sku, 3) AS UNSIGNED) END,
        created_at DESC`;
    }
    const query = `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`;
    const countQuery = `SELECT COUNT(*) as total FROM products ${where}`;

    const [rows] = await pool.query(query, [...params, limit, offset]) as any[];
    const [countResult] = await pool.query(countQuery, params) as any[];

    res.json({
      data: (rows as any[]).map(normalizeQbActive),
      meta: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (err) {
    logger.error('listProducts error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT category FROM products WHERE hidden = 0 AND (qb_active IS NULL OR qb_active = 1) AND category IS NOT NULL ORDER BY category"
    ) as any[];
    res.json({ data: rows.map((r: any) => r.category) });
  } catch (err) {
    logger.error('listCategories error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getProductByBarcode(req: Request, res: Response): Promise<void> {
  try {
    const { barcode } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE barcode = ? AND hidden = 0 AND (qb_active IS NULL OR qb_active = 1)',
      [barcode]
    ) as any[];
    if (rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ data: normalizeQbActive(rows[0]) });
  } catch (err) {
    logger.error('getProductByBarcode error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { barcode, sku, name, short_name, price, min_price, category, brand, stock, description, unit, qty, weight_per_unit } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: 'Nombre y precio requeridos' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO products (barcode, sku, name, short_name, price, min_price, category, brand, stock, description, unit, qty, weight_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [barcode ?? null, sku ?? null, name, short_name ?? null, price, min_price ?? null, category ?? null, brand ?? null, stock ?? 0, description ?? null, unit ?? null, qty ?? 0, weight_per_unit ?? null]
    ) as any;

    res.status(201).json({ id: result.insertId, barcode, sku, name, price });
  } catch (err) {
    logger.error('createProduct error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { barcode, sku, name, short_name, price, min_price, category, brand, stock, description, unit, qty, weight_per_unit } = req.body;

    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const fields: string[] = [];
    const values: any[] = [];

    // barcode es puramente interno (código físico escaneado) — QBO no tiene un campo
    // de barcode nativo, así que nunca se empuja a QBO. sku es lo que sí tiene
    // contraparte real (Item.Sku) y es lo único que dispara updateItemMeta abajo.
    if (barcode !== undefined) { fields.push('barcode = ?'); values.push(barcode ?? null); }
    if (sku !== undefined) { fields.push('sku = ?'); values.push(sku ?? null); }
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (short_name !== undefined) { fields.push('short_name = ?'); values.push(short_name ?? null); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (min_price !== undefined) { fields.push('min_price = ?'); values.push(min_price ?? null); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category ?? null); }
    if (brand !== undefined) { fields.push('brand = ?'); values.push(brand ?? null); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description ?? null); }
    if (unit !== undefined) { fields.push('unit = ?'); values.push(unit ?? null); }
    if (qty !== undefined) { fields.push('qty = ?'); values.push(qty); }
    if (weight_per_unit !== undefined) { fields.push('weight_per_unit = ?'); values.push(weight_per_unit ?? null); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    // Obtener qb_item_id una sola vez
    const [productRows] = await pool.query('SELECT qb_item_id FROM products WHERE id = ?', [id]) as any[];
    const qbItemId = productRows[0]?.qb_item_id;

    // Sync nombre, descripción, SKU y/o precio a QBO si se actualizaron. barcode
    // queda afuera a propósito — es un campo interno sin contraparte en QBO.
    if (name !== undefined || description !== undefined || sku !== undefined || price !== undefined) {
      if (qbItemId) {
        try {
          await updateItemMeta(qbItemId, {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(sku !== undefined && { sku }),
            ...(price !== undefined && { unitPrice: Number(price) }),
          });
          logger.info(`QBO actualizado: producto ${id}, qb_item_id=${qbItemId}`);
        } catch (qbErr) {
          logger.warn(`No se pudo sincronizar a QBO para producto ${id}:`, qbErr);
        }
      }
    }

    // Sync stock a QBO si se actualizó el campo stock
    if (stock !== undefined && qbItemId) {
      try {
        const result = await updateItemQtyOnHand(qbItemId, stock);
        if (result) {
          logger.info(`Stock QBO actualizado: producto ${id}, qb_item_id=${qbItemId}, qty=${stock}`);
        } else {
          logger.warn(`Producto ${id} (qb_item_id=${qbItemId}) no es tipo Inventory en QBO — stock no sincronizado`);
        }
      } catch (qbErr) {
        logger.warn(`No se pudo sincronizar stock a QBO para producto ${id}:`, qbErr);
      }
    }

    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    logger.error('updateProduct error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getProductPriceHistory(req: Request, res: Response): Promise<void> {
  try {
    const { barcode } = req.params;
    const customerId = req.query.customer_id as string;

    if (!customerId) {
      res.status(400).json({ error: 'customer_id es requerido' });
      return;
    }

    const [productRows] = await pool.query('SELECT * FROM products WHERE barcode = ?', [barcode]) as any[];
    const product = productRows[0] ?? null;

    const [historyRows] = await pool.query(
      `SELECT price, quantity, total, batch_id, qb_invoice_id as invoice_id, created_at as date
       FROM orders
       WHERE customer_id = ? AND barcode = ? AND status IN ('SENT','PENDING')
       ORDER BY created_at DESC
       LIMIT 10`,
      [customerId, barcode]
    ) as any[];

    res.json({
      product: product ? {
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        min_price: product.min_price,
      } : null,
      history: historyRows,
    });
  } catch (err) {
    logger.error('getProductPriceHistory error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── migrateSkuNomenclature (one-time) ────────────────────────────────────────
// Adopta la nomenclatura NEW_SKU (marca de 3 letras + secuencia, ej. REY001)
// calculada a partir del master sheet Excellentia-vs-QBO. sku es el campo que
// sincroniza con QBO (barcode nunca — ver "SKU (QBO) vs barcode" en CLAUDE.md),
// así que cada cambio de sku acá dispara el mismo push a QBO que editar el campo
// SKU a mano en el modal (updateItemMeta). Corre PAGINADO (?offset&limit) para no
// pisar el timeout del proxy de cPanel en una corrida de varios minutos, y en modo
// dry-run por default — hace falta ?apply=true para escribir de verdad.
// POST /api/products/migrate-sku?apply=true&offset=0&limit=25 — SOLO POST (el router
// no registra GET; un fetch sin method:'POST' responde 404).
//
// Robustez (endurecido para re-corridas seguras sobre las mismas páginas):
// - La decisión de push a QBO se toma contra el Sku VIVO del item en QBO
//   (getItemById), NO contra el sku local: si una corrida anterior aplicó el sku
//   local pero el push a QBO falló, la re-corrida detecta el desajuste y
//   reintenta el push (auto-curativo — no quedan desyncs silenciosos).
// - Error por fila: un fallo de MySQL/QBO en una fila se reporta en esa fila
//   (status:'error' + db_error) y NO aborta la página completa con 500.
// - Duplicados de new_sku dentro del archivo: detectados sobre el JSON completo,
//   las filas repetidas se omiten (la primera aparición gana) — evita el
//   choque de UNIQUE en products.sku.
// - Colisión de new_sku contra la DB: pre-check (SELECT id ... WHERE sku = ? AND
//   id <> ?) antes del UPDATE, con mensaje claro por fila.
// - Tricky: QBO puede no tener Sku (null) — en ese caso el push se dispara igual
//   (updateItemMeta manda Sku: '' si fields.sku es null, pero acá siempre llega
//   un string con row.new_sku).
// - Match por nombre normalizado (segunda corrida): los nombres de QBO del master
//   sheet llevan prefijo de unidad ("Units:", "Pounds:", "Case/Bucket:", "Case:")
//   que los productos locales no tienen — los items con qbo_sku null quedaban
//   not_found sin razón. Se intenta un tercer match quitando ese prefijo del
//   qbo_name y comparando exacto contra products.name (db_match: 'name_normalized').
interface SkuMigrationRow {
  match_status: 'MATCHED' | 'ONLY_IN_QBO' | 'ONLY_IN_EXCELLENTIA';
  new_sku: string;
  excellentia_name: string | null;
  excellentia_pkg: string | null;
  qbo_sku: string | null;
  qbo_name: string | null;
  qbo_desc: string | null;
  target_unit: string | null;
  target_qty: number | null;
}

const SKU_MIGRATION_NAME_PREFIX_RE = /^(Units|Pounds|Case\/Bucket|Case)\s*:/i;

function stripSkuMigrationNamePrefix(name: string): string {
  return name.replace(SKU_MIGRATION_NAME_PREFIX_RE, '').trim();
}

async function findProductForSkuMigration(row: SkuMigrationRow): Promise<{ match: string; product: any | null }> {
  if (row.qbo_sku) {
    const [rows] = await pool.query('SELECT * FROM products WHERE barcode = ?', [row.qbo_sku]) as any[];
    if (rows.length === 1) return { match: 'barcode', product: rows[0] };
    if (rows.length > 1) return { match: 'ambiguous', product: null };
  }
  if (row.qbo_name) {
    const [rows] = await pool.query('SELECT * FROM products WHERE name = ?', [row.qbo_name]) as any[];
    if (rows.length === 1) return { match: 'name', product: rows[0] };
    if (rows.length > 1) return { match: 'ambiguous', product: null };
  }
  if (row.qbo_name) {
    const normalized = stripSkuMigrationNamePrefix(row.qbo_name);
    if (normalized !== row.qbo_name) {
      const [rows] = await pool.query('SELECT * FROM products WHERE name = ?', [normalized]) as any[];
      if (rows.length === 1) return { match: 'name_normalized', product: rows[0] };
      if (rows.length > 1) return { match: 'ambiguous', product: null };
    }
  }
  return { match: 'not_found', product: null };
}

const SKU_MIGRATION_QBO_DELAY_MS = 400;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function migrateSkuNomenclature(req: Request, res: Response): Promise<void> {
  try {
    const apply = req.query.apply === 'true';
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 50);

    const allRows = skuMigrationInput as unknown as SkuMigrationRow[];
    const end = Math.min(offset + limit, allRows.length);
    const results: any[] = [];

    // Duplicados de new_sku dentro del archivo — la primera aparición gana.
    const newSkuFirstSeen = new Map<string, number>();
    const duplicateNewSkus: { new_sku: string; first_index: number; duplicate_index: number }[] = [];
    allRows.forEach((row, idx) => {
      const first = newSkuFirstSeen.get(row.new_sku);
      if (first === undefined) {
        newSkuFirstSeen.set(row.new_sku, idx);
      } else {
        duplicateNewSkus.push({ new_sku: row.new_sku, first_index: first, duplicate_index: idx });
      }
    });

    for (let i = offset; i < end; i++) {
      const row = allRows[i]!;
      try {
        // 1) new_sku repetido en el archivo → omitir (evita UNIQUE en MySQL)
        const firstIndex = newSkuFirstSeen.get(row.new_sku)!;
        if (firstIndex !== i) {
          results.push({
            new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: null, product_id: null,
            sku_changed: false, unit_filled: null, qty_filled: null,
            qbo_push: 'skipped', qbo_status: null, qbo_error: null,
            status: 'error', db_error: `new_sku duplicado en sku-migration-input.json — ya procesado en la fila ${firstIndex}`,
          });
          continue;
        }

        if (row.match_status === 'ONLY_IN_EXCELLENTIA') {
          results.push({
            new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: 'not_found', product_id: null,
            sku_changed: false, unit_filled: null, qty_filled: null,
            qbo_push: 'skipped', qbo_status: null, qbo_error: null,
            status: 'skipped', db_error: null,
            note: 'No existe en products (nunca vino de QBO) — no se puede actualizar, hay que crearlo aparte',
          });
          continue;
        }

        const { match, product } = await findProductForSkuMigration(row);
        if (!product) {
          results.push({
            new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: match, product_id: null,
            sku_changed: false, unit_filled: null, qty_filled: null,
            qbo_push: 'skipped', qbo_status: null, qbo_error: null,
            status: 'skipped', db_error: null,
            note: match === 'ambiguous' ? 'Más de 1 producto local coincide — revisar a mano' : 'No se encontró el producto en products',
          });
          continue;
        }

        const needsSkuUpdate = product.sku !== row.new_sku;
        const needsUnitFill = (!product.unit || product.unit === '') && !!row.target_unit;
        const needsQtyFill = (!product.qty || product.qty === 0) && !!row.target_qty;

        // 2) Colisión: otro producto ya usa ese sku (products.sku es UNIQUE) — se
        //    reporta como error de fila en vez de dejar que el UPDATE reviente.
        if (needsSkuUpdate) {
          const [collisionRows] = await pool.query(
            'SELECT id FROM products WHERE sku = ? AND id <> ?', [row.new_sku, product.id]
          ) as any[];
          if (collisionRows.length > 0) {
            results.push({
              new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: match, product_id: product.id,
              sku_changed: false, unit_filled: null, qty_filled: null,
              qbo_push: 'skipped', qbo_status: null, qbo_error: null,
              status: 'error', db_error: `new_sku "${row.new_sku}" ya lo usa el producto id=${collisionRows[0].id} — revisar a mano`,
            });
            continue;
          }
        }

        // 3) Estado vivo del Sku en QBO (lectura pura). La decisión de push se toma
        //    contra ESTE valor y no contra el sku local: si una corrida previa
        //    aplicó el sku local pero el push a QBO falló, la re-corrida detecta el
        //    desajuste y reintenta (auto-curativo). Si QBO no responde (undefined)
        //    se asume que hay que empujar — un push fallido se reporta por fila.
        let qboLiveSku: string | null | undefined;
        if (product.qb_item_id) {
          try {
            const qboItem = await getItemById(product.qb_item_id);
            const raw = qboItem?.Sku;
            qboLiveSku = raw == null || raw === '' ? null : String(raw).trim();
          } catch (err) {
            qboLiveSku = undefined;
          }
        }

        const qboStatus: string = !product.qb_item_id
          ? 'no_qb_item_id'
          : qboLiveSku === undefined
            ? 'unverified'
            : qboLiveSku === row.new_sku
              ? 'synced'
              : 'needs_push';
        const needsQboPush = !!product.qb_item_id && qboLiveSku !== row.new_sku;

        if (!needsSkuUpdate && !needsUnitFill && !needsQtyFill && !needsQboPush) {
          results.push({
            new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: match, product_id: product.id,
            sku_changed: false, unit_filled: null, qty_filled: null,
            qbo_push: 'skipped', qbo_status: qboStatus, qbo_error: null,
            status: 'skipped', db_error: null,
            note: 'Ya estaba al día, nada que hacer',
          });
          continue;
        }

        // 4) Ejecutar (apply) o simular (dry-run). El UPDATE solo toca sku/unit/qty
        //    (unit/qty solo si estaban vacíos) — nunca name, price, stock, barcode.
        let qboPush = 'skipped';
        let qboError: string | null = null;

        if (apply) {
          const fields: string[] = ['sku = ?'];
          const values: any[] = [row.new_sku];
          if (needsUnitFill) { fields.push('unit = ?'); values.push(row.target_unit); }
          if (needsQtyFill) { fields.push('qty = ?'); values.push(row.target_qty); }
          await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, [...values, product.id]);

          if (needsQboPush) {
            try {
              await updateItemMeta(product.qb_item_id, { sku: row.new_sku });
              qboPush = 'ok';
            } catch (err: any) {
              qboPush = 'failed';
              qboError = err?.message ?? String(err);
              logger.warn(`migrateSkuNomenclature: QBO push falló para ${row.new_sku} (qb_item_id=${product.qb_item_id}): ${qboError}`);
            }
            await sleep(SKU_MIGRATION_QBO_DELAY_MS);
          }
        }

        results.push({
          new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: match, product_id: product.id,
          sku_changed: needsSkuUpdate, unit_filled: needsUnitFill ? row.target_unit : null,
          qty_filled: needsQtyFill ? row.target_qty : null,
          qbo_push: qboPush, qbo_status: qboStatus, qbo_error: qboError,
          status: apply ? 'applied' : 'dry_run', db_error: null,
          note: apply ? null : '[DRY RUN] nada se escribió todavía',
        });
      } catch (rowErr: any) {
        // Error inesperado por fila — no aborta la página, se reporta y se sigue.
        logger.warn(`migrateSkuNomenclature: fila ${row.new_sku} falló:`, rowErr);
        results.push({
          new_sku: row.new_sku, qbo_name: row.qbo_name, db_match: null, product_id: null,
          sku_changed: false, unit_filled: null, qty_filled: null,
          qbo_push: 'skipped', qbo_status: null, qbo_error: null,
          status: 'error', db_error: rowErr?.message ?? String(rowErr),
        });
      }
    }

    const nextOffset = end < allRows.length ? end : null;
    res.json({
      apply, offset, limit, total: allRows.length, next_offset: nextOffset,
      warnings: { duplicate_new_skus: duplicateNewSkus },
      summary: {
        processed: results.length,
        updated_locally: results.filter(r => r.sku_changed || r.unit_filled || r.qty_filled).length,
        qbo_pushed_ok: results.filter(r => r.qbo_push === 'ok').length,
        qbo_push_failed: results.filter(r => r.qbo_push === 'failed').length,
        needs_qbo_push: results.filter(r => r.qbo_status === 'needs_push').length,
        no_qb_item_id: results.filter(r => r.qbo_status === 'no_qb_item_id').length,
        not_found: results.filter(r => r.db_match === 'not_found').length,
        ambiguous: results.filter(r => r.db_match === 'ambiguous').length,
        db_failed: results.filter(r => r.status === 'error').length,
      },
      results,
    });
  } catch (err) {
    logger.error('migrateSkuNomenclature error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]) as any[];
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    logger.error('deleteProduct error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
