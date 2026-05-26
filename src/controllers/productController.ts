import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import { AppError } from '../types/index.ts';
import logger from '../services/logger.ts';
import { updateItemQtyOnHand, updateItemMeta } from '../services/qbItems.ts';

export async function listProducts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM products WHERE hidden = 0';
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE hidden = 0';
    const params: any[] = [];
    const countParams: any[] = [];

    if (search) {
      const where = ' AND (name LIKE ? OR barcode LIKE ?)';
      query += where;
      countQuery += where;
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params) as any[];
    const [countResult] = await pool.query(countQuery, countParams) as any[];

    res.json({
      data: rows,
      meta: { page, limit, total: countResult[0].total },
    });
  } catch (err) {
    logger.error('listProducts error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getProductByBarcode(req: Request, res: Response): Promise<void> {
  try {
    const { barcode } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE barcode = ? AND hidden = 0', [barcode]) as any[];
    if (rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    logger.error('getProductByBarcode error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { barcode, name, price, min_price, category, brand, stock, description, weight_per_unit } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: 'Nombre y precio requeridos' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO products (barcode, name, price, min_price, category, brand, stock, description, weight_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [barcode ?? null, name, price, min_price ?? null, category ?? null, brand ?? null, stock ?? 0, description ?? null, weight_per_unit ?? null]
    ) as any;

    res.status(201).json({ id: result.insertId, barcode, name, price });
  } catch (err) {
    logger.error('createProduct error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { barcode, name, price, min_price, category, brand, stock, weight_per_unit, description } = req.body;

    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (barcode !== undefined) { fields.push('barcode = ?'); values.push(barcode ?? null); }
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (min_price !== undefined) { fields.push('min_price = ?'); values.push(min_price ?? null); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category ?? null); }
    if (brand !== undefined) { fields.push('brand = ?'); values.push(brand ?? null); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description ?? null); }
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

    // Sync nombre, descripción, barcode (SKU) y/o precio a QBO si se actualizaron
    if (name !== undefined || description !== undefined || barcode !== undefined || price !== undefined) {
      if (qbItemId) {
        try {
          await updateItemMeta(qbItemId, {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(barcode !== undefined && { sku: barcode }),
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
