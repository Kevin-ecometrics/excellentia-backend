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
| POST | `/api/orders/:id/sync` | JWT+admin | Forzar sync a QuickBooks (re-encola para SyncEngine, no llama a QBO al instante) |
| POST | `/api/orders/batch/:batchId/retry` | JWT | Reintenta el envío a QBO de un batch PENDING/FAILED al instante (mismo `createBatchInvoice` que la creación). Disponible para el operador dueño del batch, no solo admin |
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
    unit            VARCHAR(20) NULL,
    case_qty        INT NULL,
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
ALTER TABLE products ADD COLUMN IF NOT EXISTS qb_active TINYINT(1) NULL DEFAULT NULL AFTER qb_item_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS case_qty INT NULL;
ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NULL;
ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NULL;
CREATE TABLE IF NOT EXISTS customer_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(64) NULL,
  customer_name VARCHAR(255) NULL,
  batch_id VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_credits_batch (batch_id),
  INDEX idx_customer_credits_customer (customer_id)
);
```

**`orders.unit`/`case_qty` — por qué importan para el ticket:** `unit` es el tipo de venta (Lbs/Case/Unit/Bucket) y `case_qty` las unidades por caja (`products.qty` cuando `unit = "Case"`, copiado al momento de la venta). Sin estos dos campos guardados en `orders`, reimprimir un pedido desde Historial no puede saber si era por peso o por caja — `listOrders` los expone ahora junto al resto de columnas.

## Créditos por daño (Fase 75)

El modal de "artículos dañados" (ya existente en el flujo de la app Android) genera un crédito real en dólares, no solo texto descriptivo. `src/services/creditCalculator.ts` (`computeDamageCredit`) calcula el valor por unidad consultando `products` fresco al momento de crear el batch — **nunca** un precio mandado por el cliente:
- **Case**: `unitValue = products.price` (ya es el precio por unidad individual dentro de la caja).
- **Lbs / sin unit**: `unitValue = products.price * (products.weight_per_unit || 1.0)`.
- **Unit / Bucket**: `unitValue = products.price` directo.

El resultado se guarda por línea en `batch_damage.unit_price`/`amount`, y agregado en `customer_credits` (ledger de auditoría — el crédito siempre se aplica de inmediato al mismo batch, no hay redención en un pedido futuro todavía). `createBatchInvoice()` (`qbInvoices.ts`) recibe un parámetro `creditAmount` y, si es > 0 y `QB_CREDIT_ITEM_ID` está configurado en `.env`, agrega una línea `SalesItemLineDetail` con `Amount` negativo a la factura — reduce el total real en QBO, no solo el `CustomerMemo`. Sin esa env var, sigue funcionando como antes (memo únicamente). Los reintentos (`retryBatchSync`) reusan el `amount` ya persistido, nunca lo recalculan, para que el crédito no derive si el precio del catálogo cambió después de la venta.

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
4. Guarda damage_items en batch_damage (qty > 0) — calcula el crédito por línea
   (computeDamageCredit) y lo agrega a customer_credits
5. Intenta sync inmediato a QuickBooks (createBatchInvoice, incluye la línea
   negativa de crédito si corresponde)
   - Éxito → UPDATE status=SENT, qb_invoice_id
   - Falla → quedan PENDING para SyncEngine (cada 5 min)
6. Responde: { batchId, invoiceId, orders[], creditsTotal }
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

**Inconsistencia conocida (no arreglada):** `syncProductsFromQbo` (el sync automático de `syncEngine.ts`, cada 5 min) inserta productos nuevos con `barcode = NULL` directo, sin el fallback `item.Sku || 'QBO-{Id}'` que sí usa `syncProducts`. Un producto que nace por esta vía queda sin barcode — y como `orders.barcode = products.barcode` es el JOIN que usa todo el flujo de facturación (`retryBatchSync`, `processPendingOrders`), ese producto nunca puede facturarse aunque tenga `qb_item_id` válido, porque `NULL` no matchea contra nada.

`updateItemMeta` acepta `sku` y lo envía como `Sku` en el sparse update. `updateProduct` pasa `barcode` como `sku` cuando cambia.

**Flujo completo en una sola llamada a QBO:** nombre + descripción + SKU + precio (`UnitPrice`) se sincronizan juntos en `updateItemMeta`. Stock va en llamada separada (`updateItemQtyOnHand`) porque requiere verificar el tipo del ítem.

**Cost vs Price en QBO:**
- `Price` (`UnitPrice`) = precio de venta al cliente → gestionado desde webapp (`products.price`)
- `Cost` (`PurchaseCost`) = costo de adquisición → solo se edita en QBO directamente, no gestionado en la webapp. QBO lo usa para calcular ganancia bruta y registrar COGS al vender.

## qb_active — estado Active/Inactive dentro de QuickBooks

Distinto de `hidden` (que es local, solo afecta qué se lista en la webapp/app). `qb_active` refleja el flag `Active` del item **dentro de QBO mismo** — un item puede estar perfectamente visible en nuestra tabla (`hidden = 0`) y aun así estar inactivo en QBO, lo que hace fallar cualquier intento de facturarlo con `"Business validation error: you need to activate this item before updating the quantity"`.

- `qb_active = NULL` → nunca sincronizado desde que existe la columna. No bloquea nada (comportamiento previo, para no romper productos ya andando).
- `qb_active = 1` / `0` → estado real conocido, tomado del último sync.

**Por qué las consultas a QBO necesitan `Active IN (true, false)` explícito:** QBO excluye los items inactivos de las respuestas de `query` por defecto. Sin ese filtro explícito en `qbItems.ts` (`findAllItems`, `findItemsUpdatedSince`), un item que se desactiva en QBO simplemente deja de aparecer en los resultados del sync — nunca nos enteramos, y el dato local queda desactualizado para siempre.

Se actualiza en dos lugares (ambos deben mantenerse en sync):
- `syncProducts` (`qbController.ts`) — botón manual "Sincronizar QB"
- `syncProductsFromQbo` (`syncEngine.ts`) — automático cada 5 min

`retryBatchSync` y `processPendingOrders` (SyncEngine) chequean `qb_active = 0` antes de intentar la factura, evitando la llamada a QBO y dando un mensaje claro ("Item inactivo en QuickBooks — hay que reactivarlo en QBO antes de reintentar") en vez de depender del rechazo genérico de la API.

**`qb_active = 0` se excluye de los endpoints de lectura** (`listProducts`, `getProductByBarcode`, `listCategories` en `productController.ts`) — condición `(qb_active IS NULL OR qb_active = 1)` junto a `hidden = 0`. Un item "(Deleted)"/inactivo en QBO no debe aparecer ni en la webapp ni en la app Android; ambos consumen estos mismos endpoints, así que el filtro alcanza para los dos sin tocarlos por separado.

**Gotcha — `TINYINT(1)` vía `mysql2` no es boolean en JSON.** `mysql2` devuelve `TINYINT(1)` como `number` (`0`/`1`) sin ningún `typeCast` configurado en `db/connection.ts`. Cualquier cliente que espere un booleano estricto (Android/Gson, `Boolean?`) tira excepción al parsear un número donde espera `true`/`false` — y si esa excepción cae dentro de un `try/catch` genérico (como en `ProductRepository` de Android), rompe la respuesta *entera* en silencio, no solo el campo. `normalizeQbActive()` en `productController.ts` convierte `qb_active` a boolean real antes de responder — aplicar el mismo patrón a cualquier otro `TINYINT(1)` que se exponga a un cliente que espere boolean estricto (la webapp en TS es más tolerante, no lo necesita).

## Mensajes de error de QBO — `extractQboErrorMessage`

La librería `intuit-oauth` solo expone en `error.message` el texto genérico que manda QBO para toda una familia de rechazos ("A business validation error has occurred while processing your request"). El motivo específico (número de factura duplicado, item inactivo, cliente inválido, etc.) vive en `error.description` / `error.fault.errors[0].detail`, que por defecto se descarta.

`extractQboErrorMessage()` en `orderController.ts` combina ambos: `mensaje — detalle`. Usado en `retryBatchSync`; el mismo problema existe en `createBatch` (intento inicial) y `syncEngine.ts` si hace falta aplicarlo ahí también.

## Flujo definitivo de productos

- **Crear**: en QBO (Productos y servicios → Nuevo como Inventory) → "Sincronizar QB" importa a MySQL con `qb_item_id`
- **Editar** desde webapp: modal → `updateItemMeta` (nombre/desc/SKU) + `updateItemQtyOnHand` (stock) → QBO
- **No se crean productos desde la webapp** — evita conflictos de tipo contable en QBO
