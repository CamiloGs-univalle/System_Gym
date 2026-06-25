# GymCore — Estructura del Proyecto

> Software de gestión integral para gimnasios · Versión Local (Desktop)  
> Stack: React + Vite · Tailwind CSS · SQLite (Electron / Tauri) · Zustand

---

## Árbol de directorios

```
gymcore/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.jsx                        # Entrada principal de React
│   ├── App.jsx                         # Router raíz + guards de rol
│   │
│   ├── assets/                         # Logos, íconos estáticos
│   │
│   ├── components/                     # Componentes reutilizables (UI atómica)
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx               # Estado activo/inactivo membresía
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   └── Table.jsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx             # Menú lateral dinámico por rol
│   │   │   ├── Header.jsx              # Barra superior + usuario + turno activo
│   │   │   └── DashboardLayout.jsx     # Wrapper que envuelve Sidebar + Header + children
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPanel.jsx          # Formulario de inicio de sesión
│   │   │   └── ProtectedRoute.jsx      # Guard por rol
│   │   │
│   │   ├── shared/
│   │   │   ├── SearchBar.jsx           # Buscador indexado (nombre / cédula)
│   │   │   ├── StatusBadge.jsx         # "Activo · X días" / "Vencido"
│   │   │   ├── ConfirmDialog.jsx       # Modal de confirmación genérico
│   │   │   └── EmptyState.jsx
│   │   │
│   │   └── pos/
│   │       ├── CartItem.jsx            # Fila de producto en el carrito
│   │       ├── CartSummary.jsx         # Total + campo efectivo + vuelto
│   │       └── ProductCard.jsx         # Tarjeta visual para seleccionar producto
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   │
│   │   ├── admin/                      # ROL: Administrador
│   │   │   ├── AdminDashboard.jsx      # KPIs del día (ingresos, membresías, nómina)
│   │   │   ├── UsuariosPanel.jsx       # CRUD clientes + entrenadores
│   │   │   ├── EmpleadosPanel.jsx      # Gestión empleados + ciclo de pago
│   │   │   ├── ProductosAdminPanel.jsx # Catálogo + categorías + stock
│   │   │   ├── FinanzasPanel.jsx       # Ganancias, ahorro diario nómina, proyecciones
│   │   │   ├── ReportesPanel.jsx       # Reportes por periodo (ventas, mensualidades)
│   │   │   ├── TurnosPanel.jsx         # Historial y configuración de turnos
│   │   │   └── ConfiguracionPanel.jsx  # Parámetros del gimnasio
│   │   │
│   │   ├── recepcion/                  # ROL: Recepcionista
│   │   │   ├── RecepcionDashboard.jsx  # Turno activo + accesos rápidos
│   │   │   ├── ClientesPanel.jsx       # Registro + búsqueda + ficha del cliente
│   │   │   ├── POSPanel.jsx            # Punto de venta (caja)
│   │   │   ├── ProductosPanel.jsx      # Vista de inventario (solo lectura)
│   │   │   └── CierrePanel.jsx         # Arqueo de caja + cierre de turno
│   │   │
│   │   └── unauthorized/
│   │       └── Unauthorized.jsx
│   │
│   ├── store/                          # Estado global (Zustand)
│   │   ├── authStore.js                # Usuario logueado + rol + permisos
│   │   ├── turnoStore.js               # Turno activo, hora inicio, tipo
│   │   ├── ventasStore.js              # Carrito POS en tiempo real
│   │   ├── clientesStore.js            # Cache lista de clientes
│   │   └── finanzasStore.js            # Ganancias del día, fondo nómina
│   │
│   ├── services/                       # Abstracción de acceso a datos
│   │   ├── authService.js              # Login / logout / validar token local
│   │   ├── clientesService.js          # CRUD clientes (mensualidades, estado)
│   │   ├── productosService.js         # CRUD productos y categorías
│   │   ├── ventasService.js            # Registro de ventas + descuento inventario
│   │   ├── empleadosService.js         # CRUD empleados + ciclos de pago
│   │   ├── finanzasService.js          # Cálculos nómina, proyecciones, reportes
│   │   └── turnoService.js             # Apertura, cierre y arqueo de turno
│   │
│   ├── hooks/                          # Custom hooks
│   │   ├── useAuth.js                  # Rol, permisos, sesión activa
│   │   ├── useTurno.js                 # Control del turno activo
│   │   ├── useClientes.js              # Búsqueda + filtros
│   │   ├── useInventario.js            # Stock, alertas mínimo
│   │   └── useExport.js                # Exportar reportes CSV / PDF
│   │
│   ├── utils/
│   │   ├── formatters.js               # Moneda, fechas, días restantes
│   │   ├── validators.js               # Validación cédula, teléfono, campos
│   │   ├── membershipCalc.js           # Lógica días restantes + estado membresía
│   │   └── nominaCalc.js               # Algoritmo ahorro diario por empleado
│   │
│   ├── mock/                           # Datos semilla para desarrollo
│   │   ├── users.js
│   │   ├── clientes.js
│   │   ├── empleados.js
│   │   ├── productos.js
│   │   ├── ventas.js
│   │   └── finanzas.js
│   │
│   └── styles/
│       ├── variables.css               # Tokens: colores, fuentes, espaciados
│       ├── index.css                   # Reset global
│       ├── login.css
│       ├── adminCSS/
│       │   ├── admin.css
│       │   ├── finanzas.css
│       │   ├── reportes.css
│       │   ├── turnos.css
│       │   └── usuarios.css
│       └── recepcionCSS/
│           ├── Dashboard.css
│           ├── clientes.css
│           ├── pos.css
│           ├── cierre.css
│           └── responsive.css
│
├── electron/                           # (Solo versión Desktop)
│   ├── main.js                         # Proceso principal Electron
│   ├── preload.js                      # Bridge seguro renderer ↔ main
│   └── database/
│       ├── db.js                       # Inicialización SQLite
│       ├── migrations/                 # Scripts de creación de tablas
│       │   ├── 001_users.sql
│       │   ├── 002_clientes.sql
│       │   ├── 003_productos.sql
│       │   ├── 004_ventas.sql
│       │   ├── 005_turnos.sql
│       │   └── 006_empleados.sql
│       └── seed.js                     # Datos iniciales (admin por defecto)
│
├── tests/
│   └── unit/
│       ├── membershipCalc.test.js
│       ├── nominaCalc.test.js
│       └── formatters.test.js
│
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── .env.example
```

---

## Módulos y responsabilidades

### Bloque 1 · Gestión de Usuarios

| Archivo | Función |
|---|---|
| `ClientesPanel.jsx` | Registro y búsqueda de clientes/entrenadores |
| `UsuariosPanel.jsx` | Vista admin: CRUD completo + asignación de entrenador |
| `clientesService.js` | Lógica de negocio: alta, edición, cálculo membresía |
| `membershipCalc.js` | `calcularDiasRestantes(fechaPago, tipoPlan)` → estado |
| `StatusBadge.jsx` | Visual "Activo · 12 días" o "Vencido" |

**Tipos de usuario internos (no son roles de sistema):**
- `CLIENTE` — quien entrena. Tiene mensualidad, entrenador asignado, datos biométricos (opcional).
- `ENTRENADOR` — empleado de campo. Aparece como opción en la ficha del cliente.

---

### Bloque 2 · Inventario + POS

| Archivo | Función |
|---|---|
| `POSPanel.jsx` | Interfaz de caja: carrito + calculadora vuelto |
| `ProductosAdminPanel.jsx` | CRUD categorías y productos (admin) |
| `productosService.js` | Control de stock, alertas mínimo |
| `ventasStore.js` | Estado en tiempo real del carrito |
| `CartSummary.jsx` | Muestra total, campo "efectivo recibido", calcula vuelto |

---

### Bloque 3 · Finanzas

| Archivo | Función |
|---|---|
| `FinanzasPanel.jsx` | Dashboard financiero del admin |
| `finanzasService.js` | Consolidado ingresos + cálculo fondo nómina |
| `nominaCalc.js` | `calcularAhorroDiario(salario, ciclo)` → monto reserva |
| `EmpleadosPanel.jsx` | Configuración ciclo pago (15 o 30 días) por empleado |

---

### Bloque 4 · Cierre de Turno

| Archivo | Función |
|---|---|
| `CierrePanel.jsx` | Formulario arqueo ciego + resultado conciliación |
| `turnoService.js` | Apertura, cálculo ventas del turno, cierre |
| `turnoStore.js` | Tipo de turno activo, hora inicio, base de caja |
| `TurnosPanel.jsx` | Historial de turnos (admin) |

**Tipos de turno:** `COMPLETO` · `MEDIO` · `POR_HORAS`

---

### Bloque 5 · Biométrico (Opcional)

Integración futura via SDK del fabricante (ej. ZKTeco).  
La ficha del cliente reserva el campo `huella_id` en la base de datos.  
En desktop se conecta por USB/DLL nativa desde el proceso Electron.

---

## Esquema de base de datos (SQLite local)

```sql
-- Usuarios del sistema (login)
usuarios (id, nombre, email, password_hash, rol, activo)
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'RECEPCIONISTA'

-- Personas del gimnasio
personas (id, nombre, cedula UNIQUE, telefono, tipo, entrenador_id, foto_url, huella_id)
  tipo: 'CLIENTE' | 'ENTRENADOR'

-- Membresías
membresias (id, persona_id, fecha_pago, dias_plan, fecha_vencimiento, estado)
  estado: 'ACTIVO' | 'VENCIDO' | 'PENDIENTE'

-- Categorías de productos
categorias (id, nombre, descripcion)

-- Productos
productos (id, categoria_id, nombre, precio_venta, precio_costo, stock, stock_minimo)

-- Ventas (cabecera)
ventas (id, turno_id, fecha, total, metodo_pago, tipo)
  tipo: 'PRODUCTO' | 'MENSUALIDAD' | 'DIA_ENTRENAMIENTO'
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

-- Detalle de ventas
ventas_detalle (id, venta_id, producto_id, cantidad, precio_unitario)

-- Empleados
empleados (id, persona_id, cargo, salario, ciclo_pago, fecha_inicio)
  ciclo_pago: 15 | 30

-- Turnos
turnos (id, usuario_id, tipo, hora_inicio, hora_cierre, base_caja,
        ventas_calculadas, monto_ingresado, estado, diferencia)
  tipo: 'COMPLETO' | 'MEDIO' | 'POR_HORAS'
  estado: 'ABIERTO' | 'EXITOSO' | 'FALTANTE' | 'SOBRANTE'
```

---

## Roles del sistema y acceso por módulo

| Módulo | Super Admin | Admin | Recepcionista |
|---|:---:|:---:|:---:|
| Gestión de usuarios/clientes | ✅ | ✅ | ✅ (solo lectura + registro) |
| Inventario (editar) | ✅ | ✅ | ❌ |
| Inventario (ver) | ✅ | ✅ | ✅ |
| POS / Caja | ✅ | ✅ | ✅ |
| Finanzas globales | ✅ | ✅ | ❌ |
| Nómina / Empleados | ✅ | ✅ | ❌ |
| Cierre de turno | ✅ | ✅ | ✅ (solo su turno) |
| Configuración | ✅ | ✅ | ❌ |
| Gestión de licencias | ✅ | ❌ | ❌ |