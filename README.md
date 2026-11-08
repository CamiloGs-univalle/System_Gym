# System Gym

Sistema de gestión para gimnasios: clientes y membresías, punto de venta, inventario,
turnos y cierre de caja, empleados, nómina y reportes. App de escritorio para Windows
(Electron + React) con backend local (Quarkus + SQLite, repositorio `backendGym`).

## Desarrollo

```bash
# Backend (en backendGym)
mvn quarkus:dev            # queda en http://localhost:8080

# Frontend (este repositorio)
npm install
npm run dev                # Vite + Electron; usa el backend de desarrollo si está arriba
```

## Generar el instalador

```bash
# 1. Compilar el backend (en backendGym)
mvn package -DskipTests

# 2. Descargar Java 21 para incluirlo en el instalador (una sola vez)
npm run preparar-jre

# 3. Generar el instalador
npm run dist               # queda en release/System Gym Setup x.y.z.exe
```

El instalador incluye Java (carpeta `jre`), así que el gimnasio no tiene que instalar nada más.

## Primer inicio

- Usuario `admin`, contraseña `admin123`. El sistema **obliga a cambiarla** en el primer ingreso.
- Las contraseñas deben tener al menos 8 caracteres, con letras y números.
- Tras 5 intentos fallidos, el usuario queda bloqueado 5 minutos.

## Seguridad

- Electron arranca el backend en un **puerto libre** y con una **llave aleatoria** por sesión
  (`X-App-Key`): una página web abierta en el mismo PC no puede usar la API.
- En producción no se guardan logs informativos del navegador (pueden contener datos).
- Swagger/OpenAPI solo se exponen en modo desarrollo.

## Datos y respaldos

- Base de datos: `%USERPROFILE%\.gymcore\gymcore.db`.
- Respaldo automático cada noche (11:00 p. m.) y al arrancar si ese día no hay copia, en
  `%USERPROFILE%\.gymcore\backups` (se conservan 30). También se puede crear uno desde
  **Configuración → Respaldos**.
- Para duplicar los respaldos fuera del PC (Google Drive, OneDrive), defina la variable de
  entorno `SYSTEMGYM_BACKUP_DIR` con la carpeta sincronizada.

## Licencias (cobro mensual)

1. Una sola vez, en un PC seguro: `node tools/licencias/crear-llaves.mjs C:\ruta\privada`
   - Guarda `private.pem` (NUNCA lo suba a GitHub ni lo comparta).
   - Copie el contenido de `public.pem` en `systemgym.license.public-key` de
     `backendGym/src/main/resources/application.properties` y recompile.
2. Por cada gimnasio y mes:
   `node tools/licencias/generar-licencia.mjs C:\ruta\privada\private.pem "Nombre del gym" 2026-12-31`
3. El administrador del gimnasio pega la licencia en el aviso amarillo/rojo de la parte superior.

Sin licencia, el sistema funciona 30 días de prueba. Si la licencia vence, queda en
**solo lectura** (se puede consultar, pero no registrar ventas ni cobros) hasta renovarla.
Si no se configura la llave pública, el licenciamiento está desactivado.

## Nómina

- **Empleados:** registre fecha de ingreso, tipo de vinculación (contrato laboral o prestación de
  servicios), frecuencia (quincenal o mensual) y riesgo ARL. El salario es siempre el **mensual**.
- **Nómina → Configuración:** día de pago mensual, días de las quincenas, qué hacer si cae domingo o
  festivo, día límite de la PILA y exoneración del Art. 114-1.
- **Nómina → Pagos:** pagos pendientes y atrasados por empleado y periodo. Cada pago se registra una
  sola vez y crea el egreso "Nómina" en Finanzas.
- **Nómina → Ahorro y obligaciones:** cuánto debería tener ahorrado hoy, cuánto apartar en cada pago y el
  calendario de seguridad social, prima (30 jun y 20 dic), intereses de cesantías (31 ene), cesantías
  (14 feb) y vacaciones, con un fondo de nómina para registrar lo que se aparta.
- Los festivos de Colombia se calculan solos para cada año. El SMMLV, el auxilio de transporte y la UVT
  se actualizan cada enero en `src/services/nomina/nominaEngine.js`.
