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
| POST | `/api/orders/batch/:batchId/approve` | JWT+admin | Aprueba un batch AWAITING_APPROVAL y recién ahí lo manda a QBO (Fase 113) — ver "Aprobación de admin..." abajo |
| POST | `/api/orders/batch/:batchId/reconcile` | JWT+admin | Chequeo de solo lectura contra QBO por DocNumber para un batch FAILED/PENDING — sin reintentar el envío. Ver "Fix (2026-09-01)" abajo |
| GET | `/api/products` | JWT | Listar productos — `?search=` matchea `name`/`barcode`/**`sku`** (Fase 108), `?sort=sku` ordena por secuencia NEW_SKU (marca A-Z, luego 001, 002…; sin NEW_SKU al final) |
| GET | `/api/customers` | JWT | Clientes QB |
| GET | `/api/customers/:customerId` | JWT | Un solo cliente — cache-first contra `cached_customers`, fallback a QB (Fase 102, ticket Android necesitaba resolver dirección para reprint) |
| GET | `/api/settings` | JWT | Info de la empresa |
| PUT | `/api/settings/invoice-counter` | JWT+admin | Reasigna el próximo número de factura QBO (`company_settings.invoice_counter`) — ver nota abajo |
| POST | `/api/products/migrate-sku` | JWT+admin | Migración de una sola vez: adopta la nomenclatura NEW_SKU (marca+secuencia) del master sheet Excellentia-vs-QBO — ver nota abajo |
| \* | `/api/routes/*` | JWT (+admin/almacenista en mutaciones) | Rutas de entrega, paradas y manifiesto de carga — ver "Módulo Almacén" abajo |
| \* | `/api/warehouse/*` | JWT+admin/almacenista (`/settlements/*` es JWT+admin exclusivo) | Recepción, lotes/FIFO, sub-inventario y liquidación diaria — ver "Módulo Almacén" abajo |

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

`company_settings.invoice_counter` (fila única, `id = 1`) es el **próximo** `DocNumber` a asignar en QuickBooks — se reserva y se incrementa en `createOrder`/`createBatch`/`retryBatchSync` (`orderController.ts`), `convertPreOrder` (`preOrderController.ts`) y `processPendingOrders` (`syncEngine.ts`). Cada factura exitosa hace `invoice_counter = invoice_counter + 1`.

`PUT /api/settings/invoice-counter` (`updateInvoiceCounter`, `settingsController.ts`) permite reasignarlo manualmente — caso de uso real: se acaba la caja de facturas físicas y hay que arrancar la numeración en un número más alto. **Solo admite avanzar el contador, nunca retroceder** (`next > current`, si no 400) — bajarlo podría reasignar un `DocNumber` que QBO ya usó en una factura previa. Cada cambio queda en `activity_log` (`action = 'INVOICE_COUNTER_UPDATED'`, `details` con `#actual → #nuevo`) para auditoría, dado que es un valor sensible que afecta la numeración fiscal.

Editable desde la webapp en Settings (card "Invoice numbering", admin-only) — `excellentia-webapp/app/settings/_components/SettingsClient.tsx`. Requiere confirmación en un modal antes de aplicar el cambio.

### Fix (2026-08-31) — condición de carrera al reservar el número

Los 5 lugares de arriba seguían el mismo patrón: `SELECT invoice_counter` →
llamar a QBO (una llamada HTTP, no instantánea) → recién ahí `UPDATE
invoice_counter = invoice_counter + 1`, **solo si** QBO confirmó la factura
(así una factura que falla no quema un número — importante porque el
contador se usa para alinear con un talonario físico de facturas, ver más
arriba). El problema: la lectura y el incremento no eran una sola operación
atómica. Si dos ventas entraban casi al mismo tiempo desde dispositivos
distintos, las dos podían leer el mismo `invoice_counter` antes de que
cualquiera de las dos llegara al `UPDATE` — QBO rechaza el segundo intento
(no permite `DocNumber` repetido), esa orden quedaba `PENDING`/`FAILED` para
reintentar más tarde, pero era un fallo evitable.

**Fix:** `src/services/invoiceCounter.ts` — `withInvoiceNumber(fn)` serializa
la sección crítica completa (leer + llamar a QBO + incrementar) con un
*named lock* de MySQL (`GET_LOCK('invoice_counter', 10)` / `RELEASE_LOCK`),
todo en la misma conexión (`pool.getConnection()`, no `pool.query()` suelto —
un named lock es por sesión, se pierde si cada consulta toma una conexión
distinta del pool). Se usa un named lock y no un `SELECT ... FOR UPDATE`
para no dejar una fila de InnoDB trabada durante toda la llamada HTTP a QBO,
que puede tardar. `fn` recibe el número reservado y un callback
`markSuccess()` que hay que llamar explícitamente si QBO confirmó — mismo
criterio de "no quemar el número si falla" que ya existía, ahora sin la
carrera. Los 5 call sites se reescribieron para usar este helper en vez de
las dos queries sueltas.

De paso, `createBatch` tenía un segundo bug relacionado: al armar la
respuesta HTTP volvía a leer `invoice_counter` y le restaba 1 para reportar
`invoiceNumber` — bajo la misma concurrencia, ese re-read podía devolver el
número de **otra** venta que ya hubiera incrementado el contador mientras
tanto. Reemplazado por usar directamente el número que `withInvoiceNumber`
ya había reservado para ese batch (`docNumber`, capturado en el closure).

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
-- Fase 112 (Almacén) — CREATE TABLE completos de warehouses/product_lots/
-- route_item_lots/inventory_movements/route_returns/daily_settlements/
-- settlement_lines en la sección "Migración — Fase 112" de db/schema.sql
-- (muy largos para este bloque). Corren solos y son idempotentes; lo único
-- que hace falta ejecutar a mano después es:
INSERT INTO warehouses (name, is_active) SELECT 'Almacén Principal', 1 WHERE NOT EXISTS (SELECT 1 FROM warehouses);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS warehouse_id INT DEFAULT NULL AFTER driver_user_id;
UPDATE routes SET warehouse_id = (SELECT id FROM warehouses ORDER BY id LIMIT 1) WHERE warehouse_id IS NULL;
-- ALTER TABLE routes ADD FOREIGN KEY (warehouse_id) REFERENCES warehouses(id); -- solo si todavía no existe esa FK
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
   (computeDamageCredit) y lo agrega a customer_credits; aplica apply_credit
   de inmediato (credit_transactions USED, invoice_id=NULL por ahora)
5. Reserva el número de factura (reserveInvoiceNumber) y queda
   status=AWAITING_APPROVAL — el envío real a QBO se difiere hasta que un
   admin apruebe (ver "Aprobación de admin..." más abajo), no pasa acá
6. Responde: { batchId, invoiceId: null, invoiceNumber, orders[], creditsTotal, creditApplied }
```

## Aprobación de admin antes de enviar una venta a QBO (Fase 113)

Pedido urgente del usuario (2026-09-01), mismo espíritu que el rediseño de
Liquidación diaria de la Fase 112 ("que el admin revise antes de que algo le
pegue a QBO") pero aplicado al flujo de ventas, no de inventario. Antes de
esta fase, `createBatch`/`createOrder`/`convertPreOrder` llamaban a
QuickBooks en la misma request en la que se imprimía el ticket. Ahora **se
difiere solo el push a QBO, no el registro local** — mismo principio de
diseño que ya se usó para el sub-inventario de la Fase 112 — la orden, el
ticket (con número de factura real) y todo lo que es puramente local (stock,
crédito por daño, crédito de cliente aplicado) siguen sucediendo al
instante.

**Alcance: todas las ventas**, no solo las de ruta de entrega — decisión
explícita del usuario. Incluye `createOrder` (el endpoint de un solo item),
que ahora también genera su propio `batch_id` (antes no tenía) para poder
aprobarse por el mismo mecanismo que un batch de varios items.

**Estado nuevo `AWAITING_APPROVAL`** en `orders.status`. Al crear una venta,
los 3 flujos reservan el número de factura al instante
(`reserveInvoiceNumber()`, `src/services/invoiceCounter.ts` — envuelve
`withInvoiceNumber()` llamando `markSuccess()` incondicionalmente, porque a
diferencia del flujo viejo ya no hay forma de saber en ese momento si QBO va
a aceptar la factura más tarde; el número se considera "usado" en cuanto se
imprime, igual que un talonario físico) y dejan el batch entero en
`AWAITING_APPROVAL` con `reserved_invoice_number` guardado — **no** llaman a
`createBatchInvoice`/`createInvoice`.

**`POST /api/orders/batch/:batchId/approve` (`approveBatch`,
`orderController.ts`, admin-only)** es el único lugar que de verdad manda la
venta a QBO. Mismas validaciones que `retryBatchSync` (qb_item_id faltante o
`qb_active=0` → `FAILED` con mensaje claro) pero arrancando desde
`AWAITING_APPROVAL`. Usa `reserved_invoice_number` ya guardado — **no**
reserva un número nuevo, el contador ya avanzó al crear el batch. Éxito →
`SENT` + `qb_invoice_id` + `approved_by`/`approved_at`; backfillea
`credit_transactions.invoice_id` tanto para el crédito `EARNED` (daño) como
`USED` (crédito de cliente aplicado), mismo patrón para los dos. Fallo →
`FAILED` (reintentable con `retryBatchSync`).

**Por qué no hizo falta tocar el SyncEngine:** `processPendingOrders` solo
procesa `status = 'PENDING'`. Como los 3 flujos de creación ya no dejan
nada en `PENDING` (van directo a `AWAITING_APPROVAL`), el SyncEngine nunca
los toca — cumple el requisito de "no se manda solo" sin cambiar ese
archivo. Se agregó de todos modos una guarda defensiva ahí y en
`retryBatchSync`: si una orden tiene `reserved_invoice_number` seteado, se
reusa tal cual en vez de reservar uno nuevo (evita reservar un segundo
número para la misma venta si algún camino la deja en `PENDING` por
error). `retryBatchSync` además cambió su rama de fallo: con número ya
reservado, un reintento fallido vuelve a `FAILED` (no `PENDING` como antes)
para que el SyncEngine no la levante solo.

**Guard contra saltearse la aprobación vía `retryBatchSync`/`forceSync`:**
`retryBatchSync` (no es admin-only, lo puede llamar el operador dueño del
batch) y `forceSync` (admin-only) no distinguían `AWAITING_APPROVAL` de
`PENDING`/`FAILED` — sin este guard, cualquiera de los dos hubiera podido
mandar la venta a QBO directamente, saltándose por completo la revisión del
admin. Ambos ahora responden 400 ("esperando aprobación del administrador")
si el batch/orden está en `AWAITING_APPROVAL`, antes de tocar nada.

**`listOrders`** expone `reserved_invoice_number` y, vía subqueries
correlacionadas (mismo patrón que `damage_credits`), a qué ruta pertenece un
batch (`route_id`/`route_name`/`route_date`, `NULL` si la venta no está
atada a ninguna ruta) — así el admin puede "revisar la ruta" desde la
pantalla de aprobación sin una llamada aparte.

**Efecto secundario aceptado, no corregido en esta fase:**
`statsController.ts` (ingresos) y `routes/customers.ts` (stats de cliente,
"última compra") filtran `status = 'SENT'` — con este cambio hay un delay
entre la venta y que aparezca en esos números (hasta que el admin aprueba).
Coherente con lo que esos reportes ya significan ("facturado de verdad en
QBO"), pero vale tenerlo presente.

**Webapp** — la pantalla `/orders` ya existente (no una nueva) gana un chip
de filtro "Por aprobar", un botón "Aprobar y enviar a QBO" (admin-only,
visible solo en batches `AWAITING_APPROVAL`, con el mismo `ConfirmModal` que
ya usa `/warehouse/settlement` para su cierre diario) y un tag de ruta junto
al ID del batch cuando aplica.

**Fix (2026-09-01) — un timeout de QBO se registraba como fallo aunque la factura sí se hubiera creado.**
Encontrado en producción: `oauthClient.makeApiCall` (intuit-oauth) tiene un
timeout default de 30000ms — si QBO tarda más que eso en responder pero la
factura **sí** se creó de su lado, `approveBatch`/`retryBatchSync` recibían
la excepción de timeout y marcaban la venta `FAILED` (o `PENDING` vía
"Forzar sync") aunque la factura ya existiera en QBO — riesgo real de
duplicado si alguien reintentaba. Fix en dos partes:
- `qbInvoices.ts` — `createInvoice`/`createBatchInvoice` suben el timeout a
  60000ms (mitiga, no elimina el riesgo).
- Nueva `findInvoiceByDocNumber(docNumber)` (`qbInvoices.ts`, query QBO por
  `DocNumber`) — `approveBatch` y `retryBatchSync` la llaman en su `catch`
  **antes** de marcar la venta como fallida: si la factura ya existe en QBO
  con ese número reservado, se toma como éxito real (`SENT` +
  `qb_invoice_id`) en vez de `FAILED`/`PENDING`. Evita que un reintento
  posterior sobre un DocNumber que ya existe termine en un duplicado.
- **`POST /api/orders/batch/:batchId/reconcile`** (`reconcileBatch`,
  admin-only) — cubre el hueco que dejan `approveBatch`/`retryBatchSync`: su
  reconciliación automática solo corre dentro de un intento de envío real,
  pero **"Forzar sync" (`forceSync`) no llama a QBO al instante** — solo
  reencola para el SyncEngine (cada 5 min) — así que una venta que quedó
  `FAILED`/`PENDING` por un timeout, pero que en QBO sí se creó, podía
  quedar sin reconciliar hasta el próximo ciclo (o hasta que alguien la
  arreglara a mano en la DB, como pasó en producción el 2026-09-01). Este
  endpoint es de **solo lectura contra QBO** (consulta por `DocNumber`, no
  reintenta el envío — cero riesgo de duplicado): si encuentra la factura,
  actualiza local a `SENT` + `qb_invoice_id` + backfill de
  `credit_transactions`; si no la encuentra, responde que es seguro
  reintentar. Botón "Verificar en QBO" en `/orders`, junto a "Forzar sync"
  (mismas condiciones: admin, batch `PENDING`/`FAILED`).

**Fuera de alcance de esta fase:** el repo de Android no se tocó (no está en
este workspace). El contrato de respuesta de los 3 endpoints de creación no
cambia de forma, pero `orders[].status` ahora puede llegar
`AWAITING_APPROVAL` en vez de `SENT`/`PENDING` justo después de crear la
venta, y `invoiceId` llega `null` hasta la aprobación — hay que verificar en
el repo Android si algo depende de esos valores puntuales antes de dar esto
por cerrado en producción.

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

## Módulo Almacén — rutas, recepción, FIFO, sub-inventario y liquidación (Fases 111-112)

Rol `almacenista` (`users.role`, junto a `admin`/`operator`): arma rutas de
entrega y opera el almacén. Middleware `warehouseOnly` (`admin` o
`almacenista`) gatea las mutaciones; lecturas quedan abiertas a cualquier
usuario autenticado, con el ownership resuelto dentro de cada controller
(`operator` solo ve/opera sus propias rutas — mismo criterio que
`canAccessPreOrder()`).

**Rutas de entrega (Fase 111) — `routes`/`route_stops`/`route_items`.** Una
ruta agrupa un repartidor, una fecha y paradas ordenadas (`BATCH` un pedido ya
facturado, `PRE_ORDER` una pre-orden confirmada, o `CUSTOMER` una visita
suelta). `route_items` es el manifiesto de carga del camión completo (no por
parada) — lo arma el almacenista escaneando en la app Android
(`WarehouseRouteDetailActivity`). Transiciones de estado forward-only
(`PLANNED → IN_PROGRESS → COMPLETED`, `CANCELLED` terminal alcanzable desde
cualquiera de los dos primeros); `maybeAutoCloseRoute` cierra sola la ruta
(`COMPLETED` si hubo ≥1 entrega, `CANCELLED` si se saltearon todas) cuando ya
no queda ninguna parada `PENDING`.

**Recepción y FIFO (Fase 112) — `warehouses`/`product_lots`/`route_item_lots`.**
Recibir mercadería (`POST /api/warehouse/receipts`) crea un `product_lots` por
cada línea escaneada (código de barras + cantidad + fecha de expiración
opcional) — cada escaneo es su propio lote, sin agrupar por producto/fecha,
para no complicar el merge de dos recepciones separadas del mismo producto.
Al cargar una ruta (`addRouteItem`), `computeFifoAllocation()` elige el/los
lote(s) — orden `expiration_date ASC` (los lotes sin fecha quedan al final,
no bloquean perecederos) y `received_at ASC` como desempate — y puede partir
la cantidad entre varios lotes si el primero no alcanza. **Es sugerencia, no
regla dura**: el almacenista puede pisarla a mano pasando `lot_id` en el
body (`route_item_lots.used_suggested_lot = 0`), la app Android se lo ofrece
tras mostrar la sugerencia. `removeRouteItem` revierte recorriendo
`route_item_lots` de esa línea y restaurando `remaining_qty` en cada lote.

Un lote recibido con un error de tipeo (cantidad o expiración) se corrige con
`PUT /api/warehouse/lots/:id` (`updateLot`, agregado 2026-08-31 a pedido del
usuario) — solo mientras el lote sigue `ACTIVE`, y no deja bajar la cantidad
por debajo de lo que ya se asignó a una ruta. El delta queda como un
movimiento `ADJUSTMENT` aparte; el `RECEIPT` original nunca se toca (registro
histórico). Expuesto en Android desde `InventoryMovementsActivity` — botón de
editar en las filas `RECEIPT` cuyo lote sigue activo. Corregir el *producto*
de una recepción mal escaneada queda fuera de alcance a propósito (implicaría
mover stock entre dos productos) — la vía es dar de baja el lote
(`setLotCondition`) y recibir de nuevo.

**Sub-inventario y liquidación diaria (Fase 112) — `inventory_movements`/
`daily_settlements`/`settlement_lines`.** Decisión de diseño central: **se
difiere solo el push a QBO, no el registro local.** Cada movimiento
(`RECEIPT`, `ROUTE_LOAD`, `RETURN`, `DAMAGE`) escribe de inmediato en
`product_lots`/`products.stock` — sigue siendo la fuente de verdad local todo
el día, igual que antes de esta fase — pero ya **no** dispara
`updateItemQtyOnHand` al instante (ese código, `syncStockToQbo` en
`routeController.ts`, se eliminó). El movimiento queda con `settlement_id
NULL` (pendiente) hasta que la liquidación del día lo agrupa. Quién dispara
`preview`/`confirm` es el **admin**, desde `/warehouse/settlement` en la
webapp (`adminOnly`, no `warehouseOnly` — el almacenista no tiene acceso,
ver más abajo "Alcance de la Fase 112"). Confirmar una
liquidación (`POST /api/warehouse/settlements/:id/confirm`) es barato de
razonar porque `updateItemQtyOnHand` ya trabaja con `QtyOnHand` **absoluto**,
no delta: como `products.stock` local ya está siempre al día, liquidar es
simplemente "por cada producto con movimientos pendientes, empujar el stock
actual una sola vez" — no hace falta sumar deltas a mano.
`confirmSettlement` recalcula fresco contra lo pendiente en el momento de
confirmar (no contra lo que haya guardado el último preview, que puede haber
quedado desactualizado) y no bloquea si el settlement ya estaba `CONFIRMED`
— volver a confirmar reintenta las líneas que hayan fallado la sincronización
sin perder lo ya logrado.

> **Desactualizado — ver Fase 114.** La Liquidación diaria completa
> (`daily_settlements`/`settlement_lines`, `/warehouse/settlement`,
> `previewSettlement`/`confirmSettlement`) se **eliminó** en la Fase 114: el
> usuario dejó de verle sentido una vez que el resto de los cambios de esa
> fase ya daban visibilidad completa del historial. Ahora `recordMovement()`
> sincroniza QBO al toque en cada movimiento — se deja este párrafo como
> registro histórico de por qué se diseñó así originalmente.

**Revisión de devoluciones y condición del producto (Fase 112) —
`route_returns`.** Solo con la ruta `COMPLETED`. `GOOD` restituye
`remaining_qty` a los lotes que **esa ruta** usó para ese producto (recorre
`route_item_lots`, el más recientemente cargado primero — no hay forma de
saber de qué caja física vino lo que regresó) y revierte el descuento de
`products.stock` de la carga original. `DAMAGED`/`EXPIRED` **no** revierte
nada: el `ROUTE_LOAD` original ya restó esa cantidad al cargarla al camión, y
sumar otro movimiento acá duplicaría el descuento — la condición del producto
en sí (bueno/dañado/vencido) ya queda capturada en `condition_status`, sin
necesitar tocar el ledger de nuevo. El almacén audita lo que regresa
físicamente, no re-valida lo que se vendió (eso ya está en `orders`) —
`GET /api/routes/:id/returns/expected` da la referencia (cargado − vendido −
ya revisado) pero no bloquea si el conteo real no coincide.

**`routes.returns_reviewed_at`/`returns_reviewed_by` (2026-08-31) — marca
explícita de revisión, no inferida.** `createReturns` la estampa siempre al
terminar, **incluso con `items: []`** (el endpoint dejó de exigir al menos
un producto) — así una ruta 100% vendida se puede marcar "revisada, nada
para devolver" en vez de quedar indistinguible de una ruta que todavía
nadie miró (antes se adivinaba por si `route_returns` tenía filas, y los dos
casos se veían idénticos). Se usa para avisos en la webapp (badge en
`/warehouse`, banner en `/warehouse/settlement`) — **nunca para bloquear**;
se evaluó un bloqueo duro y se descartó porque no hay forma de que sea
preciso sin esta marca, y aun con ella el admin puede tener razones válidas
para liquidar antes de tiempo.

**Alcance de la Fase 112: backend + Android primero, con un ajuste posterior
el mismo día.** Mismo patrón que la Fase 111 pero al revés ("primero
Android, después Dashboard/webapp") — a pedido explícito del usuario. Las
pantallas de Android (`ReceivingActivity`, `RouteReturnsActivity`,
`InventoryMovementsActivity`) son deliberadamente simples (listas y
formularios, sin gráficos/reportes). Una excepción reconsiderada en la
práctica: la **liquidación diaria** arrancó como `SettlementActivity` en
Android (accesible al almacenista), pero el usuario decidió después que ese
paso — revisar lo que pasó en cada ruta y confirmar el cierre a QBO — es
tarea exclusiva del **admin desde la webapp**, no del almacenista en el
TC22. `SettlementActivity` se eliminó por completo de Android (no quedó como
código muerto) y el flujo se reconstruyó en `/warehouse/settlement`
(`excellentia-webapp`), gateado a `admin` tanto en el backend
(`adminOnly` en `warehouseInventory.ts`) como en la página. El resto del
módulo (recepción, FIFO, sub-inventario, devoluciones) sigue siendo tarea
del almacenista en Android, sin cambios.

## Módulo Almacén — revisión de devoluciones 2.0, Sub-inventario, backfill y sync instantáneo a QBO (Fase 114)

Pedido del usuario en varias vueltas seguidas sobre lo ya construido en las
Fases 111-112: mejorar cómo se revisa lo que vuelve de una ruta, dar
visibilidad real de stock/movimientos también desde la webapp (no solo
Android), resolver el caso de stock real que nunca pasó por Recepción, y —
al final, viendo que ya no hacía falta — sacar la Liquidación diaria por
completo. Alcance: backend + Android + webapp, las tres partes.

### 1. Bloqueo de ruta una vez revisadas las devoluciones
Antes, `addStop`/`removeStop`/`reorderStops`/`addRouteItem`/`removeRouteItem`
solo bloqueaban rutas `CANCELLED` — una ruta con devoluciones ya revisadas
seguía técnicamente editable por API (aunque la UI no ofreciera el botón).
Los cinco ahora también rechazan (`400`) si `routes.returns_reviewed_at` está
seteado. `WarehouseActivity` (lista de rutas, Android y ahora también
`/warehouse` en la webapp) muestra un badge "Revisado"/"Falta revisar" en
rutas `COMPLETED`; `WarehouseRouteDetailActivity` muestra un banner y
deshabilita todos los botones de edición cuando corresponde, y ahora refresca
en `onResume()` — antes, volver de `RouteReturnsActivity` dejaba la pantalla
con el estado viejo hasta salir y reentrar a mano.

### 2. Sub-inventario (Android) rediseñado — Disponible / Historial
`InventoryMovementsActivity` pasó de una lista plana de movimientos a dos
pestañas:
- **Disponible** — stock `ACTIVE` agrupado por producto (badge con el total,
  detalle por lote con vencimiento, orden FIFO). Acá vive el único botón de
  **Editar** un lote (antes vivía en el historial, sobre líneas `RECEIPT`,
  donde se podía "corregir" un lote ya consumido del todo — no tenía sentido
  práctico).
- **Historial** — todos los movimientos, con badge de color por tipo (verde
  = entra stock, índigo = sale de forma normal, rojo = daño, ámbar = ajuste),
  filtro por fecha y por tipo, agrupado por día (Hoy/Ayer/fecha), badge
  "Disponible" cuando el lote de esa línea sigue teniendo stock, alerta ámbar
  si algo vence en ≤7 días, y referencia a la ruta (`Ruta #N`) cuando aplica.

### 3. Revisión de devoluciones — condición por línea + confirmación de salida
Antes, `RouteReturnsActivity` solo permitía **una cantidad + una condición
por producto para toda la ruta** — si de 5 unidades volvían 3 buenas y 2
dañadas, no había forma de registrarlo.

- Cada producto ahora tiene 3 campos de cantidad — **Bueno / Dañado /
  Vencido** — en vez de uno solo. Notas obligatorias (validado en cliente y
  en `createReturns`) cuando hay cantidad en Dañado o Vencido.
- `createReturns` suma dos guardas: rechaza una segunda línea `GOOD` del
  mismo producto en la misma request (la rama `GOOD` restaura stock a los
  lotes leyendo la cantidad *original* cargada por lote, no un contador de
  "ya restaurado en esta request" — dos líneas `GOOD` del mismo producto
  duplicarían la restitución), y rechaza revisar una ruta cuyo
  `returns_reviewed_at` ya está seteado (doble tap / reintento de red no
  vuelve a sumar `route_returns` ni a restituir stock).
- **Confirmación de salida, sin ningún paso ni columna nueva.** Como
  `addRouteItem` solo permite cargar lotes `ACTIVE` (nunca dañados/vencidos),
  la carga misma ya es la prueba de que ese producto salió en buen estado —
  `route_items.scanned_by`/`created_at` ya lo registraban. `getExpectedReturns`
  y `getRoute` ahora exponen `loaded_at`/`loaded_by_name` (join a `users`), y
  tanto `RouteReturnsActivity` (Android) como el detalle de ruta en la webapp
  muestran "Salió el [fecha] · cargado por [nombre] — confirmado en buen
  estado". Como la salida está garantizada buena por construcción, cualquier
  `DAMAGED`/`EXPIRED` en la devolución ya implica que pasó durante la
  ruta — no hizo falta un valor nuevo en el ENUM `condition_status`.

### 4. Paridad webapp — Sub-inventario nuevo en `/warehouse/inventory`
La webapp no tenía ningún equivalente al Sub-inventario de Android — un
admin no podía ver stock disponible ni movimientos sin abrir la app. Página
nueva `excellentia-webapp/app/warehouse/inventory/` (`page.tsx` +
`InventoryClient.tsx`), mismas dos pestañas y mismos criterios que Android
(agrupación, colores, filtros, día/Ayer/Hoy) — reusa los mismos endpoints que
ya consumía Android (`GET /api/warehouse/lots`, `GET /api/warehouse/movements`,
gateados por `warehouseOnly`, no hizo falta ningún endpoint nuevo). Se agregó
el token de color `--ec-info`/`--ec-info-bg` (`globals.css`) para el badge de
`ROUTE_LOAD`, que no tenía un semántico propio todavía. `WarehouseClient.tsx`
también ganó la línea "Cargado el... confirmado en buen estado" por ítem
(mismo dato que expone `getRoute` desde el punto 3).

### 5. Backfill — stock pre-existente sin lote
Productos con stock real de antes de usar el módulo Almacén (nunca pasaron
por Recepción) se pueden **vender** sin problema (`createBatch`/`createOrder`/
`convertPreOrder` restan `products.stock` directo, sin pedir lote) pero
**no se pueden cargar a una ruta** — `computeFifoAllocation` solo asigna
desde `product_lots` `ACTIVE`. `POST /api/warehouse/lots/backfill`
(`backfillLots`, admin-only, mismo criterio dry-run/`apply=true` que
`migrateSkuNomenclature`) compara `products.stock` contra la suma de lotes
`ACTIVE` existentes y crea un lote de apertura por la diferencia — **sin
tocar `products.stock`** (ya está correcto) **ni generar un movimiento**
(no fue un movimiento físico real, es registrar en el sistema algo que ya
existía; un `RECEIPT` falso hubiera aparecido en el historial como si hoy
hubiera entrado mercadería nueva). Botón admin-only en la pestaña Disponible
de `/warehouse/inventory` (preview → confirmar, mismo patrón que ya usaba la
Liquidación diaria antes de eliminarse).

### 6. Cargar a una ruta directo del stock general (sin lote)
Alternativa al backfill para el día a día: `addRouteItem` acepta
`source: 'STOCK'` (default `'LOT'`, sin cambio de comportamiento) — salta
`computeFifoAllocation`/`route_item_lots` por completo, valida que
`products.stock` alcance (`409` con el mismo shape que `InsufficientStockError`)
y descuenta directo. `removeRouteItem` ya restauraba `products.stock` sin
mirar si había lotes; se le agregó el movimiento de reversa que faltaba para
ese caso (antes quedaba sin rastro en el historial). Android:
`WarehouseRouteDetailActivity` — checkbox "Usar stock general (tengo N)" en
el diálogo de cantidad al escanear/ingresar manualmente.

### 7. "Devolver" un lote sin usar
Botón nuevo junto a "Editar" en la pestaña Disponible (Android) — para stock
que se recibió pero no hacía falta. Reusa `updateLot` (sin backend nuevo):
manda `quantity = received_qty - remaining_qty` (lo ya consumido por una
ruta, nunca 0 a secas) para dejar `remaining_qty` en 0 sin pisar lo que ya
salió en un camión — evita el `409` de "ya se asignó esa cantidad a una
ruta" que dispararía mandar siempre `0`.

### Fix — stock negativo posible en `updateLot`
`updateLot` aplicaba `UPDATE products SET stock = stock + deltaQty` **sin**
el piso `GREATEST(...,0)` que sí tiene cualquier otro camino que resta stock
(venta, carga de ruta, `setLotCondition`). Bajar la cantidad de un lote por
más de lo que `products.stock` tenía realmente sincronizado podía dejarlo en
negativo (se detectó así en datos de prueba). Corregido a
`GREATEST(stock + deltaQty, 0)`, mismo criterio que el resto — protege tanto
"Editar" como "Devolver" (punto 7), que reusa el mismo endpoint.

### 8. Eliminación de la Liquidación diaria — QBO se sincroniza al toque
A pedido explícito del usuario: con todo lo de arriba, el paso manual de
"confirmar" para recién ahí empujar `QtyOnHand` a QBO agrupado por día dejó
de tener sentido — la razón original (evitar muchas llamadas seguidas a la
API de QBO) no es un problema real al volumen de uso real.

**Reemplazo:** `recordMovement()` (`warehouseController.ts`) ya era el único
punto de paso de **todo** cambio de stock del módulo Almacén — lo llaman
`createReceipt`, `addRouteItem` (los dos orígenes), `removeRouteItem` (con y
sin lote), `createReturns`, `setLotCondition` y `updateLot`. Se le agregó una
llamada a `syncProductStockToQbo(productId)` (mismo archivo) justo después
del `INSERT INTO inventory_movements` — lee `products.stock`/`qb_item_id`
actuales y llama `updateItemQtyOnHand`, mismo patrón "silencioso" que ya usa
`updateProduct` (`productController.ts`): si QBO falla, no revierte nada
local, queda logueado como warning nomás. Cubre los 6 call sites sin tocar
ninguno de ellos. Nota: si una sola acción genera varias filas de movimiento
para el mismo producto (ej. una carga partida entre 2 lotes), esto sincroniza
QBO más de una vez seguida con el mismo valor final — redundante pero
inofensivo (siempre manda el stock actual, no un delta).

**Se eliminó por completo:** `previewSettlement`/`confirmSettlement`/
`listSettlements`/`getSettlement`/`aggregatePendingMovements`
(`warehouseController.ts`) y sus 4 rutas (`warehouseInventory.ts`);
`/warehouse/settlement` entero en la webapp (página + `SettlementClient.tsx`)
y el botón "Liquidación" en `/warehouse` (con el `isAdmin`/`getUserInfo` que
quedaban sin otro uso); el badge "Draft"/"Confirmado" del historial en
Android y webapp (`settlementId`/`settlement_id` ya no significa nada, no se
vuelve a escribir). **No se tocó el schema** — `daily_settlements`/
`settlement_lines` siguen definidas (creadas por `ensureWarehouseTables()`)
pero sin uso, mismo criterio que el resto del proyecto de nunca dropear
tablas. `inventory_movements.settlement_id` queda en la tabla, siempre
`NULL` de acá en más.

### Estado al cierre de la Fase 114
Backend + webapp + Android completos y compilando (`tsc --noEmit` sin
errores nuevos en ninguno de los dos backends TS, `assembleDebug` limpio en
Android) — **pendiente de deploy** en las tres partes al momento de escribir
esto: el backend no está desplegado a `app.excellentiafoods.com`, la webapp
de producción no tiene el build nuevo, y no se generó/distribuyó un APK
nuevo a los TC22.

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
