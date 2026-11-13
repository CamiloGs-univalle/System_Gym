# System Gym — Estructura del proyecto

> App de escritorio para Windows: **Electron + React (Vite)** en este repositorio y
> backend **Quarkus + SQLite** en el repositorio hermano `backendGym`.

## Cómo encajan las piezas

```
Electron (electron/main.js)
 ├─ arranca el backend: java -jar quarkus-run.jar en un puerto libre + llave aleatoria (X-App-Key)
 ├─ carga la interfaz React (dist/index.html)
 └─ preload.js expone a la interfaz: getConfig() (URL + llave), lector de huella y quiosco

React (src/)  ──HTTP + JWT + X-App-Key──►  Quarkus (backendGym)  ──►  %USERPROFILE%\.gymcore\gymcore.db
```

## Árbol de `src/`

```
src/
├── main.jsx, App.jsx           Entrada; App decide pantalla según sesión y rol (o modo quiosco)
├── components/
│   ├── admin/                  KpiCard, ActivityFeed, QuickActions, DataTable
│   ├── auth/                   LoginPanel, HeroPanel
│   ├── clientes/               FotoCliente, CapturaFoto, RegistroHuella, RenovarPlan
│   ├── common/                 ErrorBoundary, LogoutConfirmModal
│   ├── layout/                 AppShell (menú lateral + encabezado), Header, Sidebar
│   ├── system/                 Cambio de contraseña obligatorio, licencia, respaldos
│   └── ui/                     Button, Card
├── pages/
│   ├── Login.jsx
│   ├── acceso/                 Ingreso de clientes (cédula/huella) y pantalla Quiosco
│   ├── admin/                  AdminDashboard y paneles: Finanzas, Reportes, Empleados, Configuración
│   │   ├── gimnasio/           Planes, Pagos, Cartera
│   │   ├── nomina/             Nómina, pagos, ahorro y obligaciones, configuración, boleta
│   │   └── turnos/             Turnos: calendario, crear, editar, historial
│   ├── clients/                ClientesPanel (registro, búsqueda, ficha)
│   ├── ingreso/                Entrada de mercancía (pedidos y recepciones)
│   ├── products/               Inventario (productos y categorías)
│   └── recepcion/              RecepcionDashboard, POSPanel (caja), Cierrepanel (arqueo)
├── services/
│   ├── api.js                  Cliente axios: URL del backend, JWT, llave de la app, errores
│   ├── storageSync.js          Sincroniza con /api/storage los módulos guardados como JSON
│   ├── authService, clientesService, productosService, ventasService, turnoService,
│   │   empleadosService, finanzasService, ingresoService, accesoService, lectorHuella
│   ├── gimnasio/               planes, membresías (registro local), pagos, cartera, promociones, rachas
│   └── nomina/                 nominaEngine (cálculos y festivos de Colombia), obligacionesNomina
├── store/                      authStore (sesión), ventasStore + VentasProvider (ventas del turno)
├── utils/                      formatters (moneda y fechas, fechaLocalISO), empresa, errorCapture
└── styles/                     CSS por módulo (adminCSS, recepcionCSS, ingresoCSS) y theme.css
```

Otros:

| Carpeta | Contenido |
|---|---|
| `electron/` | Proceso principal, preload y `biometria/` (lector simulado o ZKTeco) |
| `scripts/preparar-jre.ps1` | Descarga el Java 21 que incluye el instalador (`jre/`) |
| `tools/licencias/` | Crear llaves y generar licencias mensuales |
| `release/` | Instalador generado (no se versiona) |

## Dónde vive cada dato

| Dato | Dónde se guarda |
|---|---|
| Usuarios, clientes y su membresía, productos, categorías, ventas, turnos, empleados, gastos, pedidos, entradas de mercancía, ingresos, huellas, auditoría | Tablas del backend (SQLite) |
| Fotos de clientes | `%USERPROFILE%\.gymcore\photos` |
| Planes, promociones, pagos, cartera, rachas, registro local de membresías, nómina (historial, pagos, configuración, obligaciones), configuración del gimnasio | JSON en la tabla `app_storage` vía `storageSync.js`; `localStorage` funciona como caché |

Reglas de `storageSync`:

- Las claves permitidas deben coincidir con `StorageResource.ALLOWED_KEYS` del backend.
- Planes, promociones, configuración y nómina solo las modifica el administrador; para un recepcionista
  no se guardan ni localmente, y si el servidor rechaza un cambio se recupera su versión.

## Roles

| Rol | Pantalla |
|---|---|
| `ADMIN`, `SUPER_ADMIN` | AdminDashboard (todos los módulos) |
| `RECEPTIONIST` | RecepcionDashboard: caja, clientes, inventario, ingresos y cierre de turno |

## Reglas de negocio clave

- **Membresía:** la fecha de vencimiento es el último día con acceso. Un plan de 30 días pagado hoy da
  acceso hoy y 29 días más; el diario solo el día de pago. Si se renueva antes de vencer, el nuevo
  periodo empieza al día siguiente del vencimiento.
- **Cobros:** toda venta o membresía exige un turno de caja abierto y suma al turno.
- **Cierre de turno:** arqueo ciego; el sistema informa faltante o sobrante.
- **Fechas:** en la interfaz se usa `fechaLocalISO()` (hora de Colombia), nunca
  `toISOString().split("T")[0]`, que después de las 7:00 p. m. da el día siguiente.
