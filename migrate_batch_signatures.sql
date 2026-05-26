-- Fase 48: Normalizar firmas — una por batch en batch_signatures
-- Ejecutar en orden

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS batch_signatures (
    batch_id   VARCHAR(100) PRIMARY KEY,
    signature  MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrar firmas existentes (una por batch, la primera que encuentre)
INSERT IGNORE INTO batch_signatures (batch_id, signature)
SELECT batch_id, signature
FROM orders
WHERE signature IS NOT NULL
  AND batch_id IS NOT NULL
GROUP BY batch_id;

-- 3. Verificar cuántas firmas se migraron
SELECT COUNT(*) AS firmas_migradas FROM batch_signatures;

-- 4. Limpiar columna signature de orders (ya no se usa)
ALTER TABLE orders DROP COLUMN signature;
