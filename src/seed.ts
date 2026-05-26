import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from './db/connection.ts';
import { findAllItems } from './services/qbItems.ts';

async function seed() {
  console.log('Iniciando seed...');

  // 1. Crear tablas
  const fs = await import('fs');
  const schema = fs.readFileSync(new URL('./db/schema.sql', import.meta.url), 'utf-8');
  const statements = schema.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      console.warn('Schema warning:', err.message);
    }
  }
  console.log('Tablas creadas/verificadas');

  // 2. Crear admin user
  const hashed = await bcrypt.hash('admin123', 10);
  try {
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      ['admin@excellentia.com', hashed, 'admin']
    );
    console.log('Admin user creado: admin@excellentia.com / admin123');
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('Admin user ya existe');
    } else {
      throw err;
    }
  }

  // 3. Sincronizar items de QBO a MySQL (opcional — requiere OAuth previo)
  // Si los tokens no existen o están expirados, se omite sin fallar el seed.
  // Para sincronizar QB: primero completa el flujo en /api/qb/auth,
  // luego llama POST /api/admin/sync-products o corre este seed de nuevo.
  console.log('Consultando items desde QuickBooks...');
  try {
    const items = await findAllItems();
    console.log(`Encontrados ${items.length} items en QBO`);

    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const [existing] = await pool.query(
        'SELECT id FROM products WHERE qb_item_id = ?',
        [item.Id]
      ) as any[];

      const barcode = `QBO-${item.Id}`;
      const category = item.IncomeAccountRef?.name ?? null;
      if (existing.length > 0) {
        await pool.query(
          'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, updated_at = NOW() WHERE qb_item_id = ?',
          [item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, category, item.Id]
        );
        updated++;
      } else {
        await pool.query(
          'INSERT INTO products (barcode, name, price, stock, qb_item_id, category) VALUES (?, ?, ?, ?, ?, ?)',
          [barcode, item.Name, item.UnitPrice ?? 0, item.QtyOnHand ?? 0, item.Id, category]
        );
        inserted++;
      }
    }

    console.log(`Productos: ${inserted} insertados, ${updated} actualizados`);

    // Inicializar sync_meta
    try {
      await pool.query("INSERT INTO sync_meta (entity, last_sync_at) VALUES ('product', ?)", [new Date().toISOString()]);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        await pool.query("UPDATE sync_meta SET last_sync_at = ? WHERE entity = 'product'", [new Date().toISOString()]);
      }
    }
  } catch (err: any) {
    console.warn('⚠️  QB sync omitido:', err.message ?? err);
    console.warn('   → Completa el OAuth en /api/qb/auth y luego sincroniza desde la webapp.');
  }

  console.log('Seed completado exitosamente');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
