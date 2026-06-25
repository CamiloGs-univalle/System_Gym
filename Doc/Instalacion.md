# GymCore — Instalación y Arranque

> Guía paso a paso para levantar el proyecto en entorno de desarrollo  
> y preparar el build de producción (versión local desktop).

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18.x LTS | `node -v` |
| npm | 9.x | `npm -v` |
| Git | 2.x | `git --version` |
| VS Code (recomendado) | cualquiera | — |

Para la versión **Desktop (Electron)**:
- Windows 10/11 x64 (objetivo principal de recepción)
- SDK del lector biométrico instalado (ej. ZKTeco SDK) — solo Bloque 5

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/tu-org/gymcore.git
cd gymcore
```

---

## 2. Instalar dependencias

```bash
npm install
```

Dependencias principales que se instalarán:

| Paquete | Uso |
|---|---|
| `react` + `react-dom` | UI |
| `vite` | Build tool / dev server |
| `react-router-dom` | Enrutamiento |
| `zustand` | Estado global |
| `tailwindcss` | Estilos utilitarios |
| `@shadcn/ui` | Componentes UI base |
| `lucide-react` | Íconos |
| `dayjs` | Manipulación de fechas |
| `zod` | Validación de esquemas |

Para versión desktop, además:

```bash
npm install electron electron-builder better-sqlite3
```

---

## 3. Variables de entorno

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Contenido del `.env` para desarrollo:

```env
# Modo de la aplicación
VITE_APP_MODE=desktop           # 'desktop' | 'web'
VITE_APP_NAME=GymCore
VITE_APP_VERSION=1.0.0

# Base de datos (solo web)
# VITE_API_URL=http://localhost:3000/api

# Funciones opcionales
VITE_BIOMETRICO_ENABLED=false   # true para activar Bloque 5
```

---

## 4. Inicializar la base de datos (versión desktop)

Al correr la app por primera vez, Electron crea automáticamente el archivo SQLite en:

```
Windows: C:\Users\{usuario}\AppData\Roaming\GymCore\gymcore.db
```

Para forzar la creación y aplicar migraciones manualmente:

```bash
npm run db:migrate
```

Para cargar datos de prueba (seed):

```bash
npm run db:seed
```

Esto crea un usuario admin por defecto:

```
Email:    admin@gymcore.local
Password: Admin123!
Rol:      ADMIN
```

> **Importante:** Cambiar la contraseña en el primer inicio desde Configuración → Seguridad.

---

## 5. Levantar en modo desarrollo

### Solo interfaz React (sin Electron):

```bash
npm run dev
```

Abre en `http://localhost:5173`

### Con Electron (desktop completo):

```bash
npm run electron:dev
```

Esto inicia Vite en modo dev y abre la ventana de Electron apuntando al servidor local.

---

## 6. Estructura de scripts disponibles

```json
{
  "scripts": {
    "dev":              "vite",
    "build":            "vite build",
    "preview":          "vite preview",
    "electron:dev":     "concurrently \"vite\" \"electron .\"",
    "electron:build":   "vite build && electron-builder",
    "db:migrate":       "node electron/database/migrations/run.js",
    "db:seed":          "node electron/database/seed.js",
    "db:reset":         "node electron/database/reset.js",
    "test":             "vitest run",
    "test:watch":       "vitest"
  }
}
```

---

## 7. Build de producción

### Web (archivos estáticos):

```bash
npm run build
```

Genera carpeta `dist/` lista para servir con cualquier servidor web (Nginx, Apache, etc.).

### Desktop (instalador .exe para Windows):

```bash
npm run electron:build
```

Genera en `dist-electron/`:
```
GymCore-Setup-1.0.0.exe    ← instalador NSIS
GymCore-1.0.0-win.zip      ← versión portable
```

Configuración de electron-builder en `package.json`:

```json
"build": {
  "appId": "com.gymcore.app",
  "productName": "GymCore",
  "win": {
    "target": ["nsis", "zip"],
    "icon": "public/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  },
  "files": ["dist/**/*", "electron/**/*"],
  "extraResources": [
    { "from": "electron/database/migrations", "to": "migrations" }
  ]
}
```

---

## 8. Módulos opcionales: activar Bloque 5 (Biométrico)

### Requisitos adicionales:

1. Instalar el SDK del fabricante (ej. ZKTeco `zkfp2.dll`) en la máquina de recepción.
2. Colocar los archivos `.dll` en `electron/biometric/sdk/`.
3. Activar en `.env`:

```env
VITE_BIOMETRICO_ENABLED=true
```

4. Registrar huellas desde la ficha del cliente → botón "Registrar huella".

> La integración con el SDK se hace únicamente desde el proceso principal de Electron (`electron/main.js`) usando `ffi-napi` o el módulo nativo provisto por el fabricante.

---

## 9. Backup automático de la base de datos

La app ejecuta un backup automático cada día a la hora configurada. Para ajustarlo:

Configuración → Backup:
- Hora del backup automático (default: 2:00 AM)
- Carpeta de destino (local o USB)
- Sincronización con Google Drive (requiere internet)

El archivo de backup se guarda como:
```
gymcore_backup_YYYY-MM-DD.db
```

Para restaurar un backup manualmente:
```bash
npm run db:restore -- --file=gymcore_backup_2026-06-25.db
```

---

## 10. Extensiones recomendadas para VS Code

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "prisma.prisma",
    "formulahendry.auto-rename-tag"
  ]
}
```

---

## 11. Solución de problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| `better-sqlite3` falla al instalar | Versión de Node incompatible | Usar Node 18 LTS exactamente |
| Electron no abre | Puerto 5173 ocupado | Cambiar en `vite.config.js` → `server.port` |
| DB no se crea | Permisos en AppData | Ejecutar VS Code como administrador |
| Pantalla en blanco en prod | Rutas relativas mal configuradas | Verificar `base: './'` en `vite.config.js` |
| Biométrico no detectado | DLL no encontrada | Verificar ruta en `electron/biometric/sdk/` |

---

## 12. Roadmap de desarrollo (fases)

```
Fase 1 (actual) ──► Frontend: Admin + Recepcionista (mock data)
Fase 2          ──► Integración SQLite local (Electron)
Fase 3          ──► Bloque Finanzas completo + reportes exportables
Fase 4          ──► Cierre de turno + arqueo ciego funcional
Fase 5          ──► Integración biométrica (opcional)
Fase 6          ──► Versión Web SaaS (multi-tenant, backend NestJS/PostgreSQL)
```