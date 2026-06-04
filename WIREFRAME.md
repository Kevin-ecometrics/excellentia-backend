# Excellentia — Wireframe General del Sistema

> Documento de referencia completo. Cubre App Android, Backend, Webapp, SQLite, MySQL y QuickBooks.

---

## 1. Arquitectura Global

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ZEBRA TC22  (campo)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  APP ANDROID (Kotlin · minSdk 30)                                   │    │
│  │                                                                     │    │
│  │  DataWedge ──► MainActivity ──► ProductDetailActivity               │    │
│  │  (escáner)         │                    │                           │    │
│  │                    │                    ▼                           │    │
│  │              CustomerPicker      CurrentOrderActivity               │    │
│  │              Activity            │                                  │    │
│  │                    │             ▼                                  │    │
│  │                    │        SignatureActivity                       │    │
│  │                    │             │                                  │    │
│  │                    │             ▼                                  │    │
│  │                    └──── POST /api/orders/batch ──────────────────► │    │
│  │                                                                     │    │
│  │  SQLite (local)  ◄──── pending_orders / cached_products / customers │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │ JWT + HTTPS                  │ BT SPP (CPCL)     │
└──────────────────────────┼──────────────────────────────┼───────────────────┘
                           │                              ▼
                           │                    ┌──────────────────┐
                           │                    │  ZEBRA ZQ630 Plus │
                           │                    │  Bluetooth SPP   │
                           │                    │  Lenguaje: CPCL  │
                           │                    └──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              BACKEND  (Bun · Express 5 · TypeScript · ESM)                  │
│                                                                             │
│   /api/auth        /api/products      /api/orders       /api/preorders      │
│   /api/customers   /api/users         /api/stats        /api/settings       │
│   /api/devices     /api/scans         /api/activity     /api/setup          │
│   /api/qb/*                                                                 │
│                                                                             │
│   ┌──────────────┐   ┌────────────────┐   ┌───────────────────────────┐    │
│   │  Auth JWT    │   │  SyncEngine    │   │  QuickBooks OAuth 2.0     │    │
│   │  bcrypt      │   │  (5 min loop)  │   │  intuit-oauth 4           │    │
│   │  refresh tok │   │  PENDING→QB    │   │  tokens en MySQL          │    │
│   └──────────────┘   └────────────────┘   └───────────────────────────┘    │
│                              │                          │                   │
│                    ┌─────────▼──────────┐   ┌──────────▼──────────────┐    │
│                    │      MySQL          │   │    QuickBooks Online     │    │
│                    │  (todas las tablas) │   │  Invoices · Items       │    │
│                    │                    │   │  Customers · Payments   │    │
│                    └────────────────────┘   └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                           ▲
                           │ JWT + HTTPS
                           │
┌─────────────────────────────────────────────────────────────────────────────┐
│                WEBAPP  (Next.js 16 · Tailwind 4)                            │
│                                                                             │
│  /dashboard  /orders  /products  /customers  /users  /settings              │
│                                                                             │
│   Admin: todos los módulos + edición                                        │
│   Operator: /orders + /products (lectura)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. App Android — Flujo de Pantallas

```
┌─────────────────┐
│  LoginActivity  │ ◄── LAUNCHER
│                 │
│  · URL backend  │
│  · Email/Pass   │
│  · POST /login  │
└────────┬────────┘
         │ JWT ok
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MainActivity                                                        │
│                                                                      │
│  ┌──────────────────────┐    ┌─────────────────┐                    │
│  │  Card cliente activo │    │  Chip "Pre-órd." │                   │
│  │  [Cambiar] [Historial]│   │  (ic_schedule)  │                    │
│  └──────────────────────┘    └────────┬────────┘                    │
│                                       │                              │
│  ○ TAP TO SCAN (ring animado)         ▼ PreOrderListActivity        │
│  [Ingresar código]   [Pre-órdenes]                                  │
│  └── long press → búsqueda por nombre                               │
│                                                                      │
│  [Último escaneo card]  ← long press → resumen del día              │
│                                                                      │
│  Bottom Nav: [Escáner] [Pedido(N)] [Historial] [Ajustes]           │
└─────────────────────┬──────────────────────┬────────────────────────┘
                      │ barcode              │
                      ▼                      ▼
         ┌────────────────────┐   ┌───────────────────────┐
         │ ProductDetailAct.  │   │  CustomerPickerAct.   │
         │                    │   │                       │
         │ · Nombre, precio/lb│   │ · Lista clientes QB   │
         │ · Historial precios│   │ · Búsqueda en tiempo  │
         │ · +/- unidades     │   │   real                │
         │ · min_price warn   │   │ · Cache SQLite offline│
         │ · "Agregar pedido" │   │ · [Click] → confirmar │
         └─────────┬──────────┘   │ · [Long press] →      │
                   │              │   Asignar / Historial  │
                   ▼              └───────────┬───────────┘
         ┌────────────────────┐               │
         │ CurrentOrderAct.   │               ▼
         │                    │   ┌───────────────────────┐
         │ · Lista ítems      │   │  ClientHistoryAct.    │
         │ · Edit: lb + $/lb  │   │                       │
         │ · Delete confirm   │   │ · Header: nombre +    │
         │ · Total dinámico   │   │   total histórico     │
         │ · "Ver ticket" →   │   │ · Batches del cliente │
         │   TicketDetail     │   │ · Click → TicketDetail│
         │ · "Finalizar" →    │   └───────────────────────┘
         └─────────┬──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │  SignatureActivity  │
         │                    │
         │  Canvas táctil     │
         │  quadratic bezier  │
         │  [Limpiar][Confirmar│
         │  → base64 PNG      │
         └─────────┬──────────┘
                   │ signature
                   ▼
         askDamagedItems() → askPaymentMethod() → checkPrinterThenFinalize()
                   │
          ┌────────┴────────────────────────────────┐
          │ Sin impresora          Con impresora     │
          │ "Continuar sin         "Finalizar e      │
          │  imprimir"              imprimir" /       │
          │                        "Sin imprimir"    │
          └────────┬────────────────────────────────┘
                   │ POST /api/orders/batch
                   ▼
         ┌────────────────────┐    ┌──────────────────────┐
         │  OrderSuccessAct.  │    │  PrintService        │
         │                    │    │  BT SPP → ZQ630      │
         │  · batch_id        │    │  CPCL ticket         │
         │  · invoice_id      │    │  con firma PNG       │
         │  · total           │    └──────────────────────┘
         │  · "Ver ticket"    │
         └────────────────────┘

         ┌────────────────────┐
         │  HistoryActivity   │
         │                    │
         │  Chips: Hoy/Todos  │
         │  + Todos/Enviados/ │
         │    Pendientes/     │
         │    Fallidos        │
         │                    │
         │  · Locales: SQLite │
         │    pending_orders  │
         │  · Remotos: API    │
         │    paginado        │
         │  · "Cargar más"    │
         │  · Empty state     │
         │    dinámico        │
         │  · Click → Ticket  │
         └────────────────────┘

         ┌────────────────────┐
         │ TicketDetailAct.   │
         │                    │
         │  · Header empresa  │
         │  · Fecha, batch#   │
         │  · Invoice QB #    │
         │  · Cliente + dir.  │
         │  · Ítems + totales │
         │  · Payment method  │
         │  · Negative Sale   │
         │  · Firma PNG       │
         │  · [Reimprimir]    │
         └────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PRE-ÓRDENES (flujo paralelo)                                │
│                                                              │
│  PreOrderListActivity                                        │
│  Chips: [Pendientes★][Convertidas][Canceladas][Todas]        │
│  FAB [+ Nueva pre-orden]  ──► CreatePreOrderActivity         │
│  Click card ─────────────► PreOrderDetailActivity            │
│                                                              │
│  CreatePreOrderActivity                                      │
│  · Seleccionar cliente (pre-llena si hay activo)             │
│  · DatePicker → scheduled_date                               │
│  · Notas                                                     │
│  · Agregar ítems: DataWedge scan ó dialog manual             │
│  · Total estimado en tiempo real                             │
│  · [Guardar] → POST /api/preorders                           │
│                                                              │
│  PreOrderDetailActivity (DRAFT/CONFIRMED)                    │
│  · Muestra: cliente, fecha formateada, notas, ítems, total   │
│  · [Convertir a pedido] → mismo flujo que CurrentOrder:      │
│    Firma → Dañados → Pago → Impresora →                      │
│    POST /api/preorders/:id/convert →                         │
│    Print → OrderSuccessActivity                              │
│  · [Cancelar pre-orden] → DELETE → status=CANCELLED          │
│                                                              │
│  PreOrderDetailActivity (CONVERTED)                          │
│  · [Reusar pre-orden] → crea nueva DRAFT con mismos ítems    │
│  · [Ver en historial] → finish()                             │
│                                                              │
│  PreOrderDetailActivity (CANCELLED)                          │
│  · Solo lectura, sin botones                                 │
└──────────────────────────────────────────────────────────────┘

         ┌────────────────────┐
         │  SettingsActivity  │
         │                    │
         │  · URL backend     │
         │  · Offline toggle  │
         │  · Impresora BT    │
         │    (lista + test)  │
         │  · Cambiar password│
         │  · Cerrar sesión   │
         └────────────────────┘
```

---

## 3. Backend — Mapa de API

```
/api/auth
  POST  /login                → { token, refreshToken, user }
  POST  /refresh              → { token, refreshToken }
  POST  /register     [admin] → crear usuario
  GET   /me                   → datos del usuario actual
  PUT   /change-password      → cambiar contraseña

/api/products
  GET   /                     → listar (paginado, ?search=)
  GET   /:barcode             → buscar por código
  GET   /:barcode/history     → historial de precios por ?customer_id=
  POST  /           [admin]   → crear
  PUT   /:id        [admin]   → actualizar (incluye min_price, weight_per_unit)
  DELETE/:id        [admin]   → eliminar

/api/orders
  POST  /batch                → crear batch con items[], customer, signature, damage_items, payment_method
  GET   /                     → listar (?status, ?barcode, ?customer_id, ?device_id, ?date_from, ?date_to)
                                operadores ven solo sus pedidos
  GET   /export               → CSV descargable (?status, ?date_from, ?date_to)
  GET   /damage/:batchId      → items dañados de un batch
  GET   /:id                  → detalle de orden
  PUT   /:id/status [admin]   → cambiar status (PENDING|SENT|FAILED|CANCELLED)
  POST  /:id/sync   [admin]   → forzar re-sync a QB

/api/preorders
  POST  /                     → crear { customer_id, customer_name, scheduled_date, notes, items[] }
  GET   /                     → listar (?status, ?customer_id) — operadores ven solo las suyas
  GET   /:id                  → detalle con items[]
  PUT   /:id                  → actualizar scheduled_date, notes, items, status
  DELETE/:id                  → cancelar (soft delete → CANCELLED)
  POST  /:id/convert          → convertir a batch real { signature, payment_method, damage_items }

/api/customers
  GET   /                     → cache MySQL TTL 1h → QB → stale cache si QB falla
  POST  /refresh    [admin]   → forzar actualización desde QB
  GET   /stats      [admin]   → totales por cliente (batch_count, total_spent, last_order)
  GET   /:customerId/orders   → batches agrupados del cliente (paginado)

/api/users        [admin]
  GET   /                     → listar usuarios (sin passwords)
  PUT   /:id                  → actualizar email, rol, nombre, contraseña
  DELETE/:id                  → eliminar (protegido contra auto-eliminación)

/api/stats
  GET   /?period=today|yesterday|week|month
        → { kpis: { ordersToday, revenueToday, revenueTotal, pending, sent, failed } }
        operadores: filtrado por user_id

/api/settings
  GET   /                     → company_name, subtitle, address, phone, city
  PUT   / [admin]             → actualizar configuración de empresa

/api/activity   [admin]
  GET   /                     → últimas 100 entradas del log

/api/qb
  GET   /auth                 → iniciar OAuth flow QuickBooks
  GET   /callback             → recibir tokens OAuth
  GET   /status     [admin]   → estado de conexión QB
  POST  /sync-products[admin] → importar Items de QB → MySQL products

/api/devices
  POST  /register             → registrar dispositivo TC22
  PUT   /:id/heartbeat        → latido del dispositivo

/api/scans
  POST  /                     → registrar escaneo
  GET   /                     → historial

/api/setup
  GET   /                     → inicializar DB (idempotente, CREATE TABLE IF NOT EXISTS)
```

---

## 4. MySQL — Esquema Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  users                                                           │
│  id · email · password(bcrypt) · role(admin|operator) · name    │
│  created_at                                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  products                                                        │
│  id · barcode(UNIQUE) · name · price(DECIMAL 10,2)              │
│  min_price(DECIMAL 10,2 NULL) · stock · category · brand        │
│  description(TEXT NULL) · weight_per_unit(DECIMAL 10,4 NULL)    │
│  hidden(TINYINT 1 DEFAULT 0) · qb_item_id                       │
│  cached_at · updated_at                                          │
│                                                                  │
│  hidden=1 → no aparece en listProducts ni en la app Android     │
│  Usado para ocultar ítems del sistema de QBO (QBO-1, QBO-2)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  orders                                                          │
│  id · barcode · product_name · price(10,6) · quantity(10,2)     │
│  total(10,2) · batch_id · device_id · user_id · customer_id     │
│  customer_name · signature(MEDIUMTEXT) · qb_invoice_id          │
│  status(PENDING|SENT|FAILED|CANCELLED) · error_log · retry_count│
│  created_at · updated_at                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  batch_damage                                                    │
│  id · batch_id · barcode · product_name · qty                   │
│  created_at                                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  pre_orders                                                      │
│  id · user_id · customer_id · customer_name · scheduled_date    │
│  notes · status(DRAFT|CONFIRMED|CONVERTED|CANCELLED)            │
│  created_at · updated_at                                         │
│                                                                  │
│  ⚠ NOTA: SQLs de ensureTables() deben ir en UNA SOLA LÍNEA     │
│    para evitar \r\n de Windows dentro del ENUM value            │
└────────────────────────┬────────────────────────────────────────┘
                         │ FK ON DELETE CASCADE
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  pre_order_items                                                 │
│  id · pre_order_id(FK) · barcode · product_name                 │
│  price(10,6) · quantity(10,2) · total(10,2)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  cached_customers                                                │
│  id(VARCHAR 50, PK) · display_name · active · address_line1     │
│  city · state_code · postal_code · cached_at(TTL 1h)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  company_settings  (1 sola fila)                                │
│  id · company_name · subtitle · address · phone · city          │
│  updated_at                                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  activity_log                                                    │
│  id · user_id · user_email · action · entity_type · entity_id   │
│  details · ip · created_at                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  qb_tokens  (1 sola fila)                                       │
│  id · access_token · refresh_token · token_type · expires_in    │
│  x_refresh_token_expires_in · created_at · updated_at           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  devices                                                         │
│  id · serial_number(UNIQUE) · model · name · created_at         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  sync_log                                                        │
│  id · entity_type · entity_id · action · qb_status              │
│  qb_id · error_message · created_at                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  batch_signatures                                                │
│  batch_id(VARCHAR 100, PK) · signature(MEDIUMTEXT)              │
│  created_at                                                      │
│                                                                  │
│  Una fila por batch (no por orden) — la firma se guarda aquí    │
│  en vez de repetirse en cada fila de orders. Se carga bajo       │
│  demanda via GET /api/orders/damage/:batchId                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  sync_meta                                                       │
│  entity(PK) · last_sync_at                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. SQLite — App Android

```
Archivo: excellentia.db  (SQLiteOpenHelper v6)

┌─────────────────────────────────────────────────────────────────┐
│  cached_products                                                 │
│  id · barcode(UNIQUE) · name · price · category · brand         │
│  stock · weight_per_unit · cached_at                            │
│  Propósito: modo offline — fallback si API no responde          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  pending_orders                                                  │
│  id · barcode · product_name · price · quantity(REAL)           │
│  device_id · created_at · retry_count · customer_id             │
│  customer_name                                                   │
│                                                                  │
│  retry_count:                                                    │
│    0+  = pendiente de envío (SyncWorker lo reintenta)           │
│    -1  = fallido manual (solo reintento manual)                 │
│  Propósito: cola offline — se vacía al hacer sendBatch()        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  cached_customers                                                │
│  id(TEXT PK) · display_name · address_line1 · city              │
│  state_code · postal_code · cached_at                           │
│  Propósito: CustomerPickerActivity sin conexión (banner naranja)│
└─────────────────────────────────────────────────────────────────┘

Migraciones automáticas (onUpgrade):
  v1 → schema inicial
  v2 → cached_products.weight_per_unit REAL
  v3 → pending_orders.quantity INTEGER→REAL (preserva datos)
  v4 → pending_orders + customer_id, customer_name
  v5 → nueva tabla cached_customers
  v6 → cached_customers + address_line1, city, state_code, postal_code
```

---

## 6. QuickBooks Online — Integración

```
┌──────────────────────────────────────────────────────────────┐
│                  QB ONLINE (Sandbox / Production)            │
│                                                              │
│  Entidades usadas:                                           │
│  · Customer  → mapeado desde cached_customers.id (QB ID)    │
│  · Item      → mapeado desde products.qb_item_id            │
│  · Invoice   → creado por createBatchInvoice()              │
│                                                              │
│  Estructura de Invoice creada:                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Invoice                                               │  │
│  │  CustomerRef: customer_id (QB)                         │  │
│  │  Line[]:                                               │  │
│  │    - SalesItemLineDetail (por cada item del batch)     │  │
│  │      · ItemRef: qb_item_id                             │  │
│  │      · Qty: 1  (siempre — 1 scan = 1 unidad física)   │  │
│  │      · UnitPrice: item.total (monto total de la línea) │  │
│  │      · Description: "X.XX lb a $X.XX/lb"              │  │
│  │      QBO descuenta 1 unidad de inventario por scan     │  │
│  │    - DescriptionOnly (si hay damage_items)             │  │
│  │      · Description: "Damaged: X unit(s) - product"    │  │
│  │  CustomerMemo: "Payment: Cash | Negative Sale: X..."   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  OAuth 2.0 Flow:                                             │
│  1. GET /api/qb/auth → redirect a Intuit                     │
│  2. GET /api/qb/callback → guarda tokens en qb_tokens        │
│  3. SyncEngine usa access_token (1h) + refresh auto          │
│  4. access_token expira → intuit-oauth renueva automático    │
│  5. refresh_token expira (100 días) → repetir paso 1        │
│                                                              │
│  Sync de productos (QB → MySQL):                             │
│  POST /api/qb/sync-products [admin]                          │
│  · Trae Items activos de QB (hidden=0 no se toca)            │
│  · Upsert en MySQL: barcode=item.Sku (fallback QBO-{Id})     │
│  · Sincroniza: name, description, price, stock, qb_item_id   │
│  · Ítems del sistema (QBO-1, QBO-2) marcados hidden=1        │
│                                                              │
│  Sync inventario (MySQL → QB):                               │
│  updateItemQtyOnHand(itemId, qty)   — stock webapp → QBO     │
│  · Solo ítems Type='Inventory' (Service se ignora, warning)  │
│  · Llamado desde updateProduct cuando stock cambia           │
│                                                              │
│  Sync metadata (MySQL → QB):                                 │
│  updateItemMeta(itemId, {name?, description?, sku?,          │
│                           unitPrice?})                       │
│  · Sparse update en un solo GET + POST a QBO                 │
│  · Llamado desde updateProduct cuando nombre/desc/barcode    │
│    o precio de venta cambian (una sola llamada QBO)          │
│  · Precio de compra (Cost) solo se edita en QBO directamente │
│                                                              │
│  Descuento automático de stock (al vender):                  │
│  · createBatch → UPDATE products SET stock=GREATEST(s-1,0)   │
│    por cada línea del batch (1 scan = 1 unidad)              │
│  · Ocurre antes del sync a QBO para garantizar consistencia  │
│  · QBO también descuenta 1 unidad via Qty:1 en el Invoice    │
│                                                              │
│  Requisito para sync stock QBO:                              │
│  · Ítems deben ser Type='Inventory' en QBO                   │
│    (cambiar desde UI: Productos y servicios → Editar → tipo) │
│  · Cuentas requeridas: Inventory Asset + Cost of Goods Sold  │
│                                                              │
│  SyncEngine (background cada 5 min):                         │
│  · SELECT orders WHERE status='PENDING' AND retry_count >= 0 │
│  · Busca qb_item_id del producto                             │
│  · createBatchInvoice() → Invoice en QB                      │
│  · UPDATE orders SET status='SENT', qb_invoice_id=?          │
│  · Si falla: retry_count++ (máx 3) → luego FAILED           │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Flujos de Datos Clave

### 7a. Flujo Pedido Completo

```
TC22 (DataWedge)
  │ barcode broadcast
  ▼
MainActivity.onBarcode()
  │ GET /api/products/:barcode → precio, min_price, weight_per_unit
  │ GET /api/products/:barcode/history?customer_id= → historial
  ▼
ProductDetailActivity
  │ precio negociado · unidades · validación min_price
  │ → SQLite: INSERT INTO pending_orders
  ▼
CurrentOrderActivity
  │ lista pending_orders · editar/borrar
  │ "Finalizar pedido"
  ▼
SignatureActivity → base64 PNG
  ▼
askDamagedItems() → askPaymentMethod() → checkPrinterThenFinalize()
  ▼
POST /api/orders/batch {
  items[{barcode, product_name, price, quantity, total}],
  customer_id, customer_name,
  signature (base64 PNG),
  damage_items[{barcode, product_name, qty}],
  payment_method (Cash|Check|null)
}
  │ Backend:
  │   · Valida total >= min_price por unidad
  │   · INSERT INTO orders (batch_id generado)
  │   · INSERT INTO batch_damage (si damage_items)
  │   · Busca qb_item_id → createBatchInvoice() → QB Invoice
  │   · UPDATE orders SET status='SENT', qb_invoice_id=?
  ▼
PrintService.printTicket()           OrderSuccessActivity
  BT SPP → ZQ630 Plus                batch_id · invoice_id
  CPCL ticket con firma PNG          total · firma
  ▼
SQLite: DELETE FROM pending_orders
SecurePreferences: clearActiveCustomer()
```

### 7b. Flujo Pre-Orden → Conversión

```
PreOrderListActivity (chip: Pendientes)
  │ GET /api/preorders?status=null → filtra DRAFT client-side
  ▼
CreatePreOrderActivity
  │ cliente · fecha entrega · notas · ítems (scan / manual)
  │ POST /api/preorders → { id, status:'DRAFT' }
  ▼
PreOrderDetailActivity (DRAFT)
  │ [Convertir a pedido]
  ▼
SignatureActivity → askDamagedItems() → askPaymentMethod()
  → checkPrinterThenConvert()
  ▼
POST /api/preorders/:id/convert {
  signature, payment_method, damage_items
}
  │ Backend:
  │   · Carga pre_order_items
  │   · INSERT INTO orders (batch_id, firma, cliente)
  │   · INSERT INTO batch_damage (si damage_items)
  │   · UPDATE pre_orders SET status='CONVERTED'
  │   · createBatchInvoice() → QB Invoice
  ▼
Loading overlay: "Convirtiendo" → "Generando factura" → "Imprimiendo"
  ▼
PrintService.printTicket() → OrderSuccessActivity
  ▼
PreOrderListActivity (chip: Convertidas) → muestra la pre-orden
  [Reusar pre-orden] → nueva DRAFT con mismos ítems
```

### 7c. Flujo Historial por Cliente

```
CustomerPickerActivity
  │ long-press en card → menú
  │ "Ver historial de pedidos"
  ▼
ClientHistoryActivity (customer_id, customer_name)
  │ GET /api/customers/:customerId/orders
  │ → batches agrupados (batch_id, total, item_count, status, fecha)
  ▼
Card batch: click
  │ GET /api/orders?customer_id=X&limit=100
  │ filtra por batch_id client-side
  ▼
TicketDetailActivity (orders_json con signature)
  · ticket completo con firma PNG del cliente
  · [Reimprimir] si impresora configurada
```

### 7d. Flujo Inventario QBO

```
IMPORTAR (QB → MySQL):
  POST /api/qb/sync-products [admin]
    → item.Sku → products.barcode  (fallback: QBO-{Id})
    → item.Name → products.name
    → item.Description → products.description
    → item.UnitPrice → products.price
    → item.QtyOnHand → products.stock
    → item.Type='Inventory' → permite sync de stock en ventas
    → ítems QBO-1, QBO-2 marcados hidden=1 (ítems del sistema)

VENDER (MySQL auto-descuento):
  POST /api/orders/batch
    → por cada línea: UPDATE products SET stock=GREATEST(stock-1,0)
    → Invoice QBO: Qty=1, UnitPrice=total (QBO también -1 unidad)

EDITAR desde webapp (MySQL → QB):
  PUT /api/products/:id
    nombre / descripción / barcode / precio
      → updateItemMeta(qb_item_id, {name, description, sku, unitPrice})
      → un solo GET + POST a QBO
    stock
      → updateItemQtyOnHand(qb_item_id, qty)
      → solo si Type='Inventory', silencioso si falla QBO

Precio de compra (Cost/PurchaseCost):
  · Solo se edita directamente en QBO
  · No gestionado desde la webapp
  · QBO lo usa para calcular COGS y ganancia bruta
```

### 7e. Flujo Sync Offline → Online

```
Sin conexión:
  pending_orders (SQLite) ← INSERT por cada unidad escaneada
  retry_count = 0

Con conexión (WorkManager cada 15 min):
  SyncWorker → OrderRepository.sendBatch()
  → POST /api/orders/batch
  → ok: DELETE pending_orders · retry_count se ignora
  → fail: retry_count++ hasta 3 → luego retry_count = -1 (FAILED)

HistoryActivity chip "Fallidos":
  · Locales: pending_orders WHERE retry_count = -1
  · Remotos: batches WHERE any order.status = 'FAILED'
  [Reintentar envío] → sendBatch() manual
```

---

## 8. Webapp — Pantallas

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (dark zinc-950)                                     │
│  · Logo Excellentia                                          │
│  · Dashboard     [admin only]                                │
│  · Pedidos       [admin + operator]                          │
│  · Productos     [admin + operator]                          │
│  · Clientes      [admin only]                                │
│  · Usuarios      [admin only]                                │
│  · Configuración [admin only]                                │
│  · User card: nombre · email · badge rol                     │
│  · Toggle idioma ES/EN (globo + pills) — persiste en         │
│    localStorage, aplica a toda la webapp via LangProvider    │
└──────────────────────────────────────────────────────────────┘

/dashboard  [admin]
  · Chips: Hoy / Ayer / 7d / 30d → ?filter= en URL
  · KPIs: pedidos hoy · ingresos hoy · total · enviados · fallidos
  · Gráfica pedidos por hora
  · Top 5 productos
  · Actividad reciente

/orders  [admin + operator]
  · Tabla paginada: batch · producto · cliente · precio · qty · total
  · Filtros: estado · fecha
  · Chip "✎ firma" en batches con signature
  · Modal ticket: recibo completo con firma PNG
  · Exportar CSV
  · [admin] Cambiar status · Forzar sync QB

/products  [admin editable · operator lectura]
  · Tabla: nombre · descripción (gris, truncada) · barcode · precio
    · min_price · stock (rojo si=0, ámbar si≤5) · QB Item
  · Stat card "Sin stock" (rojo) visible para admins
  · Productos hidden=1 nunca aparecen (ítems sistema QBO)
  · [admin] Botón lápiz por fila → ProductModal (nombre, descripción,
    barcode, precio, min_price, stock) — toda edición via modal
  · Modal guarda en MySQL y sincroniza a QBO:
      nombre/descripción/barcode/precio → updateItemMeta (1 sola llamada)
      stock → updateItemQtyOnHand (solo ítems Inventory)
  · Productos se crean en QBO (no desde la webapp) y se importan
  · Botón "Sincronizar QB" [admin] → POST /api/qb/sync-products

/customers  [admin]
  · Tabla: nombre QB · dirección · pedidos · total gastado
  · Desde cache MySQL + stats de orders

/users  [admin]
  · Tabla: nombre · email · rol
  · Crear / Editar / Eliminar
  · Protección: no puede eliminar su propio usuario

/settings  [admin]
  · Nombre empresa · subtítulo · dirección · teléfono · ciudad
  · PUT /api/settings → actualiza company_settings MySQL
  · La app Android sincroniza en cada onResume() silenciosamente
```

---

## 9. Hardware

```
ZEBRA TC22 (dispositivo de campo)
  · Android 11+ (minSdk 30)
  · DataWedge: perfil "TestScannerProfile" creado automáticamente
    action: com.symbol.datawedge.datawedge.ACTION_RESULT
    delivery: Broadcast
  · Conectividad: WiFi → Backend local (192.168.x.x:3000)
  · Permiso runtime: BLUETOOTH_CONNECT (Android 12+)

ZEBRA ZQ630 Plus (impresora de campo)
  · Protocolo: Bluetooth Classic SPP
  · UUID: 00001101-0000-1000-8000-00805F9B34FB
  · Lenguaje: CPCL (NO ZPL — el firmware no lo soporta)
  · Fuentes disponibles: Font 4 (17×27px) · Font 7 (28×44px)
    ⚠ Font 3 NO disponible en este firmware
  · Ancho: PAGE-WIDTH 576 (~3" a 203 DPI)
  · Alineación: LEFT únicamente (CENTER/RIGHT problemáticos)
  · Drain: Thread.sleep(2000) antes de cerrar socket
  · Emparejamiento: TC22 Ajustes → Bluetooth → ZQ630
    App Settings → "Seleccionar impresora" → elegir ZQ630
```

---

## 10. Seguridad

```
Autenticación:
  · JWT access token (15 min expiry)
  · JWT refresh token (7 días, rotado en cada uso, guardado en MySQL)
  · bcrypt para passwords (cost 10)
  · Rate limiting: 10 intentos/15 min en POST /api/auth/login

Android:
  · EncryptedSharedPreferences para JWT + refresh token
  · HttpLoggingInterceptor en NONE en release builds
  · TokenAuthenticator: refresca token en 401 automáticamente
  · OkHttpClient independiente para refresh (evita loops)

Backend:
  · Middleware auth: extrae userId + role del JWT
  · adminOnly middleware: bloquea operadores en rutas admin
  · express.json({ limit: '10mb' }) — soporta firmas base64 PNG

Roles:
  · admin   → acceso total (app + webapp)
  · operator → solo sus pedidos + productos en lectura

QuickBooks:
  · OAuth 2.0 — tokens en MySQL (access 1h auto-renovable, refresh 100 días)
  · Tokens nunca en código ni .env en producción
```

---

## 11. Variables de Entorno (Backend)

```env
# QuickBooks
CLIENT_ID=           # developer.intuit.com → Keys & OAuth
CLIENT_SECRET=
REALM_ID=            # Company ID de QB
REDIRECT_URI=        # https://tudominio.com/api/qb/callback
ENVIRONMENT=         # sandbox | production

# QB tokens (se llenan automáticamente tras OAuth)
ACCESS_TOKEN=
REFRESH_TOKEN=
EXPIRES_IN=3600
X_REFRESH_TOKEN_EXPIRES_IN=8726400
QB_DEFAULT_CUSTOMER_ID=2

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=excellentia

# JWT
JWT_SECRET=          # min 32 chars aleatorios
JWT_REFRESH_SECRET=  # diferente al anterior

# Server
PORT=3000
LOG_LEVEL=info
NODE_ENV=production
```

---

## 12. Migraciones SQL Acumuladas

```sql
-- Fase 7
ALTER TABLE orders MODIFY COLUMN quantity DECIMAL(10,2) NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;

-- Fase 17 (también auto-crea el backend)
CREATE TABLE IF NOT EXISTS company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'EXCELLENTIA',
  subtitle VARCHAR(255) NOT NULL DEFAULT 'Ticket de Venta',
  address VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO company_settings (id, company_name, subtitle)
VALUES (1, 'EXCELLENTIA', 'Ticket de Venta');

-- Fase 33: pre-órdenes (también via GET /api/setup)
CREATE TABLE IF NOT EXISTS pre_orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, customer_id VARCHAR(100) NOT NULL, customer_name VARCHAR(255) NOT NULL, scheduled_date DATE, notes TEXT, status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS pre_order_items (id INT AUTO_INCREMENT PRIMARY KEY, pre_order_id INT NOT NULL, barcode VARCHAR(100) NOT NULL, product_name VARCHAR(255) NOT NULL, price DECIMAL(10,6) NOT NULL, quantity DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL, FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE);

-- Fix Fase 37: ENUM corrupto (CONVERTED partido por \r\n de Windows)
ALTER TABLE pre_orders MODIFY COLUMN status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT';
UPDATE pre_orders SET status = 'CONVERTED' WHERE status = '';

-- Fase 38-39: Stock + QBO Inventory sync
-- (stock ya existe en products desde la fase inicial)

-- Fase 41: Sales Description en productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER stock;

-- Fase 45: Ocultar ítems del sistema de QBO
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0;
UPDATE products SET hidden = 1 WHERE barcode IN ('QBO-1', 'QBO-2');

-- Fase 48: Normalización firmas — una por batch en vez de una por orden
CREATE TABLE IF NOT EXISTS batch_signatures (
  batch_id   VARCHAR(100) NOT NULL PRIMARY KEY,
  signature  MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Migrar firmas existentes de orders → batch_signatures
INSERT IGNORE INTO batch_signatures (batch_id, signature)
  SELECT batch_id, signature
  FROM orders
  WHERE signature IS NOT NULL AND signature != ''
  GROUP BY batch_id;
-- Eliminar columna signature de orders (ejecutar después de migrar)
ALTER TABLE orders DROP COLUMN IF EXISTS signature;
```
