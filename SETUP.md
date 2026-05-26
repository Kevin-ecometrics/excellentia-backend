# Excellentia Backend — Guía de Despliegue en Producción (cPanel)

> Requisitos: cPanel con Node.js App Manager, phpMyAdmin, File Manager.  
> No se requiere acceso a terminal en el servidor.

---

## 1. Preparar el build localmente

En tu máquina de desarrollo (con Bun instalado):

```bash
bun run build
```

Resultado: archivo `dist/index.js` listo para Node.js.

---

## 2. Subir archivos a cPanel

En **File Manager** de cPanel, crea una carpeta (ej. `excellentia-api`) y sube:

```
dist/index.js      ← app compilada
package.json       ← dependencias
```

> No subas `.env`, `node_modules`, ni el código fuente.

---

## 3. Configurar la Node.js App en cPanel

Ve a **Software → Node.js App Manager** → Create Application:

| Campo | Valor |
|---|---|
| Node.js version | 18.x o superior (la más alta disponible) |
| Application mode | Production |
| Application root | `/home/tu_usuario/excellentia-api` |
| Application startup file | `dist/index.js` |
| Application URL | Tu dominio o subdominio |

Después de crear la app, haz clic en **Run NPM Install** para instalar dependencias.

---

## 4. Variables de entorno

En el Node.js App Manager, sección **Environment Variables**, agrega:

```
PORT=3000

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario_mysql_cpanel
DB_PASSWORD=password_mysql
DB_NAME=nombre_base_datos

# JWT
JWT_SECRET=cadena_larga_aleatoria_min_32_chars
JWT_REFRESH_SECRET=cadena_larga_aleatoria_distinta

# QuickBooks — obtener en developer.intuit.com → My Apps → Keys & OAuth
CLIENT_ID=tu_client_id_de_intuit
CLIENT_SECRET=tu_client_secret_de_intuit
APP_ID=tu_app_id_de_intuit
REALM_ID=tu_company_id_de_quickbooks
REDIRECT_URI=https://tudominio.com/api/qb/callback
ENVIRONMENT=production          # sandbox | production

# QB tokens (se llenan automáticamente tras el OAuth — dejar vacíos al inicio)
ACCESS_TOKEN=
REFRESH_TOKEN=
EXPIRES_IN=3600
X_REFRESH_TOKEN_EXPIRES_IN=8726400

# App
LOG_LEVEL=info
NODE_ENV=production
```

> Para generar JWT_SECRET y JWT_REFRESH_SECRET seguros, corre en tu máquina local:
> ```bash
> bun -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Ejecuta el comando dos veces y usa cada resultado para una variable distinta.

**Dónde encontrar los valores de QuickBooks:**

| Variable | Dónde obtenerla |
|---|---|
| `CLIENT_ID` | developer.intuit.com → My Apps → Keys & OAuth → Client ID |
| `CLIENT_SECRET` | developer.intuit.com → My Apps → Keys & OAuth → Client Secret |
| `APP_ID` | developer.intuit.com → My Apps → Keys & OAuth → App ID |
| `REALM_ID` | Sandbox: mismo panel → Company ID · Producción: URL de QBO (`/app/homepage?company=XXXXXXX`) |
| `ENVIRONMENT` | `sandbox` para pruebas, `production` para la empresa real |

---

## 5. Inicializar la base de datos — endpoint `/api/setup`

> Este método reemplaza el seed script. No necesitas terminal.

### 5.1 Crear la base de datos vacía en cPanel

En **cPanel → MySQL Databases**:
1. Crea la base de datos (anota el nombre exacto)
2. Crea un usuario MySQL y asígnalo a la base de datos con **todos los permisos**
3. Usa esas credenciales en tus variables de entorno (`DB_USER`, `DB_PASSWORD`, `DB_NAME`)

### 5.2 Ejecutar el setup desde la webapp

Con ambos servicios corriendo, abre en tu navegador:

```
https://tu-webapp.com/setup
```

O directamente la API:

```
https://tudominio.com/api/setup
```

Recibirás una respuesta JSON con el log del proceso:

```json
{
  "ok": true,
  "log": [
    "✅ Tablas creadas/verificadas",
    "✅ company_settings inicializado",
    "✅ Admin creado — email: admin@excellentia.com  password: admin123",
    "⚠️  IMPORTANTE: cambia la contraseña desde la webapp inmediatamente.",
    "✅ sync_meta inicializado",
    "",
    "🎉 Setup completado. Próximos pasos:",
    "   1. Abre /api/qb/auth para conectar QuickBooks",
    "   2. Desde la webapp: Productos → Sincronizar QB",
    "   3. Configura los datos de tu empresa en la webapp → Configuración"
  ]
}
```

> Este endpoint es idempotente — puedes llamarlo varias veces sin problema.  
> Usa `CREATE TABLE IF NOT EXISTS` e `INSERT IGNORE`, nunca borra datos.

---

## 5b. Crear la base de datos en phpMyAdmin (método alternativo)

### 5.1 Crear la base de datos

En **phpMyAdmin** de cPanel:
1. Clic en **Nueva base de datos**
2. Nombre: el mismo que pusiste en `DB_NAME`
3. Clic en **Crear**

> También puedes crear el usuario MySQL desde **cPanel → MySQL Databases**.

### 5.2 Crear las tablas

En phpMyAdmin, selecciona tu base de datos, ve a la pestaña **SQL** y ejecuta el contenido del archivo `src/db/schema.sql` del proyecto.

Las tablas principales son:
- `users` — usuarios del sistema
- `products` — productos sincronizados desde QuickBooks
- `orders` — pedidos enviados desde la app Android
- `cached_customers` — cache de clientes QB
- `company_settings` — configuración de la empresa
- `activity_log` — registro de actividad
- `sync_log` / `sync_meta` — control de sincronización QB
- `qb_tokens` — tokens OAuth de QuickBooks

> Las rutas que usan `CREATE TABLE IF NOT EXISTS` (como `/api/customers`) crean su tabla automáticamente al primer request. No necesitas crearlas manualmente.

---

## 6. Crear el usuario administrador

### 6.1 Generar el hash de la contraseña

En tu máquina local:

```bash
bun -e "const b = require('bcryptjs'); console.log(b.hashSync('TU_PASSWORD_AQUI', 10))"
```

Copia el resultado (empieza con `$2b$10$...`).

### 6.2 Insertar el admin en phpMyAdmin

En la pestaña SQL de phpMyAdmin:

```sql
INSERT INTO users (email, password, role, name)
VALUES (
  'admin@tudominio.com',
  '$2b$10$PEGA_EL_HASH_AQUI',
  'admin',
  'Administrador'
);
```

---

## 7. Autenticación con QuickBooks

El flujo OAuth se completa desde el navegador, sin terminal.

### 7.1 Primera vez (o cuando expiren los tokens)

1. Asegúrate de que la app esté corriendo (botón **Start** en cPanel)
2. Abre en tu navegador:
   ```
   https://tudominio.com/api/qb/auth
   ```
3. Completa el flujo de autorización de QuickBooks
4. Los tokens se guardan automáticamente en la tabla `qb_tokens` de MySQL

### 7.2 Cuándo repetir este paso

| Token | Duración |
|---|---|
| Access token | 1 hora (se renueva automáticamente) |
| Refresh token | 100 días |

Cuando el refresh token expire (cada ~100 días), repite el paso 7.1.

### 7.3 Sincronizar productos desde QB

Después de autenticarte, para importar los productos de QuickBooks:

```
POST https://tudominio.com/api/admin/sync-products
Authorization: Bearer TU_JWT_TOKEN
```

O desde la webapp: **Productos → Sincronizar QB**.

---

## 8. Configurar la webapp (Next.js)

La webapp (`excellentia-webapp`) se despliega por separado en Vercel o similar:

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega la variable de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://tudominio.com
   ```
3. Deploy automático con cada push

---

## 9. Configurar la app Android

En la app Android:

1. Abre **Ajustes → URL del servidor**
2. Ingresa: `https://tudominio.com`
3. Guarda y reinicia sesión

---

## 10. Actualizaciones futuras

Cada vez que hagas cambios al backend:

```bash
# 1. En tu máquina local — compilar
bun run build

# 2. Subir dist/index.js por File Manager de cPanel

# 3. En Node.js App Manager → Restart
```

Para migraciones de base de datos (nuevas columnas), ejecutar el `ALTER TABLE` correspondiente directamente en phpMyAdmin.

---

## 11. Verificar que todo funciona

| Endpoint | Respuesta esperada |
|---|---|
| `GET /api/auth/me` (con JWT) | `{ id, email, role }` |
| `GET /api/customers` (con JWT) | Lista de clientes QB |
| `GET /api/settings` (con JWT) | Datos de la empresa |

Si alguno falla con error 500, revisa los logs en el Node.js App Manager de cPanel (pestaña **Logs**).

---

## 12. Checklist de despliegue

```
[ ] bun build → dist/index.js generado sin errores
[ ] dist/index.js + package.json subidos a cPanel (File Manager)
[ ] Base de datos MySQL creada en cPanel → MySQL Databases
[ ] Variables de entorno configuradas (DB, JWT, QB, PORT)
[ ] npm install corrido desde Node.js App Manager
[ ] App iniciada (Start) en Node.js App Manager
[ ] Abrir https://tudominio.com/api/setup → respuesta ok: true
[ ] QB OAuth: abrir https://tudominio.com/api/qb/auth → completar flujo
[ ] Productos sincronizados desde webapp → Productos → Sincronizar QB
[ ] Configuración de empresa guardada desde webapp → Configuración
[ ] Contraseña del admin cambiada (no dejar admin123)
[ ] App Android apuntando a https://tudominio.com
[ ] Test de login exitoso desde la app Android
```
