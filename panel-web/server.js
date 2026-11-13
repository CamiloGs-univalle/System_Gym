// ============================================================
// System Gym - Panel web del administrador
// ------------------------------------------------------------
// - El PC del gimnasio envía cada 10 minutos un resumen (POST /api/sync)
//   usando el código de sincronización (SYNC_TOKEN).
// - El administrador entra desde el celular, consulta (solo lectura) y
//   descarga los desprendibles de pago en PDF.
// - El panel no puede modificar nada en el gimnasio.
// ============================================================
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./lib/config.js";
import { crearAlmacen } from "./lib/almacen.js";
import { crearAuth } from "./lib/auth.js";
import { generarDesprendible, nombreArchivo } from "./lib/desprendible.js";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const almacen = await crearAlmacen(config);
const auth = crearAuth(config);
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);

// ---------- Cabeceras de seguridad ----------
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/healthz", (req, res) => res.json({ ok: true }));

// ---------- Recepción del resumen desde el gimnasio ----------
app.post("/api/sync",
  auth.requiereCodigoSync,
  express.json({ limit: `${config.maxSyncBodyMb}mb`, inflate: true }),
  async (req, res, next) => {
    try {
      const datos = req.body;
      if (!datos || typeof datos !== "object" || datos.version !== 1) {
        return res.status(400).json({ error: "FORMATO", mensaje: "Resumen con formato no reconocido." });
      }
      const recibidoEn = await almacen.guardar(datos);
      res.json({ ok: true, recibidoEn });
    } catch (e) { next(e); }
  });

// ---------- Sesión ----------
app.post("/api/login", express.json({ limit: "10kb" }), auth.login);
app.post("/api/logout", auth.logout);
app.get("/api/sesion", auth.sesion);

// ---------- Consulta ----------
app.get("/api/datos", auth.requiereSesion, async (req, res, next) => {
  try {
    const ultimo = await almacen.ultimo();
    if (!ultimo) return res.json({ recibidoEn: null, datos: null });
    res.json(ultimo);
  } catch (e) { next(e); }
});

app.get("/api/desprendible/:id", auth.requiereSesion, async (req, res, next) => {
  try {
    const ultimo = await almacen.ultimo();
    const pagos = ultimo?.datos?.nomina?.pagos || [];
    const pago = pagos.find((p) => String(p.id) === String(req.params.id));
    if (!pago) return res.status(404).json({ error: "NO_ENCONTRADO", mensaje: "No se encontró ese pago." });
    const empleado = (ultimo.datos.empleados || []).find((e) => String(e.id) === String(pago.empleadoId)) || null;
    res.setHeader("Content-Type", "application/pdf");
    const modo = req.query.ver === "1" ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${modo}; filename="${nombreArchivo(pago)}"`);
    generarDesprendible(res, { pago, empleado, gimnasio: ultimo.datos.gimnasio });
  } catch (e) { next(e); }
});

app.use("/api", (req, res) => res.status(404).json({ error: "NO_ENCONTRADO" }));

// ---------- Interfaz ----------
app.use(express.static(path.join(raiz, "public"), { index: "index.html", maxAge: "1h" }));

// ---------- Errores ----------
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "MUY_GRANDE", mensaje: "El resumen supera el tamaño permitido." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON", mensaje: "Contenido no válido." });
  }
  console.error("[panel] Error:", err?.message || err);
  if (res.headersSent) return res.end();
  res.status(500).json({ error: "INTERNO", mensaje: "Error interno del panel." });
});

app.listen(config.port, () => {
  console.log(`[panel] System Gym panel escuchando en el puerto ${config.port}`);
});
