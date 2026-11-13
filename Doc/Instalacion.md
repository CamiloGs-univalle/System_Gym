# System Gym — Instalación y arranque

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20.19 o superior (o 22) | Interfaz y Electron (Vite 8 lo exige) |
| Java (JDK) | 21 | Compilar y ejecutar el backend |
| Maven | 3.9 o superior | Compilar el backend |
| Windows | 10/11 x64 | Destino del instalador |

Los dos repositorios deben estar uno al lado del otro:

```
GitHub/
├── backendGym/
└── System_Gym/
```

## Desarrollo

```bash
# Terminal 1 - backend (http://localhost:8080, base de datos ~/.gymcore/gymcore-dev.db)
cd backendGym
mvn quarkus:dev

# Terminal 2 - interfaz
cd System_Gym
npm install
npm run dev        # Vite (5173) + Electron; Electron usa el backend de desarrollo si responde
```

En desarrollo Vite redirige `/api` a `http://localhost:8080` y Swagger queda en
`http://localhost:8080/swagger-ui`.

Usuario inicial: `admin` / `admin123` (el sistema obliga a cambiar la contraseña).

## Pruebas

```bash
cd backendGym
mvn test
```

## Instalador

```bash
cd backendGym && mvn package -DskipTests      # genera target/quarkus-app
cd ../System_Gym
npm run preparar-jre                           # una sola vez: descarga Java 21 en jre/
npm run dist                                   # release/System Gym Setup x.y.z.exe
```

## Archivos en el equipo del gimnasio

| Ruta | Contenido |
|---|---|
| `%USERPROFILE%\.gymcore\gymcore.db` | Base de datos |
| `%USERPROFILE%\.gymcore\backups` | Respaldos (cada noche a las 11:00 p. m., se guardan 30) |
| `%USERPROFILE%\.gymcore\photos` | Fotos de clientes |
| `%USERPROFILE%\.gymcore\logs` | Log del backend |
| `%APPDATA%\system_gym\logs\app.log` | Log de Electron |
| `%USERPROFILE%\.gymcore\lector.json` | `{ "proveedor": "ZKTECO" }` activa el lector de huella real |

## Problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| "No se encontró Java 21" | Falta la carpeta `jre` en el instalador | Ejecutar `npm run preparar-jre` antes de `npm run dist` |
| "No se encontró el servidor de la aplicación" | No se compiló el backend | `mvn package -DskipTests` en `backendGym` |
| Pantalla en blanco en producción | Rutas relativas | Verificar `base: './'` en `vite.config.js` |
| La API responde 403 `APP_KEY_INVALID` | Petición fuera de la app | Es lo esperado: solo la app de escritorio puede usar la API |
| La API responde 402 | Licencia vencida o inválida | Pegar una licencia nueva en el aviso de la parte superior |

Más detalle sobre licencias, respaldos, nómina y lector de huella en el `README.md`.
