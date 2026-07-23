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
    `role`                      ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
    `created_at`                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `barcode`         VARCHAR(50) UNIQUE,
    `name`            VARCHAR(255) NOT NULL,
    `price`           DECIMAL(10,2) NOT NULL,
    `min_price`       DECIMAL(10,2) NULL,
    `category`        VARCHAR(100),
    `brand`           VARCHAR(100),
    `stock`           INT DEFAULT 0,
    `hidden`          TINYINT(1) NOT NULL DEFAULT 0,
    `description`     TEXT NULL,
    `weight_per_unit` DECIMAL(10,2) NULL,
    `unit`            VARCHAR(20) DEFAULT NULL,
    `qty`             INT NOT NULL DEFAULT 0,
    `qb_item_id`      VARCHAR(50),
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
    `status`        ENUM('PENDING', 'SENT', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    `error_log`     TEXT,
    `retry_count`   INT DEFAULT 0,
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
    `qty`          INT NOT NULL DEFAULT 0,
    `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_batch_damage_batch_id` (`batch_id`)
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
    `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fila por defecto
INSERT IGNORE INTO `company_settings` (`id`, `company_name`, `subtitle`)
VALUES (1, 'EXCELLENTIA', 'Ticket de Venta');

-- -----------------------------------------------------------------------------
-- 14. pre_orders
-- (depende de users por user_id, sin FK para evitar restricciones en conversión)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pre_orders` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          INT,
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
SET FOREIGN_KEY_CHECKS = 1;
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
-- Fin del schema — 15 tablas + migración Fase 48
-- =============================================================================
