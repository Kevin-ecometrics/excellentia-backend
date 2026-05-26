# Excellentia — Instrucciones de Setup y Uso

## Requisitos

- [Bun](https://bun.sh) >= 1.2
- MySQL >= 8.0 (o MariaDB)
- Cuenta de desarrollador en [Intuit QuickBooks](https://developer.intuit.com)
- Android Studio (para compilar la app)
- JDK 17+ (para compilar la app)

## Variables de Entorno

Crear archivo `.env`:

```env
# QuickBooks OAuth
CLIENT_ID=tu_client_id
CLIENT_SECRET=tu_client_secret
ACCESS_TOKEN=...
REFRESH_TOKEN=...
REALM_ID=...
ENVIRONMENT=sandbox
EXPIRES_IN=3600
X_REFRESH_TOKEN_EXPIRES_IN=8726400
REDIRECT_URI=http://localhost:3000/api/qb/callback

# QuickBooks — cliente por defecto para facturas sin customer seleccionado
QB_DEFAULT_CUSTOMER_ID=2

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=excellentia

# JWT
JWT_SECRET=tu-secreto-jwt
JWT_REFRESH_SECRET=tu-secreto-refresh-jwt

# Logging (opcional)
LOG_LEVEL=info
```

## Setup Inicial — Backend

```bash
cd C:\Users\kevin\e-commetrics\excellentia

# 1. Instalar dependencias
bun install

# 2. Crear la base de datos MySQL
bun run src/db/initdb.ts

# 3. Crear tablas, admin user y sincronizar productos desde QBO
bun run src/seed.ts

# 4. Migraciones (solo si la DB ya existe)
mysql -u root excellentia -e "ALTER TABLE orders MODIFY COLUMN quantity DECIMAL(10,2) NOT NULL;"
mysql -u root excellentia -e "ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;"

# 5. Iniciar servidor
bun run src/index.ts
```

## Configurar OAuth QuickBooks

```bash
# 1. Agregar Redirect URI en Intuit Developer Console
# 2. Abrir en el navegador:
#    http://localhost:3000/api/qb/auth
# 3. Autorizar → tokens guardados en MySQL → SyncEngine activo
```

## Setup Inicial — Android

```bash
cd C:\Users\kevin\AndroidStudioProjects\test

.\gradlew clean assembleDebug
adb uninstall com.example.test
adb install app\build\outputs\apk\debug\app-debug.apk
```

### Configurar impresora Zebra ZQ630 Plus

1. En el TC22: Ajustes → Bluetooth → emparejar la ZQ630 Plus
2. En la app: Settings → "Seleccionar impresora" → elegir ZQ630
3. Tocar "Imprimir página de prueba" para verificar

## Setup Inicial — Webapp (excellentia-webapp)

```bash
cd C:\Users\kevin\e-commetrics\excellentia-webapp

bun install
# Crear .env.local: NEXT_PUBLIC_API_URL=http://192.168.0.131:3000
bun run dev   # → http://localhost:3001
```

### Páginas disponibles

| Ruta | Roles | Descripción |
|---|---|---|
| `/dashboard` | Admin | KPIs con filtro Hoy/Ayer/7d/30d, gráficas, top productos |
| `/orders` | Admin + Operador | Pedidos con filtros, forzar sync, exportar CSV, ver ticket |
| `/products` | Admin (editable) / Operador (lectura) | Catálogo de productos, sync QB |
| `/customers` | Admin | Clientes QB con totales y frecuencia |
| `/users` | Admin | Gestión de usuarios (crear, editar, eliminar) |
| `/settings` | Admin | Configuración de empresa (nombre, dirección, teléfono) |

Login con `admin@excellentia.com` / `admin123`.

## Comandos Disponibles — Backend

| Comando | Descripción |
|---|---|
| `bun run src/index.ts` | Iniciar servidor en `:3000` |
| `bun run src/seed.ts` | Seed: tablas + admin + sync QBO |
| `bun run src/db/initdb.ts` | Crear base de datos MySQL |
| `bunx tsc --noEmit` | Verificar tipos TypeScript |

## Uso del Sistema

### Login en la App Android

1. Abrir la app → **LoginActivity**
2. Completar: backend URL, email, password (`admin123` para el admin)
3. Tocar "Iniciar sesión"

### Flujo del Pedido (Customer-First)

```
1. SELECCIONAR CLIENTE (MainActivity)
   - Si no hay cliente activo → card "Seleccionar cliente" → CustomerPickerActivity
   - Cliente activo se muestra como chip azul

2. ESCANEAR (MainActivity)
   - Escáner físico DataWedge o "Ingresar código manualmente"
   - Solo habilitado cuando hay cliente seleccionado

3. ProductDetailActivity
   - Muestra: nombre, código, precio total (NO por libra)
   - Tocar el precio → diálogo para editar precio total (negociación)
   - Si el producto tiene min_price → muestra "Precio mínimo: $X.XX"
   - Valida que el nuevo precio no sea menor al mínimo
   - Múltiples unidades con peso individual (+/- 0.1)
   - Cada unidad se guarda como un registro independiente
   - Timeline de precios históricos del cliente para este producto

4. Ver pedido (CurrentOrderActivity)
   - Lista cada unidad individual con su peso y total
   - Editar: cantidad (lb) y precio total vinculados
     * Cambiar lb → total se recalcula
     * Cambiar total → lb se recalcula (tasa fija)
   - Validación de precio mínimo en edición
   - Cliente activo mostrado en header

5. Finalizar pedido
   - Al tocar "Finalizar pedido" → validación de impresora:
     * Sin impresora configurada → dialog: "Continuar sin imprimir" / "Ir a Ajustes" / "Cancelar"
     * Impresora configurada → dialog: "Finalizar e imprimir" / "Finalizar sin imprimir" / "Cancelar"
   - Envía batch con customer_id del cliente activo
   - Loading overlay con 3 pasos: enviar → facturar → imprimir
   - Imprime ticket vía Bluetooth si el usuario eligió imprimir
   - Limpia cliente activo para próximo pedido

App → POST /api/orders/batch → MySQL
  → SyncEngine (5 min) → Invoice en QBO
```

### ProductDetailActivity — Detalle

- Precio total del producto (misma unidad que `products.price` en DB)
- Botones `+` / `-` para unidades (cada una con peso individual +/- 0.1)
- Tap en peso → diálogo numérico
- Tap en precio → diálogo "Editar precio total" con validación de mínimo
- Historial de precios: timeline visual con precios anteriores del mismo cliente
- "Agregar al pedido" guarda 1 registro por unidad en SQLite local

### Precio Mínimo (min_price)

- `min_price` se almacena en DB en las mismas unidades que `price` (precio total)
- Se edita desde la webapp (columna "Precio min")
- Backend valida en `createBatch`: `total estimado por unidad >= min_price`
- App muestra advertencia roja y bloquea si está por debajo

### Selección de Cliente (CustomerPickerActivity)

- Carga clientes desde `GET /api/customers` (cache MySQL TTL 1h → QB → cache expirado si QB falla)
- Si la API falla → usa cache SQLite local del dispositivo con banner naranja "Sin conexión"
- Si no hay cache ni conexión → mensaje de error con instrucción de conectarse al menos una vez

### Historial de Pedidos (HistoryActivity)

- Combina pedidos locales (pendientes/fallidos) + remotos (enviados)
- Filtro de fecha: **Hoy** (default) / Todos
- Filtro de estado: Todos / Enviados / Pendientes
- Órdenes fallidas (`retry_count = -1`) → chip rojo "FALLIDO" + botón "Reintentar envío"
- Al tocar un batch → `TicketDetailActivity`

### Funcionalidades especiales en MainActivity

| Acción | Resultado |
|---|---|
| Tap en "Ingresar código" | Abre dialog de entrada manual de barcode |
| **Long press** en "Ingresar código" | Abre búsqueda de producto por nombre con resultados en tiempo real |
| **Long press** en "Último escaneo" | Muestra resumen del día: pedidos enviados, ingresos, pendientes en cola |
| Tap en "Último escaneo" | Abre directamente el último producto escaneado |

> La primera vez que se abre la app aparece un `Snackbar` explicando los long press.

### Configuración (SettingsActivity)

| Sección | Descripción |
|---|---|
| **Conexión** | URL del backend — no hay campo de JWT (se gestiona automáticamente) |
| **Escáner** | Muestra "DataWedge — Zebra TC22" — configurado automáticamente al iniciar |
| **Red** | Toggle de modo offline |
| **Impresora** | Seleccionar ZQ630 Plus emparejada + prueba de impresión |
| **Dispositivo** | Info: modelo, Android, número de serie |
| **Cambiar contraseña** | Pantalla dedicada con validación de contraseña actual |
| **Cerrar sesión** | Limpia JWT y vuelve al login |

### Sistema de Usuarios y Roles

| Rol | App Android | Webapp |
|---|---|---|
| `admin` | Login normal, ve todos los pedidos en historial | Dashboard global, gestión de usuarios, todos los pedidos |
| `operator` | Login normal, ve solo sus propios pedidos | Dashboard filtrado, sin acceso a `/users` |

- Crear usuarios: webapp `/users` → "Nuevo usuario" (solo admin)
- Cada pedido guarda `user_id` del operador que lo creó

## API Endpoints

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login, devuelve `{ token, refreshToken, user }` |
| POST | `/api/auth/refresh` | No (usa refresh token) | Renueva access token |
| POST | `/api/auth/register` | JWT (admin) | Registrar usuario |
| GET | `/api/auth/me` | JWT | Datos del usuario autenticado |

### Productos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/products` | JWT | Listar (paginado, búsqueda) |
| GET | `/api/products/:barcode` | JWT | Buscar por código de barras |
| GET | `/api/products/:barcode/history` | JWT | Historial de precios por cliente (`?customer_id=X`) |
| POST | `/api/products` | JWT (admin) | Crear |
| PUT | `/api/products/:id` | JWT (admin) | Actualizar (incluye `min_price`) |
| DELETE | `/api/products/:id` | JWT (admin) | Eliminar |

### Pedidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/orders` | JWT | Crear pedido individual |
| POST | `/api/orders/batch` | JWT | Crear lote con customer (`{ items, customer_id, customer_name }`) |
| GET | `/api/orders` | JWT | Listar con filtros |
| GET | `/api/orders/:id` | JWT | Detalle |
| PUT | `/api/orders/:id/status` | JWT (admin) | Cambiar status |
| POST | `/api/orders/:id/sync` | JWT (admin) | Forzar sync a QBO |

### Escaneos / Dispositivos / QuickBooks / Clientes

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/scans` | JWT | Registrar escaneo |
| GET | `/api/scans` | JWT | Historial |
| POST | `/api/devices/register` | JWT | Registrar TC22 |
| GET | `/api/qb/status` | JWT (admin) | Estado conexión QBO |
| GET | `/api/qb/auth` | No | Iniciar OAuth flow |
| GET | `/api/qb/callback` | No | Callback OAuth |
| POST | `/api/qb/sync-products` | JWT (admin) | Sync QBO Items → MySQL |
| GET | `/api/customers` | JWT | Clientes activos de QB |

## Arquitectura General

```
TC22 (DataWedge + App Android)
     │  HTTP + JWT              │ Bluetooth SPP (CPCL)
     ▼                          ▼
Backend Express (Bun + MySQL)   ZQ630 Plus (impresora)
     │  OAuth 2.0 + API calls
     ▼
QuickBooks Online (Sandbox)
```

## Migraciones de DB

### MySQL — Tablas del sistema (creadas por `bun run src/seed.ts`)

Estas tablas se crean automáticamente al correr el seed inicial:
`users`, `products`, `devices`, `scan_entries`, `orders`, `sync_log`, `sync_meta`, `qb_tokens`

### MySQL — Migraciones manuales (correr en phpMyAdmin → DB `excellentia` → SQL)

```sql
-- Fase 7: precio mínimo por producto
ALTER TABLE orders MODIFY COLUMN quantity DECIMAL(10,2) NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2) NULL AFTER price;

-- Fase 17: configuración de empresa (también se auto-crea al primer GET /api/settings)
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
```

```sql
-- Fase 33: Pre-órdenes (se crean automáticamente via GET /api/setup o al primer request a /api/preorders)
-- Si la tabla ya existe con ENUM corrupto (bug \r\n en CONVERTED), correr:
ALTER TABLE pre_orders MODIFY COLUMN status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT';
UPDATE pre_orders SET status = 'CONVERTED' WHERE status = '';
```

### MySQL — Tablas auto-creadas por el backend (no requieren acción manual)

| Tabla | Creada por | Primera vez |
|---|---|---|
| `cached_customers` | `GET /api/customers` | Primera llamada al endpoint |
| `activity_log` | Primera acción loggeable | Login, crear usuario, etc. |
| `company_settings` | `GET /api/settings` | Primera llamada al endpoint |
| `pre_orders` + `pre_order_items` | `GET /api/setup` o primer request a `/api/preorders` | Via `ensureTables()` |

### SQLite — Android (migraciones automáticas)

Se ejecutan automáticamente al abrir la app si la DB está en versión anterior:

| Versión | Cambio |
|---|---|
| v1 | Schema inicial: `cached_products` + `pending_orders` |
| v2 | `cached_products`: columna `weight_per_unit REAL` |
| v3 | `pending_orders.quantity`: `INTEGER` → `REAL` (preserva datos existentes) |
| v4 | `pending_orders`: columnas `customer_id TEXT` + `customer_name TEXT` |
| v5 | Nueva tabla `cached_customers` (cache local de clientes QB para modo offline) |
