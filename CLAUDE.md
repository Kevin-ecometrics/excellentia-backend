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
| GET | `/api/products` | JWT | Listar productos — `?search=` matchea `name`/`barcode`/**`sku`** (Fase 108), `?sort=sku` ordena por secuencia NEW_SKU (marca A-Z, luego 001, 002…; sin NEW_SKU al final) |
| GET | `/api/customers` | JWT | Clientes QB |
| GET | `/api/customers/:customerId` | JWT | Un solo cliente — cache-first contra `cached_customers`, fallback a QB (Fase 102, ticket Android necesitaba resolver dirección para reprint) |
| GET | `/api/settings` | JWT | Info de la empresa |
| PUT | `/api/settings/invoice-counter` | JWT+admin | Reasigna el próximo número de factura QBO (`company_settings.invoice_counter`) — ver nota abajo |
| POST | `/api/products/migrate-sku` | JWT+admin | Migración de una sola vez: adopta la nomenclatura NEW_SKU (marca+secuencia) del master sheet Excellentia-vs-QBO — ver nota abajo |

## migrateSkuNomenclature — migración de una sola vez a la nomenclatura NEW_SKU

`POST /api/products/migrate-sku?apply=true&offset=0&limit=25` (`migrateSkuNomenclature`,
`productController.ts`) — reemplaza el `sku` de cada producto por el código
`MARCA+secuencia` (ej. `REY001`) calculado a partir de la comparación entre el
export de QBO y la lista de precios PDF de Excellentia (agosto 2026). Como `sku` es
el campo que sincroniza con QBO, cada cambio dispara el mismo `updateItemMeta` que
editar el SKU a mano en el modal — por eso corre secuencial con una pausa de 400ms
entre llamadas a QBO (no en paralelo, para no pisar `SyncToken`s ni gatillar rate
limit) y **paginado** (`offset`/`limit`, máx 50 por llamada) para no exceder el
timeout del proxy de cPanel en una corrida de varios minutos — se pega la URL
varias veces siguiendo el `next_offset` que devuelve cada respuesta hasta que sale
`null`. Sin `apply=true` corre en modo dry-run (no escribe nada, solo informa qué
haría). Los 198 registros de entrada (incluye qué producto matchea con qué,
unit/qty objetivo, y las filas que no tienen fila en `products` porque nunca se
importaron de QBO) están hardcodeados en `src/data/sku-migration-input.json`,
importado directo en el bundle — no se lee de disco en runtime. Reemplaza el
script standalone `bun run` que se descartó porque cPanel no da acceso a terminal
para correrlo ahí.

Solo llena `unit`/`qty` si el producto no tenía nada guardado — nunca pisa un valor
ya asignado a mano. El match del producto local es por `barcode` (SKU histórico de
QBO, ya no se toca desde la Fase 105); si no matchea, cae a un match exacto por
`name` y, como tercer intento, por `name_normalized` (los nombres del master sheet
traen prefijo de unidad — `Units:`, `Pounds:`, `Case/Bucket:`, `Case:` — que los
productos locales no tienen; se quita el prefijo y se compara exacto contra
`products.name`). Endpoint pensado para usarse una sola vez y después quedar en
desuso (no hay botón en la webapp a propósito).

**Robustez para re-corridas (Fase 106):** la decisión de push a QBO se toma contra el
Sku **vivo del item en QBO** (`getItemById`), no contra el `sku` local — si una
corrida anterior aplicó el sku local pero el push falló, la re-corrida detecta el
desajuste y reintenta (auto-curativo; si QBO no responde se asume push y el fallo se
reporta por fila). Cada fila corre en su propio try/catch: un error de MySQL/QBO en
una fila (ej. choque del `UNIQUE` de `products.sku`) se reporta con `status:'error'`
+ `db_error` y NO aborta la página. Se detectan duplicados de `new_sku` dentro del
JSON (primera aparición gana, `warnings.duplicate_new_skus` en la respuesta) y
colisiones contra la DB antes del UPDATE (`SELECT id FROM products WHERE sku = ? AND
id <> ?`). Contrato de respuesta: por fila `status` (`applied`/`dry_run`/
`skipped`/`error`), `qbo_status` (`synced`/`needs_push`/`no_qb_item_id`/
`unverified`), `db_error`; `summary.db_failed`; `qbo_push` solo reporta escrituras
reales (`ok`/`failed`/`skipped` — en dry-run siempre `skipped`; la predicción vive
en `qbo_status`).

**Defecto del master sheet — barcodes duplicados (Fase 107):** seis pares de filas
del JSON comparten el mismo `qbo_sku`; como el matcher prioriza barcode, ambas
matchean al MISMO producto local y la segunda aparición pisa el sku que la primera
acaba de aplicar. Detectado en la revisión post-corrida (productos 362/376/483/328/
494 quedaron con el sku de la fila equivocada; el producto 366 "DF Shredded Mexican
2lb", destinatario real de MIS053, quedó `barcode=NULL, sku=NULL` porque no tiene
barcode y su fila fue consumida por otro). Remediación: se parcharon las 5 filas
"segundas" del JSON para que apunten a su destinatario real (MIS046→`DF-01`,
MIS056→`DF-46`, MIS072→`DF-21`, REY010→`null` not_found inofensivo, MIS053→`null`
matchea por nombre normalizado) y una re-corrida completa reaplica las filas
primeras a sus holders correctos. **Con el parche el JSON queda consistente:
cualquier re-corrida futura es segura.**

**Trampa SQL para queries de verificación:** `sku NOT REGEXP '^[A-Z]{3,4}[0-9]{3}$'`
NO atrapa filas con `sku IS NULL` (`NULL NOT REGEXP ...` da NULL → la fila se
filtra del resultado). Usar siempre `(sku IS NULL OR sku NOT REGEXP ...)`.

**Estado: CERRADA (agosto 2026).** Corrida final verificada: la query de
verificación NULL-safe da **0 filas** sin NEW_SKU entre los productos visibles y
activos. Segundo lote de items Service (Shopify ×6, Pounds, Units, Services,
Shipping, Spoils charge, Walmart sls chargeback) oculto con `hidden=1` por ids
explícitos — sin tocar los flags Active en QBO (Shopify los necesita activos).
Endpoint retirado en la práctica; el JSON parcheado queda consistente si alguna
vez hiciera falta una re-corrida. La ruta es POST-only: un fetch sin
`method:'POST'` responde 404.

## invoice_counter — numeración de facturas QBO

`company_settings.invoice_counter` (fila única, `id = 1`) es el **próximo** `DocNumber` a asignar en QuickBooks — se lee y se incrementa en `createBatch`/`retryBatchSync`/`convertPreOrder` (`orderController.ts`, `preOrderController.ts`) y en `processPendingOrders` (SyncEngine). Cada factura exitosa hace `invoice_counter = invoice_counter + 1`.

`PUT /api/settings/invoice-counter` (`updateInvoiceCounter`, `settingsController.ts`) permite reasignarlo manualmente — caso de uso real: se acaba la caja de facturas físicas y hay que arrancar la numeración en un número más alto. **Solo admite avanzar el contador, nunca retroceder** (`next > current`, si no 400) — bajarlo podría reasignar un `DocNumber` que QBO ya usó en una factura previa. Cada cambio queda en `activity_log` (`action = 'INVOICE_COUNTER_UPDATED'`, `details` con `#actual → #nuevo`) para auditoría, dado que es un valor sensible que afecta la numeración fiscal.

Editable desde la webapp en Settings (card "Invoice numbering", admin-only) — `excellentia-webapp/app/settings/_components/SettingsClient.tsx`. Requiere confirmación en un modal antes de aplicar el cambio.

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
ALTER TABLE batch_damage MODIFY COLUMN qty DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE batch_damage ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NULL AFTER product_name;
ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS assigned_user_id INT DEFAULT NULL AFTER user_id;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE AFTER barcode;
UPDATE products SET sku = barcode WHERE sku IS NULL AND barcode IS NOT NULL;
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
- **Case/Unit**: `unitValue = products.price / caseSize` (products.price es el precio del paquete completo, se divide por el tamaño de paquete — `products.qty` — para obtener el valor de una sola unidad dañada).
- **Lbs / sin unit / Bucket**: `unitValue = products.price` directo.

**`qty` es peso real para Lbs, no un conteo de piezas (fix posterior a la Fase 75).** Originalmente `batch_damage.qty` era `INT` y, para productos Lbs, el crédito se estimaba como `products.price * products.weight_per_unit * qty` — es decir, "N piezas dañadas, cada una de un peso promedio". Eso se reemplazó: `batch_damage.qty` es ahora `DECIMAL(10,2)` y, para Lbs, es directamente el peso real dañado (ej. `2.35`), igual que `orders.quantity` en una venta normal — `weight_per_unit` ya no interviene en el cálculo. `batch_damage.unit` (columna nueva) guarda el tipo de venta del producto al momento del daño, snapshot igual que `orders.unit`, para que el input en pantalla (decimal solo si es Lbs), el texto del ticket y la factura de QBO sepan interpretar `qty` correctamente. `isLbsUnit()`/`formatDamageQty()` (exportadas desde `creditCalculator.ts`, espejadas en `data/Models.kt` de la app Android) son la fuente de verdad de ese criterio — úsalas en vez de repetir la comparación `unit == 'Lbs'` a mano.

**QBO — línea de factura de un daño en Lbs usa `Qty` fijo.** Igual que una venta normal de Lbs (`Qty: 1` + `UnitPrice: total`, ver "QBO Invoices — Qty por venta" más abajo), una línea de daño en un producto Lbs manda `Qty: -1` + `UnitPrice: dmg.amount` en vez de `Qty: -dmg.qty` — así QBO no descuenta libras del conteo de inventario, que se lleva por unidades/eventos de venta, no por peso. Case/Unit y Bucket sí son conteos reales de piezas — ahí `Qty: -dmg.qty` se mantiene tal cual (`qbInvoices.ts`, `createBatchInvoice`). `retryBatchSync` tiene su propio `SELECT ... FROM batch_damage` (no pasa por `computeDamageCredit`, reusa lo ya persistido) — hay que mantenerle la columna `unit` en el SELECT también, se pisó una vez sin querer al agregar la columna.

**Gotcha — `DECIMAL` vía `mysql2` no es `number` en JS, mismo patrón que `TINYINT(1)`/`qb_active` (ver más abajo).** Al pasar `batch_damage.qty` de `INT` a `DECIMAL(10,2)`, `mysql2` empezó a devolverlo como **string** (`"2.35"`, no `2.35`) — no hay `decimalNumbers` configurado en `db/connection.ts`. `formatDamageQty(qty, unit)` hacía `qty.toFixed(2)` directo sobre un valor leído crudo de una fila de MySQL (vía `retryBatchSync`) y reventaba (`qty.toFixed is not a function`, string no tiene ese método) — pasó también en la webapp con el mismo patrón (ver `excellentia-webapp/CLAUDE.md`). Fix: `Number(qty) || 0` dentro de `formatDamageQty()` antes de formatear. Los operadores aritméticos/relacionales (`*`, `<=`, unario `-`) coaccionan solos un string a number — el problema es específico de llamar un método de `Number.prototype` (`.toFixed()`) sobre algo que en runtime es un string aunque el tipo declarado diga `number`.

El resultado se guarda por línea en `batch_damage.unit_price`/`amount`, y agregado en `customer_credits` (ledger de auditoría — el crédito siempre se aplica de inmediato al mismo batch, no hay redención en un pedido futuro todavía). `createBatchInvoice()` (`qbInvoices.ts`) recibe un parámetro `creditAmount` y, si es > 0 y `QB_CREDIT_ITEM_ID` está configurado en `.env`, agrega una línea `SalesItemLineDetail` con `Amount` negativo a la factura — reduce el total real en QBO, no solo el `CustomerMemo`. Sin esa env var, sigue funcionando como antes (memo únicamente). Los reintentos (`retryBatchSync`) reusan el `amount` ya persistido, nunca lo recalculan, para que el crédito no derive si el precio del catálogo cambió después de la venta.

**Nota:** el código evolucionó después de la Fase 75 a un ledger `credit_transactions` (`type` EARNED/USED, `src/services/creditController.ts`) con balance consultable (`getCustomerBalance`) y un flujo real de aplicación de saldo en una venta distinta a la que lo generó (`applyCustomerCredit`, `apply_credit` en `createBatch`/`convertPreOrder`, consumido por `askApplyCredit()` en Android) — no documentado en su momento. La tabla `customer_credits` de la Fase 75 quedó obsoleta en la práctica; el balance real vive en `credit_transactions`.

## Créditos standalone — POST /api/credits/issue (Fase 76)

Botón "Agregar crédito" en la app Android — agenda crédito para un cliente **sin que exista una venta** (ej. producto dañado/caducado encontrado sin que se vaya a vender). Reusa `computeDamageCredit()` (misma regla de valuación de arriba) para calcular el monto real desde `products`. `src/routes/credits.ts`:
- Body: `{ customer_id, customer_name?, items: [{ barcode, product_name, qty }] }`.
- Genera un `batch_id` sintético (prefijo `cr`, sin fila real en `orders` detrás — `batch_damage.batch_id` y `credit_transactions.reference_batch_id` son `VARCHAR` libres, sin FK).
- Inserta el detalle por línea en `batch_damage` y el total en `credit_transactions` (`type='EARNED'`, `invoice_id=NULL`).
- **No crea ningún documento en QuickBooks** — el crédito se refleja ahí recién cuando se use en una venta real vía el flujo `apply_credit` ya existente.

**Fix Fase 79 (webapp):** `GET /api/customers/stats` (página `/customers`) tenía `FROM orders` — un cliente con **solo** un crédito standalone (sin ninguna fila en `orders`) no aparecía en la lista y su crédito quedaba invisible ahí (aunque sí se veía en `/api/credits`, que consulta `credit_transactions` directo). Se reescribió para que el `FROM` sea la unión de customer_ids con pedido `SENT` y customer_ids con alguna fila en `credit_transactions`.

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

## updateBatchPayment — PUT /api/orders/batch/:batchId/payment (Fase 82)

Adjunta `payment_method`/`check_number` a un batch que ya se creó (factura de
QBO incluida) sin conocerlos todavía — Android ahora manda el batch antes de
imprimir el primer ticket (para traer el número de factura real ahí) y recién
después pregunta el método de pago. `UPDATE orders SET payment_method = ?,
check_number = ? WHERE batch_id = ?`, sin ninguna llamada a QuickBooks — el
`CustomerMemo` de la factura se queda como estaba al crearla (decisión
explícita: alcanza con que el ticket impreso lo muestre).

## Pre-órdenes — `pre_orders`/`pre_order_items` (Fase 87)

Crear una pre-orden (`POST /api/preorders`) solo requiere `customer_id`, `customer_name`
y `items[]` con `barcode`/`product_name` — sin precio/cantidad/unidad. El detalle real
(peso, case/unit, precio) se captura recién al convertir, el día de la entrega, desde
Android (`PreOrderDetailActivity`, reusa el mismo stepper que `ProductDetailActivity`
usa para el carrito real). Por eso `pre_order_items.price/quantity/total` son
`NULL`-ables y hay columnas `unit`/`case_qty` (agregadas en Fase 87, antes no existían).

```
POST /api/preorders/:id/convert
Body: { items[] (barcode, product_name, price, quantity, total?, unit?, case_qty?),
        signature?, payment_method?, damage_items?, check_number?, apply_credit? }

1. 400 si items falta o está vacío — antes de esta fase no había items en el body,
   se leían de pre_order_items (que ahora puede no tener precio)
2. Valida min_price por item (mismo cálculo que createBatch, nuevo para pre-órdenes)
3. INSERT en orders por item (incluye unit/case_qty, antes no se insertaban)
4. DELETE + reinsert de pre_order_items con el detalle finalizado — para que
   GET /api/preorders/:id y "Reusar pre-orden" reflejen lo entregado, no el
   borrador vacío original
5. Firma, damage credits, apply-credit, factura QBO — igual que createBatch
6. Responde: { batchId, invoiceId, invoiceNumber, preOrderId, creditsTotal, creditApplied }
```

No descuenta `products.stock` al convertir (a diferencia de `createBatch`) — gap
preexistente, no cerrado en la Fase 87.

### Visibilidad por asignación — `assigned_user_id` (Fase 104)

El picker de "Vendedor" que ya existía en `CreatePreOrderActivity` (Android) hace
doble función: además de guardar `salesperson_name` (texto libre para el ticket
impreso), manda el `id` real del usuario elegido como `assigned_user_id` en
`pre_orders` — no hay un campo separado de "asignar". Ese id es lo que restringe
quién puede ver la pre-orden.

`listPreOrders` filtra para cualquier no-admin: solo ve pre-órdenes donde
`user_id = req.user.id` (las que él mismo creó) **o** `assigned_user_id =
req.user.id` (las que quedaron con él como vendedor seleccionado) — el resto del
equipo no las ve, aunque estén "activas". Admin sigue viendo todo, sin filtro.

`getPreOrder`/`updatePreOrder`/`deletePreOrder`/`convertPreOrder` (acceso por ID
directo) aplican el mismo criterio vía `canAccessPreOrder()` — devuelven 403 si el
usuario no es admin ni el creador ni el asignado, para que la restricción no se pueda
saltear conociendo el ID aunque no aparezca en el listado. Antes de esta fase estos
cuatro endpoints no verificaban ownership en absoluto.

## Notas de diseño

- `signature` se guarda en **cada fila** del batch (redundante pero consistente con `customer_id`/`customer_name` que también se repiten por fila). No hay tabla separada de batches.
- **`orders`/`pre_order_items` no guardan la dirección del cliente** (a propósito, Fase 102) — solo `customer_id`/`customer_name`. La dirección se resuelve bajo demanda contra `GET /api/customers/:customerId` (cache-first) cuando hace falta (ej. reimprimir un ticket desde Historial en Android, donde la dirección nunca viajó por Intent). Evita repetir un dato mutable del cliente en cada fila de venta cuando ya hay una fuente de verdad (QB) resoluble con una llamada barata.
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

## SKU (QBO) vs barcode (interno) — Fase 105

`products.sku` y `products.barcode` son dos campos separados con dueños distintos.
Antes de esta fase, `barcode` hacía las dos cosas a la vez (código físico Y SKU de
QBO); se separaron porque QBO **no tiene un campo de barcode nativo** en el objeto
`Item` — solo expone `Sku` — así que forzar el barcode físico ahí siempre iba a
quedar limitado a ese único campo compartido.

- **`sku`** — contraparte real de `Item.Sku` en QBO. Es lo único que sincroniza en
  ambas direcciones: `syncProducts` (`qbController.ts`, botón manual) y
  `syncProductsFromQbo` (`syncEngine.ts`, automático cada 5 min) leen `item.Sku` y
  lo escriben en `products.sku` (fallback `QBO-{Id}` si viene vacío, solo al insertar
  un producto nuevo — igual que antes se hacía con barcode). Al actualizar un
  producto ya existente, si `item.Sku` viene vacío el `sku` local no se toca (nunca
  se pisa con blanco ni con el `QBO-{Id}` sintético). `sku` es `UNIQUE` en MySQL: un
  choque entre dos ítems cae en el try/catch por ítem (se omite y se loguea, mismo
  tratamiento que cualquier otro error de fila). `updateItemMeta` acepta `sku` y lo
  envía como `Sku` en el sparse update; `updateProduct` lo dispara cuando cambia el
  campo `sku` del body (ya no cuando cambia `barcode`).
- **`barcode`** — puramente interno, nunca viaja hacia ni desde QBO. Es lo que se
  escanea con el TC22 (`getProductByBarcode`) y lo que identifica un producto en
  `orders`/`batch_damage`. Un producto recién importado de QBO (`sync` que lo crea
  por primera vez) llega con `barcode = NULL` — no hay de dónde sacarlo — hasta que
  alguien lo asigna/escanea localmente.

Migración de datos (Fase 105): `sku` se hizo backfill una sola vez copiando el
`barcode` que ya existía (esos valores eran, de hecho, el SKU de QBO histórico).
De ahí en adelante cada campo vive su vida por separado.

También sincroniza `item.Description` → `products.description` (sin relación con
sku/barcode).

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

## Guard contra pisar ediciones locales recientes — fix del bug "precio se revierte a los ~5 min"

**Síntoma que tenía (ya arreglado):** al editar el precio de un producto desde el modal de la webapp, el cambio se veía bien al guardar, pero unos 5 minutos después volvía a aparecer el precio viejo.

**Causa raíz:** `syncProductsFromQbo` (`syncEngine.ts`, cada 5 min) y `syncProducts` (`qbController.ts`, sync manual) pisaban `price`/`stock` con lo que devolvía la API de *consulta* de QBO, sin comparar contra cuándo se había editado el producto en MySQL por última vez. Esa API de consulta (distinta de la de escritura) puede tardar un rato corto en reflejar internamente una escritura reciente — si el ciclo caía en esa ventana, traía el valor viejo y pisaba la edición reciente.

**Fix aplicado (en ambos archivos, `syncEngine.ts` y `qbController.ts`):** antes de hacer el `UPDATE` de un producto existente, se compara `products.updated_at` (MySQL) contra `Metadata.LastUpdatedTime` (QBO) para ese item; si la edición local es más reciente, se salta el `UPDATE` completo de esa fila en esa pasada (protege `price`, `stock` y `barcode` a la vez, no campo por campo) — se reintenta en el siguiente ciclo, cuando la API de consulta de QBO ya haya convergido. Se cuentan por separado en el log/respuesta (`guarded`) de los omitidos por error (`skipped`).

**Pendiente, no implementado todavía:**
- `src/controllers/productController.ts` (`updateProduct`) — el `catch (qbErr)` del push a QBO solo loguea warning y la respuesta HTTP es siempre `{ message: 'Producto actualizado' }`, sin importar si QBO confirmó el cambio. Exponer en la respuesta si el sync a QBO tuvo éxito, para que el admin se entere en el momento si falló.
- Webapp — `app/products/_components/ProductModal.tsx` — leer ese nuevo campo de la respuesta del PUT y mostrar un aviso si QBO no confirmó el cambio (ver pendiente ya anotado en `excellentia-webapp/CLAUDE.md`).
