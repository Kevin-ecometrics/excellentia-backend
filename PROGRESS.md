# Excellentia — Progreso del Proyecto

> Estado actual: **Fase 56 🔄 — Seguridad Intuit App Store (Backend + Webapp + cPanel)**

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

---

## Fase 4: Customers QB + Pedido actual + Ticket de venta ✅

### Backend

| # | Tarea | Estado |
|---|---|---|
| 4.1 | `customer_id` y `customer_name` en tabla `orders` | ✅ |
| 4.2 | `POST /api/orders/batch` acepta `customer_id` / `customer_name` | ✅ |
| 4.3 | `createBatchInvoice` y `createInvoice` usan `customer_id` del pedido | ✅ |
| 4.4 | `QB_DEFAULT_CUSTOMER_ID` en `.env` como fallback (default `'2'`) | ✅ |
| 4.5 | `GET /api/customers` protegido con JWT, solo clientes activos (MAXRESULTS 200) | ✅ |
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

## Fase 56: Seguridad Intuit App Store 🔄

Requisitos de seguridad obligatorios para publicar en el QuickBooks App Store. Revisados contra la documentación oficial de Intuit (`/go-live/publish-app/security-requirements`).

### cPanel ✅

| # | Tarea | Estado |
|---|---|---|
| 56.1 | SSL wildcard 5 años activo — calificación A en SSL Labs | ✅ |
| 56.2 | HTTPS forzado en dominio y subdominio (ya existía en `.htaccess`) | ✅ |
| 56.3 | TLS 1.2+ con AES-256 confirmado (SSL Labs A rating) | ✅ |
| 56.4 | `RewriteCond %{REQUEST_METHOD} ^TRACE` + `[F]` agregado al `.htaccess` del subdominio y dominio principal | ✅ |

### Backend — `excellentia/` ⬜

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| 56.5 | Cifrar `refresh_token` y `access_token` con AES-256 antes de guardar en tabla `qb_tokens` | 🔴 Crítico | ⬜ |
| 56.6 | Llave AES en variable de entorno separada (`QB_TOKEN_KEY`) | 🔴 Crítico | ⬜ |
| 56.7 | Descifrar tokens al cargar desde DB en `loadTokensFromDb()` | 🔴 Crítico | ⬜ |
| 56.8 | OAuth `state` aleatorio (crypto UUID) + verificación en `qbCallback` — previene CSRF en flujo OAuth | 🔴 Crítico | ⬜ |
| 56.9 | Password mínimo 8 caracteres en `register` (actualmente sin validación) y en `changePassword` (actualmente 6) | 🔴 Crítico | ⬜ |
| 56.10 | Instalar `helmet` — headers de seguridad: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy` | 🟡 Medio | ⬜ |
| 56.11 | `Cache-Control: no-cache, no-store` en todas las rutas con datos sensibles (`/api/auth`, `/api/orders`, `/api/qb`, `/api/customers`) | 🟡 Medio | ⬜ |
| 56.12 | Quitar `logging: true` del cliente OAuth en `qbAuth.ts` — puede volcar tokens en logs | 🟡 Medio | ⬜ |

### Webapp — `excellentia-webapp/` ⬜

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| 56.13 | Cookie JWT seteada server-side con atributos `HttpOnly; Secure; SameSite=Strict` | 🔴 Crítico | ⬜ |
| 56.14 | `app/lib/auth.ts` — eliminar lectura de `document.cookie` (incompatible con HttpOnly); server components leen cookie desde el request directamente | 🔴 Crítico | ⬜ |

### Organizacional ⬜

| # | Tarea | Estado |
|---|---|---|
| 56.15 | Completar security affidavit cuando Intuit lo solicite (dentro de 2 semanas) | ⬜ |
| 56.16 | Permitir escaneo de vulnerabilidades de Intuit o proveer resultados de scan propio (< 1 año) | ⬜ |
| 56.17 | Cambiar `ENVIRONMENT=production` en cPanel antes del go-live | ⬜ |

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

### Backend

| Prioridad | Feature | Detalle |
|---|---|---|
| ✅ | ~~**Rate limiting en login**~~ | Completado en Fase 14 |
| ✅ | ~~**Endpoint `/api/stats` dedicado**~~ | Completado en Fase 15 |
| ✅ | ~~**Gestión de usuarios**~~ | Completado en Fase 11 |
| ✅ | ~~**Cache de clientes QB en MySQL**~~ | Completado en Fase 15 |
| Bloqueado | **Reset de contraseña (self-service)** | Requiere SMTP/dominio propio — pendiente hasta contar con email. Workaround: admin resetea desde webapp `/users` |
| ✅ | ~~**Log de actividad**~~ | Completado en Fase 16 |
| ✅ | ~~**Exportar CSV**~~ | Completado en Fase 16 |
| Media | **Producción QBO** | Cambiar `ENVIRONMENT=production`, actualizar `REDIRECT_URI`/`DASHBOARD_URL`/`DISCONNECTED_URL`, registrar URLs en Intuit Developer Console, reconectar empresa real de QuickBooks via `/api/qb/auth` |
| ✅ | ~~**Configuración de empresa dinámica**~~ | Completado en Fase 17 (backend + webapp) |

### Webapp

| Prioridad | Feature | Detalle |
|---|---|---|
| ✅ | ~~**Página de pedidos**~~ | Completado en Fase 14 |
| ✅ | ~~**Página de usuarios**~~ | Completado en Fase 11 |
| ✅ | ~~**Exportar CSV**~~ | Completado en Fase 16 |
| ✅ | ~~**Página de clientes**~~ | Completado en Fase 16 |
| ✅ | ~~**Ver ticket completo**~~ | Completado en Fase 16 |
| ✅ | ~~**Configuración de empresa**~~ | Completado en Fase 17 |
