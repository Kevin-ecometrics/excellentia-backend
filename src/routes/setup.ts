import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/setup
// Inicializa la base de datos sin necesidad de terminal.
// Ejecutar UNA SOLA VEZ después del primer deploy.
// Deshabilitar o proteger este endpoint en producción después de usarlo.
router.get('/', async (_req: Request, res: Response) => {
  const log: string[] = [];

  try {
    // ── 1. Crear tablas ──────────────────────────────────────────────────────
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','operator') DEFAULT 'operator',
        name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        min_price DECIMAL(10,2) NULL,
        stock INT DEFAULT 0,
        qb_item_id VARCHAR(100),
        category VARCHAR(100),
        brand VARCHAR(100),
        weight_per_unit DECIMAL(10,4),
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barcode VARCHAR(100),
        product_name VARCHAR(255),
        price DECIMAL(10,2),
        quantity DECIMAL(10,4),
        total DECIMAL(10,2),
        status ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
        batch_id VARCHAR(100),
        qb_invoice_id VARCHAR(100),
        device_id INT,
        user_id INT,
        customer_id VARCHAR(100),
        customer_name VARCHAR(255),
        signature MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial_number VARCHAR(100) UNIQUE,
        model VARCHAR(100),
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sync_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50),
        entity_id INT,
        action VARCHAR(100),
        qb_status VARCHAR(50),
        qb_id VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
        entity VARCHAR(50) PRIMARY KEY,
        last_sync_at VARCHAR(50)
      )`,
      `CREATE TABLE IF NOT EXISTS qb_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        access_token TEXT,
        refresh_token TEXT,
        token_type VARCHAR(50),
        expires_in INT,
        x_refresh_token_expires_in INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_email VARCHAR(255),
        action VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        details TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) DEFAULT 'EXCELLENTIA',
        subtitle VARCHAR(255) DEFAULT 'Ticket de Venta',
        address VARCHAR(255),
        phone VARCHAR(50),
        city VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS cached_customers (
        id VARCHAR(50) PRIMARY KEY,
        display_name VARCHAR(255) NOT NULL,
        active TINYINT(1) DEFAULT 1,
        address_line1 VARCHAR(255) DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        state_code VARCHAR(20) DEFAULT NULL,
        postal_code VARCHAR(20) DEFAULT NULL,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      "CREATE TABLE IF NOT EXISTS pre_orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, customer_id VARCHAR(100) NOT NULL, customer_name VARCHAR(255) NOT NULL, scheduled_date DATE, notes TEXT, status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
      `CREATE TABLE IF NOT EXISTS pre_order_items (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        pre_order_id INT NOT NULL,
        barcode      VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        price        DECIMAL(10,6) NOT NULL,
        quantity     DECIMAL(10,2) NOT NULL,
        total        DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE
      )`,
    ];

    for (const stmt of tableStatements) {
      await pool.query(stmt);
    }
    log.push('✅ Tablas creadas/verificadas');

    // ── 2. Fila única en company_settings ────────────────────────────────────
    const [[settingsRow]] = await pool.query('SELECT COUNT(*) as n FROM company_settings') as any[];
    if (settingsRow.n === 0) {
      await pool.query("INSERT INTO company_settings (company_name, subtitle) VALUES ('EXCELLENTIA', 'Ticket de Venta')");
      log.push('✅ company_settings inicializado');
    } else {
      log.push('ℹ️  company_settings ya existe');
    }

    // ── 3. Crear admin ────────────────────────────────────────────────────────
    const [[userRow]] = await pool.query(
      'SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']
    ) as any[];

    if (!userRow) {
      const hashed = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
        ['admin@excellentia.com', hashed, 'admin', 'Administrador']
      );
      log.push('✅ Admin creado — email: admin@excellentia.com  password: admin123');
      log.push('⚠️  IMPORTANTE: cambia la contraseña desde la webapp inmediatamente.');
    } else {
      log.push('ℹ️  Admin ya existe');
    }

    // ── 4. sync_meta inicial ──────────────────────────────────────────────────
    await pool.query(
      `INSERT IGNORE INTO sync_meta (entity, last_sync_at) VALUES ('product', '2000-01-01T00:00:00.000Z')`
    );
    log.push('✅ sync_meta inicializado');

    log.push('');
    log.push('🎉 Setup completado. Próximos pasos:');
    log.push('   1. Abre /api/qb/auth para conectar QuickBooks');
    log.push('   2. Desde la webapp: Productos → Sincronizar QB');
    log.push('   3. Configura los datos de tu empresa en la webapp → Configuración');

    return res.json({ ok: true, log });
  } catch (err: any) {
    log.push(`❌ Error: ${err.message}`);
    return res.status(500).json({ ok: false, log, error: err.message });
  }
});

export default router;
