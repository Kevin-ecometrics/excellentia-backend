# Excellentia — Project Architecture

API Express que conecta escáneres Zebra TC22, QuickBooks Online y un dashboard Next.js para gestión de inventario y pedidos.

---

## Stack

| Tecnología | Versión |
|---|---|
| Runtime | Bun |
| Framework | Express 5 |
| OAuth QuickBooks | intuit-oauth 4 |
| Lenguaje | TypeScript (ESM) |
| Base de datos | MySQL (driver `mysql2`) |
| Android | Kotlin, minSdk 30, DataWedge (TC22) |
| Impresora | Zebra ZQ630 Plus — Bluetooth Classic SPP, lenguaje CPCL |
| Frontend | Next.js 16 + Tailwind CSS 4 (excellentia-webapp) |

---

## Comandos

```bash
bun install                  # Instalar dependencias
bun run src/index.ts         # Iniciar servidor en :3000
bun run src/seed.ts          # Seed: tablas + admin + sync QBO
bun run --watch src/index.ts # Modo desarrollo con watch
bunx tsc --noEmit            # Verificar tipos
```

---

## Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                        ZEBRA TC22                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Android App (Kotlin)                                   │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │ │
│  │  │ DataWedge    │  │ Retrofit     │  │ SQLite (off)  │  │ │
│  │  │ (escaner)   │──│ HTTP Client  │──│ cola pend.    │  │ │
│  │  └─────────────┘  └──────┬───────┘  └───────────────┘  │ │
│  └──────────────────────────┼──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTPS + JWT             │ BT SPP (CPCL)
                              ▼                         ▼
                                             ┌──────────────────┐
                                             │  ZEBRA ZQ630 Plus │
                                             │  (impresora)      │
                                             └──────────────────┘
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND EXPRESS (excellentia)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Auth JWT │  │ REST API │  │ QuickBooks│  │ Sync Engine │  │
│  │          │  │ Products │  │ OAuth 2.0 │  │ (colas)     │  │
│  │          │  │ Scans    │  │ Invoices  │  │             │  │
│  │          │  │ Orders   │  │ Items     │  │             │  │
│  └──────────┘  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│                     └──────┬───────┴──────┬────────┘         │
│                            ▼              ▼                   │
│                     ┌────────────┐  ┌────────────┐           │
│                     │   MySQL    │  │ QuickBooks │            │
│                     │            │  │   Online   │            │
│                     └────────────┘  └────────────┘           │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS + JWT
                              │
┌──────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                           │
│  ┌────────────────┐  ┌──────────────┐                        │
│  │ Products       │  │ Sync QB      │                        │
│  │ (inline edit)  │  │ (botón)      │                        │
│  └────────────────┘  └──────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Flujo del Pedido

### Customer-First + Escaneo → Pedido → QuickBooks

```
1. SELECCIONAR CLIENTE (MainActivity)
   CustomerPickerActivity → GET /api/customers → guarda active customer en SecurePreferences

2. SCAN (TC22)
   DataWedge broadcast → MainActivity.onBarcode()
   Solo disponible si hay cliente activo

3. PRICE HISTORY (App → Backend)
   GET /api/products/:barcode/history?customer_id=X
   → Precios anteriores del cliente para este producto + min_price

4. NEGOCIACIÓN (ProductDetailActivity)
   Muestra precio total (NO per-lb)
   Tap en precio → diálogo "Editar precio total"
   Validación: nuevo total >= min_price
   Cada unidad = 1 PendingOrderEntity independiente

5. CURRENT ORDER (CurrentOrderActivity)
   Editar: dialog con "Cantidad total (lb)" + "Precio / lb" (ambos editables)
   Resumen dinámico "X.XX lb = $Y.YY"
   Validación min_price en edición
   Cliente activo en header

6. FIRMA (SignatureActivity)
   Canvas táctil (SignatureView) — trazos quadratic bezier
   Botones "Limpiar" / "Confirmar firma"
   Exporta PNG base64 → devuelve a CurrentOrderActivity
   Aparece antes de finalizar, después de seleccionar cliente

7. BATCH (App → Backend)
   POST /api/orders/batch { items[], customer_id, customer_name, signature }
   → Valida total por unidad >= min_price
   → Guarda en MySQL con firma (status = PENDING)
   → SyncEngine procesa: crea Invoice en QBO
   → Imprime ticket vía Bluetooth (si configurada)
```

---

## Base de Datos (MySQL)

### Esquema

```sql
CREATE TABLE products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    barcode         VARCHAR(50) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    min_price       DECIMAL(10,2) NULL,
    category        VARCHAR(100),
    brand           VARCHAR(100),
    stock           INT DEFAULT 0,
    weight_per_unit DECIMAL(10,2) NULL,
    unit            VARCHAR(20) DEFAULT NULL,
    case_qty        INT DEFAULT NULL,
    qty             INT NOT NULL DEFAULT 0,
    qb_item_id      VARCHAR(50),
    hidden          TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = oculto (no aparece en lista ni scanner)
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    barcode         VARCHAR(50) NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    price           DECIMAL(10,6) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL,
    total           DECIMAL(10,2) NOT NULL,
    batch_id        VARCHAR(50),
    device_id       INT,
    user_id         INT,
    customer_id     VARCHAR(50) NULL,
    customer_name   VARCHAR(255) NULL,
    signature       MEDIUMTEXT NULL,      -- base64 PNG de la firma del cliente
    qb_invoice_id   VARCHAR(50),
    status          ENUM('PENDING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
    error_log       TEXT,
    retry_count     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Auto-creadas por el backend en el primer uso
CREATE TABLE IF NOT EXISTS cached_customers (
    id          VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    active      TINYINT(1) DEFAULT 1,
    cached_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NULL,
    user_email  VARCHAR(255) NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id   VARCHAR(50) NULL,
    details     TEXT NULL,
    ip          VARCHAR(45) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_settings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'EXCELLENTIA',
    subtitle     VARCHAR(255) NOT NULL DEFAULT 'Ticket de Venta',
    address      VARCHAR(255) DEFAULT NULL,
    phone        VARCHAR(50) DEFAULT NULL,
    city         VARCHAR(100) DEFAULT NULL,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Ver schema completo en `src/db/schema.sql`.

**Migraciones MySQL acumuladas (para DBs existentes):**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;
ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL AFTER email;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature MEDIUMTEXT NULL AFTER customer_name;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0;
UPDATE products SET hidden = 1 WHERE barcode IN ('QBO-1', 'QBO-2');  -- Services y Hours (items del sistema QBO)
```

---

## API Endpoints

### Productos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/products` | JWT | Listar (paginado, búsqueda) |
| GET | `/api/products/:barcode` | JWT | Buscar por código de barras |
| GET | `/api/products/:barcode/history?customer_id=X` | JWT | Historial precios del cliente |
| POST | `/api/products` | JWT (admin) | Crear |
| PUT | `/api/products/:id` | JWT (admin) | Actualizar |
| DELETE | `/api/products/:id` | JWT (admin) | Eliminar |

### Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/orders/batch` | JWT | Batch con customer + `signature` (base64 PNG opcional) |
| GET | `/api/orders` | JWT | Listar con filtros (status, barcode, device_id, **customer_id**, date_from, date_to). Operadores ven solo sus pedidos. **No retorna `signature`** (excluida para evitar TransactionTooLargeException en Android) |
| GET | `/api/orders/:id` | JWT | Detalle |
| GET | `/api/orders/damage/:batchId` | JWT | Damage items del batch + `signature` del batch en `{ data: [...], signature: "..." }` |
| PUT | `/api/orders/:id/status` | JWT (admin) | Cambiar status |
| POST | `/api/orders/:id/sync` | JWT (admin) | Forzar sync |

### Usuarios

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/users` | JWT (admin) | Listar usuarios (sin passwords) |
| PUT | `/api/users/:id` | JWT (admin) | Actualizar email, rol, contraseña |
| DELETE | `/api/users/:id` | JWT (admin) | Eliminar (protege auto-eliminación) |

### Clientes QB

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/customers` | JWT | Cache-first (MySQL TTL 1h) → QB → cache expirado si QB falla |
| POST | `/api/customers/refresh` | JWT (admin) | Forzar actualización del cache desde QB |
| GET | `/api/customers/:customerId/orders` | JWT | Batches agrupados por cliente (paginado, newest first) |

### Pre-órdenes

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/preorders` | JWT | Crear pre-orden (customer_id, customer_name, scheduled_date, notes, items[]) |
| GET | `/api/preorders` | JWT | Listar (filtros: status, customer_id); operadores ven solo las suyas |
| GET | `/api/preorders/:id` | JWT | Detalle con items |
| PUT | `/api/preorders/:id` | JWT | Actualizar scheduled_date, notes, items o status |
| DELETE | `/api/preorders/:id` | JWT | Cancelar (soft delete → status CANCELLED) |
| POST | `/api/preorders/:id/convert` | JWT | Convertir a batch real (crea orders, sync QB, marca CONVERTED) |

### Stats

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/stats?period=today\|yesterday\|week\|month` | JWT | KPIs, pedidos por hora/día, top 5 y actividad del período. Filtrado por `user_id` para operadores. Default: `today` |

### Actividad y configuración

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/activity` | JWT (admin) | Últimas 100 entradas del log de actividad |
| GET | `/api/settings` | JWT | Configuración de empresa (cualquier rol) |
| PUT | `/api/settings` | JWT (admin) | Actualizar configuración de empresa |
| PUT | `/api/auth/change-password` | JWT | Cambiar contraseña (requiere contraseña actual) |
| GET | `/api/orders/export` | JWT | Descargar pedidos en CSV (filtrable por estado y fecha) |

### Historial de Precios (`GET /api/products/:barcode/history`)

```
Response:
{
  "product": { "name": "...", "barcode": "...", "price": 30.00, "min_price": 25.00 },
  "history": [
    { "price": 5.96, "quantity": 10.90, "total": 65.00, "invoice_id": "123", "date": "..." }
  ]
}
```

---

## Convenciones de Código

### Backend (TypeScript)
- `import`/`export` (ESM), NO `require`
- `camelCase` para variables, `PascalCase` para clases/types/interfaces
- Async/await siempre
- Errores: `AppError` class con `statusCode` + `message`
- Respuestas API: `{ data: ... }` para éxito, `{ error: ... }` para errores

### Android (Kotlin)
- `findViewById`, sin ViewBinding
- Retrofit interfaces en `data/network/`
- Entities en `data/local/`
- SQLite v3: `pending_orders.quantity` es `REAL` (no `INTEGER`) — soporta pesos decimales como 1.75 lb

---

## Roles y Permisos

| Rol | App Android | Webapp |
|---|---|---|
| `admin` | Login normal, ve todos los pedidos en historial | `/dashboard` (con filtros de período), todos los módulos, edición de productos, gestión de usuarios |
| `operator` | Login normal, ve solo sus pedidos | Redirigido a `/orders`, productos en modo lectura (sin editar), sin `/dashboard` ni `/users` |

El rol viaja en el JWT payload — el backend lo extrae via middleware `auth`. La webapp lo decodifica del cookie sin llamada extra.

## Android — Activities principales

| Activity | Descripción |
|---|---|
| `LoginActivity` | POST `/api/auth/login`, guarda JWT + company settings, navega a MainActivity |
| `MainActivity` | DataWedge scan → ProductDetailActivity. Badge pedido. Selección de cliente. Long press: búsqueda + resumen del día |
| `ProductDetailActivity` | Precio/lb, historial de precios por cliente, múltiples unidades, min_price |
| `CurrentOrderActivity` | Lista ítems pendientes. Edit dialog: Cantidad (lb) + Precio/lb editables. Finalizar → SignatureActivity |
| `SignatureActivity` | Canvas táctil (`SignatureView`). Firma del cliente en PNG base64. Retorna firma → checkPrinterThenFinalize |
| `CustomerPickerActivity` | Lista clientes QB con cache offline. Modal de confirmación |
| `TicketDetailActivity` | Recibo con ítems, totales, cliente, botón Reimprimir |
| `HistoryActivity` | Batches locales + remotos. Filtros estado/fecha. Paginación |
| `SettingsActivity` | URL backend, impresora BT, cambio de contraseña, cerrar sesión |
| `ChangePasswordActivity` | Cambiar contraseña via `PUT /api/auth/change-password` |
| `OrderSuccessActivity` | Pantalla de éxito tras enviar batch |

## Webapp — Navegación y UX

| Componente | Descripción |
|---|---|
| `NavigationProgress` | Barra azul animada en la parte superior al hacer clic en links del sidebar. Usa `usePathname` + click delegation. Envuelto en `<Suspense>` |
| `loading.tsx` (6 rutas) | Skeletons animados por página — Next.js los usa automáticamente como `<Suspense fallback>` |
| `DateFilter` | Chips Hoy/Ayer/7d/30d en el dashboard. Cambia `?filter=X` en la URL → el server component re-fetcha con el nuevo período |
| Sidebar | Dark theme (`zinc-950`), grupos de navegación, items filtrados por rol, user card con nombre/email/badge. Toggle ES/EN en el footer |
| Modal Ticket (pedidos) | Recibo con info de empresa, ítems, total, y **firma del cliente** si existe (`data:image/png;base64,…`) |
| Badge firma (pedidos) | Chip `✎ firma` azul en columna Pedido para batches con `signature !== null` |
| `LangProvider` | React Context de idioma. Locale default: `'en'`. Persiste en `localStorage`. `useLang()` expone `{ locale, setLocale, t }`. Envuelve todo el layout |
| `DashboardClient` | Client component que recibe todos los datos del dashboard como props (period, kpis, byHour, byDay, top5, recent, products) y renderiza la UI completa con `useLang()` |
| `ProductModal` | Modal crear/editar producto con campos: Nombre*, Descripción, Precio*, Min price, Barcode, Stock, Peso/lb. Validación inline por campo. Leyenda QBO al pie. `min_price` opcional — se envía en PUT/POST solo si tiene valor |

## Internacionalización (i18n)

- Diccionario en `app/lib/i18n.ts` — soporte ES y EN completo
- Prefijos de claves: `nav_` `login_` `prod_` `modal_` `ord_` `tkt_` `usr_` `cfg_` `cust_` `dash_` `dt_`
- Todos los client components usan `const { t } = useLang()`
- Server components (page.tsx) pasan datos a client wrappers que manejan la traducción
- `fmtDate` usa `locale === 'en' ? 'en-US' : 'es-MX'` para formateo de fechas locale-aware

## Seguridad

- JWT access token con expiry corto (15 min)
- JWT refresh token con expiry largo (7 días) almacenado en DB
- Refresh token rotado en cada uso
- QuickBooks tokens rotados automáticamente
- Passwords hasheados con `bcrypt`
- No hardcodear secrets — todo vía `.env`
- Rate limiting en `POST /api/auth/login` — máx 10 intentos por IP en 15 min (`express-rate-limit`)
- Android: EncryptedSharedPreferences para JWT
- Android: `HttpLoggingInterceptor` en modo `NONE` en builds de release — tokens JWT no aparecen en logcat
- Webapp: JWT decodificado del cookie sin llamada API extra (`Buffer.from(..., 'base64url')`)

## Comportamiento de Errores — Android

| Escenario | Comportamiento |
|---|---|
| Impresora Bluetooth apagada o fuera de rango | Timeout de 8 s → mensaje de error, la app no se congela |
| Sync de pedido falla 3 veces | `retry_count = -1` → chip rojo "FALLIDO" en historial, botón "Reintentar envío" disponible |
| Reintento manual de orden fallida | Pasa `customerId`/`customerName` guardados — pedido llega al backend con cliente correcto |
| SyncWorker en background | Solo procesa órdenes con `retry_count >= 0` — nunca reintenta las fallidas automáticamente |
| Abrir ticket desde historial (muchos pedidos con firma) | `TransactionTooLargeException` era causada por pasar `orders_json` con `signature` (PNG base64) en el Intent. Fix: `listOrders` excluye `signature`; Android hace `.copy(signature = null)` antes de serializar. La firma se carga por separado via `GET /api/orders/damage/:batchId` |

## SQLite — Versiones de migración

| Versión | Cambio |
|---|---|
| v1 | Schema inicial: `cached_products` + `pending_orders` |
| v2 | `cached_products`: columna `weight_per_unit REAL` |
| v3 | `pending_orders.quantity`: `INTEGER` → `REAL` |
| v4 | `pending_orders`: columnas `customer_id TEXT` + `customer_name TEXT` |
| v5 | Nueva tabla `cached_customers` — cache offline de clientes QB |

## SecurePreferences — Campos almacenados

| Clave | Descripción |
|---|---|
| `jwt_token` | JWT de acceso (gestionado automáticamente, no editable en UI) |
| `refresh_jwt_token` | Refresh token |
| `backend_url` | URL del servidor backend |
| `offline_mode` | Modo sin conexión activado/desactivado |
| `printer_bt_address` | MAC address de la impresora ZQ630 Plus |
| `printer_bt_name` | Nombre display de la impresora |
| `active_customer_id` | ID QB del cliente activo en sesión |
| `active_customer_name` | Nombre del cliente activo en sesión |
| `company_name` | Nombre de empresa cacheado desde `/api/settings` |
| `company_subtitle` | Subtítulo del ticket |
| `company_address` | Dirección de la empresa |
| `company_phone` | Teléfono |
| `company_city` | Ciudad/Estado |
| `last_scan_barcode` | Barcode del último producto escaneado |
| `last_scan_name` | Nombre del último producto escaneado |
| `last_scan_time` | Timestamp del último escaneo |
