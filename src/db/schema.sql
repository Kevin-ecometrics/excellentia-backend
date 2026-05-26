CREATE TABLE IF NOT EXISTS users (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password                VARCHAR(255) NOT NULL,
    refresh_token           TEXT NULL,
    refresh_token_expires_at BIGINT NULL,
    role                    ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    barcode     VARCHAR(50) UNIQUE,
    name        VARCHAR(255) NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    min_price   DECIMAL(10,2) NULL,
    category    VARCHAR(100),
    brand       VARCHAR(100),
    stock       INT DEFAULT 0,
    description TEXT NULL,
    weight_per_unit DECIMAL(10,2) NULL,
    qb_item_id  VARCHAR(50),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100) UNIQUE,
    last_connection TIMESTAMP,
    status          ENUM('ONLINE', 'OFFLINE', 'UNKNOWN') DEFAULT 'UNKNOWN',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_entries (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    barcode     VARCHAR(50) NOT NULL,
    product_id  INT,
    device_id   INT,
    scanned_by  INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (scanned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    barcode         VARCHAR(50) NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL,
    total           DECIMAL(10,2) NOT NULL,
    batch_id        VARCHAR(50),
    device_id       INT,
    user_id         INT,
    customer_id     VARCHAR(50) NULL,
    customer_name   VARCHAR(255) NULL,
    signature       MEDIUMTEXT NULL,
    qb_invoice_id   VARCHAR(50),
    status          ENUM('PENDING', 'SENT', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    error_log       TEXT,
    retry_count     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Migration for existing databases:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER stock;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NULL;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature MEDIUMTEXT NULL AFTER customer_name;


CREATE TABLE IF NOT EXISTS sync_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   INT NOT NULL,
    action      VARCHAR(50) NOT NULL,
    qb_status   ENUM('SUCCESS', 'FAILED') NOT NULL,
    qb_id       VARCHAR(50),
    error       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qb_tokens (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    access_token            TEXT NOT NULL,
    refresh_token           TEXT NOT NULL,
    realm_id                VARCHAR(50),
    expires_in              INT,
    x_refresh_token_expires_in INT,
    token_created_at        BIGINT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_damage (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    batch_id     VARCHAR(100) NOT NULL,
    barcode      VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    qty          INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_damage_batch_id (batch_id)
);

-- Migration for existing databases:
-- CREATE TABLE IF NOT EXISTS batch_damage (...) -- see above

CREATE TABLE IF NOT EXISTS sync_meta (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    entity      VARCHAR(50) NOT NULL UNIQUE,
    last_sync_at VARCHAR(50) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
