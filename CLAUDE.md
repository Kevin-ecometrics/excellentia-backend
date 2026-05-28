# CLAUDE.md — Backend API (excellentia/)

## Comandos

```bash
bun run dev       # desarrollo con hot-reload
bun run build     # compilar TypeScript
bun run start     # producción
npx tsc --noEmit  # type-check sin compilar
```

MySQL vía XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root <database>`

## Stack

- **Runtime:** Node.js / Bun
- **Framework:** Express.js v5
- **DB:** MySQL 8 — `mysql2/promise`, raw SQL (sin ORM)
- **Auth:** JWT (`jsonwebtoken`) — access token + refresh token
- **QB:** QuickBooks Online API via `intuit-oauth` + `node-quickbooks`
- **Lenguaje:** TypeScript strict

## Estructura

```
excellentia_schema.sql       # Schema completo (15 tablas + migraciones)
src/
├── controllers/        # Lógica de negocio
│   └── orderController.ts
├── routes/             # Definición de rutas Express
│   └── orders.ts
├── services/           # Integraciones externas
│   └── qbInvoices.ts   # createBatchInvoice()
├── middleware/
│   ├── auth.ts         # JWT verify → req.user
│   └── adminOnly.ts    # role === 'admin'
├── db/
│   ├── connection.ts   # Pool mysql2 (limit 10)
│   └── schema.sql      # DDL completo (copia de excellentia_schema.sql)
└── index.ts            # Entry point, puerto 3000
```

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login → JWT + refreshToken |
| GET | `/api/orders` | JWT | Listar órdenes (con JOIN users) |
| POST | `/api/orders/batch` | JWT | Crear batch de órdenes |
| GET | `/api/orders/export` | JWT | Exportar CSV |
| POST | `/api/orders/:id/sync` | JWT+admin | Forzar sync a QuickBooks |
| GET | `/api/products` | JWT | Listar productos |
| GET | `/api/customers` | JWT | Clientes QB |
| GET | `/api/settings` | JWT | Info de la empresa |

## Schema — tabla `orders`

```sql
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
    qb_invoice_id   VARCHAR(50),
    status          ENUM('PENDING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
    error_log       TEXT,
    retry_count     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Migración para DB existente:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;
```

## createBatch — flujo

```
POST /api/orders/batch
Body: { items[], customer_id?, customer_name?, signature?, damage_items?, payment_method? }

1. Genera batchId (timestamp36 + random6)
2. Por cada item:
   - Valida min_price contra el catálogo de productos
   - INSERT en orders con status=PENDING y signature
3. Descuenta stock: UPDATE products SET stock = GREATEST(stock - 1, 0) WHERE barcode = ?
   - 1 unidad por línea de ítem (1 escaneo = 1 unidad física)
   - GREATEST previene negativos
4. Guarda damage_items en batch_damage (qty > 0)
5. Intenta sync inmediato a QuickBooks (createBatchInvoice)
   - Éxito → UPDATE status=SENT, qb_invoice_id
   - Falla → quedan PENDING para SyncEngine (cada 5 min)
6. Responde: { batchId, invoiceId, orders[] }
```

## Notas de diseño

- `signature` se guarda en **cada fila** del batch (redundante pero consistente con `customer_id`/`customer_name` que también se repiten por fila). No hay tabla separada de batches.
- `price` en la tabla es `DECIMAL(10,6)` (6 decimales) — permite precio/lb con precisión suficiente.
- SyncEngine corre cada 5 min en `index.ts` para reintentar PENDING/FAILED.
- `loadTokensFromDb()` al arrancar carga tokens QB desde MySQL (fallback a `.env`).
- **No usar** `cancelDiscovery()` en Bluetooth — requiere permiso `BLUETOOTH_SCAN` innecesario.

## QBO Invoices — Qty por venta

`createBatchInvoice` y `createInvoice` usan `Qty: 1` + `UnitPrice: total` (no `Qty: lbs`):
- QBO descuenta **1 unidad** del inventario por línea de venta
- El `Amount` (total facturado) no cambia
- El desglose `X.XX lb a $X.XX/lb` va en el campo `Description`

## QBO Items — Sync de stock y nombre

`updateItemQtyOnHand(itemId, qty)` en `qbItems.ts`:
- GET item → verifica `Type === 'Inventory'` → POST sparse `{ QtyOnHand: qty }`
- Retorna `null` si el ítem es `Service` (no sincroniza, loguea warning)
- Llamado desde `updateProduct` cuando `stock` es parte del body del PUT

`updateItemMeta(itemId, { name?, description?, sku? })` en `qbItems.ts`:
- GET item para SyncToken → POST sparse con los campos que vengan
- Funciona para cualquier tipo de ítem (Service o Inventory)
- Llamado desde `updateProduct` cuando `name`, `description` o `barcode` cambian (una sola llamada QBO)

Ambas funciones son silent — el fallo en QBO no revierte el guardado en MySQL.

**Requisito para stock:** Los ítems en QBO deben ser `Type: 'Inventory'`. Cambiar desde UI de QBO (Productos y servicios → editar → tipo Producto). Cuentas requeridas: `Inventory Asset` + `Cost of Goods Sold`.

## QBO SKU ↔ Barcode

`syncProducts` lee `item.Sku` como barcode. Si el SKU está vacío, usa `QBO-{Id}` como fallback. También sincroniza `item.Description` → `products.description`.

`updateItemMeta` acepta `sku` y lo envía como `Sku` en el sparse update. `updateProduct` pasa `barcode` como `sku` cuando cambia.

**Flujo completo en una sola llamada a QBO:** nombre + descripción + SKU + precio (`UnitPrice`) se sincronizan juntos en `updateItemMeta`. Stock va en llamada separada (`updateItemQtyOnHand`) porque requiere verificar el tipo del ítem.

**Cost vs Price en QBO:**
- `Price` (`UnitPrice`) = precio de venta al cliente → gestionado desde webapp (`products.price`)
- `Cost` (`PurchaseCost`) = costo de adquisición → solo se edita en QBO directamente, no gestionado en la webapp. QBO lo usa para calcular ganancia bruta y registrar COGS al vender.

## Flujo definitivo de productos

- **Crear**: en QBO (Productos y servicios → Nuevo como Inventory) → "Sincronizar QB" importa a MySQL con `qb_item_id`
- **Editar** desde webapp: modal → `updateItemMeta` (nombre/desc/SKU) + `updateItemQtyOnHand` (stock) → QBO
- **No se crean productos desde la webapp** — evita conflictos de tipo contable en QBO
