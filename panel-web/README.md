# System Gym · Panel web

Panel para que el administrador consulte el gimnasio **desde el celular** y descargue los
**desprendibles de pago** en PDF. Es **solo de consulta**: no puede modificar nada en el gimnasio.

```
PC del gimnasio (System Gym)  ── cada 10 min, HTTPS + código ──►  Panel web  ◄── celular del admin
```

- El PC envía un resumen: ingresos de hoy y del mes, turnos y faltantes de caja, cobros, clientes por
  vencer y vencidos, inventario por reponer, gastos, empleados y pagos de nómina.
- No se envían fotos, huellas, contraseñas ni la base de datos.
- Si el gimnasio se queda sin internet sigue funcionando igual; el panel muestra la última
  información recibida y avisa que está desactualizada.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `SYNC_TOKEN` | Sí | Código que usa el PC para enviar datos (mínimo 16 caracteres) |
| `ADMIN_PASSWORD` | Sí | Contraseña para entrar al panel (mínimo 10 caracteres) |
| `ADMIN_USER` | No (`admin`) | Usuario para entrar al panel |
| `SESSION_SECRET` | Recomendada | Mínimo 32 caracteres; sin ella las sesiones se cierran al reiniciar |
| `DATABASE_URL` | Recomendada en la nube | PostgreSQL. Sin ella se guarda en un archivo en `DATA_DIR` |
| `DATA_DIR` | No (`./data`) | Carpeta del archivo de datos cuando no hay PostgreSQL |
| `PANEL_TZ` | No (`America/Bogota`) | Zona horaria de las fechas del PDF |

Generar códigos seguros:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## Probar en su PC

```bash
cd panel-web
npm install
cp .env.example .env      # y complete SYNC_TOKEN y ADMIN_PASSWORD en .env
npm start
```

O sin archivo `.env`:

```bash
# Git Bash / Linux / Mac
SYNC_TOKEN="un-codigo-de-prueba-largo" ADMIN_PASSWORD="ClaveDePrueba2026" npm start
# PowerShell
$env:SYNC_TOKEN="un-codigo-de-prueba-largo"; $env:ADMIN_PASSWORD="ClaveDePrueba2026"; npm start
```

Abra http://localhost:3000. En System Gym → **Configuración → Panel web** ponga
`http://localhost:3000` y el mismo código, y pulse **Sincronizar ahora**.

## Publicarlo en internet (ejemplo con Render)

1. Suba el repositorio `System_Gym` a GitHub (privado).
2. En Render cree una base de datos **PostgreSQL** y copie su *Internal Database URL*.
   El plan gratuito de PostgreSQL de Render vence a los 30 días; para uso real use el plan pago.
3. Cree un **Web Service** desde el repositorio con:
   - Root Directory: `panel-web`
   - Build Command: `npm ci --omit=dev`
   - Start Command: `node server.js`
   - Health Check Path: `/healthz`
4. En *Environment* agregue `SYNC_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET` y `DATABASE_URL`.
5. Cuando esté arriba, Render le da una dirección `https://….onrender.com`.
6. En System Gym → **Configuración → Panel web** pegue esa dirección y el `SYNC_TOKEN`, guarde y
   pulse **Sincronizar ahora**.
7. Abra la dirección en el celular, entre con `ADMIN_USER` / `ADMIN_PASSWORD` y, si quiere, use
   "Agregar a pantalla de inicio" para tenerlo como una app.

El plan gratuito del *Web Service* se duerme si nadie lo usa y tarda unos segundos en despertar;
para uso diario conviene el plan pago más pequeño.

### Con Docker (VPS propio)

```bash
docker build -t system-gym-panel ./panel-web
docker run -d --name panel -p 3000:3000 \
  -e SYNC_TOKEN=... -e ADMIN_PASSWORD=... -e SESSION_SECRET=... \
  -v panel-data:/app/data system-gym-panel
```

Póngalo detrás de un proxy con HTTPS (Caddy o Nginx). System Gym solo acepta direcciones `https://`
(salvo `localhost` para pruebas).

## Seguridad

- El panel contiene datos personales de clientes y empleados (Ley 1581 de 2012): use siempre HTTPS,
  una contraseña fuerte y no comparta el `SYNC_TOKEN`.
- Tras 5 intentos fallidos de inicio de sesión desde la misma conexión, se bloquea 10 minutos.
- Cookies `HttpOnly` y `SameSite=Strict`; cabeceras CSP y anti-iframe.
- Si sospecha que el código se filtró, cámbielo en el servidor y en System Gym.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/sync` | Recibe el resumen del gimnasio (`Authorization: Bearer SYNC_TOKEN`, JSON o gzip) |
| `POST` | `/api/login` / `/api/logout` | Sesión del administrador |
| `GET` | `/api/datos` | Último resumen (requiere sesión) |
| `GET` | `/api/desprendible/:id` | PDF del pago de nómina (`?ver=1` para abrirlo en el navegador) |
| `GET` | `/healthz` | Estado del servicio |
