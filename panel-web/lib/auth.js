// ============================================================
// Sesión del administrador y código de sincronización
// ============================================================
import crypto from "node:crypto";

const COOKIE = "sg_panel";
const MAX_FALLOS = 5;
const BLOQUEO_MS = 10 * 60 * 1000;

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest();
const igual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

export function crearAuth(config) {
  // La contraseña no se guarda en claro en memoria más allá del arranque
  const sal = crypto.randomBytes(16);
  const hashClave = crypto.scryptSync(config.adminPassword, sal, 64);
  const fallos = new Map(); // ip -> { n, hasta }

  const firmar = (texto) =>
    crypto.createHmac("sha256", config.sessionSecret).update(texto).digest("base64url");

  function crearToken(usuario) {
    const exp = Date.now() + config.sessionDays * 86400000;
    const cuerpo = Buffer.from(JSON.stringify({ u: usuario, exp })).toString("base64url");
    return `${cuerpo}.${firmar(cuerpo)}`;
  }

  function leerToken(token) {
    if (!token || typeof token !== "string") return null;
    const [cuerpo, firma] = token.split(".");
    if (!cuerpo || !firma || !igual(firma, firmar(cuerpo))) return null;
    try {
      const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
      return datos.exp > Date.now() ? datos : null;
    } catch {
      return null;
    }
  }

  function leerCookie(req) {
    const raw = req.headers.cookie || "";
    for (const parte of raw.split(";")) {
      const [k, ...v] = parte.trim().split("=");
      if (k === COOKIE) return decodeURIComponent(v.join("="));
    }
    return null;
  }

  function cookie(res, req, valor, maxAgeSeg) {
    const partes = [
      `${COOKIE}=${encodeURIComponent(valor)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${maxAgeSeg}`,
    ];
    if (req.secure) partes.push("Secure");
    res.setHeader("Set-Cookie", partes.join("; "));
  }

  return {
    /** Middleware: exige sesión de administrador */
    requiereSesion(req, res, next) {
      const sesion = leerToken(leerCookie(req));
      if (!sesion) return res.status(401).json({ error: "SESION", mensaje: "Inicie sesión." });
      req.usuario = sesion.u;
      next();
    },

    /** Middleware: exige el código de sincronización del gimnasio */
    requiereCodigoSync(req, res, next) {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
      if (!token || !igual(token, config.syncToken)) {
        return res.status(401).json({ error: "CODIGO", mensaje: "Código de sincronización no válido." });
      }
      next();
    },

    login(req, res) {
      const ip = req.ip || "desconocida";
      const f = fallos.get(ip);
      if (f && f.hasta > Date.now()) {
        const min = Math.ceil((f.hasta - Date.now()) / 60000);
        return res.status(429).json({ error: "BLOQUEADO", mensaje: `Demasiados intentos. Espere ${min} minuto(s).` });
      }
      const { usuario = "", clave = "" } = req.body || {};
      const hashIntento = crypto.scryptSync(String(clave), sal, 64);
      const ok = igual(String(usuario).trim().toLowerCase(), config.adminUser.toLowerCase())
        && crypto.timingSafeEqual(hashIntento, hashClave);
      if (!ok) {
        const n = (f && f.hasta <= Date.now() ? 0 : f?.n || 0) + 1;
        fallos.set(ip, { n, hasta: n >= MAX_FALLOS ? Date.now() + BLOQUEO_MS : 0 });
        return res.status(401).json({ error: "CREDENCIALES", mensaje: "Usuario o contraseña incorrectos." });
      }
      fallos.delete(ip);
      cookie(res, req, crearToken(config.adminUser), config.sessionDays * 86400);
      res.json({ ok: true, usuario: config.adminUser });
    },

    logout(req, res) {
      cookie(res, req, "", 0);
      res.json({ ok: true });
    },

    sesion(req, res) {
      const sesion = leerToken(leerCookie(req));
      res.json({ autenticado: Boolean(sesion), usuario: sesion?.u || null });
    },
  };
}
