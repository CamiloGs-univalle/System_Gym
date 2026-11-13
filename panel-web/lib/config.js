// ============================================================
// Configuración del panel (variables de entorno)
// ============================================================
import crypto from "node:crypto";
import path from "node:path";

function fallar(mensaje) {
  console.error(`\n[panel] Configuración incompleta: ${mensaje}\n`);
  process.exit(1);
}

// Si existe un archivo .env en la carpeta del panel, se cargan sus variables
// (las que ya estén definidas en el sistema tienen prioridad).
try {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile();
} catch {
  // sin archivo .env: se usan solo las variables del sistema
}

const env = process.env;

const syncToken = (env.SYNC_TOKEN || "").trim();
if (syncToken.length < 16) {
  fallar("defina SYNC_TOKEN (código de sincronización, mínimo 16 caracteres). Ejemplo: node -e \"console.log(require('crypto').randomBytes(24).toString('base64url'))\"");
}

const adminPassword = env.ADMIN_PASSWORD || "";
if (adminPassword.length < 10) {
  fallar("defina ADMIN_PASSWORD (contraseña del administrador, mínimo 10 caracteres).");
}

let sessionSecret = (env.SESSION_SECRET || "").trim();
if (!sessionSecret) {
  // Sin SESSION_SECRET las sesiones se cierran cada vez que se reinicia el servidor
  sessionSecret = crypto.randomBytes(32).toString("hex");
  console.warn("[panel] SESSION_SECRET no definido: las sesiones se cerrarán al reiniciar el servidor.");
} else if (sessionSecret.length < 32) {
  fallar("SESSION_SECRET debe tener al menos 32 caracteres.");
}

export const config = {
  port: Number(env.PORT) || 3000,
  syncToken,
  adminUser: (env.ADMIN_USER || "admin").trim(),
  adminPassword,
  sessionSecret,
  sessionDays: Number(env.SESSION_DAYS) || 7,
  databaseUrl: (env.DATABASE_URL || "").trim(),
  dataDir: path.resolve(env.DATA_DIR || "./data"),
  // Número de proxies delante (Render, Railway, Nginx): necesario para saber si la conexión es HTTPS
  trustProxy: env.TRUST_PROXY === undefined ? 1 : Number(env.TRUST_PROXY),
  // Tamaño máximo del resumen que envía el gimnasio
  maxSyncBodyMb: Number(env.MAX_SYNC_MB) || 15,
};
