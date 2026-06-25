# GymCore — Flujos del Sistema

> Descripción de los flujos de navegación, lógica de negocio y estados clave de cada módulo.

---

## 1. Flujo de Autenticación

```
Pantalla Login
     │
     ├─► Valida credenciales (local: SQLite / web: JWT)
     │
     ├─► ROL: ADMIN ──────────────► AdminDashboard
     │
     ├─► ROL: RECEPCIONISTA ──────► RecepcionDashboard
     │                              (Solo si hay turno activo, si no → Abrir Turno)
     │
     └─► ROL: SUPER_ADMIN ────────► SuperAdminDashboard (solo web SaaS)
```

**Guards:** `ProtectedRoute.jsx` intercepta cualquier ruta y verifica el rol en `authStore`. Si no coincide → `/unauthorized`.

---

## 2. Flujo Bloque 1 — Gestión de Usuarios / Clientes

### 2.1 Registrar nuevo cliente (Recepcionista o Admin)

```
ClientesPanel
     │
     ├─► Botón "Nuevo Cliente"
     │       │
     │       └─► Modal / formulario
     │               - Nombre completo        (requerido)
     │               - Cédula                 (requerido, único)
     │               - Teléfono               (requerido)
     │               - Tipo                   CLIENTE | ENTRENADOR
     │               - Entrenador asignado    (select, solo si tipo = CLIENTE)
     │               - Plan de membresía      (días: 30, 15, día)
     │               - Fecha de pago          (default: hoy)
     │
     ├─► Guardar
     │       │
     │       ├─► clientesService.crear(datos)
     │       ├─► Calcular fecha_vencimiento = fecha_pago + dias_plan
     │       └─► Insertar en personas + membresias
     │
     └─► Lista actualizada con StatusBadge en tiempo real
```

### 2.2 Cálculo de estado de membresía (proceso diario)

```
Cron / Timer al iniciar la app cada día:
     │
     └─► Para cada membresía activa:
             dias_restantes = fecha_vencimiento - hoy
             │
             ├─► dias_restantes > 0  →  estado = 'ACTIVO'
             │                          badge = "Activo · X días"
             │
             └─► dias_restantes <= 0 →  estado = 'VENCIDO'
                                        badge = "Vencido"
                                        acceso biométrico: DENEGADO
```

### 2.3 Búsqueda de clientes

```
SearchBar (onChange en tiempo real)
     │
     └─► Filtra por: nombre (LIKE) | cédula (exact / LIKE)
             │
             └─► Resultados en tabla con columnas:
                     Nombre | Cédula | Estado | Días restantes | Entrenador | Acciones
```

### 2.4 Ficha del cliente (vista usuario)

```
Click en cliente → FichaCliente modal/página
     │
     ├─► Datos personales
     ├─► Estado membresía (visual prominente)
     ├─► Entrenador asignado (nombre + teléfono)
     ├─► Historial de pagos
     └─► Acciones: Renovar membresía | Editar | Asignar entrenador
```

---

## 3. Flujo Bloque 2 — Inventario y Punto de Venta (POS)

### 3.1 Crear categoría y producto (Admin)

```
ProductosAdminPanel
     │
     ├─► Sección "Categorías"
     │       └─► Nueva categoría: nombre + descripción → guardar
     │
     └─► Sección "Productos"
             └─► Nuevo producto:
                     - Nombre
                     - Categoría (select)
                     - Precio de venta
                     - Precio de costo
                     - Stock inicial
                     - Stock mínimo (umbral alerta)
```

### 3.2 Flujo de venta en caja (Recepcionista)

```
POSPanel
     │
     ├─► Panel izquierdo: Catálogo por categorías
     │       └─► Click en producto → agrega a carrito (ventasStore)
     │
     ├─► Panel derecho: Carrito activo
     │       ├─► Lista de items: nombre | cantidad | subtotal
     │       ├─► Botones +/- por item | Eliminar
     │       ├─► TOTAL calculado en tiempo real
     │       │
     │       ├─► Campo "Efectivo recibido"
     │       │       └─► Vuelto = efectivo - total (muestra en grande)
     │       │
     │       └─► Método de pago: EFECTIVO | TARJETA | TRANSFERENCIA
     │
     └─► Botón "Confirmar venta"
             │
             ├─► ventasService.registrarVenta(carrito, metodoPago, turnoId)
             ├─► Descontar stock de cada producto
             ├─► Verificar stock mínimo → alerta si aplica
             ├─► Asociar al turno activo
             └─► Limpiar carrito → pantalla de éxito con resumen
```

### 3.3 Alerta de stock mínimo

```
Después de cada venta:
     │
     └─► producto.stock <= producto.stock_minimo
             │
             └─► Mostrar Toast/Badge de advertencia:
                     "⚠ Suplemento Proteína: solo 2 unidades restantes"
```

---

## 4. Flujo Bloque 3 — Finanzas y Nómina

### 4.1 Dashboard financiero del día (Admin)

```
FinanzasPanel — carga al abrir
     │
     ├─► Ingresos del día:
     │       ├─► Suma ventas tipo PRODUCTO
     │       ├─► Suma ventas tipo MENSUALIDAD
     │       └─► Suma ventas tipo DIA_ENTRENAMIENTO
     │
     ├─► Fondo de Reserva Nómina (calculado):
     │       │
     │       └─► Para cada empleado activo:
     │               costo_diario = salario / ciclo_pago
     │               fondo_total_dia = Σ costo_diario de todos
     │               │
     │               └─► Se muestra como "No disponible" → resta de ganancia líquida
     │
     └─► Ganancia líquida del día = ingresos_dia - fondo_nomina_dia
```

### 4.2 Algoritmo de ahorro diario de nómina

```
nominaCalc.calcularAhorroDiario(empleados[])
     │
     └─► Para cada empleado:
             si ciclo = 15: costo_diario = salario / 15
             si ciclo = 30: costo_diario = salario / 30
             │
             └─► Retorna: { empleado_id, costo_diario, proximo_pago, dias_para_pago }

Ejemplo:
     Entrenador Juan — salario: $600.000 — ciclo: quincenal (15 días)
     costo_diario = $600.000 / 15 = $40.000/día
     Hoy en FinanzasPanel → "Reserva nómina: $40.000 no disponibles"
```

### 4.3 Panel empleados — configuración ciclo de pago

```
EmpleadosPanel
     │
     ├─► Lista de empleados con: nombre | cargo | salario | ciclo | próximo pago
     │
     └─► Editar empleado:
             - Ciclo de pago: 15 días (quincenal) | 30 días (mensual)
             - Fecha inicio contrato (para calcular próximo pago)
             - Salario base
```

---

## 5. Flujo Bloque 4 — Turno y Cierre de Caja

### 5.1 Apertura de turno (Recepcionista)

```
RecepcionDashboard (sin turno activo)
     │
     └─► Modal "Abrir Turno"
             ├─► Tipo: COMPLETO | MEDIO | POR_HORAS
             │       (MEDIO → presets: 6am-2pm / 2pm-10pm)
             │       (POR_HORAS → campo hora inicio + hora fin estimada)
             │
             ├─► Base de caja inicial (monto en efectivo que hay en caja)
             │
             └─► Confirmar → turnoStore.abrir({ tipo, horaInicio, baseCaja })
                             registro en BD → turno estado: ABIERTO
```

### 5.2 Flujo de cierre de turno (Arqueo ciego)

```
CierrePanel
     │
     ├─► PASO 1: Resumen del turno (solo info, sin montos)
     │       - Hora inicio / hora actual
     │       - Tipo de turno
     │       - Cantidad de transacciones
     │
     ├─► PASO 2: Arqueo ciego
     │       └─► Campo: "¿Cuánto dinero hay físicamente en caja?"
     │               (el recepcionista NO ve el monto calculado)
     │
     └─► PASO 3: Confirmar → turnoService.cerrar(montoIngresado)
             │
             ├─► Sistema calcula:
             │       esperado = baseCaja + ventasEfectivo_del_turno
             │       diferencia = montoIngresado - esperado
             │
             └─► Resultado:
                     diferencia = 0   →  ✅ EXITOSO
                     diferencia < 0   →  ❌ FALTANTE  (muestra monto faltante)
                     diferencia > 0   →  ⚠ SOBRANTE  (muestra monto sobrante)

     El informe queda guardado y visible para el Admin en TurnosPanel.
```

---

## 6. Flujo Bloque 5 — Biométrico (Opcional, Desktop)

```
Cliente apoya huella en lector
     │
     └─► SDK ZKTeco devuelve huella_id numérico
             │
             └─► clientesService.validarAcceso(huella_id)
                     │
                     ├─► Busca persona por huella_id en BD
                     ├─► Consulta membresía activa
                     │
                     ├─► dias_restantes > 0
                     │       ├─► Envía señal relé: ABRIR
                     │       └─► Muestra: "Bienvenido, {nombre} · {dias} días restantes"
                     │
                     └─► dias_restantes <= 0
                             ├─► Bloquea relé: CERRADO
                             └─► Alerta visual + sonora: "Membresía vencida"
```

---

## 7. Estados globales (Zustand stores)

### authStore

```js
{
  usuario: { id, nombre, rol, email },
  isAuthenticated: boolean,
  login(credentials),
  logout()
}
```

### turnoStore

```js
{
  turnoActivo: { id, tipo, horaInicio, baseCaja } | null,
  abrirTurno(datos),
  cerrarTurno(montoIngresado),
  getTurnoId()
}
```

### ventasStore (carrito POS)

```js
{
  items: [{ producto, cantidad, subtotal }],
  total: number,
  metodoPago: string,
  agregarItem(producto),
  quitarItem(productoId),
  cambiarCantidad(productoId, cantidad),
  limpiarCarrito(),
  confirmarVenta()
}
```

### finanzasStore

```js
{
  ingresosHoy: { productos, mensualidades, dias },
  fondoNomina: number,
  gananciaLiquida: number,
  cargarResumenDia()
}
```

---

## 8. Navegación por rol

### Menú Admin (Sidebar)

```
📊 Dashboard
👥 Usuarios / Clientes
🏋 Empleados
📦 Productos e Inventario
💰 Finanzas
📋 Reportes
🕐 Turnos
⚙️ Configuración
```

### Menú Recepcionista (Sidebar)

```
🏠 Inicio (turno activo)
👤 Clientes
🛒 Caja / POS
📦 Inventario (solo ver)
🔒 Cierre de turno
```

---

## 9. Reglas de negocio clave

| Regla | Descripción |
|---|---|
| Cédula única | No se pueden registrar dos personas con la misma cédula |
| Turno requerido para vender | El POS solo opera si hay un turno abierto |
| Arqueo ciego | El recepcionista no ve el monto esperado al momento del cierre |
| Fondo de reserva | El ahorro diario de nómina se descuenta visualmente de la ganancia líquida |
| Renovación de membresía | Al cobrar, se extiende desde la fecha de vencimiento (no desde hoy) si ya venció hace menos de 3 días; si venció hace más, inicia desde hoy |
| Stock en 0 | El sistema bloquea la venta de un producto sin stock |
| Acceso biométrico | Solo si `dias_restantes > 0` se autoriza la apertura del acceso |