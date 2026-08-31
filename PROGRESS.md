# Excellentia — Progreso del Proyecto

> Estado actual: **Fase 111 🔄 — Módulo Almacén: rutas de entrega (backend + webapp). Arranca el ciclo post-v1.5.1 — ver nota de versión abajo**

---

## Leyenda

| Icono | Significado |
|---|---|
| ✅ | Completado |
| 🔄 | En progreso |
| ⬜ | Pendiente |

---

## Fase 1: Backend Foundation ✅

- [x] Refactorizar estructura (`src/` con carpetas routes, controllers, services, middleware, db, types)
- [x] MySQL pool con `mysql2`, conexión configurable vía `.env`
- [x] Schema: `users`, `products`, `devices`, `scan_entries`, `orders`, `sync_log`, `sync_meta`, `qb_tokens`
- [x] Auth JWT: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, middleware auth + adminOnly
- [x] Products CRUD con paginación y búsqueda
- [x] Scans, Orders, Devices endpoints REST completos
- [x] Error handling global (AppError, errorHandler, Winston logger)
- [x] QuickBooks OAuth flow con persistencia de tokens en MySQL
- [x] Seed script: tablas + admin (`admin@excellentia.com`/`admin123`) + sync QBO items

---

## Fase 2: Android Integration ✅

| # | Tarea | Estado |
|---|---|---|
| 2.1 | Retrofit 2.11 + OkHttp 4.12 + Gson | ✅ |
| 2.2 | ApiService interface (10+ endpoints) | ✅ |
| 2.3 | AuthInterceptor (JWT Bearer en headers) | ✅ |
| 2.4 | ProductRepository (API first, SQLite fallback) | ✅ |
| 2.5 | OrderRepository (online POST, offline queue local) | ✅ |
| 2.6 | SQLite local via SQLiteOpenHelper | ✅ |
| 2.7 | WorkManager (SyncWorker cada 15 min) | ✅ |
| 2.8 | JWT storage via EncryptedSharedPreferences | ✅ |
| 2.9 | SettingsActivity conectado a servicios | ✅ |
| 2.10 | LoginActivity con OkHttp POST + navegación | ✅ |
| 2.11 | Manual entry: solo código (cantidad en ProductDetail) | ✅ |
| 2.12 | Token check en MainActivity + redirect a Login | ✅ |
| 2.13 | Network Security Config (HTTP para IP local) | ✅ |
| 2.14 | Cantidad personalizada tocando el número en ProductDetail | ✅ |
| 2.15 | Quantity como Double en toda la capa de datos | ✅ |

---

## Fase 3: QuickBooks Sync ✅

| # | Tarea | Estado |
|---|---|---|
| 3.1 | OAuth con persistencia en MySQL | ✅ |
| 3.2 | QBO Items service | ✅ |
| 3.3 | QBO Invoices service | ✅ |
| 3.4 | Sync Engine (setInterval cada 5 min) | ✅ |
| 3.5 | Retry logic (3 intentos, backoff, log en sync_log) | ✅ |
| 3.6 | Admin endpoints (sync-products, status) | ✅ |
| 3.7 | Rotación automática de tokens | ✅ |
| 3.8 | `redirectUri` configurable via `.env` (`REDIRECT_URI`) | ✅ |
| 3.9 | `/api/qb/auth` sin JWT (accesible desde navegador) | ✅ |
| 3.10 | OAuth completado con localhost + tokens guardados en MySQL | ✅ |

---

## Resumen de Avance

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 1** | Backend Foundation | **100%** ✅ |
| **Fase 2** | Android Integration | **100%** ✅ |
| **Fase 3** | QuickBooks Sync | **100%** ✅ |
| **Fase 4** | Customers QB + Pedido + Ticket | **100%** ✅ |
| **Fase 5** | Impresión Bluetooth ZQ630 Plus | **100%** ✅ |
| **Fase 6** | UX: Historial, edición, reimprimir | **100%** ✅ |
| **Fase 7** | Customer-first, historial precios, min_price | **100%** ✅ |
| **Webapp** | excellentia-webapp (Next.js 16) | **100%** ✅ |
| **Fase 8** | Fixes de estabilidad y seguridad (Android) | **100%** ✅ |
| **Fase 9** | Flujo completo de órdenes fallidas (Android) | **100%** ✅ |
| **Fase 10** | Filtros de fecha en HistoryActivity (Android) | **100%** ✅ |
| **Fase 11** | Gestión de usuarios (Backend + Webapp) | **100%** ✅ |
| **Fase 12** | Multi-usuario: roles y vistas por operador (Webapp) | **100%** ✅ |
| **Fase 13** | Validación de impresora antes de finalizar pedido (Android) | **100%** ✅ |
| **Fase 14** | Página de pedidos (Webapp) + Rate limiting en login (Backend) | **100%** ✅ |
| **Fase 15** | Cache QB clientes + Endpoint /api/stats (Backend + Android + Webapp) | **100%** ✅ |
| **Fase 16** | Exportar CSV, log de actividad, cambio de contraseña, clientes, ticket modal (Backend + Webapp) | **100%** ✅ |
| **Fase 17** | Configuración de empresa — tabla MySQL + API + página webapp + ticket físico Android (Backend + Webapp + Android) | **100%** ✅ |
| **Fase 18** | Todos los pendientes de Android (cambiar contraseña, búsqueda, paginación, resumen, device reg, filtro FAILED, último escaneo, cache cleanup) | **100%** ✅ |
| **Fase 19** | Fixes y limpieza: bug Active integer/boolean, Settings sin JWT ni EMDK, tips long press | **100%** ✅ |
| **Fase 20** | Nombre de operador — columna `name` en `users`, en JWT, en webapp y en app Android | **100%** ✅ |
| **Fase 21** | Rediseño sidebar (dark theme, grupos, mejor user card) + botones consistentes en toda la webapp | **100%** ✅ |
| **Fase 22** | Control de acceso por rol — dashboard solo admins, productos read-only para operadores | **100%** ✅ |
| **Fase 23** | Filtro de período en dashboard (Hoy/Ayer/7d/30d) + loaders Suspense + barra de progreso nav | **100%** ✅ |
| **Fase 24** | Firma del cliente (Android + Backend + Webapp) + edit dialog precio/lb editable | **100%** ✅ |
| **Fixes** | Bug fixes: timezone historial, React Fragment key, login email hardcodeado webapp, Active integer/boolean | **100%** ✅ |
| **Fase 38** | Gestión de Stock (Webapp display/edit + Backend auto-descuento al vender) | **100%** ✅ |
| **Fase 39** | Stock ↔ QBO Sync + Fix Qty invoices (Qty: 1 unidad, no lbs) | **100%** ✅ |
| **Fase 40** | Sync nombre producto webapp → QBO al editar desde modal | **100%** ✅ |
| **Fase 41** | Sales Description + tabla read-only + toda edición via modal | **100%** ✅ |
| **Fase 42** | SKU QBO ↔ Barcode sync bidireccional | **100%** ✅ |
| **Fase 51** | QBO OAuth: disconnect, redirect post-auth, página desconexión | **100%** ✅ |
| **Fase 52** | QBO connection card en Settings webapp | **100%** ✅ |
| **Fase 53** | Fix duración de sesión (Backend + Android) | **100%** ✅ |
| **Fase 54** | Offline mode completo (Android) | **100%** ✅ |
| **Fase 55** | Reorden flujo de firma (Android) | **100%** ✅ |
| **Fase 56** | Seguridad Intuit App Store | **100%** ✅ |
| **Fase 57** | QBO Sync confiable + Paginación + Búsqueda server-side | **100%** ✅ |
| **Fase 58** | Class por vendedor en invoices QBO — selección de vendedor + ClassRef en invoice (Backend + Webapp) | **100%** ✅ |
| **Fase 59** | Fix paginación customers QB — `fetchFromQb()` usa `paginatedQuery()` con `entityType='Customer'` y loop `MAXRESULTS 1000`, eliminando el límite de 200 | **100%** ✅ |

---

## Fase 59: Fix paginación customers QB ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 59.1 | `paginatedQuery()` ahora acepta `entityType` (default `'Item'`) — `data.QueryResponse?.[entityType]` en vez de hardcodear `Item` | `src/services/qbAuth.ts:291` | ✅ |
| 59.2 | `fetchFromQb()` simplificado a `paginatedQuery('select * from Customer where Active = true', 'Customer')` — sin límite fijo, trae todos los customers activos paginando de a 1000 | `src/routes/customers.ts:36-38` | ✅ |

---

## Fase 4: Customers QB + Pedido actual + Ticket de venta ✅

### Backend

| # | Tarea | Estado |
|---|---|---|
| 4.1 | `customer_id` y `customer_name` en tabla `orders` | ✅ |
| 4.2 | `POST /api/orders/batch` acepta `customer_id` / `customer_name` | ✅ |
| 4.3 | `createBatchInvoice` y `createInvoice` usan `customer_id` del pedido | ✅ |
| 4.4 | `QB_DEFAULT_CUSTOMER_ID` en `.env` como fallback (default `'2'`) | ✅ |
| 4.5 | `GET /api/customers` protegido con JWT, solo clientes activos con paginación completa (MAXRESULTS 1000) | ✅ |
| 4.6 | `Order` interface actualizada con `customer_id` y `customer_name` | ✅ |

### Android

| # | Tarea | Estado |
|---|---|---|
| 4.7 | `CurrentOrderActivity` — resumen del pedido en curso con total y productos | ✅ |
| 4.8 | `CustomerPickerActivity` — lista de clientes QB con búsqueda y modal de confirmación | ✅ |
| 4.9 | `TicketDetailActivity` rediseñado como ticket de venta real (recibo) | ✅ |
| 4.10 | Flujo: "Ver pedido" badge → `CurrentOrderActivity` → "Finalizar" → picker → envío | ✅ |
| 4.11 | Ticket muestra chip azul con nombre del cliente | ✅ |
| 4.12 | `BatchRequest` actualizado con `customer_id` y `customer_name` | ✅ |
| 4.13 | `OrderDto` actualizado con `customerId` y `customerName` | ✅ |
| 4.14 | `OrderRepository.sendBatch()` acepta customer params | ✅ |

---

## Fase 5: Impresión Bluetooth ZQ630 Plus ✅

### Android

| # | Tarea | Estado |
|---|---|---|
| 5.1 | `PrintService.kt` — Bluetooth Classic SPP, genera CPCL, envía via RFCOMM | ✅ |
| 5.2 | `BluetoothPermission.kt` — helper `hasBtConnectPermission()` para Android 12+ | ✅ |
| 5.3 | `SecurePreferences` — guarda dirección MAC y nombre de la impresora | ✅ |
| 5.4 | `SettingsActivity` — card "Impresora Zebra ZQ630": lista dispositivos emparejados, probar impresión | ✅ |
| 5.5 | `CurrentOrderActivity` — imprime ticket automáticamente tras enviar batch exitoso | ✅ |
| 5.6 | Permisos Bluetooth en `AndroidManifest.xml` | ✅ |
| 5.7 | Request de `BLUETOOTH_CONNECT` en `MainActivity.onCreate()` (Android 12+) | ✅ |

---

## Fase 6: UX — Historial mejorado, edición de ítems, reimprimir ✅

### Android

| # | Tarea | Estado |
|---|---|---|
| 6.1 | `item_batch_header.xml` — card azul para batch en historial | ✅ |
| 6.2 | `item_order_product.xml` — fila individual de producto | ✅ |
| 6.3 | `item_pending_order.xml` — ítem del pedido actual con botones editar/borrar | ✅ |
| 6.4 | `HistoryActivity` — batches como cards azules; click → `TicketDetailActivity` | ✅ |
| 6.5 | `TicketDetailActivity` — ítems con `item_order_product.xml` | ✅ |
| 6.6 | `TicketDetailActivity` — botón **"Reimprimir ticket"** | ✅ |
| 6.7 | `CurrentOrderActivity` — ítems con botón editar (cantidad total lb + precio/lb) | ✅ |
| 6.8 | `CurrentOrderActivity` — botón borrar ítem con confirmación | ✅ |
| 6.9 | `CurrentOrderActivity` — loading overlay con texto de etapa | ✅ |
| 6.10 | `OrderDao` — método `update(id, price, quantity)` | ✅ |
| 6.11 | `OrderRepository` — método `updatePendingOrder(id, price, quantity)` | ✅ |
| 6.12 | Ticket CPCL — ítems muestran barcode + precio/lb + qty = total | ✅ |
| 6.13 | Ticket CPCL — "X.XX lb en total" en vez de "Total: X.XX lb" | ✅ |

---

## Fase 7: Customer-first + Historial precios + min_price + Unidades individuales ✅

### Backend

| # | Tarea | Estado |
|---|---|---|
| 7.1 | `min_price` en tabla `products` (precio mínimo total, misma unidad que `price`) | ✅ |
| 7.2 | `GET /api/products/:barcode/history?customer_id=X` — historial de precios por cliente | ✅ |
| 7.3 | Validación en `createBatch`: `total por unidad >= min_price` | ✅ |
| 7.4 | QB sync: actualiza productos existentes (no solo inserta nuevos) | ✅ |
| 7.5 | Redondeo a centavos en comparaciones (`Math.round * 100`) | ✅ |

### Android

| # | Tarea | Estado |
|---|---|---|
| 7.6 | Customer-first flow: seleccionar cliente antes de escanear | ✅ |
| 7.7 | `SecurePreferences` — active customer persistente por sesión | ✅ |
| 7.8 | `MainActivity` — card seleccionar cliente, escaneo bloqueado sin cliente | ✅ |
| 7.9 | `ProductDetailActivity` — precio total editable (tappable) | ✅ |
| 7.10 | `ProductDetailActivity` — timeline historial de precios del cliente | ✅ |
| 7.11 | `ProductDetailActivity` — precio mínimo mostrado y validado | ✅ |
| 7.12 | `ProductDetailActivity` — guarda 1 entidad por unidad (no suma) | ✅ |
| 7.13 | `CurrentOrderActivity` — cliente activo en header, finaliza sin picker | ✅ |
| 7.14 | `CurrentOrderActivity` — edit dialog vinculado (lb ↔ total) | ✅ |
| 7.15 | `CurrentOrderActivity` — validación min_price en edición | ✅ |
| 7.16 | `CurrentOrderActivity` — muestra $/lb en tiempo real | ✅ |
| 7.17 | `ApiService` — endpoint `getProductPriceHistory` | ✅ |
| 7.18 | `OrderRepository` — método `getProductPriceHistory` | ✅ |

### Webapp

| # | Tarea | Estado |
|---|---|---|
| 7.19 | `min_price` editable en inline row de productos | ✅ |
| 7.20 | Columna "Precio min" en tabla de productos | ✅ |

---

## Fase 8: Fixes de Estabilidad y Seguridad ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 8.1 | `pending_orders.quantity` corregido de `INTEGER` a `REAL` en SQLite + migración DB v3 | `AppDatabase.kt` | ✅ |
| 8.2 | `OrderDao.markFailed()` — órdenes con 3 reintentos fallidos marcadas como `retry_count = -1` en lugar de eliminarse silenciosamente | `OrderDao.kt` | ✅ |
| 8.3 | `SyncWorker` usa `markFailed()` en lugar de `deleteById()` al agotar reintentos | `SyncWorker.kt` | ✅ |
| 8.4 | `HttpLoggingInterceptor` desactivado en builds de release (`BuildConfig.DEBUG`) — tokens JWT ya no aparecen en logcat en producción | `RetrofitClient.kt` | ✅ |
| 8.5 | Email hardcodeado `admin@excellentia.com` eliminado de `LoginActivity` | `LoginActivity.kt` | ✅ |
| 8.6 | Timeout de 8 segundos en conexión Bluetooth — si la impresora no responde, la app muestra error en lugar de congelarse | `PrintService.kt` | ✅ |

---

## Fase 9: Completar flujo de órdenes fallidas ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 9.1 | `OrderDao.getAllPending()` filtra `retry_count >= 0` — SyncWorker nunca reintenta órdenes fallidas | `OrderDao.kt` | ✅ |
| 9.2 | `OrderDao.getAllForHistory()` — nueva query que incluye fallidas, usada solo para mostrar en historial | `OrderDao.kt` | ✅ |
| 9.3 | `OrderDao.count()` excluye `retry_count = -1` — badge del pedido no cuenta órdenes fallidas | `OrderDao.kt` | ✅ |
| 9.4 | `SyncStatus.FAILED` agregado al enum | `Models.kt` | ✅ |
| 9.5 | `bg_chip_failed.xml` — chip rojo claro para órdenes fallidas | `drawable/` | ✅ |
| 9.6 | `HistoryActivity` muestra órdenes fallidas con chip rojo "FALLIDO" | `HistoryActivity.kt` | ✅ |
| 9.7 | `PendingOrderEntity` tiene campos `customerId` y `customerName` | `PendingOrderEntity.kt` | ✅ |
| 9.8 | DB migración v4 — agrega columnas `customer_id` y `customer_name` a `pending_orders` | `AppDatabase.kt` | ✅ |
| 9.9 | `savePendingOrder()` lee cliente activo de `SecurePreferences` automáticamente | `OrderRepository.kt` | ✅ |
| 9.10 | Botón retry pasa `customerId`/`customerName` al reenviar — pedido llega con cliente correcto | `HistoryActivity.kt` | ✅ |
| 9.11 | `buildFeatures { buildConfig = true }` habilitado — `BuildConfig.DEBUG` disponible | `build.gradle.kts` | ✅ |

---

## Fase 10: Filtros de fecha en HistoryActivity ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 10.1 | `ChipGroup` de fecha — chips "Hoy" (default) y "Todos" sobre los filtros de estado | `activity_history.xml` | ✅ |
| 10.2 | `currentDateFilter` — "TODAY" por defecto al abrir la activity | `HistoryActivity.kt` | ✅ |
| 10.3 | `isToday(Long)` — compara timestamp local con fecha actual del dispositivo | `HistoryActivity.kt` | ✅ |
| 10.4 | `isTodayFromIso(String)` — parsea ISO 8601 UTC y compara en timezone local | `HistoryActivity.kt` | ✅ |
| 10.5 | Filtro de fecha combinado con filtro de estado (Todos/Enviados/Pendientes) | `HistoryActivity.kt` | ✅ |
| 10.6 | Fix timezone en `bindBatchHeader` — parser UTC, display en hora local del dispositivo (corregía +7h) | `HistoryActivity.kt` | ✅ |

---

## Fase 11: Gestión de usuarios ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 11.1 | `GET /api/users` — lista usuarios sin passwords (admin only) | `userController.ts` + `routes/users.ts` | ✅ |
| 11.2 | `DELETE /api/users/:id` — elimina usuario, protege auto-eliminación (admin only) | `userController.ts` | ✅ |
| 11.3 | `listOrders` filtra por `user_id` cuando `role == operator` — cada operador ve solo sus pedidos | `orderController.ts` | ✅ |
| 11.4 | Ruta `/api/users` registrada en servidor | `index.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 11.5 | Página `/users` — tabla de usuarios con rol, fecha de creación | `app/users/page.tsx` | ✅ |
| 11.6 | Formulario crear usuario — email, contraseña, rol (operador/admin) | `UsersClient.tsx` | ✅ |
| 11.7 | Botón eliminar con confirmación inline | `UsersClient.tsx` | ✅ |
| 11.8 | "Usuarios" agregado al sidebar | `Sidebar.tsx` | ✅ |
| 11.9 | `PUT /api/users/:id` — actualiza email, rol, contraseña (opcional) con validación de email único | `userController.ts` + `routes/users.ts` | ✅ |
| 11.10 | Formulario de edición expandible inline por fila — email, rol, nueva contraseña opcional | `UsersClient.tsx` | ✅ |
| 11.11 | Modal de confirmación de eliminación — backdrop blur, avatar del usuario, botón con spinner, cierre en backdrop | `UsersClient.tsx` | ✅ |

---

## Fase 12: Multi-usuario — roles y vistas por operador ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 12.1 | `layout.tsx` decodifica JWT (base64) sin API call extra — extrae `id`, `email`, `role` | `layout.tsx` | ✅ |
| 12.2 | `Sidebar` recibe `user` como prop — muestra avatar, email truncado y badge de rol (Admin/Operador) | `Sidebar.tsx` | ✅ |
| 12.3 | "Usuarios" oculto para operadores — `adminOnly: true` en nav items | `Sidebar.tsx` | ✅ |
| 12.4 | Dashboard muestra "Mi Dashboard" + badge "Vista operador" para operadores | `dashboard/page.tsx` | ✅ |
| 12.5 | Dashboard ya filtra datos por `user_id` vía backend — operadores ven solo sus métricas | `dashboard/page.tsx` | ✅ |
| 12.6 | Login sin email hardcodeado — campo vacío y placeholder genérico | `login/page.tsx` | ✅ |

---

## Fase 13: Validación de impresora antes de finalizar pedido ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 13.1 | `checkPrinterThenFinalize()` — intercepta el tap de "Finalizar pedido" antes de proceder | `CurrentOrderActivity.kt` | ✅ |
| 13.2 | Sin impresora configurada → dialog con opciones "Continuar sin imprimir" / "Ir a Ajustes" / "Cancelar" | `CurrentOrderActivity.kt` | ✅ |
| 13.3 | Impresora configurada → dialog de confirmación con nombre de impresora + opciones "Finalizar e imprimir" / "Finalizar sin imprimir" / "Cancelar" | `CurrentOrderActivity.kt` | ✅ |
| 13.4 | `finalizeOrder()` acepta `skipPrint: Boolean` — respeta la decisión del usuario sin alterar el envío del pedido | `CurrentOrderActivity.kt` | ✅ |

---

## Fase 14: Página de pedidos + Rate limiting ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 14.1 | Rate limiting en `POST /api/auth/login` — máx 10 intentos por IP en 15 min, respuesta `429` con mensaje en español | `routes/auth.ts` | ✅ |
| 14.2 | `express-rate-limit@8.5.2` instalado | `package.json` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 14.3 | Página `/orders` — server component con fetch de 200 órdenes | `app/orders/page.tsx` | ✅ |
| 14.4 | Agrupación por `batch_id` client-side — una fila por batch | `OrdersClient.tsx` | ✅ |
| 14.5 | KPIs: total · enviados · pendientes · fallidos | `OrdersClient.tsx` | ✅ |
| 14.6 | Filtros por estado (chips) + búsqueda por cliente, producto o batch ID | `OrdersClient.tsx` | ✅ |
| 14.7 | Fila expandible — click en batch muestra ítems individuales con barcode, qty, precio/lb, total, estado | `OrdersClient.tsx` | ✅ |
| 14.8 | Botón "Forzar sync" (solo admin) en batches PENDING/FAILED — llama `POST /api/orders/:id/sync` por cada ítem | `OrdersClient.tsx` | ✅ |
| 14.9 | "Pedidos" agregado al sidebar | `Sidebar.tsx` | ✅ |
| 14.10 | `listOrders` JOIN con `users` — devuelve `user_email` por cada pedido | `orderController.ts` | ✅ |
| 14.11 | Columna "Operador" en tabla de pedidos (solo admin) — avatar con inicial + email | `OrdersClient.tsx` | ✅ |

---

## Fase 15: Cache QB clientes + Endpoint /api/stats ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 15.1 | `GET /api/stats` — métricas calculadas en SQL: KPIs, pedidos por hora, 7 días, top 5, actividad reciente, productos | `statsController.ts` + `routes/stats.ts` | ✅ |
| 15.2 | Stats filtrados por `user_id` para operadores — admins ven todo | `statsController.ts` | ✅ |
| 15.3 | `cached_customers` tabla MySQL — cache de clientes QB con TTL 1 hora | `routes/customers.ts` | ✅ |
| 15.4 | `GET /api/customers` — cache-first: devuelve MySQL si vigente, QB si expirado, cache expirado si QB falla | `routes/customers.ts` | ✅ |
| 15.5 | `POST /api/customers/refresh` — forzar actualización del cache desde QB (admin) | `routes/customers.ts` | ✅ |
| 15.6 | Endpoint inline `/api/customers` en `index.ts` reemplazado por `customerRoutes` | `index.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 15.7 | Dashboard usa `GET /api/stats` — 1 llamada API vs 5 anteriores | `dashboard/page.tsx` | ✅ |
| 15.8 | Eliminados cálculos JS en dashboard — todo pre-calculado en MySQL | `dashboard/page.tsx` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 15.9 | `CachedCustomerEntity` + `CustomerDao` — tabla SQLite `cached_customers` | nuevos archivos | ✅ |
| 15.10 | DB migración v5 — crea tabla `cached_customers` | `AppDatabase.kt` | ✅ |
| 15.11 | `CustomerPickerActivity` — guarda clientes en SQLite tras API exitosa | `CustomerPickerActivity.kt` | ✅ |
| 15.12 | `CustomerPickerActivity` — fallback a SQLite si API falla, banner naranja "Sin conexión" | `CustomerPickerActivity.kt` | ✅ |
| 15.13 | Banner `tvOfflineBanner` en layout con ícono de alerta | `activity_customer_picker.xml` | ✅ |

---

## Fase 16: Exportar CSV, Log de actividad, Cambio de contraseña, Clientes, Ticket modal ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 16.1 | `PUT /api/auth/change-password` — cambio de contraseña con validación de contraseña actual | `authController.ts` + `routes/auth.ts` | ✅ |
| 16.2 | `GET /api/orders/export` — CSV con BOM para Excel, filtrable por status y fecha. Operadores ven solo sus pedidos | `orderController.ts` + `routes/orders.ts` | ✅ |
| 16.3 | `activity_log` tabla MySQL (auto-create) — registra LOGIN, USER_CREATED, USER_UPDATED, USER_DELETED, PASSWORD_CHANGED, BATCH_CREATED | `services/activityLog.ts` | ✅ |
| 16.4 | `GET /api/activity` — lista últimas 100 entradas del log (admin only) | `activityController.ts` + `routes/activity.ts` | ✅ |
| 16.5 | `GET /api/customers/stats` — clientes con total facturado, nº pedidos, último pedido (calculado desde MySQL) | `routes/customers.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 16.6 | Botón "Exportar CSV" en página de pedidos — respeta filtro de estado activo | `OrdersClient.tsx` | ✅ |
| 16.7 | Modal de ticket en página de pedidos — estilo recibo con ítems, cliente, total, fecha | `OrdersClient.tsx` | ✅ |
| 16.8 | Botón "Ver ticket" (Ticket) en cada fila de batch | `OrdersClient.tsx` | ✅ |
| 16.9 | Página `/customers` — tabla de clientes con total facturado, nº pedidos, badge "Top cliente", búsqueda | `app/customers/page.tsx` + `CustomersClient.tsx` | ✅ |
| 16.10 | "Clientes" agregado al sidebar (admin only) | `Sidebar.tsx` | ✅ |

---

## Fase 17: Configuración de empresa ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 17.1 | Tabla `company_settings` MySQL (auto-create) — fila única con `company_name`, `subtitle`, `address`, `phone`, `city` | `settingsController.ts` | ✅ |
| 17.2 | `GET /api/settings` — devuelve config actual (JWT, cualquier rol) | `settingsController.ts` + `routes/settings.ts` | ✅ |
| 17.3 | `PUT /api/settings` — actualiza config (admin only), registra en activity_log | `settingsController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 17.4 | Página `/settings` — formulario con campos empresa, subtítulo, dirección, ciudad, teléfono | `app/settings/page.tsx` + `SettingsClient.tsx` | ✅ |
| 17.5 | Preview en tiempo real del ticket — refleja cambios mientras se escribe | `SettingsClient.tsx` | ✅ |
| 17.6 | "Configuración" en sidebar (admin only) con ícono de engranaje | `Sidebar.tsx` | ✅ |
| 17.7 | Modal de ticket en página de pedidos usa `company_name` y datos de la empresa desde la API | `OrdersClient.tsx` + `orders/page.tsx` | ✅ |
| 17.8 | `CompanySettingsData` + `CompanySettingsResponse` — modelos Kotlin para la respuesta del API | `Models.kt` | ✅ |
| 17.9 | `ApiService.getCompanySettings()` — endpoint `GET api/settings` | `ApiService.kt` | ✅ |
| 17.10 | `SecurePreferences` — 5 nuevos campos para cachear datos de empresa en el dispositivo | `SecurePreferences.kt` | ✅ |
| 17.11 | `LoginActivity` — fetcha y cachea `company_settings` tras login exitoso | `LoginActivity.kt` | ✅ |
| 17.12 | `PrintService.buildCpcl()` — usa nombre, subtítulo, ciudad, dirección y teléfono dinámicos desde `SecurePreferences` | `PrintService.kt` | ✅ |

---

## Fase 18: Pendientes Android — todos implementados ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 18.1 | `ChangePasswordActivity` — pantalla con campos contraseña actual, nueva y confirmación + validaciones | nuevo | ✅ |
| 18.2 | `activity_change_password.xml` — layout con 3 TextInputLayout + botón guardar | nuevo | ✅ |
| 18.3 | Botón "Cambiar contraseña" en `SettingsActivity` → navega a `ChangePasswordActivity` | `SettingsActivity.kt` + `activity_settings.xml` | ✅ |
| 18.4 | `ApiService.changePassword()` — `PUT api/auth/change-password` | `ApiService.kt` | ✅ |
| 18.5 | `ApiService.searchProducts()` — `GET api/products?search=X` | `ApiService.kt` | ✅ |
| 18.6 | `ApiService.getStats()` — `GET api/stats` | `ApiService.kt` | ✅ |
| 18.7 | Búsqueda por nombre — long press en botón "Ingresar código" abre dialog de búsqueda con resultados en tiempo real | `MainActivity.kt` | ✅ |
| 18.8 | Resumen del día — long press en sección "Último escaneo" muestra dialog con pedidos/ingresos de hoy | `MainActivity.kt` | ✅ |
| 18.9 | Último escaneo — `updateLastScan()` muestra barcode, nombre y hora del último producto abierto | `MainActivity.kt` + `SecurePreferences.kt` | ✅ |
| 18.10 | Cache cleanup — `ProductDao.deleteOldCache()` llamado al iniciar app, borra productos > 7 días | `MainActivity.kt` | ✅ |
| 18.11 | Device registration — `POST /api/devices/register` con `ANDROID_ID` y modelo al hacer login | `LoginActivity.kt` | ✅ |
| 18.12 | Chip "Fallidos" en `HistoryActivity` — filtra órdenes con `retry_count = -1` | `activity_history.xml` + `HistoryActivity.kt` | ✅ |
| 18.13 | Paginación en historial — botón "Cargar más" carga siguiente página de 20 pedidos remotos | `activity_history.xml` + `HistoryActivity.kt` | ✅ |

---

## Fase 19: Fixes y limpieza de Settings ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 19.1 | Fix `Active: 1` (TINYINT MySQL) → `Active: true` (boolean JSON) en `/api/customers` cache-first y stale_cache — corregía "Sin conexión" falso en Android | `routes/customers.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 19.2 | `SettingsActivity` — campo JWT eliminado (no editable por el usuario) | `activity_settings.xml` + `SettingsActivity.kt` | ✅ |
| 19.3 | `SettingsActivity` — RadioGroup DataWedge/EMDK reemplazado por tarjeta informativa "DataWedge — Zebra TC22" | `activity_settings.xml` + `SettingsActivity.kt` | ✅ |
| 19.4 | `SettingsActivity` — removidos: `etJwtToken`, `radioScannerMode`, constantes `PREFS_NAME`/`KEY_SCANNER_MODE`, imports huérfanos | `SettingsActivity.kt` | ✅ |
| 19.5 | Tips de long press — `Snackbar` permanente la primera vez que se abre `MainActivity`: informa sobre búsqueda por nombre y resumen del día | `MainActivity.kt` | ✅ |

---

## Fase 20: Nombre de operador en pedidos ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 20.1 | Columna `name VARCHAR(255) NULL` en tabla `users` — ejecutar `ALTER TABLE` manualmente | MySQL | ✅ |
| 20.2 | `listUsers` incluye `name` en SELECT | `userController.ts` | ✅ |
| 20.3 | `updateUser` acepta y guarda campo `name` | `userController.ts` | ✅ |
| 20.4 | `register` acepta y guarda campo `name` | `authController.ts` | ✅ |
| 20.5 | `listOrders` JOIN incluye `u.name AS user_name` | `orderController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 20.6 | `UserRow` incluye campo `name` | `users/page.tsx` | ✅ |
| 20.7 | Formulario "Crear usuario" incluye campo Nombre | `UsersClient.tsx` | ✅ |
| 20.8 | Formulario "Editar usuario" incluye campo Nombre | `UsersClient.tsx` | ✅ |
| 20.9 | Tabla de usuarios muestra columna Nombre como primera columna | `UsersClient.tsx` | ✅ |
| 20.10 | Columna Operador en pedidos muestra nombre (con email como subtítulo si tiene nombre) | `OrdersClient.tsx` | ✅ |

### SQL necesario (correr en phpMyAdmin)

```sql
ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL AFTER email;
```

### Backend (Fase 20 — nombre en JWT)

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 20.11 | `User` interface incluye campo `name` | `types/index.ts` | ✅ |
| 20.12 | JWT incluye `name` en payload — disponible sin llamada extra a la DB | `jwtService.ts` | ✅ |
| 20.13 | Login response incluye `name` en objeto `user` | `authController.ts` | ✅ |

### Android (Fase 20 — nombre en app)

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 20.14 | `LoginResponse` lee `user.name` de la respuesta del servidor | `LoginActivity.kt` | ✅ |
| 20.15 | `SecurePreferences` guarda `user_email`, `user_name`, `user_role` al hacer login | `SecurePreferences.kt` + `LoginActivity.kt` | ✅ |
| 20.16 | Tarjeta "Mi cuenta" en `SettingsActivity` — avatar con inicial, nombre, email, badge de rol | `activity_settings.xml` + `SettingsActivity.kt` | ✅ |

---

## Fase 21: Rediseño Sidebar + Botones Webapp ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 21.1 | Sidebar rediseñado — fondo dark `zinc-950`, grupos de navegación con etiquetas | `Sidebar.tsx` | ✅ |
| 21.2 | Item activo → fondo `blue-600` sólido, hover `white/5` | `Sidebar.tsx` | ✅ |
| 21.3 | User card en sidebar muestra nombre + email + badge rol | `Sidebar.tsx` + `layout.tsx` (`CurrentUser` incluye `name`) | ✅ |
| 21.4 | Botones consistentes en todas las páginas: `font-semibold`, `py-2.5`, `ring-1` en primarios | Todos los `*Client.tsx` | ✅ |
| 21.5 | Fondo del cuerpo principal → `bg-slate-50` | `layout.tsx` | ✅ |

---

## Fase 22: Control de Acceso por Rol ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 22.1 | Dashboard redirige a `/orders` si el usuario es operador | `dashboard/page.tsx` | ✅ |
| 22.2 | Login redirige a `/orders` para operadores, `/dashboard` para admins | `login/page.tsx` | ✅ |
| 22.3 | Link "Dashboard" en sidebar solo visible para admins (`adminOnly: true`) | `Sidebar.tsx` | ✅ |
| 22.4 | Página de productos — operadores ven datos en modo lectura (sin inputs ni botón Guardar) | `ProductRow.tsx` | ✅ |
| 22.5 | Botón "Sincronizar QB" oculto para operadores | `ProductsClient.tsx` | ✅ |
| 22.6 | `isAdmin` pasado desde `products/page.tsx` a `ProductsClient` y `ProductRow` | `products/page.tsx` | ✅ |
| 22.7 | Fix hydration: `toLocaleString` con `hour12: false` en `SettingsClient` y `OrdersClient` | `SettingsClient.tsx` + `OrdersClient.tsx` | ✅ |

---

## Fase 23: Filtro de Período en Dashboard + Loaders ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 23.1 | `GET /api/stats?period=today|yesterday|week|month` — todas las queries filtradas por rango de fechas | `statsController.ts` | ✅ |
| 23.2 | KPIs del período (`ordersPeriod`, `revenuePeriod`) en lugar de siempre "hoy" | `statsController.ts` | ✅ |
| 23.3 | `byDay` y `top5` filtrados por el período seleccionado | `statsController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 23.4 | `DateFilter` — client component con chips Hoy/Ayer/7 días/30 días, activo en `blue-600` | `dashboard/_components/DateFilter.tsx` | ✅ |
| 23.5 | `DashboardPage` lee `searchParams.filter` y pasa `?period=X` al API | `dashboard/page.tsx` | ✅ |
| 23.6 | KPIs y subtítulos de gráficas muestran el período seleccionado dinámicamente | `dashboard/page.tsx` | ✅ |
| 23.10 | `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` — backend acepta rango personalizado | `statsController.ts` | ✅ |
| 23.11 | Botón "Personalizado" con dropdown picker — inputs Desde/Hasta + validación + botón Aplicar | `DateFilter.tsx` | ✅ |
| 23.12 | Chip "Personalizado" muestra el rango activo (ej: `05/01 → 05/20`) cuando está seleccionado | `DateFilter.tsx` | ✅ |
| 23.13 | Picker cierra al hacer clic fuera (`mousedown` listener) | `DateFilter.tsx` | ✅ |
| 23.14 | Fix `LineChart` NaN cuando `n=0` o `n=1` — "Sin datos" y punto centrado | `Charts.tsx` | ✅ |
| 23.7 | `NavigationProgress` — barra azul animada en la parte superior al navegar entre páginas | `_components/NavigationProgress.tsx` | ✅ |
| 23.8 | `NavigationProgress` envuelto en `<Suspense fallback={null}>` según doc oficial Next.js | `layout.tsx` | ✅ |
| 23.9 | `loading.tsx` para 6 rutas — skeletons animados (Dashboard, Pedidos, Productos, Usuarios, Clientes, Configuración) | `*/loading.tsx` | ✅ |

---

## Fase 24: Firma del cliente + Edit dialog precio/lb editable ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 24.1 | `SignatureView.kt` — custom View táctil, trazos quadratic bezier, `getBase64()` exporta PNG base64, `clear()`, flag `isEmpty` | `SignatureView.kt` | ✅ |
| 24.2 | `SignatureActivity.kt` — pantalla completa, muestra nombre del cliente, botones "Limpiar" / "Confirmar firma", valida que no esté vacío antes de confirmar, retorna base64 via `RESULT_OK` | `SignatureActivity.kt` | ✅ |
| 24.3 | `activity_signature.xml` — toolbar + `tvSignatureCustomer` + "Firme dentro del recuadro" + `CardView` con `SignatureView` (fill) + botones Limpiar/Confirmar | `activity_signature.xml` | ✅ |
| 24.4 | `SignatureActivity` registrada en `AndroidManifest.xml` | `AndroidManifest.xml` | ✅ |
| 24.5 | `CurrentOrderActivity` — nuevo `signatureLauncher` (`registerForActivityResult`) que recibe la firma y llama `checkPrinterThenFinalize()` | `CurrentOrderActivity.kt` | ✅ |
| 24.6 | `CurrentOrderActivity` — `pendingSignature: String?` almacena base64 entre launcher y `finalizeOrder()`, se limpia tras cada `sendBatch()` | `CurrentOrderActivity.kt` | ✅ |
| 24.7 | `CurrentOrderActivity` — `launchSignatureAfterCustomer: Boolean` flag — al pulsar "Finalizar" sin cliente activo, abre `CustomerPickerActivity` y al volver lanza `SignatureActivity` automáticamente | `CurrentOrderActivity.kt` | ✅ |
| 24.8 | `CurrentOrderActivity` — `launchSignature()` helper que lanza `SignatureActivity` con `customer_name` como extra | `CurrentOrderActivity.kt` | ✅ |
| 24.9 | `BatchRequest` — nuevo campo `signature: String? = null` con `@SerializedName("signature")` | `data/Models.kt` | ✅ |
| 24.10 | `OrderRepository.sendBatch()` — acepta `signature: String? = null` y lo pasa a `BatchRequest` | `data/repository/OrderRepository.kt` | ✅ |
| 24.11 | Edit dialog `dialog_edit_order.xml` — eliminado input "Precio total" (`etPrice`), reemplazado por "Precio / lb" (`etPricePerLb`) con `prefixText="$"` y `suffixText="/lb"`, eliminado `tvRate` (ya no necesario) | `dialog_edit_order.xml` | ✅ |
| 24.12 | Edit dialog lógica — `etPricePerLb` inicializado con `order.price` (precio/lb directo). Un solo `watcher` compartido para ambos campos. `tvTotal` muestra `qty × rate`. Guardar pasa `rate` directo a `updatePendingOrder()` sin recalcular | `CurrentOrderActivity.kt` | ✅ |
| 24.21 | `PrintService.printTicket()` — acepta nuevo parámetro `signature: String? = null` y lo pasa a `buildCpcl()` | `data/print/PrintService.kt` | ✅ |
| 24.22 | `buildCpcl()` — sección "Firma del cliente" al final del ticket: etiqueta `F4 CENTER` + imagen via comando CPCL `EG` (480px de ancho, centrada). Solo se imprime si `signature != null` | `data/print/PrintService.kt` | ✅ |
| 24.23 | `buildSignatureEg()` — convierte base64 PNG a comando CPCL `EG` (1-bit MSB first). Escala la imagen proporcionalmente al ancho objetivo. Retorna `(comando, nuevaY)`; si falla, retorna `("", startY)` sin romper el ticket | `data/print/PrintService.kt` | ✅ |
| 24.24 | `CurrentOrderActivity` — pasa `pendingSignature` a `PrintService.printTicket()` para que la firma aparezca en el ticket físico impreso | `CurrentOrderActivity.kt` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 24.13 | Columna `signature MEDIUMTEXT NULL` agregada a tabla `orders` en `schema.sql` + comentario de migración `ALTER TABLE` | `src/db/schema.sql` | ✅ |
| 24.14 | `createBatch` extrae `signature` del `req.body` y lo incluye en el `INSERT` de cada orden del batch | `src/controllers/orderController.ts` | ✅ |
| 24.15 | `ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature MEDIUMTEXT NULL AFTER customer_name` — ejecutado en DB local | MySQL (XAMPP) | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 24.16 | `OrderRow` interface — campo `signature: string \| null` | `app/orders/page.tsx` | ✅ |
| 24.17 | `Batch` interface — campo `signature: string \| null` | `OrdersClient.tsx` | ✅ |
| 24.18 | `groupBatches` — incluye `signature: items[0]?.signature ?? null` | `OrdersClient.tsx` | ✅ |
| 24.19 | Modal Ticket — muestra imagen de firma (`<img src="data:image/png;base64,…">`) después del total, solo si `signature !== null`. Separada por línea punteada | `OrdersClient.tsx` | ✅ |
| 24.20 | Tabla pedidos — badge `✎ firma` (chip azul) junto al ID del batch si tiene firma | `OrdersClient.tsx` | ✅ |

---

---

## Fase 25: Dirección completa del cliente (Android + Backend) ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 25.1 | `cached_customers` — columnas `address_line1`, `city`, `state_code`, `postal_code` añadidas con `ALTER TABLE ADD COLUMN IF NOT EXISTS` en `ensureTable()` | `src/routes/customers.ts` | ✅ |
| 25.2 | `refreshCache()` — extrae `BillAddr.Line1`, `BillAddr.City`, `BillAddr.CountrySubDivisionCode`, `BillAddr.PostalCode` del objeto QB y los guarda en MySQL | `src/routes/customers.ts` | ✅ |
| 25.3 | `GET /api/customers` — los tres paths (live, cache, stale_cache) devuelven `AddressLine1`, `City`, `StateCode`, `PostalCode`. Live normaliza desde QB crudo; cache/stale_cache los leen de MySQL | `src/routes/customers.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 25.4 | `QbCustomer` — campos opcionales `addressLine1`, `city`, `stateCode`, `postalCode` + propiedad calculada `fullAddress` (ej: `1 Infinite Loop, Cupertino, CA 95014`) | `data/Models.kt` | ✅ |
| 25.5 | `CachedCustomerEntity` — campos `addressLine1`, `city`, `stateCode`, `postalCode` | `data/local/entities/CachedCustomerEntity.kt` | ✅ |
| 25.6 | `CustomerDao.insertAll()` y `cursorToEntity()` — guardan y leen campos de dirección | `data/local/dao/CustomerDao.kt` | ✅ |
| 25.7 | `AppDatabase` — `DATABASE_VERSION = 6`. `onCreate` incluye columnas de dirección. Migración v6: `ALTER TABLE cached_customers ADD COLUMN` para los 4 campos (con try/catch) | `data/local/AppDatabase.kt` | ✅ |
| 25.8 | `SecurePreferences` — `setActiveCustomer(id, name, address?)` guarda dirección; `getActiveCustomerAddress()` la recupera; `clearActiveCustomer()` también la borra | `data/local/SecurePreferences.kt` | ✅ |
| 25.9 | `CustomerPickerActivity` — cards muestran dirección bajo el nombre en gris pequeño. `confirmSelection()` muestra dirección en el diálogo y pasa `customer_address` en el intent result | `CustomerPickerActivity.kt` | ✅ |
| 25.10 | `activity_current_order.xml` — `tvCustomerAddress` (10sp, gris) añadido bajo `tvCustomerLabel` en el toolbar | `res/layout/activity_current_order.xml` | ✅ |
| 25.11 | `CurrentOrderActivity` — lee `customerAddress` desde `SecurePreferences` en `onCreate`/`onResume`, lo recibe del picker launcher, lo muestra en `updateCustomerLabel()` | `CurrentOrderActivity.kt` | ✅ |

### SQL (ejecutar en phpMyAdmin sobre tabla `cached_customers`)

```sql
ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255) DEFAULT NULL;
ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL;
ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS state_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE cached_customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT NULL;
```

> Después correr `POST /api/customers/refresh` (admin) para repoblar el cache con las direcciones desde QB.

---

---

## Fase 26: Dirección del cliente en el ticket impreso (CPCL) ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 26.1 | `PrintService.printTicket()` — nuevo parámetro `customerAddress: String? = null` | `data/print/PrintService.kt` | ✅ |
| 26.2 | `PrintService.buildCpcl()` — nuevo parámetro `customerAddress: String? = null`. Imprime la dirección justo debajo de "Cliente: Nombre". Si la dirección es > 32 chars, la divide en dos líneas por la primera coma (ej: "1 Infinite Loop" + "Cupertino, CA 95014") | `data/print/PrintService.kt` | ✅ |
| 26.3 | `CurrentOrderActivity.finalizeOrder()` — pasa `customerAddress` a `PrintService.printTicket()` | `CurrentOrderActivity.kt` | ✅ |
| 26.4 | `CurrentOrderActivity.openTicket()` — pasa `customer_address` como extra al lanzar `TicketDetailActivity` | `CurrentOrderActivity.kt` | ✅ |
| 26.5 | `CurrentOrderActivity.finalizeOrder()` — pasa `customer_address` como extra al lanzar `OrderSuccessActivity` | `CurrentOrderActivity.kt` | ✅ |
| 26.6 | `OrderSuccessActivity` — lee `customer_address` del intent y lo reenvía a `TicketDetailActivity` en el botón "Ver ticket" | `OrderSuccessActivity.kt` | ✅ |
| 26.7 | `TicketDetailActivity` — lee `customer_address` del intent; lo pasa a `PrintService.printTicket()` en el botón "Reimprimir" | `TicketDetailActivity.kt` | ✅ |
| 26.8 | **Fix:** `MainActivity.customerPickerLauncher` — leía `customer_id` y `customer_name` pero NO `customer_address`, por lo que la dirección quedaba null en `SecurePreferences` y nunca llegaba al ticket | `MainActivity.kt` | ✅ |

---

---

## Fase 27: Negative Sale + Leyenda legal en ticket CPCL ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 27.1 | `CurrentOrderActivity` — `pendingDamageQty: Int` almacena la cantidad de devoluciones entre el diálogo y `finalizeOrder()`. Se limpia a 0 tras cada `sendBatch()` | `CurrentOrderActivity.kt` | ✅ |
| 27.2 | `CurrentOrderActivity.signatureLauncher` — llama a `askDamagedItems()` en vez de ir directo a `checkPrinterThenFinalize()` | `CurrentOrderActivity.kt` | ✅ |
| 27.3 | `CurrentOrderActivity.askDamagedItems()` — diálogo con `EditText` numérico: "¿Artículos dañados o vencidos?". Botones "Continuar" (guarda qty) y "Sin devoluciones" (qty = 0). Ambos continúan a `checkPrinterThenFinalize()` | `CurrentOrderActivity.kt` | ✅ |
| 27.4 | `CurrentOrderActivity.finalizeOrder()` — captura `damageForPrinting` antes del envío y lo pasa a `PrintService.printTicket()` | `CurrentOrderActivity.kt` | ✅ |
| 27.5 | `PrintService.printTicket()` — nuevo parámetro `damageQty: Int = 0` | `data/print/PrintService.kt` | ✅ |
| 27.6 | `PrintService.buildCpcl()` — nuevo parámetro `damageQty: Int = 0`. Si `> 0`: imprime sección "Negative Sale" con separadores y cantidad de unidades dañadas/caducas | `data/print/PrintService.kt` | ✅ |
| 27.7 | `PrintService.buildCpcl()` — leyenda legal siempre visible antes de la firma: "I hereby acknowledge that all above referenced goods have been received..." (word-wrapped en 30 chars) | `data/print/PrintService.kt` | ✅ |
| 27.8 | `PrintService.buildCpcl()` — "Firma del cliente" → "Customer Signature" con separador de dashes antes. Firma imagen sigue igual (EG command) | `data/print/PrintService.kt` | ✅ |
| 27.9 | `PrintService.wrapText()` — helper privado que divide texto largo en líneas de máximo N caracteres respetando palabras | `data/print/PrintService.kt` | ✅ |
| 27.10 | `BatchRequest` — nuevo campo `@SerializedName("damage_qty") val damageQty: Int? = null`. Solo se envía si `> 0` | `data/Models.kt` | ✅ |
| 27.11 | `OrderRepository.sendBatch()` — nuevo parámetro `damageQty: Int = 0`, lo incluye en `BatchRequest` | `data/repository/OrderRepository.kt` | ✅ |
| 27.12 | `CurrentOrderActivity.finalizeOrder()` — pasa `damageForPrinting` a `orderRepository.sendBatch()` | `CurrentOrderActivity.kt` | ✅ |
| 27.13 | `orderController.createBatch()` — extrae `damage_qty` del body y lo pasa a `createBatchInvoice()` | `src/controllers/orderController.ts` | ✅ |
| 27.14 | `qbInvoices.createBatchInvoice()` — acepta `damageQty: number = 0`. Si `> 0`: añade `CustomerMemo: { value: "Negative Sale: X unit(s) returned (damaged/expired)" }` al invoice QB — aparece como "Message on invoice" visible en QB y en PDFs enviados al cliente | `src/services/qbInvoices.ts` | ✅ |
| 27.15 | **Fix:** `MainActivity.refreshCompanySettings()` — fetch de `GET /api/settings` en cada `onResume()` para mantener nombre/subtítulo/dirección/teléfono de empresa actualizados en `SecurePreferences` sin necesidad de re-login | `MainActivity.kt` | ✅ |

**Estructura nueva del ticket (final):**
```
[header empresa + cliente + ítems + TOTAL]
[Negative Sale: X unit(s) damaged/expired]  ← solo si damageQty > 0
------------------------------
I hereby acknowledge that all
above referenced goods have
been received and are in good
...                                          ← leyenda legal (word-wrap)
------------------------------
Customer Signature
[imagen de firma PNG]                        ← solo si hay firma
```

---

---

## Fase 28: Customer Payment Method (Cash / Check) ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 28.1 | `CurrentOrderActivity` — `pendingPaymentMethod: String?`. Flujo: firma → `askDamagedItems()` → **`askPaymentMethod()`** → `checkPrinterThenFinalize()` | `CurrentOrderActivity.kt` | ✅ |
| 28.2 | `askPaymentMethod()` — diálogo con 3 opciones: "Cash" / "Check" / "Omitir". Guarda en `pendingPaymentMethod`, limpia a null tras `sendBatch()` | `CurrentOrderActivity.kt` | ✅ |
| 28.3 | `BatchRequest` — nuevo campo `@SerializedName("payment_method") val paymentMethod: String? = null` | `data/Models.kt` | ✅ |
| 28.4 | `OrderRepository.sendBatch()` — nuevo parámetro `paymentMethod: String? = null`, incluido en `BatchRequest` | `data/repository/OrderRepository.kt` | ✅ |
| 28.5 | `PrintService.printTicket()` y `buildCpcl()` — nuevo parámetro `paymentMethod: String? = null`. Aparece en el header del ticket bajo el nombre del cliente: `"Payment: Cash"` | `data/print/PrintService.kt` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 28.6 | `orderController.createBatch()` — extrae `payment_method` del body, lo pasa a `createBatchInvoice()` | `src/controllers/orderController.ts` | ✅ |
| 28.7 | `qbInvoices.createBatchInvoice()` — acepta `paymentMethod?: string`. Construye `CustomerMemo` combinando payment y negative sale: `"Payment: Cash \| Negative Sale: 2 unit(s)..."`. Aparece como "Note to customer" en el invoice QB | `src/services/qbInvoices.ts` | ✅ |

---

---

## Fase 29: Rediseño layout ticket CPCL ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 29.1 | Separadores `================================` (32 '=') entre secciones principales y `--------------------------------` (32 '-') para sub-secciones | `data/print/PrintService.kt` | ✅ |
| 29.2 | Cabecera empresa (nombre, subtítulo, ciudad, dirección, teléfono): CENTER — igual que antes | `data/print/PrintService.kt` | ✅ |
| 29.3 | Info del pedido (fecha, Pedido#, Factura#): **LEFT** desde x=0 — usa todo el ancho | `data/print/PrintService.kt` | ✅ |
| 29.4 | Bloque cliente (Cliente, Payment, dirección): **LEFT** desde x=0, dirección indentada x=8 | `data/print/PrintService.kt` | ✅ |
| 29.5 | Ítems: **dos columnas** — `twoCol(nombre, $total, 32)` en línea 1; `X.XX lb x $X.XX/lb` indentado en línea 2. Ocupa los 32 chars disponibles | `data/print/PrintService.kt` | ✅ |
| 29.6 | `twoCol(left, right, width=32)` — helper que rellena con espacios para alinear right al borde derecho | `data/print/PrintService.kt` | ✅ |
| 29.7 | Total, Negative Sale, Términos, Firma: CENTER — mismo comportamiento, mejor integrados con separadores | `data/print/PrintService.kt` | ✅ |
| 29.8 | **Fix alignment:** city/address/phone → LEFT. Total section completo → LEFT excepto monto F7. Negative sale, terms, firma → LEFT | `data/print/PrintService.kt` | ✅ |
| 29.9 | **Fix overflow:** `wrapText(32)` aplicado a nombre de producto, nombre del cliente ("Cliente: …"), dirección del cliente, términos. Strings con `take(N)` en subtitle/city/address/phone/invoiceId para prevenir desbordamiento | `data/print/PrintService.kt` | ✅ |
| 29.10 | **Fix total:** `twoCol("TOTAL:", "$XX.XX", 28)` en F4 — label y monto en la misma línea, mismo tamaño de letra que el resto del ticket | `data/print/PrintService.kt` | ✅ |
| 29.11 | **Fix overflow terms/items/cliente:** todos los `wrapText` cambiados a ancho 28 (476px = 28×17px), dejando ~100px de margen físico. El `twoCol` de ítems también a width=28. Espaciado de línea terms: `F4H+2→F4H+4` para mejor legibilidad | `data/print/PrintService.kt` | ✅ |
| 29.12 | **Fix company name:** F7 LEFT `take(20)` truncaba "Excellentia Foods, LLC" → cambio a F4 LEFT `take(33)`. Subtítulo también LEFT. Con F7 (28px/char) nunca caben más de 20 chars en 576px; F4 (17px/char) permite hasta 33 chars | `data/print/PrintService.kt` | ✅ |

**Nuevo layout del ticket:**
```
      EXCELLENTIA         ← F7, CENTER
     Ticket de Venta      ← F4, CENTER
================================ ← SEP
12/06/2026 10:30          ← F4, LEFT
Pedido  #XXXXXXXX         ← F4, LEFT
Factura #XXXXX            ← F4, LEFT
-------------------------------- ← DASH (si hay cliente)
Cliente: Cool Cars         ← F4, LEFT
Payment: Cash             ← F4, LEFT
  1 Infinite Loop         ← F4, LEFT x=8
  Cupertino, CA 95014     ← F4, LEFT x=8
================================ ← SEP
Sprinkler Pipes     $4.10 ← F4, LEFT twoCol(32)
  22.8 lb x $0.18/lb      ← F4, LEFT x=8
================================ ← SEP
           TOTAL           ← F4, CENTER
          $24.00           ← F7, CENTER
    24.00 lb en total      ← F4, CENTER
      Excellentia          ← F4, CENTER
-------------------------------- ← DASH (si neg. sale)
      Negative Sale        ← F4, CENTER
   2 unit(s) damaged       ← F4, CENTER
-------------------------------- ← DASH
[terms word-wrapped]       ← F4, CENTER
-------------------------------- ← DASH (si firma)
   Customer Signature      ← F4, CENTER
[imagen firma PNG]
```

---

---

## Fase 30: TicketDetailActivity — vista idéntica al ticket impreso ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 30.1 | `activity_ticket_detail.xml` — simplificado: toolbar + botón Reimprimir + ScrollView con `MaterialCardView` blanco (papel) que contiene solo `LinearLayout id=ticketContent` | `res/layout/activity_ticket_detail.xml` | ✅ |
| 30.2 | `TicketDetailActivity` — todo el contenido se construye programáticamente en `buildReceipt()`. Misma estructura que el CPCL: cabecera, separadores `===`/`---`, fecha/pedido/factura LEFT, cliente LEFT, ítems con `addTwoCol()`, TOTAL con `addTwoCol()` bold, términos, firma placeholder, chip de estado | `TicketDetailActivity.kt` | ✅ |
| 30.3 | `addLine(text, bold, sizeSp, indent, color)` — agrega TextView monoespaced al recibo | `TicketDetailActivity.kt` | ✅ |
| 30.4 | `addTwoCol(left, right, bold, sizeSp)` — fila horizontal con left (weight=1) y right (wrap), mismo efecto que `twoCol()` del CPCL pero con LinearLayout real | `TicketDetailActivity.kt` | ✅ |
| 30.5 | `addSep(heavy)` — separador `===` o `---` en monospace | `TicketDetailActivity.kt` | ✅ |
| 30.6 | Estado al fondo en color: verde ENVIADO, naranja PENDIENTE, rojo FALLIDO | `TicketDetailActivity.kt` | ✅ |
| 30.7 | Fecha formateada como `dd/MM/yyyy HH:mm` (igual que el ticket) en vez del formato largo anterior | `TicketDetailActivity.kt` | ✅ |
| 30.8 | `signature: String?` añadido a `OrderDto` — el campo ya existía en `o.*` del backend, solo faltaba deserializarlo en Android | `data/Models.kt` | ✅ |
| 30.9 | Firma propagada por toda la cadena: `finalizeOrder()` → `OrderSuccessActivity` intent → `TicketDetailActivity` intent. También leída de `orders[0].signature` en el flujo de historial | `CurrentOrderActivity.kt`, `OrderSuccessActivity.kt`, `TicketDetailActivity.kt` | ✅ |
| 30.10 | `TicketDetailActivity` muestra firma como `ImageView` (base64 → Bitmap, FIT_START). Si no hay firma: espacio en blanco (48dp) para la línea de firma manual | `TicketDetailActivity.kt` | ✅ |
| 30.11 | **Webapp:** modal ticket rediseñado para coincidir con el ticket físico — LEFT aligned, separadores `===`/`---` en texto, ítems con `flex justify-between` (nombre + detalle/precio), TOTAL con label izquierda y monto derecha, términos y condiciones, firma con `<img>` a ancho completo (`object-left`). Si no hay firma: placeholder de 40px | `app/orders/_components/OrdersClient.tsx` | ✅ |

---

---

## Fase 31: Negative Sale por producto ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 31.1 | `DamageItem(barcode, productName, qty)` — nuevo data class. `BatchRequest.damageItems: List<DamageItem>?` reemplaza `damageQty: Int?` | `data/Models.kt` | ✅ |
| 31.2 | `OrderRepository.sendBatch()` — parámetro `damageItems: List<DamageItem>` en vez de `damageQty: Int` | `data/repository/OrderRepository.kt` | ✅ |
| 31.3 | `CurrentOrderActivity.askDamagedItems()` — dialog con una fila por producto: nombre en bold + detalle (`X.XX lb · $X.XX/lb`) + EditText de cantidad. Construye `List<DamageItem>` filtrando los que tienen qty > 0 | `CurrentOrderActivity.kt` | ✅ |
| 31.4 | `PrintService.buildCpcl()` — muestra `Neg. Sale: X unit(s)` indentado debajo de cada producto afectado. Sección "Negative Sale Summary" con lista completa al final de los ítems (solo si hay alguno) | `data/print/PrintService.kt` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 31.5 | `orderController.createBatch()` — extrae `damage_items` (array) del body | `src/controllers/orderController.ts` | ✅ |
| 31.6 | `createBatchInvoice()` — acepta `DamageItem[]`. CustomerMemo: `"Payment: Cash \| Negative Sale: Sprinkler Pipes: 2 unit(s), Queso Fresco: 1 unit(s)"` | `src/services/qbInvoices.ts` | ✅ |

---

---

## Fase 32: Negative Sale persistido en BD + historial completo ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 32.1 | Tabla `batch_damage (id, batch_id, barcode, product_name, qty, created_at)` con índice en `batch_id` | `src/db/schema.sql` | ✅ |
| 32.2 | `orderController.createBatch()` — guarda cada `DamageItem` con `qty > 0` en `batch_damage` tras crear el batch. Usa `CREATE TABLE IF NOT EXISTS` para auto-crear la tabla si no existe | `src/controllers/orderController.ts` | ✅ |
| 32.3 | `getBatchDamage(batchId)` — nueva función. `GET /api/orders/damage/:batchId` → devuelve `{ data: [{barcode, product_name, qty}] }` | `src/controllers/orderController.ts` + `src/routes/orders.ts` | ✅ |
| 32.10 | **Fix 500:** batch_damage INSERT envuelto en su propio try/catch — nunca bloquea ni revierte la respuesta del batch. Error se loguea como warning | `src/controllers/orderController.ts` | ✅ |
| 32.11 | **Fix invoiceId null:** `createBatch` siempre devolvía `invoiceId: null` aunque QB había creado el invoice. Ahora lee `qb_invoice_id` de la DB tras el sync y lo retorna correctamente | `src/controllers/orderController.ts` | ✅ |
| 32.12 | **Webapp modal:** `DamageItem` interface + `ticketDamageItems` state. `openTicket(batch)` reemplaza `setTicketBatch` — al abrir el modal llama `GET /api/orders/damage/:batchId` y carga los items. Modal muestra "Negative Sale Summary" con lista por producto antes del total | `app/orders/_components/OrdersClient.tsx` | ✅ |
| 32.13 | **Webapp tabla:** `expandedDamage: Map<string, DamageItem[]>` cachea damage items por batch. `handleExpand(batchId)` reemplaza `setExpanded` — al expandir una fila fetch damage items. Badge naranja "↩ neg. sale" en la fila si hay devoluciones. Sección naranja en la vista expandida con chips por producto | `app/orders/_components/OrdersClient.tsx` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 32.4 | `ApiService.getBatchDamage(batchId)` — `GET api/orders/damage/{batchId}` → `Response<ApiResponse<List<DamageItem>>>` | `data/network/ApiService.kt` | ✅ |
| 32.5 | `CurrentOrderActivity` — pasa `damage_items_json` (JSON de `pendingDamageItems`) como extra al abrir `TicketDetailActivity` (preview) y a `OrderSuccessActivity` | `CurrentOrderActivity.kt` | ✅ |
| 32.6 | `OrderSuccessActivity` — reenvía `damage_items_json` a `TicketDetailActivity` | `OrderSuccessActivity.kt` | ✅ |
| 32.7 | `TicketDetailActivity` — lee `damage_items_json` del intent (flujo inmediato). Si el batchId existe y no hay datos en el intent, llama `getBatchDamage()` en background para cargar desde la API (flujo historial). Reconstruye el recibo con los datos | `TicketDetailActivity.kt` | ✅ |
| 32.8 | `TicketDetailActivity.damageItemsForReprint` — almacena los items cargados y los pasa a `PrintService.printTicket()` en el botón Reimprimir | `TicketDetailActivity.kt` | ✅ |
| 32.9 | `buildReceipt()` — acepta `damageItems: List<DamageItem>`. Muestra sección "Negative Sale Summary" con un ítem por producto dañado si hay alguno | `TicketDetailActivity.kt` | ✅ |

### SQL (ejecutar en phpMyAdmin)

```sql
CREATE TABLE IF NOT EXISTS batch_damage (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    batch_id     VARCHAR(100) NOT NULL,
    barcode      VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    qty          INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_damage_batch_id (batch_id)
);
```

**Flujo completo:**
```
Finalizar pedido → damage items capturados por producto
  → POST /api/orders/batch { damage_items: [...] }
      → MySQL batch_damage ← guardado permanente
      → QB CustomerMemo   ← nota en invoice
      → Ticket impreso    ← Negative Sale Summary

Historial → tap batch → TicketDetailActivity
  → GET /api/orders/damage/:batchId
      → Lee batch_damage de MySQL
      → Muestra en recibo en pantalla
      → Botón Reimprimir incluye damage items ✓
```

---

## Fase 33: Pre-órdenes ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 33.1 | Tablas `pre_orders` + `pre_order_items` en MySQL (idempotentes via `CREATE IF NOT EXISTS`) | `setup.ts`, `preOrderController.ts` | ✅ |
| 33.2 | `POST /api/preorders` — crear pre-orden (customer_id, customer_name, scheduled_date, notes, items[]) | `preOrderController.ts` | ✅ |
| 33.3 | `GET /api/preorders` — listar con filtros (status, customer_id); operadores ven solo las suyas | `preOrderController.ts` | ✅ |
| 33.4 | `GET /api/preorders/:id` — detalle con items | `preOrderController.ts` | ✅ |
| 33.5 | `PUT /api/preorders/:id` — actualizar campos y reemplazar items | `preOrderController.ts` | ✅ |
| 33.6 | `DELETE /api/preorders/:id` — marcar como CANCELLED (soft delete) | `preOrderController.ts` | ✅ |
| 33.7 | `POST /api/preorders/:id/convert` — convierte a batch real (crea orders, damage, sync QB, marca CONVERTED) | `preOrderController.ts` | ✅ |
| 33.8 | Ruta registrada en `index.ts` como `/api/preorders` | `routes/preOrders.ts`, `index.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 33.9 | Modelos: `PreOrderItem`, `PreOrderRequest`, `PreOrderDto`, `PreOrderResponse`, `ConvertPreOrderRequest`, `ConvertPreOrderResponse` | `Models.kt` | ✅ |
| 33.10 | Endpoints en `ApiService`: createPreOrder, listPreOrders, getPreOrder, updatePreOrder, deletePreOrder, convertPreOrder | `ApiService.kt` | ✅ |
| 33.11 | `PreOrderListActivity` — lista con chips filtro (Todas/Borrador/Confirmada/Convertida), FAB "Nueva pre-orden" | `PreOrderListActivity.kt` | ✅ |
| 33.12 | `CreatePreOrderActivity` — selección de cliente, fecha DatePicker, notas, agregar ítems (escaneo DataWedge + dialog manual), total en tiempo real | `CreatePreOrderActivity.kt` | ✅ |
| 33.13 | `PreOrderDetailActivity` — vista completa (cliente, fecha, notas, items, total), botones Convertir y Cancelar | `PreOrderDetailActivity.kt` | ✅ |
| 33.14 | Flujo Convertir: SignatureActivity → askPaymentMethod → `convertPreOrder()` | `PreOrderDetailActivity.kt` | ✅ |
| 33.15 | Layouts: `activity_pre_order_list.xml`, `activity_pre_order_detail.xml`, `activity_create_pre_order.xml`, `item_pre_order.xml` | `res/layout/` | ✅ |
| 33.16 | Botón "Pre-órdenes" en MainActivity (ícono schedule) + 4 activities en AndroidManifest | `MainActivity.kt`, `activity_main.xml`, `AndroidManifest.xml` | ✅ |

---

## Fase 34: Historial por cliente ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 34.1 | Filtro `customer_id` en `GET /api/orders` (listOrders) | `orderController.ts` | ✅ |
| 34.2 | `GET /api/customers/:customerId/orders` — batches agrupados por cliente con paginación | `routes/customers.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 34.3 | Modelo `CustomerBatchSummary` | `Models.kt` | ✅ |
| 34.4 | Endpoint `getCustomerOrders` en `ApiService` | `ApiService.kt` | ✅ |
| 34.5 | `ClientHistoryActivity` — header resumen, lista de batches, click abre `TicketDetailActivity` | `ClientHistoryActivity.kt` | ✅ |
| 34.6 | Layout `activity_client_history.xml` | `res/layout/` | ✅ |
| 34.7 | Long-press en `CustomerPickerActivity` → menú "Asignar" / "Ver historial" | `CustomerPickerActivity.kt` | ✅ |
| 34.8 | Botón "Historial" en tarjeta de cliente activo en `MainActivity` | `MainActivity.kt`, `activity_main.xml` | ✅ |

---

## Fase 35: Pre-órdenes — Flujo completo de conversión ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 35.1 | `PreOrderDetailActivity` reescrito: firma → dañados → pago → impresora → convert → `OrderSuccessActivity` (idéntico a `CurrentOrderActivity`) | `PreOrderDetailActivity.kt` | ✅ |
| 35.2 | Loading overlay con 3 pasos ("Convirtiendo…" / "Generando factura…" / "Imprimiendo…") | `activity_pre_order_detail.xml`, `PreOrderDetailActivity.kt` | ✅ |
| 35.3 | Botones por estado: DRAFT→Convertir+Cancelar · CONVERTED→Reusar+VerHistorial · CANCELLED→sin botones | `PreOrderDetailActivity.kt` | ✅ |
| 35.4 | `reusePreOrder()` — crea nueva pre-orden DRAFT con mismos ítems/cliente, abre su detalle directamente | `PreOrderDetailActivity.kt` | ✅ |
| 35.5 | Chips simplificados: Pendientes (DRAFT, default) / Convertidas / Canceladas / Todas | `activity_pre_order_list.xml`, `PreOrderListActivity.kt` | ✅ |
| 35.6 | FAB "Nueva pre-orden" con texto e icono en blanco | `activity_pre_order_list.xml` | ✅ |
| 35.7 | `formatDate()` en lista y detalle — soporta ISO con ms, sin ms, y `yyyy-MM-dd` | `PreOrderListActivity.kt`, `PreOrderDetailActivity.kt` | ✅ |
| 35.8 | Empty state dinámico por chip en `PreOrderListActivity` | `PreOrderListActivity.kt` | ✅ |

---

## Fase 36: HistoryActivity — Fix chip Fallidos + empty state ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 36.1 | Chip "Fallidos" filtra batches remotos con `orders.any { status == "FAILED" }` — antes mostraba todos | `HistoryActivity.kt` | ✅ |
| 36.2 | Empty state dinámico: cuando ningún ítem pasa el filtro del chip, muestra `layoutEmpty` con mensaje específico y oculta "Cargar más" | `HistoryActivity.kt`, `activity_history.xml` | ✅ |
| 36.3 | `tvEmptyMessage` — ID añadido al TextView del empty state para actualizarlo en runtime | `activity_history.xml` | ✅ |

---

## Fase 37: Backend — Fixes críticos ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 37.1 | `express.json({ limit: '10mb' })` — evita `PayloadTooLargeError` con firmas base64 PNG grandes | `src/index.ts` | ✅ |
| 37.2 | Bug ENUM `pre_orders.status` — `CONVERTED` se almacenaba como `''` por salto de línea `\r\n` dentro del valor ENUM en template literal de Windows. Fix: SQL en una sola línea en `ensureTables()` y `setup.ts` | `preOrderController.ts`, `setup.ts` | ✅ |
| 37.3 | Migración aplicada: `ALTER TABLE pre_orders MODIFY COLUMN status ENUM(...)` + `UPDATE pre_orders SET status='CONVERTED' WHERE status=''` | MySQL | ✅ |

### SQL de migración (para producción)

```sql
ALTER TABLE pre_orders MODIFY COLUMN status ENUM('DRAFT','CONFIRMED','CONVERTED','CANCELLED') DEFAULT 'DRAFT';
UPDATE pre_orders SET status = 'CONVERTED' WHERE status = '';
```

---

## Fase 38: Gestión de Stock ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 38.1 | `createBatch` — descuenta `stock - 1` por cada línea de ítem vendido usando `GREATEST(stock - 1, 0)` para evitar negativos. Ocurre siempre al crear el batch, independientemente del sync QBO | `src/controllers/orderController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 38.2 | `ProductsClient.tsx` — stat card **"Sin stock"** (rojo si hay productos en 0) reemplaza "Con peso". Header de columna **Stock** agregado a la tabla. `colSpan` del empty state actualizado a 8 | `app/products/_components/ProductsClient.tsx` | ✅ |
| 38.3 | `ProductRow.tsx` — columna Stock editable inline para admin (input numérico, rojo si `= 0`, ámbar si `≤ 5`). Vista operador muestra stock en color. Incluido en `isDirty` y en el body del `PUT` | `app/products/_components/ProductRow.tsx` | ✅ |
| 38.4 | `ProductModal.tsx` — campo **"Stock inicial"** en el form de crear/editar producto (junto a Categoría). Se envía en el body del `POST`/`PUT` | `app/products/_components/ProductModal.tsx` | ✅ |

**Lógica de descuento:**
- 1 unidad por línea de ítem en el batch (cada línea = 1 escaneo físico = 1 unidad vendida)
- Si el mismo producto aparece 3 veces en el batch → stock -3
- `GREATEST(stock - 1, 0)` previene stock negativo
- El descuento ocurre antes del sync a QBO para garantizar consistencia aunque el sync falle

---

## Fase 39: Stock ↔ QBO Sync + Fix Qty en invoices ✅

### Backend — Fix bug Qty en invoices QBO

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 39.1 | `createBatchInvoice` — `Qty` cambiado de `item.quantity` (lbs) a `1` (unidad física). `UnitPrice` cambiado de `price/lb` a `item.total`. QBO ya no descuenta lbs del inventario, descuenta 1 unidad por venta | `src/services/qbInvoices.ts` | ✅ |
| 39.2 | `createInvoice` — mismo fix: `Qty: 1`, `UnitPrice: order.total`. `Amount` sin cambio (el total facturado es el mismo) | `src/services/qbInvoices.ts` | ✅ |

### Backend — Sync stock webapp → QBO

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 39.3 | `updateItemQtyOnHand(itemId, qty)` — nueva función en qbItems.ts. GET item para obtener SyncToken → verifica `Type === 'Inventory'` → POST sparse update con `QtyOnHand` y `InvStartDate`. Retorna `null` si el ítem es Service (no sincroniza) | `src/services/qbItems.ts` | ✅ |
| 39.4 | `updateProduct` — importa `updateItemQtyOnHand`. Tras actualizar MySQL, si `stock` fue incluido en el body y el producto tiene `qb_item_id`, llama a `updateItemQtyOnHand` en silent (try/catch — error en QBO no revierte el guardado en MySQL) | `src/controllers/productController.ts` | ✅ |

**Notas de diseño:**
- Solo sincroniza a QBO si el ítem es `Type: 'Inventory'`. Si es `Service`, loguea un warning y continúa.
- El fallo en QBO es silencioso — MySQL siempre se actualiza, QBO es best-effort.
- Para que funcione, los ítems deben convertirse a tipo **Inventory** manualmente desde la UI de QBO (QBO no permite cambiar Service → Inventory por API). Al convertir pedir: cuenta `Inventory Asset`, cuenta `Cost of Goods Sold`, `QtyOnHand` inicial = valor actual en MySQL.
- Invoices: `Qty: 1` + `UnitPrice: total` = QBO descuenta 1 unidad por scan. El desglose `X.XX lb a $X.XX/lb` sigue en `Description`.

---

## Fase 40: Sync nombre producto webapp → QBO ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 40.1 | `updateItemName(itemId, name)` — nueva función en qbItems.ts. GET item para obtener SyncToken → POST sparse `{ Name: name }`. Funciona para cualquier tipo de ítem (Service o Inventory) | `src/services/qbItems.ts` | ✅ |
| 40.2 | `updateProduct` — importa `updateItemName`. Cuando `name` está en el body del PUT y el producto tiene `qb_item_id`, sincroniza el nombre a QBO (silent, no revierte MySQL si falla) | `src/controllers/productController.ts` | ✅ |
| 40.3 | `ProductRow.tsx` — prop `onEdit: (product) => void` + botón lápiz (icono pencil) visible solo para admins, abre modal de edición | `app/products/_components/ProductRow.tsx` | ✅ |
| 40.4 | `ProductsClient.tsx` — estado `editProduct`, importa `ProductModal`, pasa `onEdit={setEditProduct}` a cada `ProductRow`, renderiza modal cuando hay producto seleccionado | `app/products/_components/ProductsClient.tsx` | ✅ |

**Flujo:** Botón lápiz en fila → Modal editar (nombre, precio, barcode, categoría, stock) → `PUT /api/products/:id { name: "Queso Fresco" }` → MySQL actualizado → QBO Item `Name` actualizado vía sparse update.

**Nota sobre `brand`:** El campo `brand VARCHAR(100)` existe en la DB y es aceptado por la API pero no tiene UI en la webapp. Para negocios con un solo proveedor es prescindible.

---

## Fase 41: Sales Description + tabla read-only + edición solo por modal ✅

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 41.1 | Columna `description TEXT NULL` agregada a tabla `products` (después de `stock`) | `src/db/schema.sql` | ✅ |
| 41.2 | Migration: `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER stock` | MySQL | ⚠️ Ejecutar manualmente |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 41.3 | `updateItemMeta(itemId, { name?, description? })` — reemplaza `updateItemName`. Sparse update con `Name` y/o `Description` según qué campos vienen. Un solo GET + POST a QBO | `src/services/qbItems.ts` | ✅ |
| 41.4 | `updateProduct` — acepta `description` en body, guarda en MySQL, llama `updateItemMeta` cuando `name` o `description` cambian (en una sola llamada a QBO) | `src/controllers/productController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 41.5 | `Product` interface — campo `description: string \| null` agregado | `app/products/page.tsx` | ✅ |
| 41.6 | `ProductRow` — reescrito como componente read-only puro (sin estado, sin inputs, sin handleSave). Admin ve botón lápiz, operador no. Descripción visible en gris truncada bajo el nombre | `app/products/_components/ProductRow.tsx` | ✅ |
| 41.7 | `ProductModal` — campo "Descripción de venta" (textarea 2 líneas) entre Nombre y Precio. Se prellena al editar, se envía como `description` en el body | `app/products/_components/ProductModal.tsx` | ✅ |

### SQL de migración

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER stock;
```

---

## Fase 42: SKU QBO ↔ Barcode sync bidireccional ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 42.1 | `syncProducts` — usa `item.Sku?.trim()` como barcode si existe, fallback a `QBO-{Id}`. También sincroniza `item.Description` al campo `description` de MySQL en INSERT y UPDATE | `src/controllers/qbController.ts` | ✅ |
| 42.2 | `updateItemMeta` — acepta `sku?: string \| null`. Lo incluye en el sparse update como `Sku` a QBO | `src/services/qbItems.ts` | ✅ |
| 42.3 | `updateProduct` — cuando `barcode` cambia, lo pasa como `sku` a `updateItemMeta` junto con `name`/`description` en una sola llamada a QBO | `src/controllers/productController.ts` | ✅ |

**Flujo QBO → MySQL (Sincronizar QB):**
```
item.Sku = "7501234567890" → products.barcode = "7501234567890"  ✓
item.Sku = null/""         → products.barcode = "QBO-{Id}"       (fallback)
item.Description           → products.description                 ✓
item.QtyOnHand             → products.stock                       ✓
```

**Flujo Webapp → QBO (modal editar):**
```
barcode cambia → QBO Item.Sku actualizado  ✓
name cambia    → QBO Item.Name actualizado ✓
description    → QBO Item.Description      ✓
stock cambia   → QBO Item.QtyOnHand        ✓ (solo Inventory)
```

**Nota:** Para aprovechar el SKU, poner en QBO el código de barras real (EAN/UPC) en el campo SKU de cada ítem antes de hacer "Sincronizar QB". Así el TC22 encuentra el producto al escanear sin configuración adicional.

---

## Fase 43: UI improvements + Validaciones en todas las páginas webapp ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 43.1 | ~~Botón "Nuevo producto"~~ — **revertido**: productos se crean en QBO y se importan con "Sincronizar QB". Botón eliminado del header | `ProductsClient.tsx` | ✅ |
| 43.2 | `ProductModal` — validación por campo inline: nombre mín 2 chars, precio > 0, stock ≥ 0, peso válido. Inputs en error se pintan en rojo | `ProductModal.tsx` | ✅ |
| 43.3 | Login — toggle mostrar/ocultar contraseña. Email se hace `.trim()` al enviar | `login/page.tsx` | ✅ |
| 43.4 | `UsersClient` — validación email (regex) + contraseña mínimo 6 chars con indicador de fortaleza (Débil/Aceptable/Segura). Toggle mostrar/ocultar contraseña en crear usuario | `UsersClient.tsx` | ✅ |
| 43.5 | `SettingsClient` — contador de caracteres en tiempo real para "Nombre empresa" y "Subtítulo" (máx. 33 para impresión CPCL). Input se vuelve ámbar si excede el límite | `SettingsClient.tsx` | ✅ |
| 43.6 | Fix sidebar en login: `router.push('/api/logout')` (soft nav) causaba que el sidebar quedara visible al redirigir a /login. Cambiado a `window.location.href` en todos los client components para forzar reload completo del layout server | `ProductsClient.tsx`, `UsersClient.tsx`, `SettingsClient.tsx` | ✅ |
| 43.7 | `createProduct` ahora guarda `description` y `weight_per_unit` en el INSERT (antes se ignoraban) | `productController.ts` | ✅ |
| 43.8 | `updateItemMeta` acepta `unitPrice` — precio sincronizado a QBO (`UnitPrice`) al guardar desde el modal, en la misma llamada que nombre/descripción/SKU | `qbItems.ts`, `productController.ts` | ✅ |
| 43.9 | Modal de producto — leyenda estática "Requisitos en QuickBooks" al pie del formulario + badge de estado de vinculación QBO | `ProductModal.tsx` | ✅ |

### Flujo definitivo de productos

- **Crear**: desde QBO (Productos y servicios → Nuevo, tipo Inventory) → "Sincronizar QB" importa a MySQL con `qb_item_id`
- **Editar** desde modal (solo admin): nombre + descripción + SKU + precio → `updateItemMeta` (una sola llamada QBO); stock → `updateItemQtyOnHand` (solo ítems Inventory)
- **Cost (costo de compra)**: campo de QBO no gestionado desde la webapp — se edita directamente en QBO. Es distinto al `price` (precio de venta). QBO lo usa para calcular ganancia bruta y valorar el inventario en COGS
- Todos los syncs a QBO son silenciosos — fallo no revierte el guardado en MySQL

---

## Fase 44: Internacionalización ES/EN (Webapp) ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 44.1 | `app/lib/i18n.ts` — diccionario completo ES/EN con prefijos: `nav_`, `login_`, `common_`, `val_`, `prod_`, `modal_`, `ord_`, `tkt_`, `usr_`, `cfg_`, `cust_`, `dash_`, `dt_` | `app/lib/i18n.ts` | ✅ |
| 44.2 | `LangProvider.tsx` — React Context con `locale` (default `'en'`), `setLocale`, `t(key)`. Persiste en `localStorage`. Envuelve todo el layout | `app/_components/LangProvider.tsx` | ✅ |
| 44.3 | `Sidebar.tsx` — toggle ES/EN en footer (globo + pills). Todas las etiquetas usan `t()`. `navItems` con `as const` para type-safe key lookups | `app/_components/Sidebar.tsx` | ✅ |
| 44.4 | `login/page.tsx` — todos los textos traducidos vía `useLang()` | `app/login/page.tsx` | ✅ |
| 44.5 | `ProductsClient.tsx`, `ProductRow.tsx`, `ProductModal.tsx` — traducidos con `useLang()` | `app/products/_components/` | ✅ |
| 44.6 | `OrdersClient.tsx` — `statusCfg` movido dentro del componente (usa `t()`), todos los textos traducidos | `app/orders/_components/OrdersClient.tsx` | ✅ |
| 44.7 | `UsersClient.tsx` — `DeleteModal` y formularios traducidos. `roleLabelEs` eliminado (reemplazado por `t()`) | `app/users/_components/UsersClient.tsx` | ✅ |
| 44.8 | `SettingsClient.tsx` — formulario y preview traducidos. Fecha con `locale === 'en' ? 'en-US' : 'es-MX'` | `app/settings/_components/SettingsClient.tsx` | ✅ |
| 44.9 | `CustomersClient.tsx` — KPIs, tabla, búsqueda y footer traducidos | `app/customers/_components/CustomersClient.tsx` | ✅ |
| 44.10 | `DateFilter.tsx` — `presets` movido dentro del componente (usa `t()`). Picker traducido | `app/dashboard/_components/DateFilter.tsx` | ✅ |
| 44.11 | `Charts.tsx` — `LineChart` usa `t('dash_noChartData')` para el empty state | `app/dashboard/_components/Charts.tsx` | ✅ |
| 44.12 | `DashboardClient.tsx` — nuevo client component que recibe todos los datos del dashboard como props y maneja toda la UI + traducción. Compute `pLabel` con `t()` client-side | `app/dashboard/_components/DashboardClient.tsx` | ✅ |
| 44.13 | `dashboard/page.tsx` — reescrito: server component solo fetcha datos y los pasa a `DashboardClient`. Eliminados `fmt`, `fmtDate`, `statusBadge`, `statusText`, `periodLabel`, `BarChart`, `LineChart` del page | `app/dashboard/page.tsx` | ✅ |

---

## Fase 45: Productos ocultos QBO + QBO Import CSV ✅

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 45.1 | Columna `hidden TINYINT(1) NOT NULL DEFAULT 0` agregada a tabla `products` | MySQL | ✅ |
| 45.2 | `Services` (QBO-1) y `Hours` (QBO-2) marcados como `hidden = 1` — no se pueden hacer inactive en QBO (son items del sistema) | MySQL | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 45.3 | `listProducts` — query base cambiada a `WHERE hidden = 0`. Búsqueda usa `AND (name LIKE ? OR barcode LIKE ?)` | `src/controllers/productController.ts` | ✅ |
| 45.4 | `getProductByBarcode` — query cambiada a `WHERE barcode = ? AND hidden = 0` | `src/controllers/productController.ts` | ✅ |
| 45.5 | Sync QBO (`syncProductsFromQbo` y `syncProducts`) no toca la columna `hidden` — el flag se preserva en cada sincronización | `src/services/syncEngine.ts`, `src/controllers/qbController.ts` | ✅ |

### SQL de migración

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden TINYINT(1) NOT NULL DEFAULT 0;
UPDATE products SET hidden = 1 WHERE barcode IN ('QBO-1', 'QBO-2');
```

### QBO Import CSV

| # | Tarea | Detalle | Estado |
|---|---|---|---|
| 45.6 | `qbo_import_products.csv` — archivo generado con columnas exactas del sample de QBO: `Product/Service Name`, `Type`, `Sales Description`, `Sales Price / Rate`, `Income Account`, `Purchase Description`, `Purchase Cost`, `Expense Account`, `Inventory Asset Account`, `Quantity on Hand`, `Reorder Point`, `Quantity as of Date`, `Taxable` | `excellentia/qbo_import_products.csv` | ✅ |
| 45.7 | 18 productos reales importados a QBO (Reynaldo's, Dutch Farms, LALA, etc.) con `Type: Inventory`, `Income Account: Sales of Product Income`, `Expense Account: Cost of Goods Sold` | QBO | ✅ |

---

## Fase 46: Campo min_price en ProductModal + Datos pendientes de productos ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 46.1 | `ProductModal` — campo "Min price ($/lb)" (i18n: `modal_minPrice`) agregado al formulario. Input numérico opcional junto a Stock en grid 2-col | `app/products/_components/ProductModal.tsx` | ✅ |
| 46.2 | Form state — `min_price: ''` agregado al estado inicial | `ProductModal.tsx` | ✅ |
| 46.3 | `useEffect` — prellena `min_price` al editar un producto existente | `ProductModal.tsx` | ✅ |
| 46.4 | `handleSubmit` — incluye `min_price` en el body del PUT/POST solo si tiene valor | `ProductModal.tsx` | ✅ |
| 46.5 | `i18n.ts` — claves `modal_minPrice` y `modal_minPricePh` agregadas en ES y EN | `app/lib/i18n.ts` | ✅ |

### SQL — Datos pendientes de productos

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 46.6 | `update_products_pending.sql` — script UPDATE para 13 productos con `weight_per_unit` y `min_price` faltantes. Datos extraídos de Shopify CSV (grams→lbs, cost per item) | `excellentia/update_products_pending.sql` | ✅ |

**Productos actualizados:**

| Barcode | weight_per_unit | min_price | Nota |
|---------|----------------|-----------|------|
| QBO-1 Salsa Taquera | 12.00 lb | $1.84 | Shopify: 5443g, cost $1.84 |
| QBO-2 Salsa Verde | 12.00 lb | $1.84 | Shopify: 5443g, cost $1.84 |
| QBO-3 Soy Chorizo | 11.00 lb | $1.52 | Shopify: 4990g, cost $1.52 |
| QBO-10 Rice Pudding NS | 10.50 lb | $0.82 | Shopify: 4763g, cost $0.82 |
| QBO-11 Longaniza | 12.50 lb | $2.65 | Shopify: 5670g, cost $2.65 |
| QBO-12..15 Moles | 53.13 lb | $3.75–$4.00 | Shopify: 24097g |
| QBO-16 LALA Queso Panela | 6.25 lb | $2.93 | Peso corregido (Shopify era placeholder 100kg) |
| QBO-17 LALA Queso Oaxaca | 6.25 lb | $3.94 | Peso corregido (Shopify era placeholder 100lb) |
| QBO-18 LALA ProbioC | 5.48 lb | $1.99 | Shopify: 2486g, cost $1.99 |
| QBO-19 LALA Media Crema | 13.50 lb | $1.45 | Shopify: 6123g, cost $1.45 |

```powershell
# Ejecutar:
mysql -u root -p excellentia < update_products_pending.sql
```

---

## Fase 47: Fix crash historial (TransactionTooLargeException) + Firma en historial ✅

### Bug raíz

`listOrders` backend usaba `SELECT o.*` que incluye la columna `signature` (PNG base64, ~100–500 KB por orden). Al abrir un ticket desde historial, Android serializaba todos los orders a JSON y los metía en un Intent. Con varios pedidos la carga superaba el límite del Binder (~1MB) → `TransactionTooLargeException` → la app crasheaba y volvía a MainActivity.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 47.1 | `listOrders` — `SELECT o.*` reemplazado por columnas explícitas sin `signature`. La firma ya no viaja en el listado de pedidos | `src/controllers/orderController.ts` | ✅ |
| 47.2 | `getBatchDamage` — ahora retorna también `signature` del batch en la misma respuesta: `{ data: [...], signature: "..." }`. Un solo request carga damage items + firma | `src/controllers/orderController.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 47.3 | `HistoryActivity.bindBatchHeader` — strip defensivo: `.copy(signature = null)` en cada orden antes de poner en Intent. Firma extraída por separado y pasada como extra `"signature"` | `HistoryActivity.kt` | ✅ |
| 47.4 | `ClientHistoryActivity.loadBatchDetail` — mismo strip defensivo. Importado `Gson` | `ClientHistoryActivity.kt` | ✅ |
| 47.5 | `ApiResponse<T>` — campo `signature: String? = null` agregado al modelo genérico — permite deserializar la firma de `getBatchDamage` | `data/Models.kt` | ✅ |
| 47.6 | `TicketDetailActivity` — `signatureForReprint: String?` como `var` de clase (análogo a `damageItemsForReprint`) | `TicketDetailActivity.kt` | ✅ |
| 47.7 | `TicketDetailActivity` — bloque API siempre corre cuando hay `batchId` (antes solo si `initialDamage.isEmpty()`). Actualiza `signatureForReprint` si la API retorna una firma nueva | `TicketDetailActivity.kt` | ✅ |
| 47.8 | `TicketDetailActivity` — reconstruye el recibo solo si `damageChanged || signatureChanged` — evita rebuild innecesario | `TicketDetailActivity.kt` | ✅ |
| 47.9 | Botón Reimprimir — usa `signatureForReprint` (la `var` de clase) en vez de la variable local inmutable de `onCreate` | `TicketDetailActivity.kt` | ✅ |

**Flujo de firma completo tras el fix:**

| Escenario | Firma en pantalla | Firma al reimprimir |
|-----------|-------------------|---------------------|
| Inmediatamente después de crear el pedido | ✅ Pasa directo por Intent desde `CurrentOrderActivity` | ✅ |
| Abrir desde Historial | ✅ `getBatchDamage` retorna `signature` del batch | ✅ |
| ClientHistoryActivity → TicketDetailActivity | ✅ Mismo flujo vía API | ✅ |

---

## Fase 48: Normalización batch_signatures + Cleanup firma ✅

### Problema

La firma PNG base64 se guardaba una vez por fila en `orders` (5 ítems en un batch = 5 copias idénticas). Además, el código Android tenía un strip defensivo innecesario una vez que `listOrders` dejó de retornar `signature`.

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 48.1 | Crear tabla `batch_signatures (batch_id VARCHAR(100) PK, signature MEDIUMTEXT, created_at TIMESTAMP)` | `migrate_batch_signatures.sql` | ✅ |
| 48.2 | Migrar firmas existentes de `orders` → `batch_signatures` (una por batch via `GROUP BY`) | `migrate_batch_signatures.sql` | ✅ |
| 48.3 | `ALTER TABLE orders DROP COLUMN signature` — columna eliminada de la tabla principal | `migrate_batch_signatures.sql` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 48.4 | `createBatch` — guarda firma en `batch_signatures` en vez de `orders`. Usa `CREATE TABLE IF NOT EXISTS` + `INSERT` | `src/controllers/orderController.ts` | ✅ |
| 48.5 | `convertPreOrder` — mismo cambio; usa `INSERT IGNORE` para evitar duplicados si ya existe | `src/controllers/preOrderController.ts` | ✅ |
| 48.6 | `getBatchDamage` — lee `signature` de `batch_signatures WHERE batch_id = ?` en vez de `orders` | `src/controllers/orderController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 48.7 | Eliminar `signature: string | null` de interfaz `OrderRow` | `app/orders/page.tsx` | ✅ |
| 48.8 | Eliminar `signature` de interfaz `Batch`, de `groupBatches`, y pasar a `ticketSignature` state cargado desde `getBatchDamage` | `app/orders/_components/OrdersClient.tsx` | ✅ |
| 48.9 | Badge `✎ firma` usa `batchSignatures` Map (populado en `handleExpand`) en vez de `batch.signature` | `app/orders/_components/OrdersClient.tsx` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 48.10 | `HistoryActivity.bindBatchHeader` — eliminar strip defensivo (`.copy(signature = null)`, `putExtra("signature", ...)`). Orders pasan directo al Intent | `HistoryActivity.kt` | ✅ |
| 48.11 | `ClientHistoryActivity.loadBatchDetail` — mismo cleanup; orders sin strip | `ClientHistoryActivity.kt` | ✅ |
| 48.12 | `OrderDto` — eliminar campo `signature: String? = null` (ya no viene en `listOrders`) | `data/Models.kt` | ✅ |

**Resultado:** Un batch de 5 ítems pasa de almacenar la firma 5 veces (una por fila en `orders`) a almacenarla una sola vez en `batch_signatures`. La firma se carga bajo demanda via `GET /api/orders/damage/:batchId`.

---

## Fase 49: UX — Stock visible, ticket en inglés, modal dañados, historial ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 49.1 | `Product` data class — campo `stock: Int = 0` agregado. `ProductDto.toProduct()` lo incluye. Cache fallback también pasa `cached.stock` | `data/Models.kt`, `data/repository/ProductRepository.kt` | ✅ |
| 49.2 | `MainActivity.openDetail()` — pasa `putExtra("STOCK", product.stock)` al lanzar `ProductDetailActivity` | `MainActivity.kt` | ✅ |
| 49.3 | `ProductDetailActivity` — `tvStock` debajo del barcode: verde `"Stock disponible: X unidad(es)"` o rojo `"Sin stock disponible"`. Si stock=0: botón `btnAddOrder` rojo/blanco con texto `"PRODUCTO SIN STOCK"`, deshabilitado + `btnUnitMinus/Plus` también deshabilitados | `ProductDetailActivity.kt`, `activity_product_detail.xml` | ✅ |
| 49.4 | Modal artículos dañados — scroll fix con `FrameLayout` wrapper de altura fija (38% pantalla). Mensaje movido al interior del scroll. Sin `setOnShowListener` ni `requestLayout`. Aplica a `CurrentOrderActivity` y `PreOrderDetailActivity` | `CurrentOrderActivity.kt`, `PreOrderDetailActivity.kt` | ✅ |
| 49.5 | Ticket en inglés — `TicketDetailActivity`: `"Pedido #"→"Order #"`, `"Factura #"→"Invoice #"`, `"Cliente:"→"Customer:"`, `"lb en total"→"lb total"`. Layout: `"Ticket de venta"→"Sale Ticket"`, `"Reimprimir ticket"→"Reprint ticket"`, `"Imprimiendo…"→"Printing…"` | `TicketDetailActivity.kt`, `activity_ticket_detail.xml` | ✅ |
| 49.6 | PrintService ticket en inglés — `"Pedido #"→"Order #"`, `"Factura #"→"Invoice #"`, `"Cliente:"→"Customer:"`, `"lb en total"→"lb total"` | `data/print/PrintService.kt` | ✅ |
| 49.7 | `HistoryActivity` — botón "Enviar ahora" / "Reintentar envío" oculto (`GONE`) en pedidos locales pendientes. El flujo de envío manual fue eliminado del historial | `HistoryActivity.kt` | ✅ |
| 49.8 | Cleanup `OrderDto` — campo `signature` eliminado. `PreOrderDetailActivity` y `TicketDetailActivity` actualizados para no referenciarlo | `data/Models.kt`, `PreOrderDetailActivity.kt`, `TicketDetailActivity.kt` | ✅ |

**Reglas stock en ProductDetailActivity:**
- `stock >= 1` → badge verde, botón amarillo habilitado normal
- `stock == 0` → badge rojo "Sin stock disponible", botón rojo/blanco "PRODUCTO SIN STOCK" deshabilitado, +/- deshabilitados
- `stock == -1` (sin dato / offline) → sin badge, comportamiento normal

**Fix modal dañados — causa raíz:**
`setOnShowListener` + `scroll.layoutParams = ViewGroup.LayoutParams(...)` causaba `ClassCastException` porque el contenedor interno del diálogo (LinearLayout) intentaba castear los params genéricos a `LinearLayout.LayoutParams`. Solución: `FrameLayout` wrapper con altura fija pasado como `.setView(wrapper)` — el diálogo respeta el tamaño del wrapper sin modificar los params internos.

---

---

## Fase 50: cPanel Deployment — Passenger + Frontend estático ✅

### Deployment fixes

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 50.1 | `package.json` — `start` script cambiado de `bun run` a `node dist/index.js` | `package.json` | ✅ |
| 50.2 | Build cambiado a `--format=cjs` (CommonJS) para compatibilidad con Node.js estándar | `package.json` | ✅ |
| 50.3 | `"main": "dist/index.js"` agregado para detección de Passenger | `package.json` | ✅ |
| 50.4 | Logger — creación automática de directorio `logs/` si no existe, fallback a solo Console si falla | `src/services/logger.ts` | ✅ |
| 50.5 | `process.exit(1)` eliminado del startup — errores se recolectan en `startErrors` sin matar el proceso | `src/index.ts` | ✅ |
| 50.6 | Endpoint `/api/startup-status` para diagnóstico de entorno | `src/index.ts` | ✅ |
| 50.7 | Express sirve frontend estático (Next.js `out/`) con `extensions: ['html']` para SPA routing | `src/index.ts` | ✅ |
| 50.8 | Ruta del frontend configurable via `WEBAPP_DIR` env var, default `../excellentia-webapp/out` | `src/index.ts` | ✅ |
| 50.9 | Middleware trailing slash redirect (301) — `/pagina/` → `/pagina` para compatibilidad con export estático | `src/index.ts` | ✅ |

### Webapp fixes

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 50.10 | Home page (`/`) redirige a `/login` si no hay sesión, o `/dashboard` si hay sesión | `app/page.tsx` | ✅ |
| 50.11 | Home page ya no redirige a `/orders` para operadores — siempre va a `/dashboard` | `app/page.tsx` | ✅ |
| 50.12 | Botón de descarga APK en página de Configuración (admin only) | `app/settings/_components/SettingsClient.tsx` | ✅ |

---

## Fase 51: QBO OAuth — Disconnect handler + redirect post-auth ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 51.1 | `qbCallback` — redirige al dashboard (`DASHBOARD_URL`) en vez de devolver JSON. Compatibilidad con flujo browser-based de Intuit | `src/controllers/qbController.ts` | ✅ |
| 51.2 | `qbDisconnect` — nuevo handler: revoca el access token en Intuit, elimina todos los registros de `qb_tokens` en MySQL, redirige a página de confirmación (`DISCONNECTED_URL`) | `src/controllers/qbController.ts` | ✅ |
| 51.3 | `GET /api/qb/disconnect` — nueva ruta registrada (sin auth, Intuit redirige directamente a ella) | `src/routes/quickbooks.ts` | ✅ |
| 51.4 | `.env` — variables `DASHBOARD_URL` y `DISCONNECTED_URL` para configurar los redirects por entorno (localhost en dev, `https://app.excellentiafoods.com/...` en producción) | `.env` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 51.5 | Página `/qb-disconnected` — confirmación visual con ícono, mensaje explicativo, botones "Ir al dashboard" y "Volver a conectar QuickBooks" | `app/qb-disconnected/page.tsx` | ✅ |

---

## Fase 52: QBO connection card en Settings webapp ✅

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 52.1 | Card "QuickBooks Online" en `/settings` — fetcha `GET /api/qb/status` al montar, muestra badge verde "Connected" / ámbar "Token expired" / rojo "Not connected", entorno (sandbox/production) y fecha del último sync | `app/settings/_components/SettingsClient.tsx` | ✅ |
| 52.2 | Botón **Connect / Reconnect** — siempre visible, redirige a `/api/qb/auth` para iniciar flujo OAuth | `SettingsClient.tsx` | ✅ |
| 52.3 | Botón **Disconnect** — visible solo cuando el token está activo, redirige a `/api/qb/disconnect` | `SettingsClient.tsx` | ✅ |
| 52.4 | Estado `qbLoading` — muestra "Checking status…" mientras carga, sin layout shift | `SettingsClient.tsx` | ✅ |

---

### Valores para el formulario de Intuit QBO (producción)

| Campo | Valor |
|---|---|
| Host domain | `app.excellentiafoods.com` |
| Launch URL | `https://app.excellentiafoods.com/dashboard` |
| Disconnect URL | `https://app.excellentiafoods.com/api/qb/disconnect` |
| Connect/Reconnect URL | `https://app.excellentiafoods.com/api/qb/auth` |

### Al hacer deploy a producción

Actualizar en `.env` del servidor:
```env
DASHBOARD_URL=https://app.excellentiafoods.com/dashboard
DISCONNECTED_URL=https://app.excellentiafoods.com/qb-disconnected
REDIRECT_URI=https://app.excellentiafoods.com/api/qb/callback
```

---

## Fase 53: Fix duración de sesión ✅

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 53.1 | Access token cambiado de `'15m'` a `'7d'` — coincide con la duración del refresh token y la cookie de la webapp | `src/services/jwtService.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 53.2 | `TokenAuthenticator` — tras refresh exitoso, el request reintentado ahora incluye el nuevo token en el header `Authorization: Bearer {token}`. Antes se quitaba el header pero no se ponía el nuevo, causando un segundo 401 y logout forzado al expirar el token | `data/network/RetrofitClient.kt` | ✅ |

**Causa raíz:** El access token duraba 15 minutos pero la cookie de la webapp y el refresh token duraban 7 días — desincronización que sacaba al usuario al login después de 15 min de inactividad. En Android, el `TokenAuthenticator` tenía el bug de no poner el nuevo Bearer token en el retry, por lo que el refresh silencioso fallaba y mandaba al login en lugar de continuar la sesión.

---

## Fase 54: Offline mode completo ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 54.1 | `PendingBatchEntity` + `PendingBatchDao` — nueva tabla `pending_batches` en SQLite para guardar batches completos cuando no hay red | `data/local/entities/PendingBatchEntity.kt`, `data/local/dao/PendingBatchDao.kt` | ✅ |
| 54.2 | `AppDatabase` — tabla `pending_batches` en `onCreate` y `onUpgrade`, versión → **7** | `data/local/AppDatabase.kt` | ✅ |
| 54.3 | `ApiService` — nuevo endpoint `getAllProducts(limit)` sin filtro de búsqueda para prefetch masivo | `data/network/ApiService.kt` | ✅ |
| 54.4 | `OrderRepository.sendBatch()` — si `isOfflineMode()` es true o hay excepción de red, guarda el batch completo (JSON) en `pending_batches` y devuelve `batchId = "OFFLINE_PENDING"` en vez de fallar | `data/repository/OrderRepository.kt` | ✅ |
| 54.5 | `OrderRepository.prefetchAllProducts()` — descarga todos los productos (`GET /api/products?limit=500`) y los guarda en `cached_products` | `data/repository/OrderRepository.kt` | ✅ |
| 54.6 | `OrderRepository.prefetchAllCustomers()` — descarga todos los clientes QB y los guarda en `cached_customers` | `data/repository/OrderRepository.kt` | ✅ |
| 54.7 | `ProductRepository` — recibe `SecurePreferences`; si `isOfflineMode()` salta directamente al cache SQLite sin intentar el API ni esperar timeout | `data/repository/ProductRepository.kt` | ✅ |
| 54.8 | `ProductDao.searchByQuery()` — búsqueda fuzzy por `barcode LIKE` o `name LIKE` para encontrar productos aunque el barcode guardado sea diferente al escaneado | `data/local/dao/ProductDao.kt` | ✅ |
| 54.9 | `SyncWorker` — procesa `pending_batches` al sincronizar (además de `pending_orders`); dispara notificación al usuario cuando un batch offline se sincroniza exitosamente | `data/sync/SyncWorker.kt` | ✅ |
| 54.10 | `SyncWorker.enqueueOneTime()` — nuevo método para disparar sync inmediato al recuperar la red | `data/sync/SyncWorker.kt` | ✅ |
| 54.11 | `AndroidManifest.xml` — permiso `ACCESS_NETWORK_STATE` | `AndroidManifest.xml` | ✅ |
| 54.12 | `MainActivity` — `ConnectivityManager.NetworkCallback` real: `onAvailable` oculta el banner, dispara sync + prefetch; `onLost` muestra el banner y activa offline mode | `MainActivity.kt` | ✅ |
| 54.13 | `MainActivity` — pre-caché inicial en `onCreate` si hay red: llama `prefetchAllProducts()` + `prefetchAllCustomers()` en background | `MainActivity.kt` | ✅ |
| 54.14 | `MainActivity.isNetworkAvailable()` — usa `NET_CAPABILITY_VALIDATED` + `NET_CAPABILITY_INTERNET` para detectar internet real (no solo WiFi conectado sin internet) | `MainActivity.kt` | ✅ |
| 54.15 | `MainActivity.showManualEntryDialog()` — en modo offline hace búsqueda fuzzy en SQLite en lugar de llamar al API; muestra lista de selección si hay múltiples coincidencias | `MainActivity.kt` | ✅ |
| 54.16 | `CurrentOrderActivity.finalizeOrder()` — maneja respuesta `OFFLINE_PENDING`: imprime ticket si hay impresora, limpia el carrito y navega a `OrderSuccessActivity` con flag `offline_pending = true` | `CurrentOrderActivity.kt` | ✅ |
| 54.17 | `OrderSuccessActivity` — muestra Snackbar "Sin conexión — pedido guardado, se enviará automáticamente" cuando `offline_pending = true` | `OrderSuccessActivity.kt` | ✅ |

**Flujo offline completo:**
```
Online → MainActivity.onCreate() → prefetchAllProducts() + prefetchAllCustomers() → SQLite cache lleno

Red se pierde → NetworkCallback.onLost() → isOfflineMode = true → bannerOffline visible

Usuario escanea / entra código manual:
  → ProductRepository ve isOfflineMode=true → busca en cached_products directamente
  → Si no encuentra por barcode exacto → searchByQuery (LIKE por barcode o nombre)

Usuario finaliza pedido:
  → sendBatch() ve isOfflineMode=true → guarda en pending_batches (JSON completo)
  → Imprime ticket si hay impresora configurada
  → OrderSuccessActivity muestra "Pedido guardado — se enviará cuando haya conexión"

Red se restaura → NetworkCallback.onAvailable():
  → isOfflineMode = false
  → SyncWorker.enqueueOneTime() → procesa pending_batches → POST /api/orders/batch
  → Notificación al usuario cuando se sincroniza
  → prefetchAllProducts() + prefetchAllCustomers() (actualiza cache)
```

---

## Fase 55: Reorden flujo de firma ✅

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 55.1 | `btnFinalize` onClick — ahora llama `askDamagedItems()` directamente en lugar de `launchSignature()` | `CurrentOrderActivity.kt` | ✅ |
| 55.2 | `customerPickerLauncher` — tras seleccionar cliente con `launchSignatureAfterCustomer`, ahora continúa a `askDamagedItems()` en lugar de `launchSignature()` | `CurrentOrderActivity.kt` | ✅ |
| 55.3 | `askPaymentMethod()` — los tres botones (Cash / Check / Skip) ahora llaman `launchSignature()` en lugar de `checkPrinterThenFinalize()` | `CurrentOrderActivity.kt` | ✅ |
| 55.4 | `signatureLauncher` result — tras confirmar firma llama `checkPrinterThenFinalize()` en lugar de `askDamagedItems()` | `CurrentOrderActivity.kt` | ✅ |

**Flujo anterior:** Finalizar → Cliente → **Firma** → Artículos dañados → Pago → Impresora → Enviar

**Flujo nuevo:** Finalizar → Cliente → Artículos dañados → Pago → **Firma** → Impresora → Enviar

---

## Fase 56: Seguridad Intuit App Store ✅ (código + deploy) / 🔄 organizacional

Requisitos de seguridad obligatorios para publicar en el QuickBooks App Store. Revisados contra la documentación oficial de Intuit (`/go-live/publish-app/security-requirements`).

### cPanel ✅

| # | Tarea | Estado |
|---|---|---|
| 56.1 | SSL wildcard 5 años activo — calificación A en SSL Labs | ✅ |
| 56.2 | HTTPS forzado en dominio y subdominio (ya existía en `.htaccess`) | ✅ |
| 56.3 | TLS 1.2+ con AES-256 confirmado (SSL Labs A rating) | ✅ |
| 56.4 | `RewriteCond %{REQUEST_METHOD} ^TRACE` + `[F]` agregado al `.htaccess` del subdominio y dominio principal | ✅ |

### Backend — `excellentia/` ✅

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| 56.5 | Cifrar `refresh_token` y `access_token` con AES-256 antes de guardar en tabla `qb_tokens` | 🔴 Crítico | ✅ |
| 56.6 | Llave AES en variable de entorno separada (`QB_TOKEN_KEY`) — generada en `.env` local y en cPanel `SetEnv` | 🔴 Crítico | ✅ |
| 56.7 | Descifrar tokens al cargar desde DB en `loadTokensFromDb()` — fallback a texto plano (legacy) | 🔴 Crítico | ✅ |
| 56.8 | OAuth `state` aleatorio (32 bytes hex) + verificación en `handleCallback` con TTL 10 min — previene CSRF | 🔴 Crítico | ✅ |
| 56.9 | Password mínimo 8 caracteres en `register` y en `changePassword` (antes era 6) | 🔴 Crítico | ✅ |
| 56.10 | `helmet` instalado y aplicado — headers: `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `X-XSS-Protection`, `Referrer-Policy` | 🟡 Medio | ✅ |
| 56.11 | `Cache-Control: no-cache, no-store, must-revalidate` en todas las rutas `/api/*` | 🟡 Medio | ✅ |
| 56.12 | `logging: false` en cliente OAuth (`qbAuth.ts`) — tokens ya no se vuelcan en logs | 🟡 Medio | ✅ |

### Webapp — `excellentia-webapp/` ✅

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| 56.13 | Login → backend pone `Set-Cookie: jwt=TOKEN; HttpOnly; Secure; SameSite=Strict` · Logout → `POST /api/auth/logout` borra cookie HttpOnly · Middleware auth lee cookie primero, luego Bearer (retrocompat Android) | 🔴 Crítico | ✅ |
| 56.14 | `app/lib/auth.ts` reescrito — `getUserInfo()` lee cookie `jwt_user` (no-HttpOnly, sólo info pública) · `apiFetch()` wrapper con `credentials:'include'` · `logout()` llama backend + limpia `jwt_user` · Eliminados `getToken()`, `decodeJwt()`, `Authorization: Bearer` de los 10+ archivos | 🔴 Crítico | ✅ |

### Deploy a producción ✅

| # | Tarea | Estado |
|---|---|---|
| 56.18 | Backend desplegado en cPanel — Node.js 20, npm install, variables de entorno configuradas | ✅ |
| 56.19 | Webapp (export estático) subida a cPanel y servida por Express en mismo dominio | ✅ |

### Organizacional 🔄

| # | Tarea | Estado |
|---|---|---|
| 56.15 | App Assessment Questionnaire de Intuit — revisado y corregido (ver respuestas abajo) | 🔄 |
| 56.16 | Permitir escaneo de vulnerabilidades de Intuit o proveer resultados de scan propio (< 1 año) | ⬜ |
| 56.17 | Cambiar `ENVIRONMENT=production` en cPanel (actualmente en `sandbox`) antes del go-live real | ⬜ |

#### Respuestas correctas del App Assessment Questionnaire

**General Questions (Accounting API)**
- Q1: Simple Start ✅
- Q2: Yes — *"Our app is version-agnostic. It only uses the Accounting API (Invoices and Items) which are available across all QuickBooks Online versions. We monitor API changes through the Intuit developer changelog and update accordingly."*
- Q3: Sales tax for US ✅ · Q4: No webhooks ✅ · Q5: No CDC ✅

**General Questions (primera tab)**
- Q1–Q6: No / No / Yes confirm / Yes / No / No ✅

**Authorization and Authentication**
- Q1–Q6: todos Yes ✅
- Q7 ¿Depende del OAuth playground? → **No** (la app tiene su propio flujo OAuth completo en `/api/qb/auth`)

**App Information**
- Q1: Built from scratch ✅
- Q2 Plataforma → **Web/SaaS + Mobile** (no "Desktop app")
- Q3: Reads + Writes ✅ · Q4: Private app ✅ · Q5: Only QBO admin ✅ · Q6: No ✅

**Security**
- Q1: No breach ✅ · Q2: Yes ✅ · Q3: Yes ✅ · Q4: No MFA ✅
- Q5 ¿Captcha? → **No**
- Q6 ¿WebSocket? → **No**
- Q7: No, data only for original customer ✅

---

## Fase 57: QBO Sync confiable + Paginación + Búsqueda server-side ✅

### Problemas resueltos

- QBO API limita a 1000 registros por query sin paginación explícita — antes del fix, productos > 1000 se perdían al sincronizar
- El patrón de sync parcial (50 productos por click) era porque el loop se rompía en un item problemático (datos inconsistentes de QBO) y el catch del for completo respondía 500
- No existían filtros server-side en la tabla de productos (búsqueda, categoría, estado de sync, stock)

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 57.1 | `paginatedQuery()` — función genérica que itera QBO con `MAXRESULTS 1000 STARTPOSITION N` hasta obtener todos los registros | `src/services/qbAuth.ts` | ✅ |
| 57.2 | `findAllItems()` y `findItemsUpdatedSince()` migrados de `makeQboApiCall` directo a `paginatedQuery` | `src/services/qbItems.ts` | ✅ |
| 57.3 | `syncProducts` — try-catch por item en vez de try-catch de todo el batch. Contadores `inserted`, `updated`, `skipped` en respuesta | `src/controllers/qbController.ts` | ✅ |
| 57.4 | `syncProductsFromQbo` — try-catch por item + logger en vez de catch general que abortaba todo | `src/services/syncEngine.ts` | ✅ |
| 57.5 | `INSERT ... ON DUPLICATE KEY UPDATE` en `sync_meta` — evita error 500 si no existe el row al iniciar sync | `src/controllers/qbController.ts` | ✅ |
| 57.6 | `listProducts` — filtros server-side: `search` (nombre/barcode), `category`, `qb` (synced/unsynced), `stock` (instock/outofstock/lowstock) | `src/controllers/productController.ts` | ✅ |
| 57.7 | `GET /api/products/categories` — devuelve categorías distintas de productos | `src/routes/products.ts` | ✅ |
| 57.8 | `listProducts` retorna `meta.totalPages` además de `page`, `limit`, `total` | `src/controllers/productController.ts` | ✅ |

### Frontend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 57.9 | `ProductsClient.tsx` autocontenido — maneja fetch, filtros, paginación, sync y refresh sin depender de `page.tsx` | `app/products/_components/ProductsClient.tsx` | ✅ |
| 57.10 | Búsqueda server-side con input de texto — resetea a página 1 al escribir (debounce 400ms) | `ProductsClient.tsx` | ✅ |
| 57.11 | Paginación server-side con números de página, botones prev/next, page size selector (10/25/50/100) | `ProductsClient.tsx` | ✅ |
| 57.12 | Botón Refresh (ícono recarga) visible para todos los roles — llama `loadProducts()` directamente | `ProductsClient.tsx` | ✅ |
| 57.13 | Sync QB nunca muestra errores al usuario — solo `console.warn` + notificación de éxito | `ProductsClient.tsx` | ✅ |
| 57.14 | `i18n.ts` — traducciones ES/EN para filtros (`prod_search`, `prod_category`, `prod_synced`, `prod_unsynced`, `prod_instock`, `prod_outofstock`, `prod_lowstock`, `prod_allCategories`, `prod_pagination`) | `app/lib/i18n.ts` | ✅ |
| 57.15 | `page.tsx` simplificado — solo importa y renderiza `ProductsClient` sin estado propio | `app/products/page.tsx` | ✅ |

### Key Decisions

- Try-catch por item en sync en vez de transacción: si un item de QBO tiene datos inconsistentes, se omite y el resto se procesa sin fallar
- Paginación QBO vía `paginatedQuery()` con loop `MAXRESULTS 1000 STARTPOSITION` en vez de URL params separados, para mantener consistencia con el formato actual de queries
- `router.refresh()` reemplazado por llamada directa a `loadProducts()` porque static export (Next.js output: 'export') no soporta re-fetch de server components
- Frontend calcula `totalPages` localmente si backend no lo retorna (`Math.ceil(total / limit)`), para no depender del deploy del backend

---

## Fase 58: Class por vendedor en invoices QBO 🔄

QBO Plus ya tiene Class Tracking activo (modo "una clase por línea"). Objetivo: que cada invoice creado desde la app muestre en la columna Class (Hidden) el vendedor que inició sesión. Esto **no depende del tier Silver de Intuit** — `ClassRef` es parte de la Accounting API estándar (a diferencia del campo nativo "Sales Rep", que sí requiere Custom Fields API / tier Silver, $300/mes — bloqueado, ver sección Pendiente).

### Backend ✅

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 58.1 | `findAllClasses()` — consulta `select * from Class` en QBO | `src/services/qbClasses.ts` (nuevo) | ✅ |
| 58.2 | `GET /api/qb/classes` (auth + adminOnly) — devuelve `[{id, name, active}]` | `qbController.ts` + `routes/quickbooks.ts` | ✅ |
| 58.3 | Columna `qb_class_id VARCHAR(50) NULL` en `users` | `schema.sql` + migración aplicada en MySQL local | ✅ |
| 58.4 | `register()` acepta y guarda `qb_class_id` al crear usuario | `authController.ts` | ✅ |
| 58.5 | `updateUser()` acepta y guarda `qb_class_id`; `listUsers()` lo incluye en el SELECT | `userController.ts` | ✅ |
| 58.6 | CORS soporta múltiples orígenes separados por coma (`ALLOWED_ORIGIN`) — fix necesario para dev local (webapp en :3001 cuando :3000 ya lo usa el backend) | `src/index.ts` | ✅ |

### Webapp ✅

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 58.7 | Selector "QBO Class (vendedor)" en formulario de crear usuario — carga opciones desde `GET /api/qb/classes` | `UsersClient.tsx` | ✅ |
| 58.8 | Mismo selector en el formulario de editar usuario, precargado con la Class actual | `UsersClient.tsx` | ✅ |
| 58.9 | Columna nueva en la tabla de usuarios — muestra el nombre de la Class asignada o "Unassigned" | `UsersClient.tsx` | ✅ |
| 58.10 | `UserRow` incluye `qb_class_id` | `app/users/page.tsx` | ✅ |
| 58.11 | Traducciones `usr_qbClass`, `usr_qbClassNone`, `usr_classesError` | `app/lib/i18n.ts` | ✅ |

### 🔴 Era lo MÁS URGENTE — el paso que realmente manda la Class al invoice ✅

Esto llena el campo **Class (Hidden)** dentro de QBO, en la pantalla/objeto de creación de Invoices — es un campo nativo de QBO (oculto por defecto en la vista de la transacción), no algo que se muestre en la webapp ni en Android. Se llena enviando `ClassRef` en cada línea del invoice vía la Accounting API al momento de crearlo.

Solo backend — no requiere tocar la app Android (`AndroidStudioProjects/test`): Gson ignora campos desconocidos en el JSON de login y el JWT se trata ahí como string opaco, nunca se decodifica en el cliente. Tampoco requiere cambios en la webapp.

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 58.12 | JWT incluye `qb_class_id` del usuario al hacer login (mismo patrón que `name`, Fase 20). `User` interface y `JwtUser` actualizados | `jwtService.ts` + `types/index.ts` | ✅ |
| 58.13 | `createBatch` lee `qb_class_id` del usuario logueado (`req.user`) y lo pasa a `createBatchInvoice` | `orderController.ts` | ✅ |
| 58.14 | `createBatchInvoice` / `createInvoice` aceptan `classId?: string \| null` y agregan `ClassRef: { value: classId }` dentro de `SalesItemLineDetail` de cada línea. Si no hay `classId`, se omite — no rompe el invoice | `src/services/qbInvoices.ts` | ✅ |
| 58.15 | **Propagado a los otros 3 flujos que también crean invoices** (no estaban en el alcance original pero usan la misma función): `createOrder` (pedido individual no-batch), `processPendingOrders` en `syncEngine.ts` (retry automático cada 5 min — requirió `LEFT JOIN users` para obtener `qb_class_id` del autor original del pedido), `convertPreOrder` en `preOrderController.ts` | `orderController.ts`, `syncEngine.ts`, `preOrderController.ts` | ✅ |

`npx/bunx tsc --noEmit` no muestra errores nuevos introducidos por estos cambios (los 7 errores preexistentes en `qbController.ts`/`qbAuth.ts`/`qbItems.ts`/`middleware/auth.ts` son de código no tocado en esta fase).

### Bloqueante operativo (no de código)

- El token OAuth de QBO sandbox local expiró (`invalid_grant`) — hay que reconectar en `http://localhost:3000/api/qb/auth` antes de poder probar el selector con datos reales o las próximas tareas (58.12-58.14).
- En producción (cPanel) falta correr la migración `ALTER TABLE users ADD COLUMN IF NOT EXISTS qb_class_id VARCHAR(50) NULL AFTER role;` y subir el build de backend + webapp.

### Key Decisions

- El vínculo usuario↔Class es por **Id**, no por nombre — el campo `name` del usuario no necesita coincidir con el nombre de la Class en QBO (aunque se recomienda para evitar confusión al revisar invoices).
- Las Classes se crean manualmente en QBO (Configuración → Todas las listas → Clases) — no vale la pena un endpoint de creación para un setup de una sola vez por vendedor.
- Si un usuario no tiene `qb_class_id` asignado, el invoice se crea igual sin `ClassRef` — nunca bloquea el flujo de venta.

---

## Fase 59: Fix crash en arranque — EncryptedSharedPreferences corrupta ✅

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 59.1 | App crasheaba al abrir (`RuntimeException: Unable to start activity LoginActivity` → `javax.crypto.AEADBadTagException` → `KeyStoreException: Signature/MAC verification failed`). Ocurría en `BaseActivity.attachBaseContext()` → `SecurePreferences.getLanguage()` → creación de `EncryptedSharedPreferences` | `SecurePreferences.kt` | ✅ |
| 59.2 | `createEncryptedPrefs()` ahora envuelve `EncryptedSharedPreferences.create()` en try/catch por `GeneralSecurityException`. Si falla, borra el archivo `secure_prefs` corrupto (`context.deleteSharedPreferences`) y reintenta una vez, creando el archivo desde cero | `SecurePreferences.kt` | ✅ |

**Causa raíz:** la clave AES en el Android Keystore que protege `secure_prefs` quedó inválida para el dispositivo (la operación de descifrado siempre falla con `VERIFICATION_FAILED`, código interno de Keystore -30), mientras que el archivo cifrado en disco seguía intacto. Pasa típicamente tras un restore de backup del sistema, cambio de firma de la app, o corrupción del Keystore tras una actualización de Android — el master key ya no puede descifrar el keyset de Tink que protege los valores guardados.

**Efecto secundario esperado:** al recrear el archivo se pierde el JWT/refreshToken/backend URL/etc. guardados localmente — el usuario debe volver a iniciar sesión una vez. No hay forma de recuperar esos datos si la clave del Keystore está corrupta; la app simplemente ya no crashea en el arranque.

---

## Fase 60: Campo UNIT en productos (Lbs / Unit / Bucket / Case) ✅

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 60.1 | `ALTER TABLE products ADD COLUMN unit VARCHAR(20) DEFAULT NULL AFTER stock` — columna para almacenar la unidad de medida del producto (Lbs, Unit, Bucket, Case). Default NULL hasta que se asigne manualmente | MySQL (producción) | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 60.2 | Interfaz `Product` — agregado campo `unit: string \| null` | `src/types/index.ts` | ✅ |
| 60.3 | `createProduct` — recibe `unit` del body y lo guarda en INSERT | `src/controllers/productController.ts` | ✅ |
| 60.4 | `updateProduct` — recibe `unit` del body y lo incluye en UPDATE dinámico | `src/controllers/productController.ts` | ✅ |
| 60.5 | DDL tabla `products` — agregado `unit VARCHAR(20) DEFAULT NULL` | `src/db/schema.sql` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 60.6 | Interfaz `Product` en frontend — agregado `unit: string \| null` | `app/products/page.tsx` | ✅ |
| 60.7 | Modal de producto — select desplegable con Lbs / Unit / Bucket / Case | `ProductModal.tsx` | ✅ |
| 60.8 | Traducciones ES/EN para campo `unit` | `app/lib/i18n.ts` | ✅ |

### SQL

```sql
ALTER TABLE products ADD COLUMN unit VARCHAR(20) DEFAULT NULL AFTER stock;
```

---

## Fase 61: Campo QTY (unidades por empaque) + Simulador de Factura ✅

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 61.1 | `ALTER TABLE products ADD COLUMN qty INT NOT NULL DEFAULT 0 AFTER weight_per_unit` — unidades por empaque (e.g., 6 yogurts per Case). Default 0. | `src/db/schema.sql`, `excellentia_schema.sql` | ✅ |
| 61.2 | Misma columna en CREATE TABLE de setup | `src/routes/setup.ts` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 61.3 | Interfaz `Product` — agregado `qty: number` | `src/types/index.ts` | ✅ |
| 61.4 | `createProduct` — recibe `qty` del body y lo incluye en INSERT | `src/controllers/productController.ts` | ✅ |
| 61.5 | `updateProduct` — recibe `qty` del body y lo incluye en UPDATE dinámico | `src/controllers/productController.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 61.6 | Interfaz `Product` — agregado `qty: number` | `app/products/page.tsx` | ✅ |
| 61.7 | Columna QTY fija en tabla de productos (muestra `product.qty`) | `ProductRow.tsx` | ✅ |
| 61.8 | Input `qty` en modal de edición de producto | `ProductModal.tsx` | ✅ |
| 61.9 | **Modo Factura** — botón toggle que activa inputs editables de QTY y Rate en cada fila, columna Amount calculada (QTY × Rate), step dinámico según UNIT (Lbs=0.01, otros=1) | `ProductsClient.tsx`, `ProductRow.tsx` | ✅ |
| 61.10 | Barra azul de resumen — muestra cantidad de items y total $ en modo factura | `ProductsClient.tsx` | ✅ |
| 61.11 | Traducciones ES/EN para `qty`, `rate`, `amount`, modo factura | `app/lib/i18n.ts` | ✅ |

### SQL

```sql
ALTER TABLE products ADD COLUMN qty INT NOT NULL DEFAULT 0 AFTER weight_per_unit;
```

---

## Fase 62: Case QTY (unidades por caja) en Android ✅

### Concepto
No se agregó columna nueva — `qty` (decimal(10,2)) ya almacena las unidades por caja. El código Android infiere `caseQty` desde `product.qty` como fallback cuando `unit = "Case"`.

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 62.1 | `ProductDetailActivity` — nuevo modo **Case**: `isCaseBased` cuando `unit == "Case"`. Prioridad: Case → Weight → Count | `ProductDetailActivity.kt` | ✅ |
| 62.2 | Display: `"$X.XX / Case"` en precio, breakdown `"N case(s) = N×M units"` en subtítulo | `ProductDetailActivity.kt` | ✅ |
| 62.3 | Cálculo: `baseTotal = productPrice × caseQty` (precio por caja). Total = `cases × casePrice`. `caseQty` se infiere de `product.qty` (intent `QUANTITY`) como fallback | `ProductDetailActivity.kt` | ✅ |
| 62.4 | `MainActivity`/`CreatePreOrderActivity` — pasan `CASE_QTY` en intents (0 cuando no disponible, fallback usa `qty`) | `MainActivity.kt`, `CreatePreOrderActivity.kt` | ✅ |

### SQL (aplicar solo si hay registros sin `qty` en productos Case)

```sql
-- Verificar que los productos Case tengan qty correcto:
SELECT name, unit, qty FROM products WHERE unit = 'Case' ORDER BY name;
-- Si algún Case tiene qty = 0 o NULL, actualizar:
UPDATE products SET qty = 8 WHERE unit = 'Case' AND name LIKE '%Lala%' AND (qty IS NULL OR qty = 0);
```

---

## Fase 63: Estabilidad de carrito, impresión y migraciones (Android) ✅

### Contexto
El usuario reportó que el carrito (productos escaneados, sin finalizar) desaparecía al cerrar la app y reabrirla. La causa real no era falta de persistencia (`pending_orders` ya vive en SQLite) sino que `SyncWorker` trataba esa misma tabla como una cola de reintento legacy y la vaciaba sola en segundo plano.

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 63.1 | `SyncWorker` — eliminado el paso que reenviaba cada fila de `pending_orders` (el carrito actual) individualmente vía el endpoint legacy `createOrder()` y la borraba al tener éxito. Corría cada 15 min o al recuperar conexión, **incluso con la app cerrada**, vaciando pedidos que el usuario todavía no había finalizado (sin cliente, sin firma, sin batch). Ahora solo se sincronizan `pending_batches` (pedidos ya finalizados que no llegaron a enviarse por falta de red) | `data/sync/SyncWorker.kt` | ✅ |
| 63.2 | `AppDatabase.onUpgrade` — el bloque `oldVersion < 3` (recrea `pending_orders` con el esquema base) corría *después* de los `ALTER TABLE` que le agregaban `customer_id`/`customer_name`/`unit` (`oldVersion < 4` y `< 8`). Un dispositivo actualizando desde una versión muy vieja directo a la actual podía crashear la migración completa (columnas desparejadas en `INSERT INTO ... SELECT *`). Reordenado para que la recreación corra primero | `data/local/AppDatabase.kt` | ✅ |
| 63.3 | `PrintService` — la dirección del cliente en el ticket impreso se partía en la primera coma y cada mitad se truncaba con `.take(32)` en vez de hacer salto de línea; direcciones largas quedaban cortadas sin aviso. Reemplazado por el mismo `wrapText(28)` que ya usa el resto del ticket | `data/print/PrintService.kt` | ✅ |
| 63.4 | Corregido typo `caseQtyrevisa` → `caseQty` que rompía la compilación (encontrado sin commitear en el working tree) | `ProductDetailActivity.kt` | ✅ |

### SQL
Ninguno — todos los cambios son de código Android (Kotlin), sin impacto en MySQL.

---

## Fase 64: Reintento manual de envío a QuickBooks (retry batch) ✅

### Contexto
En Historial no había forma de ver por qué un pedido quedaba en PENDING/FAILED ni de reintentar el envío a QBO manualmente — solo se podía esperar al `SyncEngine` automático (cada 5 min) o hacer otro pedido nuevo.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 64.1 | `POST /api/orders/batch/:batchId/retry` — reintenta el envío a QBO de los items PENDING/FAILED de un batch. A diferencia de `forceSync` (admin-only, solo re-encola para el SyncEngine), este está disponible para el operador dueño del batch e intenta la factura al instante (mismo `createBatchInvoice` que la creación normal) | `src/controllers/orderController.ts` (`retryBatchSync`), `src/routes/orders.ts` | ✅ |
| 64.2 | Si algún item no tiene `qb_item_id`, se marca `FAILED` con motivo explícito sin bloquear el resto del batch | `orderController.ts` | ✅ |
| 64.3 | `extractQboErrorMessage()` — la librería `intuit-oauth` solo expone en `.message` el texto genérico de QBO ("A business validation error has occurred..."); el motivo real vive en `.description`/`.fault.errors[0].detail`, que se descartaba. Ahora se combina `mensaje — detalle` tanto en `retryBatchSync` como al guardar `error_log` | `orderController.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 64.4 | `ApiService.retryBatchSync` + modelo `RetryBatchResponse` + `ApiErrorBody` (parseo del mensaje de error del backend) | `data/network/ApiService.kt`, `data/Models.kt` | ✅ |
| 64.5 | `OrderRepository.retryBatchSync(batchId)` | `data/repository/OrderRepository.kt` | ✅ |
| 64.6 | Botón **"Resend to QuickBooks"** en `TicketDetailActivity`, junto a "Reprint ticket" — visible solo si el batch no está `SENT`. Éxito → actualiza el ticket en pantalla al instante (estado, invoice #); error → **modal** con botón "Got it" (no Snackbar) | `TicketDetailActivity.kt`, `activity_ticket_detail.xml`, `ic_sync.xml` | ✅ |

### SQL
Ninguno — no se agregaron columnas en esta fase.

### Nota — causa raíz de "PENDING" en casos reales
Durante las pruebas se identificaron dos causas de fondo, documentadas pero **no resueltas** (requieren decisión de negocio, no son bugs de código):
1. **Productos sin barcode**: `orders.barcode = products.barcode` es un JOIN por igualdad de string. Si el producto no tiene barcode (`NULL`), el JOIN nunca matchea — ni con el retry ni con el SyncEngine — sin importar que el producto sí tenga `qb_item_id`. Origen: `syncProductsFromQbo` (sync automático, `syncEngine.ts`) inserta productos nuevos con `barcode = NULL` a secas, a diferencia del sync manual (`qbController.ts`) que sí usa `item.Sku || 'QBO-{id}'` como fallback.
2. **Reintentar el mismo pedido tras corregir el barcode**: no alcanza con ponerle barcode al producto — hay que actualizar también `orders.barcode` de esa orden puntual para que coincida, porque quedó grabado con el valor del momento del escaneo (ej. `"unknown"`, el placeholder que usa Android cuando el producto no tiene barcode).

---

## Fase 65: Estado Active/Inactive de QuickBooks en productos + filtrado de productos ocultos ✅

### Contexto
Un producto puede estar **inactivo dentro de QuickBooks mismo** (distinto del campo `hidden` local) — QBO rechaza la factura con "Business validation error: you need to activate this item before updating the quantity" si se intenta facturar un item inactivo. No había forma de saber esto desde la app antes de intentar el envío. Además, la app Android mostraba productos ocultos/inactivos desde un cache local que nunca se limpiaba.

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 65.1 | `ALTER TABLE products ADD COLUMN qb_active TINYINT(1) NULL DEFAULT NULL AFTER qb_item_id` — `NULL` = nunca sincronizado desde que existe la columna (no bloquea nada); `1`/`0` = estado real conocido desde el último sync | MySQL (vía `/api/setup` o SQL manual) | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 65.2 | `qbItems.ts` — las consultas a QBO (`findAllItems`, `findItemsUpdatedSince`) agregan `Active IN (true, false)`. Sin esto, QBO **excluye los items inactivos por defecto** de los resultados — nunca nos enterábamos de una desactivación | `src/services/qbItems.ts` | ✅ |
| 65.3 | `syncProducts` (botón manual "Sincronizar QB") y `syncProductsFromQbo` (automático, cada 5 min en `syncEngine.ts`) — ambos capturan `item.Active` y lo guardan en `qb_active` en INSERT y UPDATE | `src/controllers/qbController.ts`, `src/services/syncEngine.ts` | ✅ |
| 65.4 | `retryBatchSync` y `processPendingOrders` (SyncEngine) — detectan `qb_active = 0` **antes** de llamar a QBO y marcan `FAILED` con mensaje claro ("Item inactivo en QuickBooks — hay que reactivarlo...") en vez de esperar el rechazo genérico | `orderController.ts`, `syncEngine.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 65.5 | `Product.qb_active` agregado a la interfaz | `app/products/page.tsx` | ✅ |
| 65.6 | Badge QB en la tabla — 3 estados: sin vincular (gris "—"), vinculado e inactivo (rojo "QB inactivo"), vinculado y activo (verde "QB") | `ProductRow.tsx` | ✅ |
| 65.7 | Mismo criterio en el modal de edición, con mensaje explicativo | `ProductModal.tsx` | ✅ |
| 65.8 | Traducciones ES/EN (`prod_qbInactive`, `modal_qbInactive`) | `app/lib/i18n.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 65.9 | `ProductRepository.findByBarcode` — distinguía mal un 404 real (producto oculto/inexistente) de un error de red: en ambos casos caía al cache local viejo, sirviendo productos ya ocultos aunque el backend respondiera 404 fresco. Ahora un 404 limpio no cae al cache (y lo borra si estaba ahí); solo errores de red/servidor usan el cache como respaldo | `data/repository/ProductRepository.kt` | ✅ |
| 65.10 | `OrderRepository.prefetchAllProducts` — el pre-caché offline se cortaba en los primeros 500 productos y nunca podaba productos que dejaban de venir (ocultados después). Ahora pagina el catálogo completo y, si termina sin errores, borra del cache local cualquier producto no tocado en ese barrido | `data/repository/OrderRepository.kt` | ✅ |
| 65.11 | `cached_products` (SQLite local, v10→v11) — nuevas columnas `qb_item_id`/`qb_active`, migradas con `ALTER TABLE ... ADD COLUMN` | `data/local/AppDatabase.kt`, `data/local/dao/ProductDao.kt`, `data/local/entities/CachedProductEntity.kt` | ✅ |
| 65.12 | `qbItemId`/`qbActive` enhebrados desde la API hasta `ProductDetailActivity`, pasando por el cache offline (online y offline se comportan igual) | `data/Models.kt`, `ProductRepository.kt`, `OrderRepository.kt`, `MainActivity.kt` (`SuggestionItem` + 5 sitios de construcción + `openDetail`/`openSuggestion`) | ✅ |
| 65.13 | `ProductDetailActivity` — botón "Agregar al pedido" deshabilitado (mismo patrón visual que "sin stock") cuando el producto no está vinculado a QBO o está inactivo ahí, con mensaje distinto para cada caso. **No aplica en modo pre-orden** (son borradores; el vínculo a QBO solo importa al convertir) | `ProductDetailActivity.kt`, `activity_product_detail.xml` | ✅ |

### SQL

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS qb_active TINYINT(1) NULL DEFAULT NULL AFTER qb_item_id;
```

### Pendiente relacionado (no resuelto en esta fase)
- `syncProductsFromQbo` (automático) sigue insertando productos nuevos con `barcode = NULL` — inconsistente con el sync manual, que usa `item.Sku || 'QBO-{id}'`. Deja productos sin barcode que nunca pueden facturarse (ver nota en Fase 64).
- El link `orders.barcode = products.barcode` es frágil por diseño (string equality) — un arreglo de fondo sería vincular por `product_id` en vez de barcode. Discutido, no implementado.

---

## Fase 66: Ocultar productos inactivos/borrados en QBO (webapp + Android) ✅

### Contexto
Tras la Fase 65, el sync trae también los items marcados "(Deleted)"/inactivos en QBO (`qb_active = 0`) — pero seguían apareciendo en la lista de productos de la webapp y en las búsquedas de la app Android (con el botón de agregar deshabilitado, per Fase 65). El usuario pidió que directamente **no se muestren en ningún lado**, ni webapp ni Android.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 66.1 | `listProducts` — agregada condición `(qb_active IS NULL OR qb_active = 1)` junto a `hidden = 0`. `NULL` (nunca sincronizado desde que existe el campo) no se excluye | `src/controllers/productController.ts` | ✅ |
| 66.2 | `getProductByBarcode` — misma condición. Ahora un producto con `qb_active = 0` da 404, igual que uno oculto | `productController.ts` | ✅ |
| 66.3 | `listCategories` — misma condición, para que categorías con solo productos inactivos no aparezcan como filtro | `productController.ts` | ✅ |

### Efecto en cascada (sin cambios de código adicionales)
- **Webapp**: como `listProducts` ya no los devuelve, desaparecen solos de la tabla. El badge rojo "QB inactivo" (Fase 65) queda como código defensivo sin uso activo — no se rompe nada si en algún momento sí llega uno (ej. lag de cache).
- **Android**: mismo efecto — `searchProducts`/`getAllProducts`/`getProductByBarcode` ya no los traen. Los fixes de la Fase 65 (`ProductRepository.findByBarcode` purga el cache en 404, `prefetchAllProducts` poda lo que no vuelve a aparecer en el barrido) hacen que además se limpien solos del cache offline en el próximo sync exitoso. El gating del botón "Agregar al pedido" (Fase 65) también queda como respaldo defensivo para la ventana entre que un producto se desactiva en QBO y el próximo sync/pruning.

### SQL
Ninguno — cambios solo en las consultas `SELECT`, no en el esquema.

### Bug encontrado y arreglado — `qb_active` rompía toda búsqueda/detalle en Android
`mysql2` devuelve `TINYINT(1)` como `number` (`0`/`1`), no como `boolean`. Android (`ProductDto.qbActive: Boolean?`, parseado con Gson estricto) tiraba excepción al recibir un número donde esperaba `true`/`false` — como esa excepción quedaba atrapada en un `try/catch` silencioso, rompía **toda la respuesta**, no solo el campo: la búsqueda por nombre no devolvía nada, y el detalle de producto caía al cache local viejo (por eso siempre mostraba "Not linked to QuickBooks" aunque el producto sí estuviera vinculado).

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 66.4 | `normalizeQbActive()` — convierte `qb_active` a booleano real (`true`/`false`/`null`) antes de responder, en vez de dejar pasar el número crudo de MySQL | `productController.ts` (`listProducts`, `getProductByBarcode`) | ✅ |

---

## Fase 67: Barcode obligatorio para agregar al pedido (Android) ✅

### Contexto
El matching `orders.barcode = products.barcode` (retry a QBO, SyncEngine) es la razón de fondo por la que un pedido puede quedar PENDING para siempre (ver Fase 64) — un producto sin barcode nunca puede facturarse, sin importar su `qb_item_id`/`qb_active`. Se agregó una validación proactiva en la app para bloquear el problema en el origen, en vez de descubrirlo después con el pedido ya hecho.

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 67.1 | `ProductDetailActivity` — si el producto no tiene barcode real (`barcode` vacío o `"unknown"`, el placeholder que usan `MainActivity`/`CreatePreOrderActivity` cuando no hay barcode), el botón "Agregar al pedido" se deshabilita con mensaje "No barcode assigned" — mismo patrón visual que "sin stock"/"no vinculado a QBO". **Bloquea en cualquier modo, incluido pre-orden** (a diferencia del gating de `qb_active`/`qb_item_id`, que no aplica en pre-orden) — es un problema estructural, no un estado transitorio de QBO que se pueda resolver antes de convertir | `ProductDetailActivity.kt` | ✅ |
| 67.2 | Strings `label_no_barcode`, `btn_no_barcode` | `strings.xml` | ✅ |

### SQL
Ninguno.

---

## Fase 68: Ticket agrupado por categoría (LBS / CASE / UNIT / BUCKET) ✅

### Contexto
El renglón de detalle de cada ítem en el ticket (impreso y "Ver ticket" en pantalla) usaba el mismo formato decimal para todo tipo de unidad — un producto por Case mostraba `"1.00 Case x $56.00/Case"`, con decimales que no tienen sentido para algo que se vende en cajas/unidades enteras. Tampoco había ninguna separación visual entre productos por peso, por caja o por unidad cuando un pedido mezclaba tipos.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 68.1 | `ticketCategoryFor()`, `isWeightTicketCategory()`, `byTicketCategory()` — helpers compartidos que agrupan `GroupedTicketItem` por categoría (LBS, CASE, UNIT, BUCKET, u otro valor de `unit` en mayúsculas), en ese orden fijo | `data/Models.kt` | ✅ |
| 68.2 | Renglón de detalle: **LBS** mantiene el formato con decimales (`"22.80 lb x $0.18/lb"`); **CASE/UNIT/BUCKET** usa cantidad entera con guion (`"1 - Case x $56.00"`, `"3 - Unit x $12.00"`) | `PrintService.buildCpcl()`, `TicketDetailActivity.buildReceipt()` | ✅ |
| 68.3 | Encabezado de categoría (ej. `"CASE"`) antes de cada grupo — **solo se muestra si el pedido mezcla más de un tipo de unidad**; un ticket con un solo tipo queda igual que antes, sin encabezados de más | `PrintService.buildCpcl()`, `TicketDetailActivity.buildReceipt()` | ✅ |
| 68.4 | Línea de cantidad total al pie: con una sola categoría sigue sumando cantidad + unidad (`"22.80 lb total"`); mezclando categorías (no tiene sentido sumar lb + case + unit) muestra cantidad de productos en su lugar (`"3 items total"`) | `PrintService.buildCpcl()`, `TicketDetailActivity.buildReceipt()` | ✅ |

### SQL
Ninguno.

---

## Fase 69: Desglose de unidades por caja en el ticket ✅

### Contexto
Una caja puede traer 1 artículo o varios (ej. "Case of 8"), y el ticket no distinguía — mostraba `"1 - Case x $56.00"` sin decir cuántas unidades hay adentro. Ese dato (`products.qty` cuando `unit = "Case"`) nunca se guardaba con el pedido: se calculaba en `ProductDetailActivity` al escanear y se descartaba después. Al investigar se encontró que **`orders` tampoco guardaba `unit`** — el ticket recién impreso funcionaba porque usa los datos locales del carrito, pero reimprimir un pedido viejo desde Historial perdía el tipo de unidad (y por lo tanto el agrupamiento de la Fase 68) porque el backend nunca la devolvía. Se arregló todo junto.

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 69.1 | `ALTER TABLE orders ADD COLUMN unit VARCHAR(20) NULL` | MySQL (vía `/api/setup` o SQL manual) | ✅ |
| 69.2 | `ALTER TABLE orders ADD COLUMN case_qty INT NULL` | MySQL (vía `/api/setup` o SQL manual) | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 69.3 | `createBatch` — ahora guarda `unit`/`case_qty` de cada item (antes se recibían y se ignoraban) | `orderController.ts` | ✅ |
| 69.4 | `listOrders` — agregadas `o.unit, o.case_qty` al `SELECT` explícito (antes faltaban, así que `OrderDto.unit` siempre volvía `null` en reimpresiones/historial) | `orderController.ts` | ✅ |
| 69.5 | `Order` (tipo TS) — agregados `unit`, `case_qty` | `types/index.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 69.6 | `BatchItem`, `OrderDto`, `GroupedTicketItem` — agregado `caseQty: Int?` (`case_qty`). `PendingOrderEntity` + `pending_orders` (SQLite v11→v12) también, para que el carrito local lo retenga | `data/Models.kt`, `data/local/entities/PendingOrderEntity.kt`, `data/local/AppDatabase.kt`, `data/local/dao/OrderDao.kt` | ✅ |
| 69.7 | `ProductDetailActivity` → `OrderRepository.savePendingOrder()` → `CurrentOrderActivity` (batch + preview) — hilvanado extremo a extremo desde el escaneo hasta el ticket | `ProductDetailActivity.kt`, `OrderRepository.kt`, `CurrentOrderActivity.kt` | ✅ |
| 69.8 | Renglón CASE con desglose: `"N - Case of Q x $XX.XX"` (Q = unidades por caja) cuando `caseQty` está disponible; sin el dato, cae al formato simple de la Fase 68 (`"N - Case x $XX.XX"`) — no rompe pedidos viejos sin este campo | `PrintService.buildCpcl()`, `TicketDetailActivity.buildReceipt()` | ✅ |

### Pendiente relacionado (no resuelto en esta fase)
- **Pre-órdenes**: `PreOrderItem` no tiene `caseQty` — un pedido convertido desde una pre-orden imprime el ticket sin el desglose "of Q" (cae al formato simple, no rompe nada, pero no muestra el detalle). No se extendió el pipeline de pre-órdenes en esta fase.

### SQL

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS case_qty INT NULL;
```

---

## Fase 70: Agrupar re-escaneos del mismo producto en el carrito ✅

### Contexto
Escanear el mismo producto dos veces en visitas separadas a `ProductDetailActivity` (ej. cantidad 2, después cantidad 1) creaba dos filas separadas en el carrito (`CurrentOrderActivity`) en vez de sumarse en una — `CurrentOrderActivity` nunca agrupó a propósito (cada escaneo editable individualmente), pero el usuario quería que el mismo producto no apareciera duplicado, sin perder la posibilidad de editarlo.

### Decisión de diseño (confirmada con el usuario)
Se agrupan **Case y Unit** (cantidades enteras — "2 Case" + "1 Case" = "3 Case" en una sola fila). Los productos **por peso NO se agrupan** — cada unidad pesada individualmente sigue quedando en su propia fila editable, para no mezclar el peso de artículos físicos distintos en un solo número (esto además es coherente con la mejora pendiente "Almacenar pesos individuales").

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 70.1 | `OrderDao.findActiveByBarcodeAndPrice(barcode, price)` — busca una fila activa (no fallida) del mismo producto **y mismo precio** en el carrito. El precio se incluye a propósito en el match: si cambió entre un escaneo y otro, no se mezclan en la misma fila | `data/local/dao/OrderDao.kt` | ✅ |
| 70.2 | `OrderRepository.savePendingOrder(..., merge: Boolean = true)` — con `merge=true` (default), si existe una fila activa que matchea, suma la cantidad ahí en vez de insertar una fila nueva | `data/repository/OrderRepository.kt` | ✅ |
| 70.3 | `ProductDetailActivity.saveOrder()` — el loop de productos por peso pasa `merge = false` explícitamente (preserva una fila por unidad pesada); Case y el modo de cantidad simple usan el default (`merge = true`) | `ProductDetailActivity.kt` | ✅ |

### SQL
Ninguno.

---

## Fase 71: Editar ítem del carrito reabriendo ProductDetailActivity ✅

### Contexto
El botón "editar" en `CurrentOrderActivity` abría un diálogo genérico (`dialog_edit_order.xml`) con dos campos: "Cantidad total (lb)" y "Precio/lb" — hablaba de libras aunque el producto fuera Case, Unit o Bucket. El usuario pidió que editar reabra la misma pantalla que se usa al escanear/agregar (`ProductDetailActivity`), para que la edición respete el modo real del producto.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 71.1 | `ProductDetailActivity` — nuevo modo edición vía extra `EDIT_ORDER_ID`: precarga cantidad existente (`resetCount()` ya no reinicia a 1 para Case cuando se está editando), botón pasa a decir "Save changes", y `saveOrder()` llama `orderRepository.updatePendingOrder(id, price, quantity)` sobre la fila existente en vez de insertar/mezclar una nueva | `ProductDetailActivity.kt` | ✅ |
| 71.2 | Productos por peso en edición: el stepper superior (+/-, que agrega/quita unidades enteras) se deshabilita — la fila representa una sola unidad ya pesada, se ajusta con los controles finos ±0.1 o tocando el número, no agregando más unidades | `ProductDetailActivity.kt` | ✅ |
| 71.3 | El chequeo de "vinculado a QBO" (Fase 65) se salta en modo edición — `CurrentOrderActivity.editItem()` no manda `QB_ITEM_ID`/`QB_ACTIVE` (no se guardan en `pending_orders`) y el ítem ya pasó esa validación al agregarse la primera vez; sin este ajuste el botón "Save changes" quedaba siempre bloqueado por error. El chequeo de barcode obligatorio (Fase 67) sí se mantiene activo — el barcode viaja completo en cualquier caso | `ProductDetailActivity.kt` | ✅ |
| 71.4 | `CurrentOrderActivity.editItem()` reemplaza al diálogo — arma el intent con los datos de la fila (`PRODUCT_PRICE` como precio **por unidad**: para Case se reconstruye dividiendo `order.price / caseQty`, así `ProductDetailActivity` puede volver a multiplicar con su lógica normal sin casos especiales) | `CurrentOrderActivity.kt` | ✅ |
| 71.5 | Eliminado el diálogo genérico y su layout (`dialog_edit_order.xml`, `showEditDialog()`) — sin más referencias | `CurrentOrderActivity.kt` | ✅ |

### SQL
Ninguno.

---

## Fase 72: Disclaimer con saltos de línea rotos al imprimir ✅

### Contexto
El disclaimer que se guarda en la webapp (`/settings`) tiene un Enter (salto de línea real) entre cada punto numerado — "(1)...", "(2)...", etc. Al imprimir el ticket físico, el texto después del primer salto de línea se perdía/rompía; en la vista "Ver ticket" en pantalla se veía bien porque ahí es un `TextView` normal, que sí entiende saltos de línea.

### Causa
`wrapText()` (`PrintService.kt`) parte el texto en líneas dividiendo únicamente por espacios — nunca por saltos de línea. Una "palabra" como `"contrato.\n(2)"` (fin de una oración + salto de línea + inicio del siguiente punto, sin espacio entre medio) quedaba pegada como un solo token con un carácter de salto de línea crudo adentro. El comando CPCL `T` que imprime cada línea es de una sola línea de texto — ese salto de línea crudo en medio del comando lo rompía al mandarlo a la impresora.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 72.1 | `wrapText()` — ahora parte primero por `\n` (párrafos) y recién dentro de cada uno divide por palabras, así ningún "word" arrastra un salto de línea crudo. Un párrafo en blanco (`\n\n` seguido) genera una línea vacía en el ticket para conservar el espaciado entre puntos | `data/print/PrintService.kt` | ✅ |

### SQL
Ninguno.

---

## Fase 73: Fix — edición de productos por peso (Fase 71) ✅

### Contexto
La Fase 71 (editar reabriendo `ProductDetailActivity`) se pasó de restrictiva con productos por peso: deshabilitaba el stepper +/- superior asumiendo que cada fila era siempre "una unidad físicamente pesada" — pero varios productos del catálogo no tienen `unit` asignado (caen en peso por default) sin ser realmente pesados a mano, y el usuario no podía incrementar la cantidad al editarlos. También se veía "2.00" en vez de "2" cuando la cantidad era un número entero.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 73.1 | Se sacó el bloqueo del stepper +/- en modo edición para productos por peso — vuelve a funcionar igual que al agregar | `ProductDetailActivity.kt` | ✅ |
| 73.2 | `saveOrder()` en modo edición para peso: ahora suma **todos** los valores de `weights` (por si se usó el stepper durante la edición) en vez de tomar solo el primero — antes se perdían silenciosamente unidades agregadas mientras se editaba | `ProductDetailActivity.kt` | ✅ |
| 73.3 | `formatQty()` — nuevo helper que muestra cantidades sin decimales de sobra ("2" en vez de "2.00"), conservando la precisión real cuando sí hay parte fraccionaria ("6.5"). Aplicado a los labels de cantidad/peso en `ProductDetailActivity` (no afecta el ticket, que mantiene 2 decimales siempre por convención de recibo) | `ProductDetailActivity.kt`, `strings.xml` (`label_weight_display` pasó de `%.2f` a `%s`) | ✅ |
| 73.4 | **Fix crash** — `values-es/strings.xml` tenía su propia copia de `label_weight_display` con el formato viejo (`"Peso: %.2f lb"`), nunca actualizada junto con la de `values/`. En dispositivo en español, Android usa esa versión — `getString(id, formatQty(...))` le pasaba un `String` a un placeholder `%.2f` (espera número) → `IllegalFormatConversionException`, crash inmediato al abrir `ProductDetailActivity` en modo edición para cualquier producto por peso. Sincronizada con `%s` | `values-es/strings.xml` | ✅ |

### SQL
Ninguno.

---

## Fase 74: Cantidad de unidades pesadas en el renglón LBS del ticket ✅

### Contexto
En el ticket, un renglón LBS solo mostraba el peso total agrupado (ej. "2.00 lb x $6.50/lb" para 2 chicharrones pesados por separado), sin decir cuántas unidades físicas se combinaron en ese peso — a diferencia de Case, que sí muestra la cantidad ("N - Case x $XX.XX").

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 74.1 | `GroupedTicketItem.count` — cuenta cuántas filas (escaneos/pesadas individuales) se combinaron en una línea agrupada del ticket. Se incrementa en `groupedForTicket()` cada vez que una fila nueva se suma a un grupo existente por barcode | `data/Models.kt` | ✅ |
| 74.2 | Renglón LBS: `"N - X.XX lb x $X.XX/lb"` (antes `"X.XX lb x $X.XX/lb"`, sin decir cuántas unidades) — mismo criterio que Case, siempre muestra el conteo aunque sea 1 | `PrintService.buildCpcl()`, `TicketDetailActivity.buildReceipt()` | ✅ |

### SQL
Ninguno.

---

## Fase 75: Créditos por daño — Subtotal / Créditos / Total (app + backend + webapp) ✅

### Contexto
El flujo de "artículos dañados" (modal ya existente en `CurrentOrderActivity`) solo producía texto descriptivo — "Negative Sale Summary" en el ticket y un `CustomerMemo` en QBO — sin ningún cálculo de dinero real en ningún lado. Se agregó un crédito en dólares de verdad: aparece en el ticket como `Subtotal / Créditos / Total`, reduce el total real de la factura de QuickBooks con una línea negativa, y queda auditado en una tabla nueva. No se agregó ningún botón/UI nuevo — se reusa el modal de daño existente, que ya elige productos + cantidad de la orden actual.

### Regla de cálculo (autoritativa, backend, al crear el batch)
- **Case**: `unitValue = products.price` (ya es el precio por unidad individual dentro de la caja).
- **Lbs / sin unit**: `unitValue = products.price * (products.weight_per_unit || 1.0)`.
- **Unit / Bucket**: `unitValue = products.price` directo.
- `amount = unitValue * qty`. Se calcula una sola vez al crear el batch (nunca se confía en un precio del cliente); los reintentos reusan el `amount` ya guardado, no lo recalculan.

### DB

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 75.1 | `ALTER TABLE batch_damage ADD COLUMN unit_price DECIMAL(10,2) NULL, ADD COLUMN amount DECIMAL(10,2) NULL` — detalle de crédito por línea, para reconstruir el ticket en cualquier reimpresión | MySQL (vía `/api/setup` o SQL manual) | ✅ |
| 75.2 | `CREATE TABLE customer_credits (id, customer_id, customer_name, batch_id, amount, created_at)` — ledger de auditoría, una fila por batch con crédito. Base para reportes/saldo futuro; el crédito de esta fase siempre se aplica de inmediato al mismo batch que lo generó | MySQL (vía `/api/setup` o SQL manual) | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 75.3 | `computeDamageCredit()` — calcula el crédito por línea consultando `products` fresco, según la regla de arriba | `src/services/creditCalculator.ts` (nuevo) | ✅ |
| 75.4 | `createBatchInvoice()` — nuevo parámetro `creditAmount`; si es > 0 y `QB_CREDIT_ITEM_ID` está configurado, agrega una línea negativa real (`SalesItemLineDetail`, `Amount: -creditAmount`) a la factura — no solo el memo de texto. Sin la env var configurada, sigue funcionando igual que antes (memo únicamente), con un warning logueado | `src/services/qbInvoices.ts` | ✅ |
| 75.5 | `createBatch()` — calcula el crédito, guarda `unit_price`/`amount` por línea en `batch_damage`, inserta en `customer_credits`, pasa `creditsTotal` a `createBatchInvoice`, lo devuelve en la respuesta JSON | `src/controllers/orderController.ts` | ✅ |
| 75.6 | `retryBatchSync()` — trae `unit_price`/`amount` ya guardados de `batch_damage` y los reusa (no recalcula) | `src/controllers/orderController.ts` | ✅ |
| 75.7 | `getBatchDamage()` (`GET /api/orders/damage/:batchId`) — el SELECT ahora incluye `unit_price`/`amount`. Un solo cambio arregla las reimpresiones tanto en Android como en la webapp, porque ambos leen de este mismo endpoint | `src/controllers/orderController.ts` | ✅ |
| 75.8 | `convertPreOrder()` — mismo patrón que `createBatch`: calcula, guarda, pasa a `createBatchInvoice`, devuelve `creditsTotal` | `src/controllers/preOrderController.ts` | ✅ |
| 75.9 | `QB_CREDIT_ITEM_ID` documentada en `.env`/`INSTRUCTIONS.md` (mismo patrón que `QB_DEFAULT_CUSTOMER_ID`) | `INSTRUCTIONS.md` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 75.10 | `DamageItem.unitPrice`, `BatchResponse.creditsTotal`, helper `creditsTotalOf(damageItems, authoritative)` — prioriza el total autoritativo del backend cuando está disponible, si no suma `qty * unitPrice` local (aproximación, solo para preview antes de finalizar y ticket impreso offline) | `data/Models.kt` | ✅ |
| 75.11 | `askDamagedItems()` calcula `unitPrice` por producto con `unitValueOf()` (misma regla que el backend; para Case divide `order.price / caseQty` porque ahí `order.price` ya es el precio de la caja completa) | `CurrentOrderActivity.kt` | ✅ |
| 75.12 | `PrintService.printTicket()`/`buildCpcl()` — nuevo parámetro `creditsTotal`; el call site online lo manda desde `response.creditsTotal` (autoritativo), el offline cae a la aproximación local. Línea de "Negative Sale Summary" ahora incluye el monto por producto; bloque de total pasa a `Subtotal:` / `Credits:` / `TOTAL:` solo si hay crédito — sin daño, el ticket queda idéntico a antes | `data/print/PrintService.kt` | ✅ |
| 75.13 | `TicketDetailActivity.buildReceipt()` — mismo tratamiento que el ticket impreso; siempre suma desde el `unitPrice` de cada `DamageItem` (que ya viene poblado, sea de la finalización reciente o de `getBatchDamage` en una reimpresión) | `TicketDetailActivity.kt` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 75.14 | Modal de ticket — mismo bloque `Subtotal` / `Créditos` / `Total` que Android, solo si hay crédito. Chips de "Negative Sale" en la fila expandible también muestran el monto | `app/orders/_components/OrdersClient.tsx` | ✅ |
| 75.15 | Traducciones `tkt_subtotal`/`tkt_credits` agregadas en **los dos** bloques (`es`/`en`) | `app/lib/i18n.ts` | ✅ |

### Fuera de esta ronda (documentado explícitamente)
- Sin UI para "aplicar" el saldo de `customer_credits` en un pedido futuro distinto — la tabla existe como base, pero el crédito siempre se aplica de inmediato al mismo pedido que lo generó.
- Sin página de historial de créditos por cliente en la webapp.
- No se toca stock por artículos dañados.
- Pre-órdenes: `PreOrderItem` no tiene `caseQty`/`unitPrice` — un pedido convertido desde pre-orden no calcula el desglose de crédito (cae a formato simple, no rompe nada).
- `createInvoice()` (endpoint legacy de un solo ítem, sin caller real) no se tocó.

### Configuración manual requerida
Crear/identificar un Item en QuickBooks para representar el crédito (ej. "Store Credit / Damaged Goods") y poner su Id en `.env` como `QB_CREDIT_ITEM_ID=...`. Sin esto, todo funciona igual (ticket, ledger) pero la factura de QBO no incluye la línea negativa — solo el memo de texto, como hasta ahora.

### SQL

```sql
ALTER TABLE batch_damage
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NULL;

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

---

## Fase 76: Botón "Agregar crédito" — crédito standalone sin venta ✅

### Contexto
Hasta ahora un crédito (`credit_transactions` tipo `EARNED`) solo podía nacer como efecto secundario de un pedido real — el modal de "artículos dañados" en `CurrentOrderActivity` pide cantidades de los productos que ya están en el carrito de esa venta. El usuario necesitaba poder agendarle crédito a un cliente **sin que exista una venta** (ej. el camión encuentra producto dañado/caducado que no se va a vender ese día). Se agregó un botón nuevo en `MainActivity` ("Agregar crédito") que abre un flujo independiente: elegir cliente, agregar productos (escaneo DataWedge o búsqueda manual) con cantidad dañada/caducada, y guardar. No toca QuickBooks ni requiere firma/ticket — el crédito queda disponible de inmediato en el balance del cliente (mismo ledger `credit_transactions` EARNED/USED que ya usa el flujo "Apply Credit" al finalizar un pedido).

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 76.1 | `POST /api/credits/issue` — recibe `customer_id`/`customer_name`/`items[]`, reusa `computeDamageCredit()` (misma regla de valuación que el crédito por daño de un batch) para calcular el monto real desde `products`, inserta el detalle en `batch_damage` y el total en `credit_transactions` (`type='EARNED'`) con un `batch_id` sintético (prefijo `cr`, sin fila real en `orders` detrás — ambas tablas usan `VARCHAR` libre, sin FK). No crea ningún invoice/documento en QBO | `src/routes/credits.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 76.2 | `IssueCreditRequest`/`CreditItemRequest`/`IssueCreditResponse` + `issueCredit()` en el `ApiService` | `data/Models.kt`, `data/network/ApiService.kt` | ✅ |
| 76.3 | Nueva `IssueCreditActivity` — calco del esqueleto de `CreatePreOrderActivity` (customer picker, receiver DataWedge, diálogo de búsqueda manual) sin fecha/notas/vendedor; al elegir un producto (escaneado o buscado) pide cantidad dañada/caducada con un diálogo simple (entero, no peso) y arma la lista a guardar. Muestra un estimado de crédito en pantalla replicando `unitValueOf()` del backend en Kotlin — el monto real autoritativo lo sigue calculando el servidor | `IssueCreditActivity.kt`, `activity_issue_credit.xml` | ✅ |
| 76.4 | Botón "Agregar crédito" en `MainActivity`, mismo estilo que "Pre-órdenes" | `MainActivity.kt`, `activity_main.xml` | ✅ |
| 76.5 | Activity registrada en el manifest; strings nuevos agregados en `values/` y `values-es/` | `AndroidManifest.xml`, `strings.xml` (ambos locales) | ✅ |

### Fuera de esta ronda (confirmado con el usuario)
- Sin documento/factura en QuickBooks al agendar el crédito — se refleja ahí recién cuando se aplique en una venta real (flujo "Apply Credit" ya existente, sin cambios).
- Sin firma ni impresión de ticket — es una acción interna simple.
- No se tocó el flujo de "Apply Credit" (`askApplyCredit()` en `CurrentOrderActivity`, `GET /api/customers/:id/credit-balance`) — el crédito agendado aquí solo aumenta el balance disponible que ese flujo ya consulta.

### Nota de documentación
Este documento tenía como último crédito registrado la Fase 75 (tabla `customer_credits`, ledger simple sin "aplicar" saldo). El código ya había evolucionado a un ledger `credit_transactions` (EARNED/USED) con balance consultable y un flujo de aplicación de crédito (`askApplyCredit()`, `applyCustomerCredit()`) antes de esta fase, sin quedar documentado en su momento — la Fase 76 se apoya en ese sistema ya existente tal cual está en el código, no en la tabla `customer_credits` descrita en la Fase 75.

## Fase 77: Balance de crédito visible + monto de aplicación editable (Android) ✅

### Contexto
Dos ajustes al sistema de crédito ya existente, sin cambios de backend: (1) el saldo de crédito del cliente no se veía en ningún lado hasta que aparecía el modal de "Apply Credit" al finalizar un pedido — ahora se muestra proactivamente; (2) ese modal era todo-o-nada (un solo botón que aplicaba el máximo posible, o no aplicar nada) — ahora es un monto editable.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 77.1 | `refreshCustomerCredit()` — consulta `GET /api/customers/:id/credit-balance` y muestra "Crédito disponible: $X.XX" (oculto si balance = 0) junto al cliente activo | `MainActivity.kt` (`updateCustomerUi()`), `activity_main.xml` (`tvCustomerCredit`) | ✅ |
| 77.2 | Mismo patrón junto al cliente elegido en el flujo de agendar crédito | `IssueCreditActivity.kt`, `activity_issue_credit.xml` (`tvCustomerCredit`) | ✅ |
| 77.3 | `askApplyCredit()` — el diálogo pasa de un solo botón "Apply $max" a un `EditText` prellenado con `min(balance, total del pedido)` pero editable; al confirmar, el valor se recorta con `coerceIn(0.0, maxApply)` (no se puede aplicar más del saldo ni más del total del pedido); si queda en 0, equivale a "No aplicar" | `CurrentOrderActivity.kt`, `PreOrderDetailActivity.kt` (mismo bloque duplicado en ambos) | ✅ |
| 77.4 | String `btn_apply_credit` (con monto embebido) eliminada — el botón ahora usa el genérico `btn_apply` ("Apply"/"Aplicar"); `msg_credit_apply` reescrito para describir un rango en vez de pedir confirmar un monto fijo; nuevos strings `hint_credit_amount`, `label_available_credit` en `values/` y `values-es/` | `strings.xml` (ambos locales) | ✅ |

### Fuera de esta ronda
- Sin cambios de backend — reusa `GET /api/customers/:customerId/credit-balance` y `apply_credit` en `createBatch`/`convertPreOrder`, ya existentes.
- No se agregó validación con mensaje de error si el usuario escribe un monto mayor al máximo — se recorta en silencio (`coerceIn`).

## Fase 78: Fix — total de `OrderSuccessActivity` no restaba créditos ✅

### Contexto
Reporte del usuario: la pantalla de "Pedido completado" mostraba el total crudo del pedido incluso cuando había artículos dañados/caducados o crédito aplicado — mientras que el ticket (`TicketDetailActivity`/impresión) sí restaba ambos correctamente (`Subtotal` / `Credits` / `TOTAL`, Fase 75). El bug era que `OrderSuccessActivity` nunca recibía `creditsTotal`/`creditApplied` por intent — solo el `total` bruto (`items.sumOf { it.total }`).

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 78.1 | Extras nuevos `credits_total` (sentinel `-1.0` si no hay valor autoritativo del backend — pasa `null` a `creditsTotalOf()` para que use la suma local de `damageItems`) y `credit_applied` al lanzar `OrderSuccessActivity` | `CurrentOrderActivity.kt`, `PreOrderDetailActivity.kt` | ✅ |
| 78.2 | `displayTotal = total - credits - creditApplied` (misma fórmula que `TicketDetailActivity.buildReceipt()`); fila "Credits" nueva (oculta si no hay crédito) mostrando el monto combinado en negativo | `OrderSuccessActivity.kt`, `activity_order_success.xml` | ✅ |
| 78.3 | String `label_credits_field` en `values/` y `values-es/` | `strings.xml` (ambos locales) | ✅ |

### Fuera de esta ronda
- Sin cambios de backend.
- La fila "Credits" muestra el combinado daño+aplicado en una sola línea (a diferencia del ticket, que los separa en "Credits:"/"Credit Applied:") — es una pantalla de resumen, no el recibo; el detalle completo sigue disponible en "Ver ticket".

## Fase 79: Fix — créditos standalone invisibles en la página de Clientes (webapp) ✅

### Contexto
Reporte del usuario: en la webapp, la página de Clientes solo mostraba el crédito de un cliente si venía acompañado de un pedido/factura real (el caso "damage credit" clásico) — un cliente que solo tuviera un crédito standalone (agendado vía `POST /api/credits/issue`, Fase 76, sin ninguna venta detrás) no aparecía en la lista en absoluto, con su crédito invisible ahí. La página `/credits` (reporte de todos los créditos) ya funcionaba bien porque consulta `credit_transactions` directo, sin pasar por `orders`.

### Causa raíz
`GET /api/customers/stats` — el `FROM` de la query era `orders o ... WHERE o.status = 'SENT'`, con el balance de crédito unido después vía `LEFT JOIN`. Un cliente sin ninguna fila en `orders` (porque su único crédito es standalone) nunca entraba al `FROM`, así que ni el cliente ni su crédito aparecían en la tabla, sin importar que `credit_transactions` tuviera el registro correcto.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 79.1 | `GET /api/customers/stats` reescrita: el `FROM` ahora es la unión (`UNION`) de customer_ids con pedido `SENT` y customer_ids con alguna fila en `credit_transactions`, con los agregados de `orders`/`credit_transactions` unidos por separado vía `LEFT JOIN`. `customer_name` cae a `credit_transactions.customer_name` y, en último caso, al propio `customer_id` (nunca queda vacío, evita romper el avatar de iniciales en el frontend) | `src/routes/customers.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 79.2 | `last_order_at` ahora puede ser `null` (cliente sin pedidos, solo crédito standalone) — tipo actualizado y `fmtDate()` devuelve cadena vacía en vez de `new Date(null)` (que renderizaba 1970) | `app/customers/page.tsx`, `app/customers/_components/CustomersClient.tsx` | ✅ |

### Fuera de esta ronda
- `/api/credits` (reporte general) y `/api/customers/:id/credits` (historial por cliente) no se tocaron — ya funcionaban bien, ninguno depende de `orders`.

### Fase 79b: label "Sin factura" en vez de guion vacío en columna Invoice (webapp)
Un crédito standalone nunca va a tener `invoice_id` (por diseño, Fase 76 — no toca QBO al agendar), así que la columna Invoice en `/credits` y en el modal de historial de `/customers` siempre le va a mostrar un guion vacío. Para que se lea como "esto no tiene factura porque no hubo venta" y no como un dato roto, el guion se reemplazó por un label explícito (`crd_noInvoice`: "No invoice"/"Sin factura", ambos locales) en `CreditsClient.tsx` y `CustomersClient.tsx`.

## Fase 80: Fix — doble impresión (Fase 76) nunca se llamaba desde ningún lado ✅

### Contexto
Reporte del usuario: quería que el ticket se imprimiera una vez justo después de firmar, y una segunda vez después de elegir el método de pago. La Fase 76 ya documentaba exactamente ese comportamiento (`printFirstTicketThenAskPayment()`), pero al revisar el código esa función **no existía** — `checkPrinterThenFinalize()` saltaba directo a `askPaymentMethod()`, y `sendBatchAndPrint()` imprimía los dos tickets (sin pago, con pago) seguidos, ambos **después** de mandar el batch al servidor. El usuario nunca veía salir un ticket entre firmar y elegir el método de pago — la doble impresión existía como texto en `PROGRESS.md`/`CLAUDE.md`, pero no como código.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 80.1 | Nueva `printFirstTicketThenAskPayment(skipPrint)` — corre entre `checkPrinterThenFinalize()` y `askPaymentMethod()`; si hay impresora y no se saltó, imprime el primer ticket con `paymentMethod = null`, `invoiceId = null`, `batchId = ""`, `creditsTotal = null` (nada de esto existe todavía en este punto del flujo) usando `pendingSignature`/`pendingDamageItems`/`pendingApplyCredit` ya conocidos | `CurrentOrderActivity.kt` | ✅ |
| 80.2 | `sendBatchAndPrint()` — se eliminó el primer print duplicado (el que se llamaba "Ticket #1" en el código); ahora solo imprime el segundo ticket (con `Payment:` y, si hubo conexión, el invoice real) después de mandar el batch | `CurrentOrderActivity.kt` | ✅ |
| 80.3 | Error del primer print usa `error_print_generic` ("Print error: %s") en vez de `error_order_sent_print_fail` ("Order sent · Print error: %s") — en ese punto el pedido todavía no se mandó al servidor, así que el mensaje viejo era incorrecto | `CurrentOrderActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend.
- No aplica a `PreOrderDetailActivity` (conversión de pre-órdenes) — sigue con una sola impresión, como documentado desde la Fase 76.

## Fase 81: Reordenar diálogo de impresora antes del diálogo de crédito ✅

### Contexto
Tras la Fase 80, el orden post-firma en `CurrentOrderActivity` quedó: firma → diálogo de crédito disponible → diálogo de confirmar impresora → ticket #1 → método de pago → ticket #2. El usuario probó el flujo y pidió que el diálogo de impresora aparezca **antes** del diálogo de crédito, no después.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 81.1 | Orden invertido: `signatureLauncher` ahora llama `checkPrinterThenFinalize()` directo (antes llamaba `askApplyCredit()`); `checkPrinterThenFinalize()` llama `askApplyCredit(skipPrint)` (antes llamaba `printFirstTicketThenAskPayment(skipPrint)` directo); `askApplyCredit()` ahora recibe `skipPrint: Boolean` y llama `printFirstTicketThenAskPayment(skipPrint)` en sus tres salidas (sin cliente, crédito aplicado, sin crédito/error). Nuevo orden: firma → impresora → crédito → ticket #1 → pago → ticket #2 | `CurrentOrderActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend ni de `PreOrderDetailActivity` (mantiene su propio orden: firma → dañados → crédito → pago → impresora → convertir).

## Fase 82: Batch (e invoice de QBO) se manda antes del ticket #1, método de pago se adjunta después ✅

### Contexto
El usuario quería el número de factura real ya en el ticket #1 — hasta ahora `sendBatch()` (que crea las filas en `orders` y la factura en QBO) corría recién después de elegir el método de pago, así que el primer ticket imprimía sin invoice. Se movió el envío del batch a justo antes del ticket #1 (con `payment_method`/`check_number` en `null`, todavía no se conocen), y se agregó una forma de "pegarle" el método de pago al pedido ya creado una vez que el usuario lo elige, sin tocar el `CustomerMemo` de la factura en QBO (decisión explícita: alcanza con que el ticket impreso lo diga).

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 82.1 | Nuevo `PUT /api/orders/batch/:batchId/payment` (`updateBatchPayment`) — `UPDATE orders SET payment_method = ?, check_number = ? WHERE batch_id = ?`. Sin llamada a QuickBooks | `src/controllers/orderController.ts`, `src/routes/orders.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 82.2 | `BatchResponse.localPendingId` (nunca lo manda el servidor) — permite identificar la fila en `pending_batches` cuando el batch se mandó offline, para poder actualizarla después | `data/Models.kt` | ✅ |
| 82.3 | `UpdatePaymentRequest` + `ApiService.updateBatchPayment()` (`PUT`) | `data/Models.kt`, `data/network/ApiService.kt` | ✅ |
| 82.4 | `PendingBatchDao.insert()` ahora devuelve el `Long` id generado; nuevo `updateBatchJson(id, newJson)` | `data/local/dao/PendingBatchDao.kt` | ✅ |
| 82.5 | `OrderRepository.saveOfflineBatch()` propaga el id local en `localPendingId`; nuevos `attachPaymentMethod()` (caso online, llama al endpoint nuevo) y `attachPaymentMethodOffline()` (caso offline, re-serializa el `BatchRequest` ya encolado en `pending_batches` con el `payment_method`/`check_number` correctos, para que `SyncWorker` lo mande bien más tarde vía el `createBatch` de siempre — sin endpoint especial para offline) | `data/repository/OrderRepository.kt` | ✅ |
| 82.6 | `CurrentOrderActivity` reordenada: `printFirstTicketThenAskPayment()` ahora manda el batch de verdad (antes solo imprimía un preview local) y guarda la respuesta en `sentBatch` (batchId/invoiceId/invoiceNumber/creditsTotal/items) para reusarla después. `sendBatchAndPrint()` ya no manda el batch — solo adjunta el método de pago (`attachPaymentMethod`/`attachPaymentMethodOffline` según corresponda) e imprime el segundo ticket con el mismo invoice + `Payment:` | `CurrentOrderActivity.kt` | ✅ |
| 82.7 | String `loading_saving_payment` en ambos locales | `strings.xml` | ✅ |

### Fuera de esta ronda
- No se actualiza el `CustomerMemo` de la factura en QBO con el método de pago — decisión explícita del usuario, el ticket impreso alcanza.
- `PreOrderDetailActivity` no se toca — sigue mandando el batch después de elegir el método de pago (una sola impresión).

## Fase 83: Mover el diálogo de crédito antes de la firma (no después del ticket #1) ✅

### Contexto
Después de la Fase 82, el usuario pidió que el crédito se decidiera *después* de imprimir el ticket #1 (junto con el método de pago). Se le explicó la diferencia clave: el método de pago es puro memo en QBO, pero el crédito aplicado (`apply_credit`) es una **línea real de descuento** en la factura (`qbInvoices.ts`, `Discount line`) — si se decide después de crear la factura, o se hace una llamada extra a QBO para agregarlo, o la factura queda con el total mal. El usuario decidió, en cambio, mover el diálogo de crédito **antes de la firma** (en vez de entre impresora y ticket #1) — así el crédito siempre queda resuelto antes de mandar cualquier cosa a QBO, sin necesitar una segunda llamada a QuickBooks.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 83.1 | Nuevo orden: `askDamagedItems()` → `askApplyCredit()` (ya sin parámetro `skipPrint`) → `launchSignature()` → `signatureLauncher` → `checkPrinterThenFinalize()` → `printFirstTicketThenAskPayment(skipPrint)` → `askPaymentMethod(skipPrint)` → `sendBatchAndPrint(skipPrint)` | `CurrentOrderActivity.kt` | ✅ |
| 83.2 | Fix de un bug que este reorden habría expuesto: `signatureLauncher` reseteaba `pendingApplyCredit = null` justo después de la firma — inofensivo antes (el crédito se preguntaba después de la firma), pero con el crédito ahora resuelto *antes* de firmar, ese reset borraba la elección del usuario. Se movió el reset a `btnFinalize.setOnClickListener` (el verdadero inicio del flujo) | `CurrentOrderActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend — no hizo falta ninguna llamada extra a QBO gracias al reorden.

## Fase 84: Disclaimer impreso → QR (Android, sin cambios de backend) ✅

### Contexto
El usuario ya no quiere el texto legal completo impreso/mostrado en el ticket — pidió reemplazarlo por un QR (imagen provista por el usuario) que apunta a una página web con el disclaimer.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 84.1 | QR embebido en la APK (`disclaimer_qr.png`, 1200×1200, `drawable-nodpi` para que no se escale por densidad) | `app/src/main/res/drawable-nodpi/disclaimer_qr.png` | ✅ |
| 84.2 | `bitmapToEg()` — extraído de lo que antes era solo `buildSignatureEg()` (conversión Bitmap → comando CPCL `EG`, 1-bit MSB-first), ahora compartido; `buildSignatureEg()` (firma, base64) y nuevo `buildQrEg()` (QR, `BitmapFactory.decodeResource`) delegan en él. El bloque de "Términos y condiciones" (texto completo wrappeado) se reemplazó por una línea de caption + el QR impreso vía `EG`, centrado en la página | `data/print/PrintService.kt` | ✅ |
| 84.3 | Vista en pantalla ("Ver ticket") — mismo reemplazo: el bloque de texto del disclaimer pasa a un `ImageView` con el mismo QR | `TicketDetailActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend.
- `SecurePreferences.getDisclaimer()`/`saveDisclaimer()` y el campo editable en `SettingsActivity` (`etDisclaimer`) no se tocaron — la infraestructura de disclaimer configurable (Android + webapp `/settings`) sigue existiendo, solo dejó de imprimirse/mostrarse en el ticket. Si en algún momento se quiere retirar esa infraestructura por completo (Settings del device, `company_settings.disclaimer` en el backend, campo en la webapp), es una ronda aparte.

## Fase 85: Botón "+ Agregar crédito" en CurrentOrderActivity — crédito para un producto fuera del carrito ✅

### Contexto
Hasta ahora, marcar un producto como dañado/caducado (crédito) dentro de un pedido en curso solo era posible para productos que ya estaban en el carrito (`askDamagedItems()`, limitado a `pending_orders`). El usuario pidió un botón aparte en `CurrentOrderActivity` que abra una búsqueda de productos normal, y que lo elegido ahí se agregue como línea negativa (crédito) al pedido — sin necesidad de que ese producto esté en el carrito.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 85.1 | Botón `btnAddCreditItem` ("+ Agregar crédito") arriba de "Ver ticket"/"Finalizar pedido" | `activity_current_order.xml` | ✅ |
| 85.2 | `showAddCreditItemDialog()` — diálogo de búsqueda por nombre (mismo patrón que `IssueCreditActivity`, sin escaneo DataWedge) → `askCreditQtyThenAdd()` pide cantidad → agrega/mergea un `DamageItem` a `pendingDamageItems` (mismo campo que ya usa `askDamagedItems()`, así que reusa toda la lógica de cálculo/impresión/envío sin tocar el backend) | `CurrentOrderActivity.kt` | ✅ |
| 85.3 | `loadOrder()` renderiza `pendingDamageItems` como filas extra en la lista del carrito (mismo layout, tag "CREDIT", total en rojo, solo botón borrar) | `CurrentOrderActivity.kt` | ✅ |
| 85.4 | `askDamagedItems()` ajustado para no pisar las entradas agregadas a mano — solo reemplaza las entradas cuyo barcode está en el carrito actual, preserva el resto | `CurrentOrderActivity.kt` | ✅ |
| 85.5 | Strings `btn_add_credit_item`, `label_credit_item_tag` en ambos locales (reusa `title_credit_qty`/`hint_credit_qty`/`hint_product_name_search`/etc. ya existentes) | `strings.xml` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend — reusa `damage_items` en `createBatch`, ya existente desde la Fase 75.
- Sin escaneo DataWedge en el diálogo de búsqueda — solo búsqueda por nombre, `CurrentOrderActivity` no tenía infraestructura de scanner propia.

### Fase 85b: Fix — ORDER TOTAL no descontaba los créditos agregados
Reporte del usuario, mismo día: al agregar un ítem normal y un crédito, el "ORDER TOTAL" del carrito no cambiaba — seguía sumando solo los ítems reales. `loadOrder()` en `CurrentOrderActivity.kt` ahora calcula `creditsTotal = pendingDamageItems.sumOf { it.qty * it.unitPrice }` y lo resta del total mostrado; nuevo `tvCreditsTotal` (rojo, `activity_current_order.xml`) muestra `"Credits: -$X.XX"` debajo del total cuando hay crédito, oculto si no. String `label_order_credits` en ambos locales.

## Fase 86: Persistir los credit items del carrito (sobreviven cierre de la app) ✅

### Contexto
Reporte del usuario: al cerrar la app y volver a abrirla, los productos normales del carrito seguían ahí, pero los agregados vía "+ Agregar crédito" (Fase 85) desaparecían. Causa: vivían solo en `pendingDamageItems`, una variable en memoria de `CurrentOrderActivity` — se pierde si Android mata el proceso. Los productos normales sobreviven porque están en SQLite (`pending_orders`).

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 86.1 | `AppDatabase` v12 → v13 — columna nueva `pending_orders.is_credit INTEGER DEFAULT 0` (`ALTER TABLE` simple, no requiere recrear la tabla) | `data/local/AppDatabase.kt` | ✅ |
| 86.2 | `PendingOrderEntity.isCredit: Boolean = false`; `OrderDao` — `insert()`/`cursorToEntity()` leen/escriben la columna; `findActiveByBarcodeAndPrice()` agrega `AND is_credit = 0` (evita que un re-escaneo normal se mergee por accidente con una fila de crédito del mismo barcode — riesgo real en Case/Unit/Bucket, mismo precio unitario); nuevo `findActiveCreditByBarcode()`; `count()` agrega `AND is_credit = 0` (badge "Ver pedido (N)" ya no cuenta créditos como producto) | `data/local/entities/PendingOrderEntity.kt`, `data/local/dao/OrderDao.kt` | ✅ |
| 86.3 | `OrderRepository.saveCreditItem(barcode, productName, qty, unitPrice)` — inserta o mergea (suma qty) una fila `is_credit = true` | `data/repository/OrderRepository.kt` | ✅ |
| 86.4 | Los 6 lugares de `CurrentOrderActivity` que llaman `getPendingOrders()` separan `normalItems`/`creditRows` por `isCredit` — el más crítico es `printFirstTicketThenAskPayment()` (`toBatchItems()` solo con `normalItems`, para que un crédito nunca se mande como línea positiva real en la factura). `askCreditQtyThenAdd()` ahora llama `saveCreditItem()` en vez de mutar una lista en memoria. `PendingOrderEntity.toDamageItem()` es el helper de conversión | `CurrentOrderActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend.

---

## Fase 87: Pre-órdenes — detalle de producto (peso/case/precio) se captura al convertir, no al crear ✅

### Contexto
Pedido del usuario: crear una pre-orden debía ser únicamente elegir qué productos van, sin pesar/casear/precificar nada — porque el producto exacto que se entrega (y su precio/peso ese día) recién se sabe el día de la pre-orden. Antes, `CreatePreOrderActivity` lanzaba el mismo stepper de peso/case/precio que usa el carrito real (`ProductDetailActivity` en `PRE_ORDER_MODE`) al agregar cada producto. Ahora ese stepper se movió íntegro a `PreOrderDetailActivity`, producto por producto, justo antes de convertir — con el precio/catálogo **actual** (no el que había al crear el borrador).

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 87.1 | `PreOrderItem.price/quantity/total` pasan a nullable (borrador sin detallar); se agrega `caseQty` (no existía) | `data/Models.kt` | ✅ |
| 87.2 | `ConvertPreOrderRequest` agrega `items: List<PreOrderItem>` — el detalle finalizado, que antes no viajaba en la conversión | `data/Models.kt` | ✅ |
| 87.3 | `CreatePreOrderActivity` deja de lanzar `ProductDetailActivity` — `addDraftItem()` agrega el producto directo (barcode+nombre, sin duplicados); se quita "Total estimado" (nada que sumar sin precio) | `CreatePreOrderActivity.kt`, `activity_create_pre_order.xml` | ✅ |
| 87.4 | `PreOrderDetailActivity` — para pre-órdenes DRAFT/CONFIRMED, cada item sin detallar muestra botón "Detallar"; `finalizeItem()` pide el producto fresco del catálogo (`getProductByBarcode`) y relanza `ProductDetailActivity` en `PRE_ORDER_MODE`; `btnConvert` queda deshabilitado hasta que todos los items tengan su detalle. `askDamagedItems()`/`askApplyCredit()`/`doConvert()` usan `finalizedItemsFlat` en vez de `po.items`. `reusePreOrder()` ya no copia el precio finalizado al nuevo borrador (la nueva pre-orden también pasa por su propio finalize-at-conversion) | `PreOrderDetailActivity.kt`, `activity_pre_order_detail.xml` | ✅ |
| 87.5 | `ProductDetailActivity` — la rama `PRE_ORDER_MODE` de `saveOrder()` ahora setea `caseQty` en el `PreOrderItem` devuelto (gap preexistente: un pre-order de un producto Case perdía ese dato) | `ProductDetailActivity.kt` | ✅ |

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 87.6 | `pre_order_items`: `price`/`quantity`/`total` ahora nullable; columnas nuevas `unit`/`case_qty` | `preOrderController.ts` (`ensureTables`), `excellentia_schema.sql`, `routes/setup.ts` | ✅ |
| 87.7 | `createPreOrder`/`updatePreOrder` — el insert de items tolera precio/cantidad ausentes (`hasPricing` gate) | `preOrderController.ts` | ✅ |
| 87.8 | `convertPreOrder` reescrito: los items finalizados llegan en el body (`req.body.items`, 400 si falta) en vez de leerse de `pre_order_items` — se valida precio mínimo por item (paridad nueva con `createBatch`, antes no existía para pre-órdenes), se insertan en `orders` incluyendo `unit`/`case_qty` (gap preexistente, cerrado de paso), y se reescriben en `pre_order_items` (delete+reinsert) para que `GET /api/preorders/:id` y "Reusar pre-orden" reflejen lo entregado, no el borrador vacío | `preOrderController.ts` | ✅ |
| 87.9 | Migración `routes/setup.ts` (`GET /api/setup`, correr una vez): `pre_orders.salesperson_name` (ya estaba en `ensureTables()` pero no en `setup.ts`), `pre_order_items` nullable + `unit`/`case_qty` | `routes/setup.ts` | ✅ |
| 87.10 | Fix — `finalizeItem()` mandaba `QUANTITY = 1.0` fijo al relanzar el stepper; para productos Case eso pisaba el tamaño real de la caja (`products` **no tiene** columna `case_qty` — el tamaño de caja viaja en `products.qty`, y `ProductDetailActivity` lo recupera vía el fallback interno de `QUANTITY` cuando `CASE_QTY` llega en 0, ver Fase 87 nota de diseño en `CLAUDE.md` de Android). Cada caja se procesaba como "caja de 1". Fix: calcular `initialQty` igual que `MainActivity.openDetail()` (`product.qty` si > 0, si no `weightPerUnit`, si no 1.0); de paso se agregó el extra `STOCK` que tampoco se mandaba, para paridad completa con el flujo normal | `PreOrderDetailActivity.kt` | ✅ |
| 87.11 | Fix — `PreOrderListActivity` mostraba "$0.00" para toda pre-orden DRAFT/CONFIRMED/CANCELLED (esperado, sin precio hasta convertir — Fase 87), se leía como error. Ahora muestra "Sin detallar" salvo `status == "CONVERTED"` (único estado con total real persistido en `pre_order_items`). `PreOrderDetailActivity.renderItemsSection()` ya mostraba "—" correctamente para el mismo caso — solo faltaba la lista | `PreOrderListActivity.kt` | ✅ |

### Orden de despliegue
Backend primero (compatible hacia atrás con un APK viejo que siga mandando precio completo al crear) → correr `GET /api/setup` una vez → recién ahí distribuir el APK nuevo. Sin esto, `createPreOrder` con items sin precio falla contra la constraint `NOT NULL` vieja.

### Fuera de esta ronda
- `convertPreOrder` sigue sin descontar `products.stock` al convertir (a diferencia de `createBatch`) — gap preexistente, no tocado.
- Pre-órdenes DRAFT/CONFIRMED creadas antes de este deploy (con precio completo, app vieja) se muestran como "sin detallar" la primera vez que se abren con la app nueva — se sobreescriben al finalizar, sin pérdida de datos.

---

## Fase 88: Pre-órdenes — doble impresión (mismo patrón que CurrentOrderActivity) ✅

### Contexto
Pedido del usuario: que la conversión de pre-órdenes tenga el mismo flujo de impresión que un pedido normal — ticket #1 apenas se manda (con el número de factura real), se pregunta el método de pago después, y se imprime un ticket #2 con "Payment: X". Antes de esta fase, `PreOrderDetailActivity` preguntaba el pago **antes** de convertir e imprimía una sola vez.

Sin cambios de backend ni de SQL: `updateBatchPayment` (`PUT /api/orders/batch/:batchId/payment`, Fase 82) ya es genérico sobre la tabla `orders` por `batch_id` — como `convertPreOrder` escribe ahí con el mismo esquema que `createBatch`, sirve tal cual sin tocarlo.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 88.1 | Reordenado: `askApplyCredit()` ahora sigue a `checkPrinterThenConvert()` en vez de a `askPaymentMethod()` — el pago se pregunta después de convertir, no antes | `PreOrderDetailActivity.kt` | ✅ |
| 88.2 | `doConvert()` → `doConvertAndPrintFirst(skipPrint)` — manda `convertPreOrder` con `payment_method=null`/`check_number=null` (ya con firma/dañados/crédito), guarda la respuesta en `sentConversion` (nuevo, mismo rol que `SentBatch` en `CurrentOrderActivity`), imprime el ticket #1 sin "Payment:", y llama `askPaymentMethod(skipPrint)` en vez de navegar a `OrderSuccessActivity` | `PreOrderDetailActivity.kt` | ✅ |
| 88.3 | `askPaymentMethod()` pasa a recibir `skipPrint: Boolean`; cada botón llama `sendPaymentAndPrint(skipPrint)` en vez de `checkPrinterThenConvert()` | `PreOrderDetailActivity.kt` | ✅ |
| 88.4 | `sendPaymentAndPrint(skipPrint)` (nuevo) — adjunta el pago vía `updateBatchPayment` (endpoint existente, sin cambios), imprime el ticket #2 con el mismo invoice + Payment, y recién ahí navega a `OrderSuccessActivity` | `PreOrderDetailActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend — `updateBatchPayment` ya era reusable tal cual.
- A diferencia de `CurrentOrderActivity`, las pre-órdenes no tienen variante offline (`isOfflinePending`) — requieren internet siempre, así que `sendPaymentAndPrint` no necesita esa rama.

---

## Fase 89: Fix — precio de Case es el precio total de la caja, no se multiplica por caseQty ✅

### Contexto
Reporte del usuario: productos `unit = "Case"` con caja de 12 unidades, catálogo con `price = 2.69` — la app calculaba el total de la caja como `2.69 × 12 = $32.28`, pero la tienda vende esa caja completa en $2.69, no $32.28. `products.price` para un Case ya es el precio de venta de la caja entera, no el precio de una sola unidad dentro de ella. Sin cambios de backend — `creditCalculator.ts`/QBO invoice nunca multiplicaban por su cuenta, solo usan el precio que manda el cliente, así que el fix fue enteramente del lado Android.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 89.1 | `onCreate()`/`showProduct()` — eliminado `baseTotal = productPrice * caseQty`; ahora `baseTotal`/`pricePerLb = productPrice` directo | `ProductDetailActivity.kt` | ✅ |
| 89.2 | Labels `"$X/unit"` (`tvPrice`, `tvTotalWeight` en `recalcTotal()`) — antes mostraban `productPrice` crudo como precio unitario, ahora `productPrice / caseQty` (ya que `productPrice` pasó a ser el precio de la caja) | `ProductDetailActivity.kt` | ✅ |
| 89.3 | `editItem()` — ya no reconstruye `order.price / caseQty` para pasarlo como `PRODUCT_PRICE`; se manda `order.price` tal cual, porque `ProductDetailActivity` ya no vuelve a multiplicar | `CurrentOrderActivity.kt` | ✅ |
| 89.4 | `estimatedUnitValueOf()` (crédito de un producto suelto, buscado fuera del carrito) — Case pasó de usar `product.price` directo a `product.price / caseSize` para obtener el valor de una sola unidad dañada. `caseSize` usa `product.caseQty?.takeIf{it>0} ?: product.qty.takeIf{it>0}` porque `products.case_qty` no existe en MySQL (`ProductDto.caseQty` siempre null/0) | `CurrentOrderActivity.kt`, `IssueCreditActivity.kt` (misma función duplicada en ambos) | ✅ |

### Fuera de esta ronda
- `unitValueOf(order: PendingOrderEntity)` (crédito de un producto ya en el carrito) **no cambió** — ya dividía `order.price / order.caseQty`, que sigue siendo correcto porque `order.price` sigue significando "precio de la caja completa" en el esquema nuevo igual que en el viejo.
- Sin cambios de backend.
- ⚠️ Pendiente de verificar en el backend/admin: si `min_price` de estos productos Case fue cargado asumiendo el precio multiplicado (~$32), ahora bloqueará ediciones al precio real (~$2.69) — puede necesitar recarga de datos para esos SKUs.

---

## Fase 90: Fusión de tipos de producto "Case" + "Unit" → "Case/Unit" ✅

### Contexto
Pedido del usuario: unificar los tipos "Case" y "Unit" en un solo tipo de producto, "Case/Unit", reusando la lógica de precio de Case (Fase 89 — `price` = precio total del paquete, se divide por la cantidad de unidades para obtener el valor de una sola unidad). Confirmado con el usuario antes de implementar: los productos que hoy son "Unit" casi siempre tienen `qty = 1` (se venden de a uno), así que fusionarlos con la lógica de Case es seguro — un "paquete de 1" se comporta igual que el "Unit" lineal de antes.

De paso se detectó y arregló un bug de dinero activo desde la Fase 89: `creditCalculator.ts` (backend, cálculo autoritativo de crédito por daño) seguía devolviendo `products.price` directo para Case, sin dividir por tamaño de paquete — desde que Android empezó a tratar `price` como precio total del paquete (Fase 89), el crédito real aplicado en la factura de QuickBooks para una unidad dañada de un producto Case estaba sobre-valuado por un factor de `qty` (ej. 1 unidad dañada de un paquete de 12 a $2.69 se acreditaba $2.69 completos en vez de $0.22).

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 90.1 | `unitValueOf()` — Case/Unit/Case-Unit ahora divide `price / qty` (antes devolvía `price` directo para Case); agregado `qty` al SELECT (`products` no tiene `case_qty`, el tamaño real de paquete viaja en `qty`) | `src/services/creditCalculator.ts` | ✅ |
| 90.2 | Migración de datos (endpoint `/api/setup`, correr a mano tras el deploy): `UPDATE products SET unit='Case/Unit' WHERE unit IN ('Case','Unit')` — solo el catálogo vivo; `orders`/`pre_order_items` históricos no se tocan (quedan con el unit real de la venta) | `src/routes/setup.ts` | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 90.3 | Dropdown de tipo de producto — colapsados `<option value="Unit">`/`<option value="Case">` en un solo `<option value="Case/Unit">` | `app/products/_components/ProductModal.tsx` | ✅ |
| 90.4 | Al editar un producto viejo con `unit` legacy ("Case"/"Unit" sueltos, previo a correr la migración), se normaliza a `"Case/Unit"` al popular el form para que el `<select>` preseleccione correctamente | `app/products/_components/ProductModal.tsx` | ✅ |
| 90.5 | Columna "Unidad" de la tabla — mismo mapeo Case/Unit → "Case/Unit" para que se vea consistente aunque la fila no esté migrada todavía | `app/products/_components/ProductRow.tsx` | ✅ |

### Android
Detalle completo en `CLAUDE.md` (repo Android) — nuevo helper `isCaseUnitType(unit)` en `data/Models.kt` (acepta `"Case/Unit"` y, por compatibilidad con datos históricos, también `"Case"`/`"Unit"` sueltos), usado en `ProductDetailActivity`, `CurrentOrderActivity` e `IssueCreditActivity` en vez de comparar contra `"Case"` a secas. Categoría de ticket fusionada (`TICKET_CATEGORY_ORDER`, `ticketCategoryFor()`) para que un ticket con productos históricamente "Case" y "Unit" mezclados no muestre dos secciones separadas.

### Fuera de esta ronda
- Min-price validation (`orderController.ts`/`preOrderController.ts`) ya era unit-agnóstica — no necesitó cambios.
- No se tocaron `orders.unit`/`pre_order_items.unit` de ventas ya facturadas — la app y el backend ya tratan esos valores legacy como equivalentes a `Case/Unit` en la lectura.
- Bucket y Lbs sin cambios — la fusión es solo entre Case y Unit.

---

## Fase 91: Ticket — nuevo formato de línea de ítem (# / descripción / qty / rate / total) ✅

### Contexto
Pedido del usuario: cambiar cómo se muestran los productos en el ticket a un formato tipo factura — número de línea, descripción, cantidad/peso, tarifa y total como campos separados (antes la cantidad y la tarifa venían mezcladas en un solo texto, ej. `"22.8 lb x $0.18/lb"`). Confirmado con el usuario el layout de 2 líneas por ítem (nombre no siempre entra junto con las 4 columnas en el ancho angosto de la impresora térmica ZQ630) y que aplica igual al ticket impreso y al de pantalla.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 91.1 | Línea 1 `"# Nombre"` (número de línea corrido para todo el ticket, no se reinicia por categoría) + línea 2 en 3 columnas (`threeCol` nuevo, análogo a `twoCol`): qty/weight, rate, total | `data/print/PrintService.kt` (CPCL) | ✅ |
| 91.2 | Mismo cambio en el ticket en pantalla — `addThreeCol()` nuevo (fila `LinearLayout` de 3 `TextView`, mid/right alineados a la derecha) | `TicketDetailActivity.kt` | ✅ |
| 91.3 | El campo qty ya no incluye `"x $rate"` (se movió a su propia columna); el desglose `"of Q"` (Case/Unit con paquete >1) y `"N -"` (varias pesadas agrupadas) se conservan igual que antes de la Fase 91 | ambos archivos | ✅ |
| 91.4 | Encabezado de columnas — `"#  Description"` + `threeCol("Qty/Weight", "Rate", "Total")` una sola vez antes de la lista de ítems (pedido de seguimiento del usuario, después de ver el resultado sin headers) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 91.5 | Ticket impreso — el usuario preguntó por el padding izq/der; `PAGE-WIDTH 576` ya es el ancho real de la ZQ630 (no hay margen artificial ahí), pero los anchos de `wrapText`/`threeCol` de la sección de ítems eran conservadores (24/30 chars contra un máximo físico de ~33.9 con Font 4). Ensanchados a 27/32 para aprovechar más el ancho real sin llegar al límite teórico | `data/print/PrintService.kt` | ✅ |
| 91.6 | **Fix** — al ajustar esos anchos a mano el usuario terminó con `threeCol(..., width = 48)` (48 chars × 17px = 816px, más de lo que entra en `PAGE-WIDTH 576`); la impresora envolvía esa fila por su cuenta sin que el código avanzara el `y`, pisando la línea siguiente. Unificado: `LINE_WIDTH`/`MAX_LINE_CHARS` calculados una sola vez desde `PW`/17px, todo el ticket usa ese único default, y `wrapText`/`twoCol`/`threeCol` clampan internamente contra el máximo físico — ya no se puede desbordar la página aunque alguien pase un ancho grande a mano. De paso, los campos de cabecera (nombre de empresa, subtítulo, dirección, ciudad, teléfono) que truncaban con `.take()` en vez de wrappear pasaron a usar wrap real (`tWrapped()` nuevo) | `data/print/PrintService.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend/webapp — es puramente presentación del ticket en Android.
- En el ticket impreso, la columna de cantidad/peso se trunca (`.take()`) en el caso raro de un texto muy largo (ej. "N - Case/Unit of Q" con N y Q de 2+ dígitos a la vez) para no romper la alineación de rate/total — no aplica al ticket en pantalla, que usa `TextView`s reales sin límite de caracteres fijo.

---

---

## Fase 92: Fix — ancho de línea + splitAddress en ticket CPCL (PrintService) ✅

### Contexto
La dirección del cliente en el ticket impreso se partía por `wrapText()` usando `LINE_WIDTH=31` chars sin considerar que Font 4 en la ZQ630 es proporcional — cadenas de ≤31 caracteres podían ocupar más de 576px en la impresora y el firmware envolvía el último carácter sin avanzar `y`, pisando la línea siguiente. Además, direcciones sin coma (ej. `"2323 Avenida Costa Este Suite 100"`) no se partían en la calle vs. unidades/cuarto — `wrapText` por ancho solo producía cortes antiestéticos.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 92.1 | `LINE_WIDTH` reducido de `MAX_LINE_CHARS - 2` a `MAX_LINE_CHARS - 4` (33→29) — margen extra de ~83px contra PAGE-WIDTH 576px para absorber la variación de la fuente proporcional | `data/print/PrintService.kt` | ✅ |
| 92.2 | `splitAddress(text)` — nuevo helper que parte una dirección en líneas naturales: (1) primera coma separa calle de ciudad/estado; (2) palabras clave (Suite/Unit/Apt/Ste/Apart) con word boundary regex; (3) prefijo `#` para unidades; (4) si nada coincide, devuelve el texto completo (wrapText se encarga después) | `data/print/PrintService.kt` | ✅ |
| 92.3 | Header `address` y `city` — reemplazado `tWrapped` directo por `splitAddress()` + loop de `tWrapped` por cada parte. Mismo patrón que se aplicó a `customerAddress` | `data/print/PrintService.kt` | ✅ |
| 92.4 | `customerAddress` — reemplazado el split por coma manual por `splitAddress()` + loop de `tWrapped` (misma lógica, ahora también detecta keywords y #) | `data/print/PrintService.kt` | ✅ |

**Efecto en `"2323 Avenida Costa Este Suite 100"`:**
```
Antes (wrapText 31 chars):      Después (splitAddress + tWrapped):
2323 Avenida Costa Este         2323 Avenida Costa Este
Suite 100                       Suite 100
```
El resultado impreso es idéntico en este caso concreto (ambos métodos rompían igual por ancho), pero la lógica con `splitAddress` también separa por coma (calle vs. ciudad/estado) igual que `TicketDetailActivity.buildReceipt()`, manteniendo consistencia entre el ticket en pantalla y el impreso.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

---

## Fase 93: Ticket — ajustes de columnas, QR link y header compacto ✅

### Contexto
Tres ajustes al ticket (CPCL impreso + pantalla) después de la Fase 92: (1) las columnas `midWidth`/`rightWidth` de `threeCol` troncaban valores grandes ($1000+) y el header/data usaban `x` distintos en CPCL, desalineando; (2) el URL del QR se agregó debajo del código pero sin `https://` ni salto de línea — la impresora ZQ630 superponía caracteres; (3) los headers de columna eran innecesariamente largos (`"#  Description"`, `"Qty/Weight"`) y ocupaban espacio valioso.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 93.1 | `threeCol`: midWidth 7→8, rightWidth 8→9 (caben $1000.00 y $10000.00 sin truncar); `leftWidth` se recalcula solo (14→12) | `data/print/PrintService.kt` | ✅ |
| 93.2 | threeCol header y data rows: `x=4`→`x=0` en CPCL, alineados con `"#  Desc"` | `data/print/PrintService.kt` | ✅ |
| 93.3 | Continuation lines de nombre de producto (wrap): `F4, 4, y`→`F4, 0, y` — mismo x que el resto, sin zigzag | `data/print/PrintService.kt` | ✅ |
| 93.4 | `addThreeCol` en pantalla: mid/right pasan de `WRAP_CONTENT` a ancho fijo medido con `Paint.measureText("M".repeat(N))` — columnas ya no se desalinean entre header y data | `TicketDetailActivity.kt` | ✅ |
| 93.5 | URL del QR: `"excellentiafoods.com/..."`→`"https://excellentiafoods.com/..."` con `chunked(LINE_WIDTH=29)` — parte exactamente en `.com/` (2 líneas, sin overlapping) | `data/print/PrintService.kt` | ✅ |
| 93.6 | URL del QR en pantalla: same `https://` prefix agregado al TextView | `TicketDetailActivity.kt` | ✅ |
| 93.7 | Header compacto: `"#  Description"`→`"#  Desc"`, `"Qty/Weight"`→`"Qty/W"` (ambos archivos) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |

### Fuera de esta ronda
- Sin cambios de backend/webapp.

---

## Fase 94: Nombre corto de producto (`short_name`) para el ticket ✅

### Contexto
Pedido del usuario: en la webapp, poder cargar a mano un "nombre corto" por producto (distinto del `name` completo usado en QBO/reportes), y que ese nombre corto sea el que se imprima/muestre en el ticket de venta en vez del nombre completo — pensado para productos con nombres largos que no entran bien en el ancho angosto de la ZQ630 o que el usuario prefiere mostrar más simplificados al cliente. Si un producto no tiene `short_name` cargado, el ticket sigue mostrando el `name` completo como hasta ahora (fallback, sin romper productos existentes).

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 94.1 | Columna `products.short_name VARCHAR(255) NULL` — agregada al `CREATE TABLE` (instalaciones nuevas) y como migración `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (bases existentes) | `src/routes/setup.ts` | ✅ |
| 94.2 | `createProduct`/`updateProduct` — `short_name` agregado al INSERT y al patrón de partial-update dinámico (mismo tratamiento que `description`: string nullable, no dispara sync a QBO) | `src/controllers/productController.ts` | ✅ |
| 94.3 | `Product` interface — campo `short_name: string \| null` agregado | `src/types/index.ts` | ✅ |
| 94.4 | Sin cambios en `listProducts`/`getProductByBarcode` — ambos usan `SELECT *`, la columna nueva aparece automáticamente en la respuesta JSON sin tocar la query | `src/controllers/productController.ts` | ✅ |
| 94.5 | Reference docs sincronizados (no ejecutados por la app) | `src/db/schema.sql`, `excellentia_schema.sql` | ✅ |

**Fuera de esta ronda:** `GET /api/orders` (`listOrders`) no hace join con `products` — los reimpresos de pedidos históricos desde Historial siguen mostrando el `name` completo, no el `short_name`. Solo importa para el ticket inmediato (justo después de la venta), donde todo se arma en el cliente Android sin volver a golpear el backend.

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 94.6 | Campo "Short name (ticket)" en el modal de producto — mismo patrón que `description` (siempre se manda, `trim() \|\| null`, para que vaciarlo en la UI también lo borre en el servidor) | `app/products/_components/ProductModal.tsx` | ✅ |
| 94.7 | Subtexto azul bajo el nombre en la tabla de productos, solo si `short_name` tiene valor | `app/products/_components/ProductRow.tsx` | ✅ |
| 94.8 | `Product` interface (`short_name: string \| null`) + claves de traducción `modal_shortName`/`modal_shortNamePh` (es/en) | `app/products/page.tsx`, `app/lib/i18n.ts` | ✅ |

### Android
Detalle completo en `CLAUDE.md` (este repo). Resumen: `short_name` viaja por toda la cadena — `ProductDto`/`Product` → cache offline (`cached_products`, migración v14) → escaneo/búsqueda en `MainActivity` (extra `SHORT_NAME`, 5 sitios de `SuggestionItem`) → `ProductDetailActivity` (nuevo `KEY_SHORT_NAME`) → carrito (`pending_orders`, migración v14) → armado del ticket en `CurrentOrderActivity`/`PreOrderDetailActivity`. El único punto de resolución del nombre a mostrar es `GroupedTicketItem` (`data/Models.kt`): `shortName?.takeIf { it.isNotBlank() } ?: productName`. Ni `PrintService` (CPCL) ni `TicketDetailActivity` (pantalla) necesitaron cambios — ambos ya consumen `GroupedTicketItem.productName` tal cual. Pre-órdenes (`PreOrderItem`) también lo llevan, para que el ticket de una pre-orden convertida respete el nombre corto igual que una venta normal.

### SQL
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_name VARCHAR(255) NULL AFTER name;
```
(Idempotente — también se corre solo al pegarle a `GET /api/setup` tras desplegar el backend.)

---

## Fase 95: Fix reprint short_name + quitar # del nombre en el ticket ✅

### Contexto
Dos reportes del usuario después de probar la Fase 94 en dispositivo:

1. **Bug** — en `TicketDetailActivity`, la vista en pantalla (`buildReceipt()`, arma `GroupedTicketItem` desde `orders.groupedForTicket()`) mostraba correctamente el `short_name`, pero el botón **"Reimprimir ticket"** imprimía el nombre completo. Causa: ese botón reconstruye `List<BatchItem>` a mano desde `orders` (línea ~187 de `TicketDetailActivity.kt`) para pasárselo a `PrintService.printTicket()`, y esa reconstrucción no copiaba `shortName` (ni `caseQty`, mismo bug de paso) — `BatchItem.shortName` quedaba en su default `null`, así que `PrintService`'s `groupedForTicket()` (overload de `BatchItem`) caía al fallback `productName` completo.
2. **Ajuste de formato** — el usuario no quería el número de línea corrido (`#`, agregado en la Fase 91) pegado al nombre del producto (`"1  Queso Fresco"`). El número de unidades/cajas/pesadas agrupadas (`"3 - Case/Unit"`, `"2 - 2.00 lb"`, ya existente desde antes de la Fase 91) debía seguir apareciendo, pero únicamente en esa línea de cantidad/tipo — nunca junto al nombre.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 95.1 | **Fix** — `shortName = o.shortName` (+ `caseQty = o.caseQty`, faltaba también) agregados a la reconstrucción manual de `BatchItem` en el botón "Reimprimir ticket" | `TicketDetailActivity.kt` | ✅ |
| 95.2 | Quitado el número de línea corrido (`itemNumber`) de la línea del nombre de producto — ahora solo imprime el nombre (con wrap si es largo), sin prefijo numérico | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 95.3 | Header de columna `"#  Desc"` → `"Desc"` (ya no hay `#` por fila junto al nombre) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 95.4 | `ITEM_NAME_WIDTH` (ticket impreso) — ya no reserva espacio para el prefijo `"N  "`, usa el ancho completo de línea (`LINE_WIDTH`) | `data/print/PrintService.kt` | ✅ |

**El número de cantidad/tipo (`"3 - Case/Unit"`, `"2 - 2.00 lb"`, sin cambios de lógica) sigue funcionando igual que antes de la Fase 91** — aplica a Case/Unit, Bucket (vía el mismo branch `else`) y Lbs (solo cuando `count > 1`), y es exactamente lo que el usuario pidió mantener: el número solo ahí, nunca en el nombre.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 96: Qty/W = cantidad total real (Case × unidades por caja), rate recalculado ✅

### Contexto
Pedido del usuario, después de la Fase 95: la columna Qty/W debía mostrar solo el número de la cantidad realmente seleccionada, sin texto de tipo/unidad ni desgloses (`"N - Case/Unit of Q"`, `"N - X.XX lb"`) — y para Case/Unit ese número **no** es la cantidad de cajas escaneadas sino el total de unidades individuales: "si tengo un case de 12 y selecciono 3 cajas son 36, eso va en el qty". Para Lbs y Bucket el número ya era el total real (peso sumado / conteo de buckets), sin necesidad de multiplicar nada más. El usuario confirmó explícitamente que el rate debe recalcularse sobre esa nueva base (`total / qty`), y el total de la línea no cambia.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 96.1 | `displayQty` nuevo por ítem: para categoría `"CASE/UNIT"` = `quantity * caseQty` (caseQty ausente/≤0 → ×1); para `"LBS"`/`"BUCKET"`/otras = `quantity` tal cual (ya es el total real) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 96.2 | `qtyStr` simplificado a solo el número — `"%.2f"` para categorías de peso, `"%d"` (entero) para el resto. Se eliminó el prefijo `"N - "` y el desglose `"of Q"` | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 96.3 | `rate` (columna del medio) recalculado como `total / displayQty` (antes `total / quantity`, es decir antes era precio-por-caja, ahora precio-por-unidad-individual cuando aplica el multiplicador de Case) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 96.4 | `unitLabel()` ya no se usa en la columna Qty/W (sigue usándose sin cambios en la línea de resumen al pie, `"XX.XX lb total"`) | ambos archivos | ✅ |

**Sin cambios** — encabezados de categoría (LBS/CASE-UNIT/BUCKET, solo se muestran si el pedido mezcla tipos), agrupación por producto/categoría, columna Total (sigue siendo el total real de la línea, no cambia con el recálculo de rate).

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 97: Prefijo "N -" (cantidad seleccionada) de vuelta antes del nombre del producto ✅

### Contexto
La Fase 95 había quitado el número de línea corrido (`itemNumber`, 1/2/3... por todo el ticket) de la línea del nombre porque no aportaba información útil. Después de ver el resultado, el usuario pidió agregar de vuelta un número ahí — pero **no** el número de línea, sino la cantidad de veces que ese producto se seleccionó/escaneó (ej. "1 -", "3 -"), que sí es información relevante. Aclaración importante: **no** es la misma cantidad que ahora vive en la columna Qty/W desde la Fase 96 (que ya viene multiplicada por unidades-por-caja para Case/Unit) — este prefijo es la cantidad "cruda" seleccionada (cajas/buckets elegidos, o pesadas individuales agrupadas para Lbs).

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 97.1 | `pickCount` nuevo por ítem: Lbs = `g.count` (pesadas individuales agrupadas); Case/Unit y Bucket = `g.quantity.toInt()` (unidades elegidas, sin multiplicar por unidades-por-caja) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 97.2 | Nombre del producto → `"$pickCount - $nombre"`, siempre (incluso si es 1, a diferencia del viejo formato pre-Fase 96 que solo mostraba el número en Lbs cuando `count > 1`) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 97.3 | Ticket impreso — `ITEM_NAME_WIDTH` vuelve a reservar espacio para el prefijo (`LINE_WIDTH - 4`, revertido de la Fase 95); el prefijo solo va en la primera línea si el nombre hace wrap | `data/print/PrintService.kt` | ✅ |

**No confundir con Qty/W (Fase 96)** — esa columna sigue mostrando la cantidad ya multiplicada/expandida (36 para 3 cajas de 12); este prefijo es un dato distinto (3, la cantidad seleccionada) que vive junto al nombre.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 98: Fix — header de categoría (CASE/UNIT, LBS, BUCKET) siempre visible en el ticket ✅

### Contexto
`showCategoryHeaders` (implementado desde antes de la Fase 91) solo mostraba el encabezado de categoría (`"CASE/UNIT"`, `"LBS"`, `"BUCKET"`) cuando el pedido mezclaba más de un tipo de producto — con un solo tipo (ej. 2 productos Case/Unit) el encabezado no aparecía. El usuario pidió que el header aparezca siempre, sin importar si hay uno o varios tipos en el pedido.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 98.1 | Quitada la condición `groupedByCategory.size > 1` — el header de categoría se imprime siempre, una vez por cada grupo | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |

Sin cambios en la línea de resumen al pie (`"22.80 lb total"` vs `"N items total"`), que sigue usando `groupedByCategory.size` para decidir si puede sumar cantidad+unidad o debe mostrar conteo de productos — esa lógica es independiente de si se muestra el header por categoría.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 99: Fix — factura QBO agrupa filas del mismo producto en una sola línea ✅

### Contexto
El usuario reportó: un producto por peso (ej. "Michoacano") pesado 10 veces por separado (10 filas en `orders`, una por cada pesada de 1 lb — así vive el carrito en Android, ver nota de `PendingOrderEntity.quantity` en `CLAUDE.md` del repo Android) aparecía en la factura de QuickBooks como **10 líneas separadas** (`"Michoacano - 1 lb a $3.49/lb", Qty 1, $3.49` × 10), mientras que el ticket de Android ya lo mostraba correctamente agrupado ("Michoacano", 10 lb, $3.49/lb, $34.90) desde antes (`GroupedTicketItem`/`groupedForTicket()`). El agrupado del ticket es solo de presentación en Android — nunca tocaba lo que se mandaba a QBO, así que la factura real seguía yendo desglosada fila por fila.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 99.1 | `createBatchInvoice()` — agrupa `items` por `qb_item_id + price` (mismo criterio de merge que usa Android en el carrito/ticket: mismo producto y mismo precio se suman, precio distinto no se mezcla) antes de armar las líneas de la factura; suma `quantity` y `total` de las filas agrupadas | `src/services/qbInvoices.ts` | ✅ |
| 99.2 | Cada línea de QBO ahora manda `Qty: <cantidad agrupada>` y `UnitPrice: <price>` (antes `Qty: 1, UnitPrice: item.total` por fila — un hack para que cada fila individual se viera como "1 x total"); `Amount` sigue siendo el total real de la línea agrupada | `src/services/qbInvoices.ts` | ✅ |

**Efecto:** con 10 pesadas de 1 lb a $3.49/lb, la factura ahora manda **una sola línea** `"Michoacano - 10 lb a $3.49/lb"`, `Qty: 10`, `UnitPrice: 3.49`, `Amount: 34.90` — igual a lo que ya mostraba el ticket. Aplica también a Case/Unit y Bucket si llegan varias filas del mismo producto al mismo precio (mismo criterio, aunque en el carrito normal ya se mergean al agregar — Fase 70 — así que en la práctica esto solo se nota con productos por peso, donde cada pesada es intencionalmente una fila separada).

**Sin cambios** — `createInvoice()` (factura de un solo ítem, usada por `syncEngine.ts`/retry individual) no aplica acá, no tiene el problema de filas múltiples. Las líneas de damage/crédito/descuento (dañados, `QB_CREDIT_ITEM_ID`, `QB_CREDIT_APPLY_ITEM_ID`) no se tocaron.

### SQL
Ninguno.

---

## Fase 100: Ticket — header de categoría enmarcado + "lb" de vuelta en Qty/W ✅

### Contexto
Dos mejoras visuales pedidas por el usuario sobre el ticket (impreso y en pantalla), después de ver la Fase 98/96 en uso real: (1) el nombre de categoría (`"LBS"`, `"CASE/UNIT"`, `"BUCKET"`) quedaba pegado al texto de alrededor y se perdía o confundía visualmente; (2) la columna Qty/W (Fase 96 la dejó como número puro) no dejaba claro que un valor como "105" era libras — pidió un indicador de unidad ahí.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 100.1 | Header de categoría enmarcado con separador arriba y abajo (`DASH`/`addSep(heavy=false)`) — queda como su propia sección, no pegado al resto | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 100.2 | Columna Qty/W — `"lb"` de vuelta solo para categorías de peso (`"105.00 lb"`); Case/Unit y Bucket quedan como número puro (`"36"`), sin sufijo — ya quedan claros con el nombre + header de categoría | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |

Verificado que `"105.00 lb"` no se trunca en el ticket impreso — el ancho izquierdo de `threeCol` (`LINE_WIDTH - midWidth(8) - rightWidth(9)` ≈ 12 chars) alcanza sin problema; en pantalla la columna izquierda de `addThreeCol` es de ancho flexible (`weight=1f`), sin riesgo de corte.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 101: Ticket — indicador corto de unidad en Qty/W para Case/Unit ("cs/unt") y Bucket ("bkt") ✅

### Contexto
Extensión directa de la Fase 100: el usuario pidió el mismo tipo de indicador de unidad que se agregó para Lbs (`"lb"`) también para Case/Unit y Bucket, pero abreviado ("con pocos caracteres") ya que comparte fila con rate/total en un ancho angosto.

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 101.1 | `shortQtyUnit(category)` nuevo — `"CASE/UNIT"` → `"cs/unt"` (ajustado tras feedback del usuario, antes `"cs"` a secas), `"BUCKET"` → `"bkt"`, cualquier otra categoría → primeras 3 letras en minúscula (fallback genérico) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 101.2 | Qty/W para categorías no-peso: `"36 cs/unt"`, `"2 bkt"` (antes número puro desde la Fase 96) | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |

Verificado que "36 cs/unt" (9 chars) y "2 bkt" (5 chars) entran sin truncarse en el ancho izquierdo de `threeCol` (~12 chars) del ticket impreso.

### SQL
Ninguno — cambios solo en código Android (Kotlin).

---

## Fase 102: Fix — dirección del cliente ausente en reprint + check number pisaba la dirección ✅

### Contexto
Tres bugs reportados por el usuario sobre el bloque "Customer" del ticket:

1. La línea `"Payment: Check (#$checkNumber)"` (Fase — commit `cd818ac`, "check number") se imprimía en un solo comando `T` de CPCL sin wrap. Con un número de cheque largo, la línea se salía del ancho físico de la página (`PAGE-WIDTH`) — la impresora la envolvía por su cuenta pero `y` (el cursor que controla dónde se dibuja lo siguiente) no avanzaba lo que la impresora de verdad imprimía, así que la dirección del cliente (que se dibujaba justo después) quedaba pisada por el texto desbordado del cheque. Mismo patrón de bug que la Fase 91.6.
2. Pedido explícito del usuario: el número de cheque debía ir en su propia línea, no pegado a "Payment: Check" en el mismo renglón.
3. Orden pedido del bloque cliente: Customer → Dirección → Payment → Check #, no Customer → Payment → Check # → Dirección (orden que tenía el ticket impreso desde la Fase de check number).
4. Bug más profundo, separado de los anteriores: `orders`/`pre_order_items` (MySQL) nunca guardaron la dirección del cliente — solo `customer_id`/`customer_name`. La dirección solo viajaba de forma efímera vía extras de Intent en Android, hilvanada desde `CustomerPickerActivity` → `CurrentOrderActivity` → ticket inmediato. En cuanto el usuario salía de esa cadena (ej. `HistoryActivity`/`ClientHistoryActivity` → `TicketDetailActivity` → "Reimprimir ticket", que abren el ticket a partir de `GET /api/orders`, sin dirección en el DTO) la dirección ya no existía en ningún lado y el reprint salía sin ella. `PreOrderDetailActivity` tenía el mismo problema pero peor — mandaba `customerAddress = null`/`""` siempre a impresión y a `OrderSuccessActivity`, porque `pre_orders` tampoco guarda dirección.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 102.1 | Nuevo endpoint `GET /api/customers/:customerId` — un solo cliente, cache-first contra `cached_customers` (ya tiene `address_line1`/`city`/`state_code`/`postal_code` desde la Fase de cache de clientes), fallback a QB (`paginatedQuery`) si no está cacheado. Sin cambios de esquema — reusa la tabla de cache existente. Se registra después de `/stats` y `/refresh` (rutas literales de un segmento) para no ser capturado por ellas. | `src/routes/customers.ts` | ✅ |

No se agregó `customer_address` a `orders`/`pre_order_items` a propósito — habría significado migración de esquema + repetir la dirección en cada fila (como `customer_name`) cuando ya existe una fuente de verdad (el cliente en QB) que se puede resolver bajo demanda con una sola llamada barata (cache-first).

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 102.2 | `ApiService.getCustomer(customerId)` — nuevo, `GET api/customers/{id}` → `Response<QbCustomer>` (reusa el modelo existente, con `fullAddress` ya calculado) | `data/network/ApiService.kt` | ✅ |
| 102.3 | `PrintService.kt`/`TicketDetailActivity.kt` — número de cheque en su propia línea indentada (`"Check #: $checkNumber"`, con `tWrapped`/`addLine(indent=true)`) en vez de pegado a `"Payment: Check"` | `data/print/PrintService.kt`, `TicketDetailActivity.kt` | ✅ |
| 102.4 | `PrintService.kt` — reordenado el bloque cliente del ticket impreso a Customer → Dirección → Payment → Check # (el ticket en pantalla ya tenía este orden) | `data/print/PrintService.kt` | ✅ |
| 102.5 | `TicketDetailActivity` — `customerAddress` pasó de `val` a `var`; si llega vacío y el batch tiene `customer_id` (siempre lo tiene, viene de `orders.customer_id`), se resuelve con `getCustomer()` y se reconstruye el recibo — mismo patrón ya usado para firma/damage vía `getBatchDamage`. Corre dentro del mismo bloque `if (batchId.isNotBlank())`, un solo rebuild combinando los 3 flags (`damageChanged`/`signatureChanged`/`addressChanged`) | `TicketDetailActivity.kt` | ✅ |
| 102.6 | `PreOrderDetailActivity` — nuevo campo `resolvedCustomerAddress`, resuelto una vez en `loadPreOrder()` vía `po.customerId` + `getCustomer()`; reemplaza los `customerAddress = null` hardcodeados en ambos prints (`doConvertAndPrintFirst`/`sendPaymentAndPrint`) y el `putExtra("customer_address", "")` hacia `OrderSuccessActivity` | `PreOrderDetailActivity.kt` | ✅ |

### SQL
Ninguno — sin cambios de esquema, ver nota arriba.

---

## Fase 103: Numeración de facturas editable desde Settings (invoice_counter) ✅

### Contexto
El usuario se quedó sin facturas físicas y pidió arrancar la numeración en un número específico (`#51640` → `#52551`). Hasta ahora `company_settings.invoice_counter` (el próximo `DocNumber` a asignar en QBO, incrementado en cada factura por `createBatch`/`retryBatchSync`/`convertPreOrder`/SyncEngine) solo se podía cambiar con un `UPDATE` manual en phpMyAdmin sobre producción. Se decidió exponerlo como campo editable en la webapp para que no dependa de acceso directo a la base de datos la próxima vez que se repita (se acaba una caja de facturas).

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 103.1 | Nuevo endpoint `PUT /api/settings/invoice-counter` (JWT + admin) — valida entero positivo y que el nuevo valor sea **estrictamente mayor** al actual (400 si no); bajarlo podría reasignar un `DocNumber` que QBO ya usó en una factura previa | `src/controllers/settingsController.ts`, `src/routes/settings.ts` | ✅ |
| 103.2 | Cambio registrado en `activity_log` (`action = 'INVOICE_COUNTER_UPDATED'`, `details` con `#actual → #nuevo`) para auditoría — es un valor sensible que afecta numeración fiscal | `src/controllers/settingsController.ts` | ✅ |

`GET /api/settings` no cambió — ya devolvía `invoice_counter` vía `SELECT *`.

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 103.3 | Card "Invoice numbering" en Settings — próximo número actual + input para el nuevo valor (validación en vivo: debe ser mayor al actual) + botón, visible solo si `getUserInfo().role === 'admin'` | `app/settings/_components/SettingsClient.tsx` | ✅ |
| 103.4 | Modal de confirmación antes de aplicar el cambio (mismo patrón visual que `DeleteModal` de `UsersClient.tsx`, en ámbar en vez de rojo por no ser una acción destructiva) | `app/settings/_components/SettingsClient.tsx` | ✅ |
| 103.5 | Claves i18n `cfg_invoice*` (`es`/`en`) | `app/lib/i18n.ts` | ✅ |
| 103.6 | `CompanySettings` gana `invoice_counter: number` | `app/settings/page.tsx` | ✅ |

`bun run build` corrió limpio después del cambio.

### Pendiente, no cerrado en esta fase
`GET /api/settings` sigue sin `adminOnly` en el backend — un operador que navegue directo a `/settings` por URL puede ver la página (el link está oculto en el sidebar, pero a diferencia de `/dashboard` la ruta no redirige). La card de facturación se ocultó igual con el chequeo de rol en cliente, y el `PUT` en sí ya está protegido por `adminOnly`, pero la inconsistencia general de la página queda para después — ver `excellentia-webapp/CLAUDE.md`.

### SQL
Ninguno — `company_settings.invoice_counter` ya existía desde antes de esta fase.

---

## Fase 104: Pre-órdenes — visibilidad restringida al vendedor asignado ✅

### Contexto
El usuario (admin) pidió que una pre-orden que él crea o asigna a un vendedor específico solo la pueda ver ese vendedor (además de los admins) — el resto del equipo no debía verla en su lista aunque estuviera activa. Antes, `listPreOrders` solo filtraba por `user_id` (el creador), así que una pre-orden creada por un admin para que la viera un vendedor específico no aparecía en la lista de nadie más que la del propio admin. Además, ninguno de los endpoints de acceso por ID (`getPreOrder`/`updatePreOrder`/`deletePreOrder`/`convertPreOrder`) verificaba ownership — cualquiera con sesión válida podía ver/editar/convertir/cancelar cualquier pre-orden con solo conocer el ID, aunque no le apareciera en su lista.

Primer diseño: campo separado "Asignar a" (admin-only) en `CreatePreOrderActivity`. El usuario pidió simplificarlo — reusar el picker de "Vendedor" que ya existía (antes solo guardaba el nombre como texto libre para el ticket impreso) para que también determine la visibilidad, sin agregar un campo nuevo en la UI.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 104.1 | Columna `pre_orders.assigned_user_id` (nullable, sin FK) — id real del usuario elegido como vendedor | `src/routes/setup.ts`, `src/db/schema.sql`, `excellentia_schema.sql` | ✅ |
| 104.2 | `createPreOrder`/`updatePreOrder` aceptan `assigned_user_id` en el body y lo persisten (lo manda el picker de vendedor de Android, no un campo separado) | `src/controllers/preOrderController.ts` | ✅ |
| 104.3 | `listPreOrders` — un no-admin ahora solo ve pre-órdenes donde `user_id = él mismo` **o** `assigned_user_id = él mismo`; admin sigue viendo todo sin filtro | `src/controllers/preOrderController.ts` | ✅ |
| 104.4 | `canAccessPreOrder()` — nuevo helper, usado en `getPreOrder`/`updatePreOrder`/`deletePreOrder`/`convertPreOrder` para devolver 403 si el usuario no es admin ni el creador ni el asignado | `src/controllers/preOrderController.ts` | ✅ |

### Android

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 104.5 | `showSalespersonPicker()` — además de `salesperson_name` (texto para el ticket), ahora también captura el `id` real del usuario elegido (`selectedSalespersonUserId`) y lo manda como `assigned_user_id` en el request | `CreatePreOrderActivity.kt` | ✅ |
| 104.6 | `PreOrderRequest` gana `assigned_user_id: Int?` | `data/Models.kt` | ✅ |

### SQL
```sql
ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS assigned_user_id INT DEFAULT NULL AFTER user_id;
```

---

## Fase 105: Separación SKU (QBO) vs Barcode (interno) + nomenclatura NEW_SKU ✅

### Contexto
`products.barcode` hacía dos trabajos a la vez: código físico escaneado con el TC22 Y el campo que sincronizaba como `Sku` en QuickBooks. El usuario quería generar una nomenclatura de SKU propia (marca + secuencia, ej. `REY001`) sin perder el barcode físico ya asignado. Investigación (Context7 + búsqueda web, documentación oficial de Intuit) confirmó que la API de QBO **no tiene un campo de barcode nativo** en el objeto `Item` — solo expone `Sku` — así que la separación era la única forma limpia de lograrlo sin que ambos usos sigan pisándose.

Para saber qué nomenclatura nueva asignar a cada producto, se comparó el export completo de QuickBooks (`ProductServiceList__QBO.xls`, 191 productos tipo Inventory, se excluyeron 31 líneas tipo Service que son cargos/créditos/entradas contables) contra la lista de precios en PDF de Excellentia Foods (127 productos, 4 páginas) — sin SKU en común entre ambos archivos, el match se hizo por texto (nombre/descripción tokenizado, similitud de Jaccard) + cercanía de precio, con asignación 1:1 (bipartita greedy) y verificación manual de todos los casos de score bajo/ambiguo (variantes de sabor muy parecidas entre sí, ej. las 6 salsas de 16oz de El Campestre, o productos sin contraparte real en QBO como "Ghost Pepper" que no existe como SKU). Resultado: master sheet en Excel (`Master Product Comparison - Excellentia vs QBO.xlsx`, entregado en Downloads) con 195 filas — 123 coincidencias, 68 solo en QBO, 4 solo en la lista de Excellentia sin contraparte detectada.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 105.1 | Columna `products.sku` (nueva, UNIQUE) — backfill inicial copiando `barcode` (que hasta este punto *era*, de hecho, el SKU histórico de QBO) | `src/routes/setup.ts`, `src/db/schema.sql`, `excellentia_schema.sql`, `src/types/index.ts` | ✅ |
| 105.2 | `syncProducts`/`syncProductsFromQbo` — leen/escriben `sku` en vez de `barcode`; un producto nuevo importado de QBO llega ahora con `barcode = NULL` (no tiene fuente en QBO) | `src/controllers/qbController.ts`, `src/services/syncEngine.ts` | ✅ |
| 105.3 | `createProduct`/`updateProduct` — `sku` y `barcode` ahora son campos independientes; el push a QBO (`updateItemMeta`) se dispara cuando cambia `sku`, ya no cuando cambia `barcode` | `src/controllers/productController.ts` | ✅ |
| 105.4 | Nomenclatura NEW_SKU (prefijo de marca + secuencia de 3 dígitos, ej. `REY001` = Reynaldo's) calculada para las 195 filas del master sheet — orden de numeración: orden de impresión del PDF primero (por marca), alfabético para lo que solo existe en QBO | Master sheet (Excel, generado fuera del repo) | ✅ |
| 105.5 | `POST /api/products/migrate-sku` (admin-only, paginado `offset`/`limit` para no exceder el timeout del proxy de cPanel, dry-run por default — `?apply=true` para escribir) — adopta el NEW_SKU calculado en `sku` (con push a QBO, secuencial + pausa de 400ms entre llamadas); solo llena `unit`/`qty` si el producto no tenía nada asignado, nunca pisa un valor ya guardado. Reemplazó un script standalone (`bun run`) que se descartó porque cPanel no da acceso a terminal para correrlo ahí | `src/controllers/productController.ts`, `src/routes/products.ts`, `src/data/sku-migration-input.json` (datos de las 195 filas, importado directo en el bundle de producción — no se lee de disco en runtime) | ✅ |

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 105.6 | Campo SKU nuevo en el modal de edición (separado de Código de barras) y columna nueva en la tabla de productos | `app/products/_components/ProductModal.tsx`, `ProductRow.tsx`, `ProductsClient.tsx`, `app/products/page.tsx` | ✅ |
| 105.7 | Traducciones `prod_colSku`/`modal_sku`/`modal_skuPh` (es/en); texto de "Requisitos de QuickBooks" corregido (ya no dice que el barcode va en el campo SKU) | `app/lib/i18n.ts` | ✅ |

`bun run build` corrió limpio en ambos repos después de los cambios.

### SQL
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE AFTER barcode;
UPDATE products SET sku = barcode WHERE sku IS NULL AND barcode IS NOT NULL;
```

### Pendiente, no cerrado en esta fase
Las 4 filas del master sheet que solo existen en la lista de precios de Excellentia (sin contraparte detectada en QBO — ej. "Quesos para Freir Tio Francisco", "Chile Relleno") no tienen fila en `products` (nunca se importaron de QBO) — `migrate-sku` las reporta pero no puede actualizarlas. Si son productos reales que faltan en el catálogo, hay que crearlos primero en QBO y sincronizar antes de que el NEW_SKU les aplique.

---

## Fase 106: Endurecimiento del endpoint `migrate-sku` — re-corridas seguras y visibilidad por fila ✅

### Contexto
Revisión de `POST /api/products/migrate-sku` (Fase 105) antes de la corrida real en cPanel. Se detectaron 3 gaps:

1. **Push a QBO fallido no reintentable**: la decisión de push dependía de `product.sku !== new_sku`. Si el UPDATE local aplicaba pero el push a QBO fallaba, al re-correr la misma página el sku local ya era el nuevo → el push se omitía → desync permanente hasta editarlo a mano.
2. **Un fallo de MySQL por fila reventaba la página**: el `UPDATE` no tenía try/catch por fila. Un choque del `UNIQUE` en `products.sku` (ej. dos filas del JSON con el mismo `new_sku`, o un sku ya usado por otro producto) abortaba la página entera con 500, sin `next_offset` ni visibilidad de qué fila falló.
3. **Sin detección de duplicados en el input**: el JSON podía contener `new_sku` repetidos sin aviso.

### Backend

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 106.1 | Push a QBO decidido contra el Sku **vivo** del item (`getItemById`), no contra el sku local — re-corridas reintentan pushes que fallaron antes (auto-curativo); si QBO no responde se asume push y el fallo se reporta por fila | `src/controllers/productController.ts` | ✅ |
| 106.2 | try/catch por fila: un error de MySQL/QBO en una fila se reporta (`status:'error'`, `db_error`) sin abortar la página | ídem | ✅ |
| 106.3 | Duplicados de `new_sku` en `sku-migration-input.json` detectados sobre el archivo completo (primera aparición gana) + `warnings.duplicate_new_skus` en la respuesta | ídem | ✅ |
| 106.4 | Pre-check de colisión `SELECT id FROM products WHERE sku = ? AND id <> ?` antes del UPDATE, con mensaje claro por fila (el `UNIQUE` ya la atrapaba, pero solo con 500 global) | ídem | ✅ |
| 106.5 | Contrato de respuesta enriquecido (compatible hacia atrás): `status` por fila (`applied`/`dry_run`/`skipped`/`error`), `db_error`, `qbo_status` (`synced`/`needs_push`/`no_qb_item_id`/`unverified`), `warnings`, `summary.db_failed`; `qbo_push` en dry-run ahora es siempre `skipped` (antes simulaba `ok`) — la predicción vive en `qbo_status` | ídem | ✅ |
| 106.6 | **Fix bug silencioso de QBO writes**: `qbItems.ts` usaba `makeQboApiCall` (exportada por `qbAuth.ts`) sin importarla — `getItemById`/`findItemBySku`/`getInventoryAccountRefs` reventaban en runtime con `ReferenceError: makeQboApiCall is not defined`. Dejó de detectarse porque `bun build` no hace type-check (el error solo aparecía en tsc). Consecuencia en producción: **todos los writes a QBO fallaban silenciosamente** (editar nombre/SKU/precio/stock de un producto desde la webapp nunca llegaba a QBO; solo warning en el log). El sync de lectura (QBO→MySQL) no estaba afectado (`paginatedQuery` vive en `qbAuth.ts`, donde la función está en scope). Se detectó porque la migración dry-run reportaba `qbo_status:"unverified"` en todas las filas con `qb_item_id` — el GET de verificación (Fase 106.1) convertía el bug en visible. Fix de una línea: agregar el import. Igual que el error de `creditApplied` y los demás pendientes de tsc, conviene limpiarlos para que vuelvan a asomar errores nuevos | `src/services/qbItems.ts` | ✅ |

`bun x tsc --noEmit`: 0 errores nuevos (los 12 errores restantes del repo son preexistentes en otros archivos: `orderController`, `qbController`, `qbAuth`, `qbItems`, `auth`, `customers` — no relacionados).

### Nota de uso
Sigue igual: `?apply=true&offset=0&limit=25`, pegar la URL siguiendo `next_offset` hasta `null`. Para verificar la auto-curativa: correr una página con token QB inválido (pushes fallan), restaurar el token y re-correr la misma página — la segunda corrida empuja los skus pendientes (`qbo_push:'ok'`).

---

## Fase 107: Cierre migración NEW_SKU — barcodes duplicados del master sheet + remediación ✅

### Contexto
Corrida 2 en producción de `migrate-sku` tras extender el JSON a 198 filas (+MIS128 Chicharron con barcode `CHICHA-01`, +COR006 Cotija Molido Rincon 40#, +MIS129 Ham Virginia) y agregar el tercer fallback de match `name_normalized` al matcher (los nombres del master sheet traen prefijo `Units:`/`Pounds:`/`Case/Bucket:`/`Case:` que los productos locales no tienen — sin esto, las filas con `qbo_sku` null quedaban not_found sin razón). Resultado: 63 productos actualizados, 61 pushes a QBO OK, 0 db_failed, 2 fallos de push esperados (COR006/MIS129 — items borrados en QBO, `qb_active=0`, skus locales aplicados igual).

La query de revisión post-corrida dejó 22 items Service sin NEW_SKU + 3 productos reales (344/369/377) → destapó un **defecto del master sheet**: barcodes duplicados entre filas.

### Causa raíz — overwrite por barcode duplicado
El matcher prioriza barcode. Seis pares de filas del master sheet comparten el mismo `qbo_sku`; ambas matchean al MISMO producto local (holder) y la segunda aparición pisa el sku que la primera acaba de aplicar:

| qbo_sku compartido | Fila A (correcta) | Fila B (pisa) | Holder |
|---|---|---|---|
| 091945108937 | MIS045 Pepper Jack | MIS046 Sharp | 362 |
| 091945900319 | MIS055 Quesadilla 2lb | MIS056 Monterey Jack 2lb | 376 |
| 091945160201 | MIS071 Medium Bar 1lb | MIS072 Mild Bar 1lb | 483 |
| GS1 01000486…025198 | REY001 Beef Chorizo | REY010 Soy Chorizo | 328 |
| 24622563699 | MIS007 Chicharron | MIS083 ChicharronPierna | 441 (correcto de casualidad) |
| 091945200501 | MIS048 Italian | MIS053 Mexican 2lb | 494 |

Además, **366 "DF Shredded Mexican 2lb"** (qb 448) quedó `barcode=NULL, sku=NULL`: era el destinatario real de MIS053 pero no tiene barcode y su fila fue consumida por 494. No apareció en la query de revisión por la trampa SQL clásica: `NULL NOT REGEXP ...` da NULL → la fila se filtra. Toda query de verificación debe usar `(sku IS NULL OR sku NOT REGEXP '^[A-Z]{3,4}[0-9]{3}$')`.

### Remediación — parche del JSON + re-corrida (no edición manual)
Editar a mano desde la webapp era inviable: el modal bloqueaba guardar cualquier campo si el stock precargado era negativo (ver 107.1), y cada guardado manda `stock` en el body — un workaround SQL (stock=0 → editar → restaurar) habría empujado `QtyOnHand=0` a QBO vía `updateItemQtyOnHand`. En su lugar se parcharon las 5 filas "segundas" del JSON para que apunten a su destinatario real:

| Fila | qbo_sku parcheado → | Matchea |
|---|---|---|
| MIS046 | `'DF-01'` | 377 por barcode |
| MIS056 | `'DF-46'` | 369 por barcode |
| MIS072 | `'DF-21'` | 344 por barcode |
| REY010 | `null` | nombre normalizado sin match local → not_found inofensivo |
| MIS053 | `null` | nombre normalizado "DF Shredded Mexican 2lb" → 366 |

Las filas primeras quedan intactas: la re-corrida completa reaplica MIS045→362, MIS055→376, MIS071→483, REY001→328, MIS048→494 y MIS083→441 (doble-write transitorio MIS007/MIS083 sobre 441 que converge por orden del archivo). Con el parche, **el JSON queda consistente para siempre — cualquier re-corrida futura es segura**.

Decisiones del cierre: ocultar los 22 Services con `hidden=1` (local, no toca QBO); MIS128 asignado al Chicharron item 8; los ~110 items "(deleted)" de QBO se dejan como están. Mejora `extractQboErrorMessage` en migrate-sku salteada a propósito (endpoint retirado tras esta corrida).

### Webapp

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 107.1 | Modal de productos bloqueaba guardar TODO si el stock precargado era negativo — dos capas: validación JS (`stock < 0` sobre el valor cargado del form) + validación nativa del navegador (`min="0"` en el input, form sin `noValidate`). Fix: la validación JS solo aplica si el valor cambió respecto al producto cargado; se quitó `min="0"` del input (el guard JS sigue activo para valores nuevos escritos por el usuario) | `excellentia-webapp/app/products/_components/ProductModal.tsx` | ✅ |
| 107.2 | Orden por secuencia de SKU en la tabla de productos: `GET /api/products` acepta `?sort=sku` (prefijo de marca A-Z, luego número 001, 002…; filas sin NEW_SKU válido al final por `created_at DESC`). Opt-in para no cambiar el orden que ve Android (default sigue `created_at DESC`). La webapp lo pide siempre en `/products` | `src/controllers/productController.ts` (`listProducts`) + `excellentia-webapp/app/products/_components/ProductsClient.tsx` | ✅ |

### Operativo (producción) — ejecutado y verificado ✅
1. **Primer lote de Services** (22 items): `UPDATE ... SET hidden = 1` por nombre (`Cases%`, Case/Bucket, Delivery, Discount, Freight, Freight Charge, Labor, Bounce Check Charge, Bounced Check, Bounced Check Fee, Reimbursable Expense Item, Rent, Sales).
2. **Segundo lote**: la query de revisión original tenía la trampa NULL (`sku NOT REGEXP` sin guard `sku IS NULL OR`) y el sync automático además había importado items nuevos creados por la integración QBO↔Shopify. El diagnóstico NULL-safe destapó 17 filas visibles sin NEW_SKU: 5 productos reales (344, 366, 369, 377 y el hallazgo **408 Soy Chorizo Rey**, destinatario real de REY010 — el parche `qbo_sku=null` hizo que matchee por nombre normalizado) + 12 basura ocultada por ids explícitos (`id IN (297,326,460,461,462,463,464,465,466,467,468,512)` — Pounds, Units, Services, Shipping, Shopify ×6, Spoils charge, Walmart sls chargeback). Solo local — no se tocaron los flags Active en QBO (Shopify los necesita activos).
3. **Re-corrida final**: 198 filas · 14 aplicadas · 12 push OK · 2 push fallidos esperados (COR006/item 447 y MIS129/item 450, borrados en QBO) · 4 not_found conocidos (TIO005, COR004, CAM004, MIS049) · 0 error_db. Los 10 fixes verificados con product_id correcto; el doble-write transitorio MIS007/MIS083 sobre 441 convergió a MIS083.
4. **Verificación final NULL-safe = 0 filas** — todo producto visible y activo tiene NEW_SKU.
5. Deploy webapp en producción: fix del modal (107.1) + orden por SKU (107.2).

Nota menor: el comentario del endpoint decía "GET/POST" pero la ruta es POST-only (`routes/products.ts`) — un fetch sin `method:'POST'` da 404. Comentario corregido.

---

## Fase 108: Búsqueda por SKU en Android + webapp ✅

Con la migración NEW_SKU cerrada (Fase 107), el SKU (`MIS045`, `REY001`…) se vuelve el identificador útil para humanos — pero ningún buscador lo conocía:

| Superficie | Antes | Ahora |
|---|---|---|
| Backend `GET /api/products?search=` (`listProducts`) | `name LIKE` OR `barcode LIKE` | + `sku LIKE` — beneficia Android online y webapp `/products` |
| Webapp `/products` (buscador) | nombre/barcode | también SKU (automático vía backend) |
| Android online (`searchProducts`) | ídem | ídem (automático vía backend) |
| Android offline (SQLite `cached_products`) | sin columna `sku`; búsqueda barcode/name | columna nueva + `OR sku LIKE` |

### Cambios

**Backend** (`excellentia/`)
- `productController.ts` (`listProducts`): tercera condición `sku LIKE ?` en el filtro de búsqueda.

**Android** (`androidStudioProjects/test/`)
- `AppDatabase.kt`: columna `sku TEXT` en CREATE TABLE + `DATABASE_VERSION 14→15` con `ALTER TABLE cached_products ADD COLUMN sku TEXT` (patrón try/catch existente).
- `CachedProductEntity.kt` / `Models.kt` (`ProductDto`): campo `sku` (nullable, default null — compatible hacia atrás con respuestas viejas).
- `ProductDao.kt`: upsert guarda `sku`, `cursorToEntity` lo lee (guard por índice), `searchByQuery` agrega `OR sku LIKE ?`.
- `ProductRepository.kt` / `OrderRepository.kt` (`prefetchAllProducts`): mapean `dto.sku` al cachear.
- `MainActivity.kt`: `SuggestionItem.sku` + SKU visible en las etiquetas de resultados del diálogo de entrada manual y del buscador por nombre (`nombre · $precio/lb · barcode · SKU`).

### Notas
- La columna `sku` del cache queda poblada con el primer `prefetchAllProducts` completo tras actualizar la app (o a medida que escaneen productos).
- Los otros 3 diálogos de búsqueda (CurrentOrder/CreatePreOrder/IssueCredit) buscan por SKU vía backend pero sus etiquetas siguen mostrando barcode — extender si hace falta.
- Compilación: tsc limpio (9 errores preexistentes), `gradlew :app:compileDebugKotlin` OK.

---

## Fase 109: Ticket ZQ630 Plus — letra más chica (Font 7) + aprovechamiento del ancho del papel ✅

Proyecto Android (`androidStudioProjects/test`), único archivo tocado: `data/print/PrintService.kt`. El ticket se genera en CPCL y se manda por Bluetooth SPP.

### Contexto
Pedido: achicar la letra del ticket impreso. El cuerpo usaba solo la Font 4 (17×27px) vía comando CPCL `T {font} 0 x y texto`. Limitación descubierta: **las fuentes bit-mapped de CPCL son de tamaño fijo** — mover constantes de layout (`F4H`, gaps) nunca achica los glifos, solo reacomoda líneas. La spec del ZQ630 Plus lista 25 fuentes bit-mapped + 1 escalable (CG Triumvirate Bold Condensed), pero el código comentaba "solo font 4 y 7 disponibles" (elección histórica, no límite real).

### Probe 1 — fuentes residentes (temporal en `buildTestCpcl`, luego revertido)
Por cada número candidato imprimía una etiqueta en F4 + 50 dígitos (`0123456789|`×5, grupos de 10 para contar) + una línea F7 tras `SETMAG 1 1`.

Hallazgos:
- **En este firmware la Font 7 es una condensada MÁS CHICA que la Font 4** (~40 dígitos entran en PAGE-WIDTH vs 33; glifos visiblemente más bajos). Las tablas de Zebra que listan la Font 7 como 28×44px **NO aplican a este firmware** — el comentario viejo del código heredaba ese dato equivocado.
- `SETMAG 1 1` no le hace nada (= tamaño base); no es palanca para achicar más.
- ⚠️ **Los resultados de F0–F6, F20–F26 y F55 nunca se recolectaron** — el usuario solo reportó F4 y F7. El probe es trivial de re-crear; conviene reimprimirlo antes de cualquier otro cambio de tipografía (ver "Caminos futuros").

### Probe 2 — ancho físico del papel (temporal, luego revertido)
Papel real medido: **102mm ≈ 816 dots** (la ZQ630 Plus es de 4", hasta 104mm imprimibles) — el `PAGE-WIDTH 576` histórico era un valor de impresora de 3", dejaba ~15mm muerto por lado. Con página a 816 entraban separadores "=" de hasta 56 chars. Además se confirmó el comportamiento del origen: con página ancha, **x=0 queda pegado al borde físico izquierdo** (cero padding a la izquierda observado; el sobrante cae todo a la derecha).

### Cambios finales

| Constante | Antes | Ahora | Nota |
|---|---|---|---|
| Fuente del cuerpo | `F4 = 4` | `BODY_FONT = 7` | condensada más chica en este firmware |
| Ancho de carácter | 17px | `BODY_CHAR_PX = 15` | conservador: dígito real ≈14.2–14.4px; la fuente es proporcional y hay letras más anchas |
| Alto de línea | `F4H = 34` | `BODY_H = 28` | estimado — afinar con ticket físico si el espaciado se ve mal |
| PAGE-WIDTH | 576 | `PW = 800` | ~1mm de holgura física por lado sobre el papel de 102mm |
| Padding lateral | inexistente (x=0) | `X_LEFT = 48` | ~6mm + ~3mm propios del borde físico ≈ 9mm visual; los anchos de texto derivan del interior `(PW - 2*X_LEFT)` |
| MAX_LINE_CHARS | 33 | 46 | `(PW - 2*X_LEFT) / BODY_CHAR_PX` |
| LINE_WIDTH | 29 | 42 | colchón −4 bajo MAX |
| ITEM_NAME_WIDTH | 25 | 38 | |
| SEP / DASH | 32 chars | **56 chars** | desacoplados de LINE_WIDTH (ver decisión 1) |
| QR términos | 320px | 500px | centrado sobre el mismo eje que la caja interior |
| Firma | 480px | 700px | ≤ ancho interior (704px) |

### Decisiones
1. **Separadores desacoplados de LINE_WIDTH**: son puro "=", de ancho conocido (~11.5–12px real, deducido del gap derecho observado con 52 chars). Pueden ser más largos que las líneas de texto sin riesgo de envolver; el texto conserva su colchón porque la Font 7 es proporcional.
2. **Padding manual con X_LEFT**: CPCL no centra contenido; el origen pega al borde físico. Todo `t()`/`tWrapped()` usa `X_LEFT` (o `X_LEFT + 4` para indentados), y los anchos salen del ancho interior.
3. Error transitorio durante la edición: SEP quedó un momento con `#` en vez de `=` — detectado y corregido antes de compilar; longitudes verificadas por script (56 exacto).
4. Compilación verificada en cada paso (`gradlew compileDebugKotlin`, `JAVA_HOME` = JBR de Android Studio). Los dos probes quedaron revertidos: "imprimir prueba" saca el ticket simple.

### Ajuste fino pendiente (knobs)
- Espaciado vertical raro → tocar `BODY_H` (28 es estimado).
- Sobra aire a la derecha en texto → `BODY_CHAR_PX` 15→14 (líneas 46→50 chars).
- Más/menos padding lateral → `X_LEFT` (8 dots = 1mm).

### Caminos futuros para el tamaño de letra (documentados, NO implementados)
1. **Revisar las fuentes F0–F26/F55 del probe 1** — sus resultados jamás se recolectaron; alguna podría ser más chica o más grande que F7 sin ningún comando extra. Es el paso más barato: re-imprimir el probe y contar dígitos por fuente.
2. **`SETMAG`** para agrandar sin cambiar de fuente: `SETMAG 2 2` duplica ancho+alto (solo pasos enteros — no hay 1.25×/1.5×); también desigual (`2 1`/`1 2`). Es comando de estado: afecta a las líneas siguientes hasta el próximo SETMAG, así que puede aplicarse por sección (ej. TOTAL grande y resto normal). Efecto sobre F7 sin confirmar (el probe solo probó magnitud 1).
3. **Migración a ZPL**: `^A0N,alto,ancho` da tamaño exacto en dots (+15%, +30%, lo que sea) — requiere reescribir el generador (`buildCpcl` → `buildZpl`, gráficos EG → `^GF`). Solo si 1 y 2 no alcanzan.

---

## Fase 110: Claude Design — aplicación completa del design system (Android) ✅

Proyecto Android (`androidStudioProjects/test`). Se importó el mockup **"Mockup 2.0 Excellentia Brand"** (Claude Design, proyecto `39861b3e-28ce-4eb3-8563-18b4ed81b69b`) vía MCP `DesignSync`, y se revisó pantalla por pantalla contra las 16 pantallas del mockup, más diálogos nativos y notificaciones — sesión larga, resumida por área.

### Íconos cruzados (el nombre del archivo no coincidía con el glyph real dentro)

| # | Bug | Archivo | Estado |
|---|---|---|---|
| 110.1 | `ic_add_cart.xml` (nav "Pedido") tenía un ícono de refresh — reemplazado por un carrito real | `drawable/ic_add_cart.xml` | ✅ |
| 110.2 | `ic_history.xml` (nav "Historial") tenía una tarjeta de crédito — reemplazado por un reloj | `drawable/ic_history.xml` | ✅ |
| 110.3 | `ic_credit_card.xml` ("Agregar crédito") tenía un carrito — reemplazado por una tarjeta real | `drawable/ic_credit_card.xml` | ✅ |
| 110.4 | `ic_settings.xml` (nav "Ajustes") era el engranaje clásico — reemplazado por el ícono de sliders del mockup | `drawable/ic_settings.xml` | ✅ |
| 110.5 | `ic_schedule.xml` ("Pre-órdenes" en home) era un reloj — reemplazado por un calendario | `drawable/ic_schedule.xml` | ✅ |
| 110.6 | Editar/Borrar en pedido actual usaban lápiz-de-compras y signo "−" — nuevos `ic_edit.xml` / `ic_delete.xml` | `item_pending_order.xml` | ✅ |
| 110.7 | "Reimprimir" / "Imprimir página de prueba" usaban un ✓ — nuevo `ic_print.xml` | `activity_ticket_detail.xml`, `activity_settings.xml` | ✅ |
| 110.8 | Error de login usaba el ícono de éxito (✓) en rojo — nuevo `ic_error.xml` | `activity_login.xml` | ✅ |
| 110.9 | Buscador de clientes usaba el ícono de "producto" — nuevo `ic_search.xml` | `activity_customer_picker.xml` | ✅ |
| 110.10 | Botones home "Entrada manual / Pre-órdenes / Agregar crédito": en mayúsculas el texto no entraba en una línea (11sp) — bajado a 10sp + padding horizontal reducido | `activity_main.xml` | ✅ |

### Diálogos nativos, Snackbar y notificaciones

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.11 | `ThemeOverlay.Excellentia.MaterialAlertDialog` — título en fuente After verde, botón positivo verde sólido, negativo/neutral navy sólido (antes texto plano sin relleno), esquinas rectas, gap de 8dp entre botones | `themes.xml` | ✅ |
| 110.12 | `DatePickerDialog` nativo (fecha de entrega, pre-órdenes) — acento verde vía `android:datePickerDialogTheme` | `themes.xml` | ✅ |
| 110.13 | Snackbar global — verde oscuro (`ex_green_deep`) + acción en dorado, vía `snackbarStyle`/`snackbarTextViewStyle`/`snackbarButtonStyle` (antes gris/negro de Material) | `themes.xml` | ✅ |
| 110.14 | Único `AlertDialog.Builder` suelto de la app (selector de vendedor, Crear pre-orden) no heredaba el tema — cambiado a `MaterialAlertDialogBuilder` | `CreatePreOrderActivity.kt` | ✅ |
| 110.15 | Diálogos "sin impresora configurada" usaban el ícono de alerta de stock Android — nuevo `ic_alert.xml` en dorado | `CurrentOrderActivity.kt`, `PreOrderDetailActivity.kt` | ✅ |
| 110.16 | Notificación "pedido sincronizado" usaba el ícono de sistema (ⓘ) — ahora `ic_check` + color verde de marca | `NotificationHelper.kt` | ✅ |
| 110.17 | Diálogo de ítems dañados — filas sueltas sin card → wrapper con borde; hint de texto plano → banner con fondo tinte-danger | `CurrentOrderActivity.kt` (`askDamagedItems`) | ✅ |

### Bug crítico — modo oscuro del sistema rompía todo el tema

| # | Bug | Archivo | Estado |
|---|---|---|---|
| 110.18 | `values-night/themes.xml` redefinía `Base.Theme.Test` con solo 2 líneas — cualquier dispositivo con modo oscuro del sistema activado perdía diálogos, Snackbar, esquinas rectas y colores de marca (volvía al Material genérico morado/teal). Eliminado por completo: la app tiene un solo look de marca fijo, no debe adaptarse al modo oscuro del sistema | `values-night/themes.xml` (borrado) | ✅ |

### Login — reconstrucción completa de los inputs

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.19 | `TextInputLayout` (modo outline) recortaba el label de arriba al combinarse con esquinas rectas (0dp) — bug del cálculo del "notch" del borde de Material. Se probó deshabilitar la animación (peor) y un radio de 1dp (no confirmado). Solución final: reconstruir los 3 campos (URL servidor, email, contraseña) **sin** `TextInputLayout` — caja con borde dibujado a mano (`bg_input_field*.xml`), label fijo en mayúsculas arriba, `EditText` plano abajo | `activity_login.xml`, `LoginActivity.kt` | ✅ |
| 110.20 | Reconstruido a mano lo que daba gratis `TextInputLayout`: borde verde al enfocar, borde rojo en error de credenciales (con reset al reenfocar), mostrar/ocultar contraseña | `LoginActivity.kt` | ✅ |
| 110.21 | Mismo patrón (caja + label fijo, sin `TextInputLayout`) aplicado a **todos** los demás campos de la app: Cambiar contraseña (3 campos, c/u con su ojo), Ajustes (URL backend), selector de clientes (buscador), Crear pre-orden (notas), y los 3 diálogos con input (entrada manual, editar peso con sufijo "lb", editar precio con prefijo "$") | `activity_change_password.xml`, `ChangePasswordActivity.kt`, `activity_settings.xml`, `activity_customer_picker.xml`, `activity_create_pre_order.xml`, `CreatePreOrderActivity.kt`, `dialog_manual_entry.xml`, `dialog_edit_weight.xml`, `dialog_edit_price.xml` | ✅ |

### Otros fixes de pantalla

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.22 | "Venta completada": el check estaba dentro de 2 círculos anidados (uno con su propio círculo interno) — un solo círculo con `ic_check` (check simple, sin círculo propio) | `activity_order_success.xml` | ✅ |
| 110.23 | El círculo verde del check no se veía verde — `app:backgroundTint` no aplica sobre un `FrameLayout` plano (AppCompat solo lo intercepta en widgets específicos); cambiado a `android:backgroundTint` (atributo nativo, funciona en cualquier View) | `activity_order_success.xml` | ✅ |
| 110.24 | Banner "pendiente de sincronizar" persistente (antes un Snackbar transitorio) + fila de método de pago en el resumen de venta completada | `activity_order_success.xml`, `OrderSuccessActivity.kt` | ✅ |
| 110.25 | Resumen cliente + total agregado a la pantalla de firma, antes de firmar | `activity_signature.xml`, `SignatureActivity.kt`, `CurrentOrderActivity.kt` | ✅ |
| 110.26 | Número de factura (`Invoice #NNNN`) visible en el historial general y por cliente, antes de abrir el ticket — el dato ya vivía en `qb_invoice_id` (que guarda el `DocNumber`, no el Id interno de QBO) | `item_batch_header.xml`, `HistoryActivity.kt`, `ClientHistoryActivity.kt` | ✅ |
| 110.27 | Estado "pendiente" (chips, banner offline) usaba `ex_gold` como color de texto sobre fondo crema pálido — contraste pobre. Cambiado a `ex_warning` (marrón oscuro) en 6 lugares | `activity_main.xml`, `ClientHistoryActivity.kt`, `HistoryActivity.kt` (x2), `PreOrderListActivity.kt`, `PreOrderDetailActivity.kt` | ✅ |
| 110.28 | Chip activo de filtro (fecha/estado) usaba fondo verde-tint — mockup usa dorado sólido con texto verde | `color/chip_bg_color.xml` | ✅ |
| 110.29 | Botón "−" del stepper de peso individual (Detalle de producto) tenía esquinas redondeadas (`cornerRadius=22`) — único lugar de la app violando la regla de esquinas rectas | `ProductDetailActivity.kt` | ✅ |
| 110.30 | Método de pago: el diálogo combinaba `.setMessage()` + `.setItems()` — Android no permite ambos a la vez, el mensaje ganaba y la lista de opciones nunca se dibujaba. Se sacó el mensaje | `CurrentOrderActivity.kt` | ✅ |
| 110.31 | Badge de conteo de ítems en "Pedido actual" (header, arriba a la derecha) tenía texto verde sobre fondo dorado — cambiado a blanco + `shapeAppearanceOverlay` explícito | `activity_current_order.xml` | ✅ |
| 110.32 | Estado de conexión ("Online"/"en línea", Login y Home): el texto se pisaba en tiempo de ejecución a verde/rojo pese a estar en blanco en el XML (`setTextColor` dentro de `setStatus()`); el punto verde usaba el mismo verde oscuro/apagado que otros indicadores de "éxito" — nuevo color `ex_mint` (#7FD6A4, el verde menta del mockup) | `MainActivity.kt`, `LoginActivity.kt`, `drawable/circle_green.xml` | ✅ |

### Flujo — cliente requerido antes de escanear

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.33 | "Tap to scan"/"Entrada manual" ya se atenuaban sin cliente activo, pero quedaban con `isEnabled=false` — un tap no disparaba nada, sin aviso. Ahora quedan siempre clicables (solo atenuados visualmente); `requireCustomerSelected()` intercepta el tap real y muestra un Snackbar "Selecciona un cliente primero" si no hay cliente | `MainActivity.kt` | ✅ |
| 110.34 | Opacidad de "Tap to scan" deshabilitado no coincidía con "Entrada manual" (0.7 vs 0.4) — unificada a 0.4 | `MainActivity.kt` | ✅ |

### Versión de la app

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.35 | `versionName` "1.0" → "1.5.1", `versionCode` 1 → 2 (Ajustes lee la versión real del build, no un string) | `app/build.gradle.kts` | ✅ |
| 110.36 | String `app_version_label` (usado solo en Login) también actualizado a v1.5.1 | `strings.xml`, `strings-es.xml` | ✅ |

### Backend (`excellentia/`)

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 110.37 | `GET /api/customers/:customerId/orders` — nuevo `meta.purchases30d` (batches `SENT` en los últimos 30 días), alimenta el recuadro "Compras 30d" del historial por cliente en Android | `routes/customers.ts` | ✅ |
| 110.38 | Se agregó y luego se revirtió el campo `Balance` de QBO (columna `cached_customers.balance`, 3 endpoints, `QbCustomer.balance` en Android) — decisión del usuario, no lo necesitaba. El crédito disponible (`/credit-balance`, preexistente) y `purchases30d` se mantuvieron | `routes/customers.ts` | ✅ (revertido) |

### Notas

- Compilación verificada en cada paso: `gradlew :app:processDebugResources`, `:app:compileDebugKotlin`, y `:app:assembleDebug` completo al cierre — sin errores. Backend: `tsc --noEmit` con los mismos 9 errores preexistentes de siempre, ninguno nuevo.
- Íconos, mockup y assets vía MCP `DesignSync` (`get_file`/`list_files` sobre el proyecto de Claude Design), no requirió tocar el proyecto de diseño en sí (solo lectura).
- Pendiente de decisión del usuario, no implementado: ícono de "Entrada manual" en home (mockup usa lupa, se dejó el teclado por claridad de UX) y el ícono del botón "Seleccionar impresora" en Ajustes (usa el carrito por herencia del bug 110.1, sin ícono de printer/Bluetooth dedicado en el mockup).

---

## 📌 Corte de versión — Android v1.5.1 aprobada

La Fase 110 (110.35/110.36) dejó el Android en **`versionName` 1.5.1 / `versionCode` 2**.
Esa build es la **última aprobada antes** de arrancar el trabajo de la Fase 111 en
adelante — el APK v1.5.1 sigue siendo el que se distribuye/usa en producción hasta
que el módulo Almacén (y lo que siga) esté listo para su propia release.

A partir de acá, todo el ciclo de trabajo (Fase 111+) está enfocado en el
**módulo de almacenista/rutas de entrega**: primero webapp + backend (Fase 111),
después el port a Android como fase separada — todavía no arrancada, se abre su
propia fase cuando toque.

---

## Fase 111: Módulo Almacén — rutas de entrega (backend + webapp) 🔄

Nuevo rol `almacenista`: arma **rutas de entrega** (repartidor + fecha + lista
ordenada de paradas) tomando pedidos ya confirmados (`orders`, por `batch_id`) y
pre-órdenes (`pre_orders`) sin asignar. Alcance de esta fase: solo backend +
webapp. El port a la app Android queda para una fase futura, a pedido explícito
del usuario ("primero webapp, luego lo paso a Android").

### Backend (`excellentia/`)

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 111.1 | Rol `role` ampliado a `'admin' \| 'operator' \| 'almacenista'` | `types/index.ts` | ✅ |
| 111.2 | Migración `ALTER TABLE users MODIFY COLUMN role ENUM('admin','operator','almacenista') ...` — agregada a `setup.ts`/`schema.sql`. **Ya aplicada y ejecutada por el usuario contra MySQL** | `routes/setup.ts`, `db/schema.sql` | ✅ |
| 111.3 | Tablas nuevas `routes` (repartidor, fecha, estado, notas) y `route_stops` (parada ordenada — `stop_type` BATCH/PRE_ORDER, referencia suelta a `orders.batch_id` o `pre_orders.id`, mismo criterio que `batch_damage`/`credit_transactions`). Auto-creación vía `ensureTables()` (patrón de `pre_orders`) + documentadas en `schema.sql`/`setup.ts` | `controllers/routeController.ts`, `db/schema.sql`, `routes/setup.ts` | ✅ |
| 111.4 | Middleware `warehouseOnly` (admin o almacenista) | `middleware/warehouseOnly.ts` | ✅ |
| 111.5 | `routeController.ts` — CRUD de rutas, agregar/quitar/reordenar paradas, `listAvailable` (pedidos SENT/PENDING y pre-órdenes CONFIRMED sin asignar a ninguna ruta activa) | `controllers/routeController.ts` | ✅ |
| 111.6 | Router montado en `/api/routes` | `routes/deliveryRoutes.ts`, `index.ts` | ✅ |
| 111.7 | `GET /api/users/salespersons` ahora también devuelve `role` — reusado como picker de repartidor (filtrado a `operator` en el cliente) sin agregar endpoint nuevo | `controllers/userController.ts` | ✅ |
| 111.8 | Fix de regresión: `authController.ts` (`refresh`) tenía el tipo de rol hardcodeado a 2 valores — lo rompía el ensanche del ENUM | `controllers/authController.ts` | ✅ |

### Webapp (`excellentia-webapp/`)

| # | Tarea | Archivo | Estado |
|---|---|---|---|
| 111.9 | `CurrentUser.role` y `UserRow.role` ampliados a 3 valores | `app/lib/auth.ts`, `app/users/page.tsx` | ✅ |
| 111.10 | Sidebar: gate binario `adminOnly` → `roles: Role[]` por ítem; nuevo ítem "Almacén" (`/warehouse`), visible solo `admin`/`almacenista`; badge de rol de 3 vías | `app/_components/Sidebar.tsx` | ✅ |
| 111.11 | Claves i18n nuevas: `nav_warehouse`, `role_almacenista`, `usr_almacenista`, sección `wh_*` (título, estados de ruta, paradas, picker) | `app/lib/i18n.ts` | ✅ |
| 111.12 | Alta/edición de usuarios: opción `almacenista` en el `<select>` de rol + badge + label helper `roleLabel()` | `app/users/_components/UsersClient.tsx` | ✅ |
| 111.13 | `/warehouse` agregado a `protectedRoutes` (mismo nivel que `/dashboard`/`/products`) | `proxy.ts` | ✅ |
| 111.14 | Página `/warehouse` — lista de rutas, filtro por fecha, redirect a `/orders` si `role === 'operator'` | `app/warehouse/page.tsx` | ✅ |
| 111.15 | `WarehouseClient.tsx` — tarjetas de ruta expandibles, cambio de estado inline (PLANNED/IN_PROGRESS/COMPLETED/CANCELLED), paradas reordenables con botones ↑/↓ (sin librería de drag — no existía ninguna en el repo) | `app/warehouse/_components/WarehouseClient.tsx` | ✅ |
| 111.16 | `RouteModal.tsx` (crear/editar ruta) y `StopPickerModal.tsx` (agregar parada desde pedidos/pre-órdenes disponibles) — mismo chrome/validación que `ProductModal.tsx` | `app/warehouse/_components/RouteModal.tsx`, `StopPickerModal.tsx` | ✅ |

### Notas

- `bun run build` verificado limpio (TypeScript incluido) en ambos repos — sin errores nuevos.
- SQL de la Fase 111 (migración de rol + `CREATE TABLE routes`/`route_stops`) ya corrido a mano por el usuario contra MySQL local.
- **No probado end-to-end contra datos reales todavía** — al momento de implementar, MySQL local no estaba levantado; falta ejercitar el flujo completo (crear almacenista → login → crear ruta → asignar pedido/pre-orden → reordenar → completar) una vez el usuario lo corra.
- Pendiente explícito, fuera de esta fase: port del flujo de rutas a la app Android. Requisito identificado para ese port: soporte offline de pre-órdenes (ver "Pendiente / Mejoras futuras → Android → Pre-órdenes offline", subida a prioridad Alta por esto mismo).

---

## Pendiente / Mejoras futuras

### Android

| Prioridad | Feature | Detalle |
|---|---|---|
| ✅ | ~~**Cache de clientes QB para offline**~~ | Completado en Fase 15 |
| ✅ | ~~**Gestión de usuarios**~~ | Completado en Fase 11 |
| ✅ | ~~**Búsqueda de productos por nombre**~~ | Completado en Fase 18 — long press en botón manual |
| ✅ | ~~**Paginación en historial**~~ | Completado en Fase 18 — botón "Cargar más" |
| ✅ | ~~**Cambiar contraseña desde la app**~~ | Completado en Fase 18 — Ajustes → Cambiar contraseña |
| Bloqueado | **Reset de contraseña (self-service)** | Requiere SMTP/dominio propio — pendiente hasta contar con email. Workaround: admin resetea desde webapp `/users` |
| ✅ | ~~**Resumen del día**~~ | Completado en Fase 18 — long press en último escaneo |
| ✅ | ~~**Device registration**~~ | Completado en Fase 18 — auto-registro al hacer login |
| ✅ | ~~**Filtro FAILED en historial**~~ | Completado en Fase 18 — chip "Fallidos" |
| ✅ | ~~**Último escaneo en MainActivity**~~ | Completado en Fase 18 — muestra barcode, nombre y hora |
| ✅ | ~~**Cache cleanup**~~ | Completado en Fase 18 — borra productos cacheados > 7 días al iniciar |
| ✅ | ~~**Configuración de empresa dinámica**~~ | Completado en Fase 17 |
| Alta | **Badge crédito cliente activo** | Mostrar en `CurrentOrderActivity` si el cliente activo tiene crédito disponible por damage. Depende del sistema de créditos. |
| Media | **Notificación sync pedido PENDING** | Pulir `OrderStatusWorker` — notificar al vendedor cuando un pedido PENDING se sincroniza exitosamente a QB |
| Media | **Buscar cliente por nombre desde MainActivity** | Actualmente solo se puede escanear o ingresar código. Agregar búsqueda de cliente directamente desde la pantalla principal sin abrir `CustomerPickerActivity` |
| Alta | **Pre-órdenes offline** | Pre-órdenes funcionen sin internet usando SQLite local (mismo patrón que `OrderRepository`: cola local + `SyncWorker` cada 15 min). Subida de prioridad (era Media) — se vuelve requisito real para el port de rutas de la Fase 111: una parada de tipo `PRE_ORDER` en una ruta tiene que poder verse/actuarse en campo con datos móviles intermitentes, y hoy solo `orders` tiene ese soporte offline |
| Media | **Historial de precios mejorado** | En `ProductDetailActivity` mostrar el precio promedio que ese cliente ha pagado por el producto, además del historial de transacciones |

### Backend

| Prioridad | Feature | Detalle |
|---|---|---|
| ✅ | ~~**Class por vendedor en invoices QBO**~~ | Completado en Fase 58 — `ClassRef` se envía en cada línea de todo invoice creado (batch, individual, retry de SyncEngine, pre-órdenes). Pendiente solo reconectar OAuth sandbox local para probar con datos reales y correr la migración `qb_class_id` en cPanel. |
| Bloqueado | **Sales Rep / vendedor en Bill To — invoices QBO** | Mostrar el nombre del vendedor en el campo nativo "Sales Rep" o como custom field dentro de la sección "Bill To" (ambos usan el mismo Custom Fields API, categoría "Transaction") requiere **Premium APIs**, disponible solo desde tier **Silver** ($300/mes) del Intuit App Partner Program — confirmado en el *Intuit App Partner Program Guide* oficial v1.2 (03/2026), tabla "Build Benefits": Premium APIs = N/A en Builder, ✔ desde Silver en adelante (no requiere Gold/Platinum). App actual en tier Builder; el dueño de la empresa debe activarlo en developer.intuit.com (nosotros solo tenemos rol "Developer" ahí, sin acceso a billing). **Workaround interino mientras se aprueba:** escribir el nombre del vendedor en `PrivateNote` del invoice (campo nativo del API, no visible al cliente). |
| ✅ | ~~**Rate limiting en login**~~ | Completado en Fase 14 |
| ✅ | ~~**Endpoint `/api/stats` dedicado**~~ | Completado en Fase 15 |
| ✅ | ~~**Gestión de usuarios**~~ | Completado en Fase 11 |
| ✅ | ~~**Cache de clientes QB en MySQL**~~ | Completado en Fase 15 |
| Bloqueado | **Reset de contraseña (self-service)** | Requiere SMTP/dominio propio — pendiente hasta contar con email. Workaround: admin resetea desde webapp `/users` |
| ✅ | ~~**Log de actividad**~~ | Completado en Fase 16 |
| ✅ | ~~**Exportar CSV**~~ | Completado en Fase 16 |
| ✅ | ~~**Configuración de empresa dinámica**~~ | Completado en Fase 17 (backend + webapp) |
| ✅ | ~~**Sistema de créditos por damage — backend**~~ | Completado en Fase 75 — tabla `customer_credits` + cálculo automático desde el modal de daño existente. El crédito se aplica siempre al mismo batch que lo genera, no hay endpoint para "aplicar" saldo en un pedido futuro distinto (ver fila de saldo/historial más abajo) |
| Alta | **Endpoint stats operadores del día** | Query SQL sobre `orders` de hoy agrupada por `user_id` con total pedidos, ingresos y último pedido. Alimenta la tabla de operadores del dashboard |
| Media | **Producción QBO** | Cambiar `ENVIRONMENT=production`, actualizar `REDIRECT_URI`/`DASHBOARD_URL`/`DISCONNECTED_URL`, registrar URLs en Intuit Developer Console, reconectar empresa real de QuickBooks via `/api/qb/auth` |
| Media | **Webhook QB → backend** | Recibir notificaciones de QB cuando se crea/edita un producto directamente en QB. Elimina necesidad de "Sincronizar QB" manual. Requiere registrar endpoint en Intuit Developer Console |
| Media | **Credit Memos QB** | La Fase 75 resuelve el caso común con una línea negativa en la misma factura (más simple, ya reduce el total). Un Credit Memo separado en QB seguiría siendo útil para créditos que no se aplican en la misma venta (ver saldo/historial abajo) — no implementado |
| Media | **Email resumen diario** | Enviar resumen automático al admin con pedidos del día, ingresos totales y operadores activos. Bloqueado hasta tener SMTP |
| Alta | **`syncProductsFromQbo` inserta productos sin barcode** | El sync automático (`syncEngine.ts`) inserta `barcode = NULL` para items nuevos, a diferencia del sync manual (`qbController.ts`) que usa `item.Sku \|\| 'QBO-{id}'`. Un producto sin barcode nunca puede facturarse (ver Fase 64) — unificar el fallback en ambos sync paths |
| Media | **Vincular `orders` a `products` por id, no por barcode** | `orders.barcode = products.barcode` es un JOIN por string equality — frágil si el barcode cambia después de la venta o el producto no tiene barcode. Agregar `product_id` a `orders` eliminaría la clase entera de bugs de "PENDING sin razón aparente" (ver Fase 64) |
| Alta | **Cancelar / editar factura ya generada** | Técnicamente viable sin upgrade de tier QBO — void/update de invoice es parte de la Accounting API v3 (`invoice?operation=void`, sparse update), la misma API que ya usa `qbInvoices.ts` para crear facturas; disponible en cualquier plan de QBO (Simple Start incluido), no es feature Premium. Falta: (1) manejo de `SyncToken` antes de escribir — mismo patrón que `updateItemMeta`/`updateItemQtyOnHand` en `qbItems.ts` (GET → SyncToken → POST sparse), aplicado a `invoice`; (2) lógica de reversa del lado MySQL al voidear — hoy nada revierte `products.stock` ya descontado, créditos generados en `credit_transactions`, ni `invoice_counter` ya incrementado; (3) endpoint(s) nuevos — hoy no existe ninguno ni siquiera oculto; el único parecido (`PUT /api/orders/:id/status`, admin-only) solo cambia el status local, no toca QBO, y no lo llama ninguna pantalla (ni Android ni webapp). Preguntado por el usuario 2026-08-28; sin alcance ni fase asignada todavía |

### Webapp

| Prioridad | Feature | Detalle |
|---|---|---|
| Alta | **Imágenes de productos** | Agregar columna `image_url` a `products` en MySQL. Subir imágenes a Cloudinary/cPanel. Mostrar thumbnail en `ProductRow.tsx` y preview en `ProductModal.tsx`. Input para subir/pegar URL de imagen en el modal de edición. |
| Alta | **Dashboard semi-realtime (polling)** | Polling cada 30s en KPIs, actividad reciente y gráfica de pedidos por hora. Top 5 y gráfica de 7 días solo se refrescan al cambiar filtro de período. Opción SSE descartada por limitaciones de cPanel/Passenger. |
| Alta | **Dashboard — tabla de operadores del día** | Sección nueva en dashboard (solo admin) con tabla: Operador / Pedidos hoy / Total $ / Último pedido. Incluir "último visto" usando `activity_log`. Online en tiempo real descartado — requeriría heartbeat en Android y backend. |
| Alta | **Unidades por caja en productos** | Agregar campo `units_per_case` a tabla `products` y al modal de edición de productos. Workaround: Android infiere desde `qty` vía fallback en Fase 62. |
| ✅ | ~~**Sistema de créditos por damage**~~ | Completado en Fase 75 (Android + backend + webapp) — Subtotal/Créditos/Total en el ticket, línea negativa real en la factura de QBO, ledger `customer_credits` |
| Media | **Alerta de stock bajo** | Badge/indicador rojo en productos con stock ≤ 5 en la página de productos. Ya existe el dato, mínimo esfuerzo. |
| Media | **Historial/saldo de créditos por cliente** | Página o sección en `/customers` mostrando créditos generados y saldo disponible, más la capacidad de "aplicar" ese saldo en un pedido futuro distinto al que lo generó. La tabla `customer_credits` ya existe (Fase 75) como ledger de auditoría — falta la UI de saldo/aplicación |
| Media | **Reporte de damage por período** | Sección en dashboard con: total perdido por damage por semana/mes, top productos más dañados, qué operador reporta más damage. Útil para decisiones de compra. |
| ✅ | ~~**Numeración de facturas editable**~~ | Completado en Fase 103 — card en Settings, admin-only, con validación forward-only y modal de confirmación |
| Baja | **`/settings` sin protección de rol consistente** | `GET /api/settings` no tiene `adminOnly` y la página no redirige a un operador que entre por URL directa (a diferencia de `/dashboard`). No es grave hoy (solo lee nombre/dirección de empresa), pero quedó expuesto de nuevo al agregar la card de facturación en Fase 103 — conviene cerrarlo antes de agregar más campos sensibles a Settings |

### Inventario (módulo nuevo — no existe todavía)

| Prioridad | Feature | Detalle |
|---|---|---|
| Alta | **Módulo de inventario** | Hoy "stock" es solo un contador (`products.stock`) que baja al vender (`createBatch`) y se sincroniza con `QtyOnHand` de QBO — no hay pantalla ni endpoint dedicado a inventario, ni en backend, webapp o Android. Para que sea un módulo real falta: (1) cerrar el gap ya documentado de que `convertPreOrder` no descuenta stock (nota al final de la Fase 87); (2) recepción de mercadería — sumar stock al llegar un pedido de proveedor; hoy solo se edita el campo a mano en el modal de producto de la webapp, sin escaneo ni registro de qué entró y cuándo; (3) conteo físico / reconciliación con motivo registrado, no un pisado silencioso del número; (4) historial de movimientos auditable — mismo patrón que el ledger `credit_transactions` de la Fase 75, pero para stock (hoy un cambio no deja rastro de quién/cuándo/por qué); (5) decidir si los productos Lbs deben trackear peso real en stock o seguir contando solo eventos de venta — `Qty: 1` fijo a QBO es deliberado (Fase 39, para que QBO no descuente libras del inventario), pero eso también significa que el stock de Lbs hoy no representa peso disponible real; (6) alertas de stock bajo con punto de reorden — hoy solo hay color rojo/ámbar visual en la tabla de productos (ver fila "Alerta de stock bajo" en Webapp más arriba), sin notificación ni umbral configurable; (7) daños (`batch_damage`) no parecen ajustar `products.stock`, solo generan crédito en dólares — confirmar y cerrar si corresponde; (8) soporte offline si la recepción/conteo se hace en el TC22 sin señal, mismo patrón `SyncWorker` + Room que ya tienen pedidos/pre-órdenes. Preguntado por el usuario 2026-08-28; sin alcance ni fase asignada todavía |
