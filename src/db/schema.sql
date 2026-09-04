-- =============================================================================
-- Excellentia Backend — Schema completo
-- Generado para importar en phpMyAdmin / cPanel
-- Incluye todas las tablas del sistema (schema.sql + tablas dinámicas)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`                        INT AUTO_INCREMENT PRIMARY KEY,
    `email`                     VARCHAR(255) NOT NULL UNIQUE,
    `name`                      VARCHAR(255) NULL,
    `password`                  VARCHAR(255) NOT NULL,
    `refresh_token`             TEXT NULL,
    `refresh_token_expires_at`  BIGINT NULL,
    `role`                      ENUM('admin', 'operator', 'almacenista') NOT NULL DEFAULT 'operator',
    `qb_class_id`               VARCHAR(50) NULL,
    `created_at`                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migración para DB existente (cPanel):
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS qb_class_id VARCHAR(50) NULL AFTER role;
-- ALTER TABLE users MODIFY COLUMN role ENUM('admin','operator','almacenista') NOT NULL DEFAULT 'operator';

-- -----------------------------------------------------------------------------
-- 2. products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `barcode`         VARCHAR(50) UNIQUE,
    `sku`             VARCHAR(50) UNIQUE,
    `name`            VARCHAR(255) NOT NULL,
    `short_name`      VARCHAR(255) NULL,
    `price`           DECIMAL(10,2) NOT NULL,
    `min_price`       DECIMAL(10,2) NULL,
    `category`        VARCHAR(100),
    `brand`           VARCHAR(100),
    `stock`           INT DEFAULT 0,
    `hidden`          TINYINT(1) NOT NULL DEFAULT 0,
    `description`     TEXT NULL,
    `unit`            VARCHAR(20) DEFAULT NULL,
    `weight_per_unit` DECIMAL(10,2) NULL,
    `qty`             INT NOT NULL DEFAULT 0,
    `qb_item_id`      VARCHAR(50),
    `qb_active`       TINYINT(1) NULL DEFAULT NULL,
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. devices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `devices` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `name`            VARCHAR(100),
    `model`           VARCHAR(100),
    `serial_number`   VARCHAR(100) UNIQUE,
    `last_connection` TIMESTAMP NULL,
    `status`          ENUM('ONLINE', 'OFFLINE', 'UNKNOWN') DEFAULT 'UNKNOWN',
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. scan_entries
-- (depende de products, devices, users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scan_entries` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `barcode`     VARCHAR(50) NOT NULL,
    `product_id`  INT,
    `device_id`   INT,
    `scanned_by`  INT,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    FOREIGN KEY (`device_id`)  REFERENCES `devices`(`id`),
    FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. orders
-- Nota: columna `signature` fue eliminada en Fase 48 → ver batch_signatures
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `barcode`       VARCHAR(50) NOT NULL,
    `product_name`  VARCHAR(255) NOT NULL,
    `price`         DECIMAL(10,2) NOT NULL,
    `quantity`      DECIMAL(10,2) NOT NULL,
    `total`         DECIMAL(10,2) NOT NULL,
    `batch_id`      VARCHAR(50),
    `device_id`     INT,
    `user_id`       INT,
    `customer_id`   VARCHAR(50) NULL,
    `customer_name` VARCHAR(255) NULL,
    `qb_invoice_id` VARCHAR(50),
    `reserved_invoice_number` INT NULL,
    `approved_by`   INT NULL,
    `approved_at`   TIMESTAMP NULL,
    -- Fase 117 — auditoría de cancelación (cancelBatch, orderController.ts).
    `voided_at`     TIMESTAMP NULL,
    `voided_by`     INT NULL,
    `void_reason`   VARCHAR(255) NULL,
    `status`        ENUM('AWAITING_APPROVAL', 'PENDING', 'SENT', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    `error_log`     TEXT,
    `retry_count`   INT DEFAULT 0,
    `unit`          VARCHAR(20) NULL,
    `case_qty`      INT NULL,
    -- Fase 115 — factura en QBO a $0 (ver qbInvoices.ts); price/total acá
    -- siguen guardando el valor real de catálogo, para reportería.
    `is_courtesy`   TINYINT(1) NOT NULL DEFAULT 0,
    -- Fase 117 — si esta fila de verdad descontó products.stock al crearse
    -- (ver createBatch/cancelBatch/editBatch, orderController.ts).
    `stock_decremented` TINYINT(1) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(20) NULL,
    `check_number`   VARCHAR(20) NULL,
    `credit_applied` DECIMAL(10,2) NULL,
    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`),
    FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. sync_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sync_log` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id`   INT NOT NULL,
    `action`      VARCHAR(50) NOT NULL,
    `qb_status`   ENUM('SUCCESS', 'FAILED') NOT NULL,
    `qb_id`       VARCHAR(50),
    `error`       TEXT,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. qb_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `qb_tokens` (
    `id`                        INT AUTO_INCREMENT PRIMARY KEY,
    `access_token`              TEXT NOT NULL,
    `refresh_token`             TEXT NOT NULL,
    `realm_id`                  VARCHAR(50),
    `expires_in`                INT,
    `x_refresh_token_expires_in` INT,
    `token_created_at`          BIGINT NULL,
    `created_at`                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. batch_damage
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `batch_damage` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id`     VARCHAR(100) NOT NULL,
    `barcode`      VARCHAR(100) NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `qty`          DECIMAL(10,2) NOT NULL DEFAULT 0,
    `unit`         VARCHAR(20) NULL,
    `unit_price`   DECIMAL(10,2) NULL,
    `amount`       DECIMAL(10,2) NULL,
    `qb_item_id`   VARCHAR(64) NULL,
    `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_batch_damage_batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8b. credit_transactions
-- Ledger completo de créditos — EARNED cuando se genera un crédito por daño,
-- USED cuando se aplica a una compra futura. Saldo disponible = SUM(EARNED) - SUM(USED).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_transactions` (
    `id`                INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id`       VARCHAR(64) NULL,
    `customer_name`     VARCHAR(255) NULL,
    `type`              ENUM('EARNED','USED') NOT NULL,
    `amount`            DECIMAL(10,2) NOT NULL,
    `reference_batch_id` VARCHAR(100) NULL,
    `invoice_id`        VARCHAR(50) NULL,
    -- Fase 117 — nota libre; usada para marcar movimientos de reversa
    -- insertados por cancelBatch (orderController.ts).
    `note`              VARCHAR(255) NULL,
    `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ct_customer` (`customer_id`),
    INDEX `idx_ct_batch` (`reference_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. batch_signatures
-- Una firma por batch (Fase 48 — normalización)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `batch_signatures` (
    `batch_id`   VARCHAR(100) PRIMARY KEY,
    `signature`  MEDIUMTEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. sync_meta
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sync_meta` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `entity`       VARCHAR(50) NOT NULL UNIQUE,
    `last_sync_at` VARCHAR(50) NOT NULL,
    `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. activity_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_log` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT NULL,
    `user_email`  VARCHAR(255) NULL,
    `action`      VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id`   VARCHAR(50) NULL,
    `details`     TEXT NULL,
    `ip`          VARCHAR(45) NULL,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. cached_customers
-- Cache de clientes de QuickBooks (TTL 1 hora renovado en cada sync)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cached_customers` (
    `id`           VARCHAR(50) PRIMARY KEY,
    `display_name` VARCHAR(255) NOT NULL,
    `active`       TINYINT(1) DEFAULT 1,
    `address_line1` VARCHAR(255) DEFAULT NULL,
    `city`         VARCHAR(100) DEFAULT NULL,
    `state_code`   VARCHAR(20) DEFAULT NULL,
    `postal_code`  VARCHAR(20) DEFAULT NULL,
    `cached_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. company_settings
-- Fila única (id=1) — nombre empresa, subtítulo, dirección, tel, ciudad, disclaimer
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_settings` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `company_name`    VARCHAR(255) NOT NULL DEFAULT 'EXCELLENTIA',
    `subtitle`        VARCHAR(255) NOT NULL DEFAULT 'Ticket de Venta',
    `address`         VARCHAR(255) DEFAULT NULL,
    `phone`           VARCHAR(50) DEFAULT NULL,
    `city`            VARCHAR(100) DEFAULT NULL,
    `disclaimer`      TEXT DEFAULT NULL,
    `invoice_counter`          INT NOT NULL DEFAULT 51551,
    `qb_credit_apply_item_id` VARCHAR(50) NULL,
    `updated_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fila por defecto
INSERT IGNORE INTO `company_settings` (`id`, `company_name`, `subtitle`, `invoice_counter`)
VALUES (1, 'EXCELLENTIA', 'Ticket de Venta', 51551);

-- -----------------------------------------------------------------------------
-- 14. pre_orders
-- (depende de users por user_id, sin FK para evitar restricciones en conversión)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pre_orders` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          INT,
    `assigned_user_id` INT DEFAULT NULL,
    `customer_id`      VARCHAR(100) NOT NULL,
    `customer_name`    VARCHAR(255) NOT NULL,
    `salesperson_name` VARCHAR(255) DEFAULT NULL,
    `scheduled_date`   DATE,
    `notes`            TEXT,
    `status`           ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT',
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. pre_order_items
-- (depende de pre_orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pre_order_items` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `pre_order_id` INT NOT NULL,
    `barcode`      VARCHAR(100) NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `price`        DECIMAL(10,6) NOT NULL,
    `quantity`     DECIMAL(10,2) NOT NULL,
    `total`        DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`pre_order_id`) REFERENCES `pre_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. warehouses
-- Fase 112 — hoy la operación tiene un solo almacén físico (sembrado por
-- ensureTables() en warehouseController.ts como "Almacén Principal" si la
-- tabla está vacía), pero routes/product_lots/inventory_movements ya
-- referencian warehouse_id desde el día 1 para no migrar de nuevo si se abre
-- un segundo almacén.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `warehouses` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(255) NOT NULL,
    `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
    `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. routes
-- (depende de users por driver_user_id/created_by, sin FK — mismo criterio que pre_orders;
-- warehouse_id sí es FK real a warehouses, tabla chica y controlada)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `routes` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `name`            VARCHAR(255) NOT NULL,
    `scheduled_date`  DATE NOT NULL,
    `driver_user_id`  INT DEFAULT NULL,
    `warehouse_id`    INT DEFAULT NULL,
    `status`          ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
    -- Fase 115 — DIRECT: un solo destino, carga pre-vendida/pre-asignada de
    -- antemano (no se vende "por scratch" en el camino). MULTI_STOP: el
    -- flujo de siempre. Default MULTI_STOP para no romper rutas existentes.
    `route_type`      ENUM('DIRECT','MULTI_STOP') NOT NULL DEFAULT 'MULTI_STOP',
    `notes`           TEXT DEFAULT NULL,
    `created_by`      INT DEFAULT NULL,
    `returns_reviewed_at` TIMESTAMP DEFAULT NULL,
    `returns_reviewed_by` INT DEFAULT NULL,
    `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migración para DB existente (cPanel):
-- ALTER TABLE routes ADD COLUMN IF NOT EXISTS warehouse_id INT DEFAULT NULL AFTER driver_user_id;
-- ALTER TABLE routes ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
-- ALTER TABLE routes ADD COLUMN IF NOT EXISTS returns_reviewed_at TIMESTAMP DEFAULT NULL AFTER created_by;
-- ALTER TABLE routes ADD COLUMN IF NOT EXISTS returns_reviewed_by INT DEFAULT NULL AFTER returns_reviewed_at;
-- ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_type ENUM('DIRECT','MULTI_STOP') NOT NULL DEFAULT 'MULTI_STOP' AFTER status; -- Fase 115

-- -----------------------------------------------------------------------------
-- 18. route_stops
-- (depende de routes; referencia orders.batch_id / pre_orders.id como string/id
-- sueltos, no FK reales — mismo criterio que batch_damage/credit_transactions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `route_stops` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `route_id`      INT NOT NULL,
    `position`      INT NOT NULL,
    `stop_type`     ENUM('BATCH','PRE_ORDER','CUSTOMER','CONSIGNMENT') NOT NULL,
    `batch_id`      VARCHAR(50) DEFAULT NULL,
    `pre_order_id`  INT DEFAULT NULL,
    `customer_id`   VARCHAR(50) DEFAULT NULL,
    `customer_name` VARCHAR(255) DEFAULT NULL,
    `status`        ENUM('PENDING','DELIVERED','SKIPPED') DEFAULT 'PENDING',
    `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. route_items
-- Manifiesto de carga de la ruta: qué productos (y cuánta cantidad) escaneó el
-- almacenista para cargar al camión, vía la app Android. No está atado a una
-- parada/pedido puntual (route_stops) — es la carga de toda la ruta. Desde la
-- Fase 112 cada escaneo asigna FIFO contra product_lots (ver route_item_lots)
-- y decrementa products.stock localmente, pero YA NO sincroniza QtyOnHand a
-- QBO al instante — eso ahora se difiere a la liquidación diaria (ver
-- inventory_movements/daily_settlements más abajo).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `route_items` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `route_id`     INT NOT NULL,
    `product_id`   INT NOT NULL,
    `barcode`      VARCHAR(50) DEFAULT NULL,
    `quantity`     INT NOT NULL DEFAULT 0,
    `scanned_by`   INT DEFAULT NULL,
    `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `route_product` (`route_id`, `product_id`),
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. product_lots
-- Fase 112 — recepción de productos. Cada línea escaneada al recibir mercadería
-- (código de barras + cantidad + fecha de expiración opcional) crea/alimenta un
-- lote. remaining_qty es lo que queda disponible para asignar a una ruta vía
-- FIFO (idx_lots_fifo ordena por expiration_date y luego received_at).
-- receipt_batch_id agrupa las líneas de una misma sesión de recepción, mismo
-- criterio suelto que orders.batch_id (no hay tabla de "recepciones" aparte).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_lots` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `receipt_batch_id` VARCHAR(50) NOT NULL,
    `warehouse_id`     INT NOT NULL,
    `product_id`       INT NOT NULL,
    `barcode`          VARCHAR(50) DEFAULT NULL,
    `expiration_date`  DATE DEFAULT NULL,
    `received_qty`     DECIMAL(10,2) NOT NULL,
    `remaining_qty`    DECIMAL(10,2) NOT NULL,
    `status`           ENUM('ACTIVE','DEPLETED','DAMAGED','EXPIRED') DEFAULT 'ACTIVE',
    `received_by`      INT DEFAULT NULL,
    `received_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    INDEX `idx_lots_fifo` (`product_id`, `warehouse_id`, `status`, `expiration_date`, `received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 21. route_item_lots
-- Qué lote(s) exactos alimentaron cada línea del manifiesto (route_items) —
-- separado de route_items porque una misma línea puede partirse entre 2+ lotes
-- si el primero no alcanza. used_suggested_lot queda en 0 cuando el
-- almacenista pisa la sugerencia FIFO manualmente (override permitido, no es
-- una regla dura — ver addRouteItem).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `route_item_lots` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `route_item_id`       INT NOT NULL,
    `lot_id`              INT NOT NULL,
    `quantity`            DECIMAL(10,2) NOT NULL,
    `used_suggested_lot`  TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (`route_item_id`) REFERENCES `route_items`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`lot_id`) REFERENCES `product_lots`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 22. inventory_movements
-- Fase 112 — sub-inventario: ledger de todo movimiento físico (recepción, carga
-- de ruta, devolución, daño/ajuste). Se aplica a product_lots/products.stock en
-- el momento (fuente de verdad local inmediata) pero NO dispara ningún push a
-- QBO por sí solo — settlement_id queda NULL hasta que la liquidación diaria lo
-- incluye y empuja QtyOnHand una sola vez por producto (ver daily_settlements).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_movements` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `warehouse_id`   INT NOT NULL,
    `product_id`     INT NOT NULL,
    `lot_id`         INT DEFAULT NULL,
    `movement_type`  ENUM('RECEIPT','ROUTE_LOAD','RETURN','DAMAGE','ADJUSTMENT') NOT NULL,
    `quantity`       DECIMAL(10,2) NOT NULL,
    `route_id`       INT DEFAULT NULL,
    `settlement_id`  INT DEFAULT NULL,
    `created_by`     INT DEFAULT NULL,
    `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    INDEX `idx_movements_pending` (`warehouse_id`, `settlement_id`),
    INDEX `idx_movements_product` (`product_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 23. route_returns
-- Fase 112 — revisión de devoluciones: lo que el almacén cuenta físicamente al
-- volver una ruta (COMPLETED), con su condición. GOOD restituye remaining_qty a
-- los lotes que esa ruta usó; DAMAGED/EXPIRED/TRANSPORTER_DAMAGE se da de baja
-- permanente (no vuelve al pool FIFO). El almacén audita lo que regresa, no
-- re-valida lo que se vendió (eso ya está en orders).
-- Fase 116 (2026-09-02) — TRANSPORTER_DAMAGE distingue "se rompió en el
-- camino" de DAMAGED genérico; unit_price/amount valorizan la pérdida
-- (mismo cálculo que computeDamageCredit, creditCalculator.ts) para
-- DAMAGED/EXPIRED/TRANSPORTER_DAMAGE — no es crédito a cliente, es pérdida
-- de inventario. Diseño en PROGRESS.md, código todavía sin implementar.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `route_returns` (
    `id`                 INT AUTO_INCREMENT PRIMARY KEY,
    `route_id`           INT NOT NULL,
    `product_id`         INT NOT NULL,
    `quantity`           DECIMAL(10,2) NOT NULL,
    `condition_status`   ENUM('GOOD','DAMAGED','EXPIRED','TRANSPORTER_DAMAGE') NOT NULL DEFAULT 'GOOD',
    `notes`              TEXT DEFAULT NULL,
    `unit_price`         DECIMAL(10,2) DEFAULT NULL,
    `amount`             DECIMAL(10,2) DEFAULT NULL,
    `reviewed_by`        INT NOT NULL,
    `reviewed_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 24. daily_settlements
-- Fase 112 — liquidación diaria: un registro por almacén+día que agrupa todos
-- los inventory_movements pendientes (settlement_id IS NULL) al momento del
-- preview. Confirmar dispara el push real a QBO (ver settlement_lines) y
-- estampa settlement_id en los movimientos incluidos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_settlements` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `warehouse_id`     INT NOT NULL,
    `settlement_date`  DATE NOT NULL,
    `status`           ENUM('DRAFT','CONFIRMED') DEFAULT 'DRAFT',
    `confirmed_by`     INT DEFAULT NULL,
    `confirmed_at`     TIMESTAMP DEFAULT NULL,
    `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`),
    UNIQUE KEY `uq_settlement_day` (`warehouse_id`, `settlement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 25. settlement_lines
-- Detalle por producto de una liquidación — stock_after es lo que realmente se
-- manda como QtyOnHand a QBO (updateItemQtyOnHand ya trabaja con valor
-- absoluto, no delta; net_quantity/stock_before quedan solo para la pantalla
-- de revisión).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settlement_lines` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `settlement_id`  INT NOT NULL,
    `product_id`     INT NOT NULL,
    `net_quantity`   DECIMAL(10,2) NOT NULL,
    `stock_before`   DECIMAL(10,2) NOT NULL,
    `stock_after`    DECIMAL(10,2) NOT NULL,
    `qbo_synced`     TINYINT(1) NOT NULL DEFAULT 0,
    `qbo_error`      TEXT DEFAULT NULL,
    UNIQUE KEY `uq_settlement_product` (`settlement_id`, `product_id`),
    FOREIGN KEY (`settlement_id`) REFERENCES `daily_settlements`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Migración — Módulo Almacén (rutas de entrega): nuevo rol almacenista
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

ALTER TABLE users MODIFY COLUMN role ENUM('admin','operator','almacenista') NOT NULL DEFAULT 'operator';

-- =============================================================================
-- Migración — parada de ruta = cliente (sin pedido/pre-orden vinculado)
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

ALTER TABLE route_stops MODIFY COLUMN stop_type ENUM('BATCH','PRE_ORDER','CUSTOMER') NOT NULL;

-- =============================================================================
-- Migración — Fase 48: normalización de firmas + hidden products
-- Para bases existentes (ejecutar una sola vez en orden)
-- =============================================================================

-- 1. Migrar firmas existentes de orders a batch_signatures
INSERT IGNORE INTO batch_signatures (batch_id, signature)
SELECT batch_id, signature
FROM orders
WHERE signature IS NOT NULL
  AND batch_id IS NOT NULL
GROUP BY batch_id;

-- 2. Eliminar columna obsoleta signature de orders
ALTER TABLE orders DROP COLUMN IF EXISTS signature;

-- 3. Agregar columna hidden a products
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER stock;

-- =============================================================================
-- Migración — Fase 61: secuencia de factura
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_counter INT NOT NULL DEFAULT 51551;

-- =============================================================================
-- Migración — Fase 112: Almacén (recepción, FIFO, sub-inventario, liquidación,
-- devoluciones y condición del producto)
-- Para bases existentes (ejecutar una sola vez, en orden)
-- =============================================================================

-- 1. Tabla warehouses ya creada arriba (CREATE TABLE IF NOT EXISTS corre igual
--    en una base existente). Sembrar el almacén único si no hay ninguno:
INSERT INTO warehouses (name, is_active)
SELECT 'Almacén Principal', 1
WHERE NOT EXISTS (SELECT 1 FROM warehouses);

-- 2. routes gana warehouse_id — backfill al único almacén sembrado.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS warehouse_id INT DEFAULT NULL AFTER driver_user_id;
UPDATE routes SET warehouse_id = (SELECT id FROM warehouses ORDER BY id LIMIT 1) WHERE warehouse_id IS NULL;
-- La FK (routes.warehouse_id -> warehouses.id) solo puede agregarse una vez si
-- todavía no existe; MySQL no soporta "ADD FOREIGN KEY IF NOT EXISTS", chequear
-- a mano con SHOW CREATE TABLE routes antes de correr esta línea en una base ya migrada:
-- ALTER TABLE routes ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);

-- 3. product_lots / route_item_lots / inventory_movements / route_returns /
--    daily_settlements / settlement_lines: CREATE TABLE IF NOT EXISTS ya
--    creadas arriba, no requieren backfill (tablas nuevas, arrancan vacías).

-- =============================================================================
-- Migración (2026-08-31): marca explícita de "devoluciones revisadas" por ruta
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

-- routes.returns_reviewed_at distingue "todavía no se revisó" de "se revisó
-- y no había nada que devolver" — antes se inferría (mal) de si route_returns
-- tenía filas, lo que confundía una ruta 100% vendida con una sin revisar.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS returns_reviewed_at TIMESTAMP DEFAULT NULL AFTER created_by;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS returns_reviewed_by INT DEFAULT NULL AFTER returns_reviewed_at;

-- =============================================================================
-- Migración (2026-09-01): aprobación de admin antes de enviar una venta a QBO
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

-- Nuevo estado AWAITING_APPROVAL: createBatch/createOrder/convertPreOrder ya
-- no llaman a QBO al crear la venta — reservan el número de factura (ticket
-- sale con número real) y quedan en este estado hasta que un admin aprueba
-- (POST /api/orders/batch/:batchId/approve). reserved_invoice_number guarda
-- ese número para que la aprobación (o un retry post-fallo) no reserve uno
-- nuevo. approved_by/approved_at quedan para auditoría de quién aprobó.
ALTER TABLE orders MODIFY COLUMN status ENUM('AWAITING_APPROVAL','PENDING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reserved_invoice_number INT NULL AFTER qb_invoice_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER reserved_invoice_number;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by;

-- =============================================================================
-- Migración — Fase 115 (2026-09-02): rutas directas/no directas, consignación
-- y cortesías. Diseño documentado en PROGRESS.md — código todavía sin
-- implementar al momento de correr esta migración; corrida a mano por el
-- usuario para dejar la base lista de antemano. Todo aditivo, no rompe nada
-- de lo ya existente (defaults preservan el comportamiento actual).
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

-- 1. Rutas directas (un solo destino, carga pre-asignada) vs no directas
-- (multi-parada, flujo de siempre). Default MULTI_STOP.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_type ENUM('DIRECT','MULTI_STOP') NOT NULL DEFAULT 'MULTI_STOP' AFTER status;

-- 2. Nuevo stop_type para paradas de consignación (además de BATCH/PRE_ORDER/CUSTOMER)
ALTER TABLE route_stops MODIFY COLUMN stop_type ENUM('BATCH','PRE_ORDER','CUSTOMER','CONSIGNMENT') NOT NULL;

-- 3. Qué se dejó en consignación por parada, y cómo se liquidó (parte
-- vendida / parte devuelta). route_items sigue siendo el manifiesto de toda
-- la ruta — esta tabla es la única que trackea por parada/cliente.
CREATE TABLE IF NOT EXISTS route_consignment_items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    route_stop_id     INT NOT NULL,
    product_id        INT NOT NULL,
    quantity_left     DECIMAL(10,2) NOT NULL,
    quantity_sold     DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_returned DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit              VARCHAR(20) DEFAULT NULL,
    case_qty          INT DEFAULT NULL,
    settled_at        TIMESTAMP DEFAULT NULL,
    settled_by        INT DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_stop_id) REFERENCES route_stops(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Cortesías — factura en QBO a $0, pero orders.price/total locales
-- guardan el valor real de catálogo (reportería de "cuánto se regaló").
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_courtesy TINYINT(1) NOT NULL DEFAULT 0 AFTER case_qty;

-- =============================================================================
-- Migración — Fase 116 (2026-09-02): Damage/Credits — Transporter Damage y
-- valuación de pérdida en devoluciones de ruta. Diseño documentado en
-- PROGRESS.md — código (backend/webapp/Android) todavía sin implementar al
-- momento de correr esta migración; corrida a mano por el usuario para dejar
-- la base lista de antemano. Todo aditivo, no rompe nada de lo ya existente.
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

-- 1. Nueva condición TRANSPORTER_DAMAGE, distinta de DAMAGED/EXPIRED —
-- producto que salió del almacén en buen estado y se dañó en el camino.
ALTER TABLE route_returns MODIFY COLUMN condition_status ENUM('GOOD','DAMAGED','EXPIRED','TRANSPORTER_DAMAGE') NOT NULL DEFAULT 'GOOD';

-- 2-3. Valorización de la pérdida por línea (mismo cálculo que
-- computeDamageCredit/unitValueOf en creditCalculator.ts) para
-- DAMAGED/EXPIRED/TRANSPORTER_DAMAGE — no aplica a GOOD.
ALTER TABLE route_returns ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NULL AFTER notes;
ALTER TABLE route_returns ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NULL AFTER unit_price;

-- =============================================================================
-- Migración — Fase 117 (2026-09-04): Editar / Cancelar venta AWAITING_APPROVAL.
-- Diseño documentado en PROGRESS.md. Todo aditivo, no rompe nada de lo ya
-- existente (defaults preservan el comportamiento actual).
-- Para bases existentes (ejecutar una sola vez)
-- =============================================================================

-- 1. Auditoría de cancelación (POST /api/orders/batch/:batchId/cancel) —
-- mismo patrón que approved_by/approved_at de la migración de Fase 113.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP NULL AFTER approved_at;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS voided_by INT NULL AFTER voided_at;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS void_reason VARCHAR(255) NULL AFTER voided_by;

-- 2. Marca si esta fila de verdad descontó products.stock al crearse (1 por
-- línea, salvo que el producto ya viniera cargado en una ruta — ver
-- createBatch). cancelBatch/editBatch la usan para revertir con precisión,
-- sin tener que re-derivar la lógica de ruta desde cero ni arriesgarse a
-- sumar stock que nunca se restó (createOrder/convertPreOrder no descuentan
-- stock — el default 0 ya es correcto para esos dos flujos).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_decremented TINYINT(1) NOT NULL DEFAULT 0 AFTER is_courtesy;

-- 3. Nota libre para movimientos de reversa en credit_transactions
-- (cancelBatch inserta un movimiento opuesto al original en vez de borrarlo
-- — mismo espíritu que Void en QBO: nada se borra, todo se anula con rastro).
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS note VARCHAR(255) NULL AFTER invoice_id;

-- =============================================================================
-- Fin del schema — 24 tablas + migraciones Fase 48, 61, 112, 115, 116, 117, 2026-08-31 y 2026-09-01
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;