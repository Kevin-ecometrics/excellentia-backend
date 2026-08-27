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
        id                       INT AUTO_INCREMENT PRIMARY KEY,
        email                    VARCHAR(255) NOT NULL UNIQUE,
        name                     VARCHAR(255) NULL,
        password                 VARCHAR(255) NOT NULL,
        refresh_token            TEXT NULL,
        refresh_token_expires_at BIGINT NULL,
        role                     ENUM('admin','operator','almacenista') NOT NULL DEFAULT 'operator',
        created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS products (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        barcode         VARCHAR(50) UNIQUE,
        sku             VARCHAR(50) UNIQUE,
        name            VARCHAR(255) NOT NULL,
        short_name      VARCHAR(255) NULL,
        price           DECIMAL(10,2) NOT NULL,
        min_price       DECIMAL(10,2) NULL,
        category        VARCHAR(100),
        brand           VARCHAR(100),
        stock           INT DEFAULT 0,
        hidden          TINYINT(1) NOT NULL DEFAULT 0,
        description     TEXT NULL,
        weight_per_unit DECIMAL(10,2) NULL,
        unit            VARCHAR(20) DEFAULT NULL,
        qty             INT NOT NULL DEFAULT 0,
        qb_item_id      VARCHAR(50),
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS devices (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100),
        model           VARCHAR(100),
        serial_number   VARCHAR(100) UNIQUE,
        last_connection TIMESTAMP NULL,
        status          ENUM('ONLINE','OFFLINE','UNKNOWN') DEFAULT 'UNKNOWN',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS scan_entries (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        barcode    VARCHAR(50) NOT NULL,
        product_id INT,
        device_id  INT,
        scanned_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (device_id)  REFERENCES devices(id),
        FOREIGN KEY (scanned_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS orders (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        barcode       VARCHAR(50) NOT NULL,
        product_name  VARCHAR(255) NOT NULL,
        price         DECIMAL(10,2) NOT NULL,
        quantity      DECIMAL(10,2) NOT NULL,
        total         DECIMAL(10,2) NOT NULL,
        batch_id      VARCHAR(50),
        device_id     INT,
        user_id       INT,
        customer_id   VARCHAR(50) NULL,
        customer_name VARCHAR(255) NULL,
        qb_invoice_id VARCHAR(50),
        status        ENUM('PENDING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
        error_log     TEXT,
        retry_count   INT DEFAULT 0,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id),
        FOREIGN KEY (user_id)   REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sync_log (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id   INT NOT NULL,
        action      VARCHAR(50) NOT NULL,
        qb_status   ENUM('SUCCESS','FAILED') NOT NULL,
        qb_id       VARCHAR(50),
        error       TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS qb_tokens (
        id                        INT AUTO_INCREMENT PRIMARY KEY,
        access_token              TEXT NOT NULL,
        refresh_token             TEXT NOT NULL,
        realm_id                  VARCHAR(50),
        expires_in                INT,
        x_refresh_token_expires_in INT,
        token_created_at          BIGINT NULL,
        created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS batch_damage (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        batch_id     VARCHAR(100) NOT NULL,
        barcode      VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        qty          INT NOT NULL DEFAULT 0,
        unit_price   DECIMAL(10,2) NULL,
        amount       DECIMAL(10,2) NULL,
        qb_item_id   VARCHAR(64) NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_batch_damage_batch_id (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS credit_transactions (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        customer_id       VARCHAR(64) NULL,
        customer_name     VARCHAR(255) NULL,
        type              ENUM('EARNED','USED') NOT NULL,
        amount            DECIMAL(10,2) NOT NULL,
        reference_batch_id VARCHAR(100) NULL,
        invoice_id        VARCHAR(50) NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ct_customer (customer_id),
        INDEX idx_ct_batch (reference_batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS batch_signatures (
        batch_id   VARCHAR(100) PRIMARY KEY,
        signature  MEDIUMTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        entity       VARCHAR(50) NOT NULL UNIQUE,
        last_sync_at VARCHAR(50) NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS activity_log (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NULL,
        user_email  VARCHAR(255) NULL,
        action      VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NULL,
        entity_id   VARCHAR(50) NULL,
        details     TEXT NULL,
        ip          VARCHAR(45) NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS cached_customers (
        id           VARCHAR(50) PRIMARY KEY,
        display_name VARCHAR(255) NOT NULL,
        active       TINYINT(1) DEFAULT 1,
        address_line1 VARCHAR(255) DEFAULT NULL,
        city         VARCHAR(100) DEFAULT NULL,
        state_code   VARCHAR(20) DEFAULT NULL,
        postal_code  VARCHAR(20) DEFAULT NULL,
        cached_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS company_settings (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL DEFAULT 'EXCELLENTIA',
        subtitle     VARCHAR(255) NOT NULL DEFAULT 'Ticket de Venta',
        address      VARCHAR(255) DEFAULT NULL,
        phone        VARCHAR(50) DEFAULT NULL,
        city            VARCHAR(100) DEFAULT NULL,
        invoice_counter INT NOT NULL DEFAULT 51551,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS pre_orders (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        user_id          INT,
        assigned_user_id INT DEFAULT NULL,
        customer_id      VARCHAR(100) NOT NULL,
        customer_name    VARCHAR(255) NOT NULL,
        salesperson_name VARCHAR(255) DEFAULT NULL,
        scheduled_date   DATE,
        notes            TEXT,
        status           ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS pre_order_items (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        pre_order_id INT NOT NULL,
        barcode      VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        price        DECIMAL(10,6) DEFAULT NULL,
        quantity     DECIMAL(10,2) DEFAULT NULL,
        total        DECIMAL(10,2) DEFAULT NULL,
        unit         VARCHAR(20) DEFAULT NULL,
        case_qty     INT DEFAULT NULL,
        FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS routes (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(255) NOT NULL,
        scheduled_date  DATE NOT NULL,
        driver_user_id  INT DEFAULT NULL,
        status          ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
        notes           TEXT DEFAULT NULL,
        created_by      INT DEFAULT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS route_stops (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        route_id      INT NOT NULL,
        position      INT NOT NULL,
        stop_type     ENUM('BATCH','PRE_ORDER') NOT NULL,
        batch_id      VARCHAR(50) DEFAULT NULL,
        pre_order_id  INT DEFAULT NULL,
        customer_id   VARCHAR(50) DEFAULT NULL,
        customer_name VARCHAR(255) DEFAULT NULL,
        status        ENUM('PENDING','DELIVERED','SKIPPED') DEFAULT 'PENDING',
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    for (const stmt of tableStatements) {
      await pool.query(stmt);
    }
    log.push('✅ Tablas creadas/verificadas');

    // ── 2. Fila única en company_settings ────────────────────────────────────
    const [[settingsRow]] = await pool.query('SELECT COUNT(*) as n FROM company_settings') as any[];
    if (settingsRow.n === 0) {
      await pool.query("INSERT INTO company_settings (company_name, subtitle, invoice_counter) VALUES ('EXCELLENTIA', 'Ticket de Venta', 51551)");
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

    // ── 4. Migraciones para bases existentes ─────────────────────────────────
    const migrations: [string, string][] = [
      ["INSERT IGNORE INTO batch_signatures (batch_id, signature) SELECT batch_id, signature FROM orders WHERE signature IS NOT NULL AND batch_id IS NOT NULL GROUP BY batch_id", "firmas migradas a batch_signatures"],
      ["ALTER TABLE orders DROP COLUMN IF EXISTS signature",         "orders.signature eliminada"],
      ["ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER stock", "products.hidden agregada"],
      ["ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER hidden",               "products.description agregada"],
      ["ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT NULL",                            "users.refresh_token agregada"],
      ["ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at BIGINT NULL",               "users.refresh_token_expires_at agregada"],
      ["ALTER TABLE qb_tokens ADD COLUMN IF NOT EXISTS realm_id VARCHAR(50)",                           "qb_tokens.realm_id agregada"],
      ["ALTER TABLE qb_tokens ADD COLUMN IF NOT EXISTS token_created_at BIGINT NULL",                   "qb_tokens.token_created_at agregada"],
      ["ALTER TABLE products ADD COLUMN IF NOT EXISTS qb_active TINYINT(1) NULL DEFAULT NULL AFTER qb_item_id", "products.qb_active agregada"],
      ["ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NULL", "orders.unit agregada"],
      ["ALTER TABLE orders ADD COLUMN IF NOT EXISTS case_qty INT NULL", "orders.case_qty agregada"],
      ["ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NULL", "batch_damage.unit_price agregada"],
      ["ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NULL", "batch_damage.amount agregada"],
      ["ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NULL", "orders.payment_method agregada"],
      ["ALTER TABLE orders ADD COLUMN IF NOT EXISTS check_number VARCHAR(20) NULL", "orders.check_number agregada"],
      ["ALTER TABLE orders ADD COLUMN IF NOT EXISTS credit_applied DECIMAL(10,2) NULL", "orders.credit_applied agregada"],
      ["ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS qb_item_id VARCHAR(64) NULL", "batch_damage.qb_item_id agregada"],
      ["ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS qb_credit_apply_item_id VARCHAR(50) NULL", "company_settings.qb_credit_apply_item_id agregada"],
      ["INSERT IGNORE INTO credit_transactions (customer_id, customer_name, type, amount, reference_batch_id, created_at) SELECT customer_id, customer_name, 'EARNED', amount, batch_id, created_at FROM customer_credits", "customer_credits migrados a credit_transactions"],
      ["ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS salesperson_name VARCHAR(255) DEFAULT NULL", "pre_orders.salesperson_name agregada"],
      ["ALTER TABLE pre_order_items MODIFY COLUMN price DECIMAL(10,6) NULL DEFAULT NULL", "pre_order_items.price ahora nullable"],
      ["ALTER TABLE pre_order_items MODIFY COLUMN quantity DECIMAL(10,2) NULL DEFAULT NULL", "pre_order_items.quantity ahora nullable"],
      ["ALTER TABLE pre_order_items MODIFY COLUMN total DECIMAL(10,2) NULL DEFAULT NULL", "pre_order_items.total ahora nullable"],
      ["ALTER TABLE pre_order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT NULL", "pre_order_items.unit agregada"],
      ["ALTER TABLE pre_order_items ADD COLUMN IF NOT EXISTS case_qty INT DEFAULT NULL", "pre_order_items.case_qty agregada"],
      // Fusión de tipos "Case" + "Unit" en uno solo, "Case/Unit" — solo el catálogo
      // vivo (products); las órdenes/pre-órdenes ya facturadas conservan su unit
      // histórico tal cual se vendieron (app y webapp ya tratan "Case"/"Unit" viejos
      // como equivalentes a "Case/Unit" en la lectura, así que no hace falta tocarlas).
      ["UPDATE products SET unit = 'Case/Unit' WHERE unit IN ('Case', 'Unit')", "products.unit — Case/Unit fusionados"],
      ["ALTER TABLE products ADD COLUMN IF NOT EXISTS short_name VARCHAR(255) NULL AFTER name", "products.short_name agregada"],
      ["ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS assigned_user_id INT DEFAULT NULL AFTER user_id", "pre_orders.assigned_user_id agregada"],
      ["ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE AFTER barcode", "products.sku agregada"],
      ["UPDATE products SET sku = barcode WHERE sku IS NULL AND barcode IS NOT NULL", "products.sku — backfill desde barcode"],
      ["ALTER TABLE users MODIFY COLUMN role ENUM('admin','operator','almacenista') NOT NULL DEFAULT 'operator'", "users.role: agregado almacenista"],
    ];
    for (const [sql, label] of migrations) {
      try {
        await pool.query(sql);
        log.push(`✅ Migración: ${label}`);
      } catch (e: any) {
        log.push(`⚠️  Migración omitida (${label}): ${e.message}`);
      }
    }

    // ── 5. sync_meta inicial ──────────────────────────────────────────────────
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
