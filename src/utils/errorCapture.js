// ============================================================
// UTILS - CAPTURA DE ERRORES GLOBALES
// Registra errores no capturados en un buffer local para
// diagnosticar el congelamiento de la interfaz.
// ============================================================

const KEY = "gymcore_error_log";
const MAX = 200;

export const registroErrores = [];

export function registrarError(origen, error) {
  const entrada = {
    t: new Date().toISOString(),
    origen,
    msg: error?.message || String(error),
    stack: error?.stack || "",
    url: (typeof window !== "undefined" && window.location && window.location.href) || "",
  };
  registroErrores.push(entrada);
  if (registroErrores.length > MAX) registroErrores.shift();

  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || "[]");
    prev.push(entrada);
    if (prev.length > MAX) prev.splice(0, prev.length - MAX);
    localStorage.setItem(KEY, JSON.stringify(prev));
  } catch (e) {
    // localStorage puede estar lleno o no disponible; no bloquear
  }

  console.error(`[${origen}]`, error);
}

export function obtenerErroresGuardados() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function limpiarErrores() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // noop
  }
}

export function instalarCapturaGlobal() {
  if (typeof window === "undefined") return;
  if (window.__gymcore_errorCapture_installed) return;
  window.__gymcore_errorCapture_installed = true;

  window.addEventListener("error", (event) => {
    registrarError("window.error", event.error || new Error(event.message || "Error desconocido"));
  });

  window.addEventListener("unhandledrejection", (event) => {
    registrarError("unhandledrejection", event.reason || new Error("Promesa rechazada sin manejar"));
  });
}

export default {
  registrarError,
  obtenerErroresGuardados,
  limpiarErrores,
  instalarCapturaGlobal,
  registroErrores,
};