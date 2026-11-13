// ============================================================
// Lógica compartida de ingreso (recepción y pantalla de quiosco):
// - Escucha el lector de huella si hay uno real.
// - Registra el ingreso por huella o por cédula.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import accesoService from "../../services/accesoService";
import lectorHuella from "../../services/lectorHuella";

export default function useIngreso({ escucharHuella = true, onResultado } = {}) {
  const [lector, setLector] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const activo = useRef(true);
  const cb = useRef(onResultado);
  cb.current = onResultado;

  const mostrar = useCallback((r) => {
    setResultado(r);
    cb.current?.(r);
  }, []);

  const porCedula = useCallback(async (cedula) => {
    const dni = String(cedula || "").replace(/\D/g, "");
    if (!dni) return null;
    setProcesando(true);
    setError("");
    try {
      const r = await accesoService.registrarIngreso({ dni, method: "DNI" });
      mostrar(r);
      return r;
    } catch (e) {
      setError(e?.mensajeUsuario || e?.message || "No se pudo registrar el ingreso.");
      return null;
    } finally {
      setProcesando(false);
    }
  }, [mostrar]);

  const porCliente = useCallback(async (clientId, method = "MANUAL") => {
    setProcesando(true);
    setError("");
    try {
      const r = await accesoService.registrarIngreso({ clientId, method });
      mostrar(r);
      return r;
    } catch (e) {
      setError(e?.mensajeUsuario || e?.message || "No se pudo registrar el ingreso.");
      return null;
    } finally {
      setProcesando(false);
    }
  }, [mostrar]);

  // Lector de huella real: carga plantillas y escucha en ciclo
  useEffect(() => {
    activo.current = true;
    let refresco = null;
    (async () => {
      const est = await lectorHuella.estado();
      setLector(est);
      if (!escucharHuella || est.simulado || !est.conectado) return;

      const cargar = async () => {
        try {
          await lectorHuella.cargarPlantillas(await accesoService.plantillas());
        } catch { /* se reintenta en el siguiente ciclo */ }
      };
      await cargar();
      refresco = setInterval(cargar, 5 * 60 * 1000);

      while (activo.current) {
        const r = await lectorHuella.identificar(15000);
        if (!activo.current) break;
        if (r?.soportado === false) break;
        if (r?.clientId) {
          await porCliente(r.clientId, "FINGERPRINT");
          await new Promise((res) => setTimeout(res, 2500));
        } else if (r?.reconocida === false) {
          mostrar({ granted: false, reason: "NOT_RECOGNIZED", message: "No reconocimos la huella. Intente de nuevo o use su cédula.", client: null });
        }
      }
    })();
    return () => {
      activo.current = false;
      if (refresco) clearInterval(refresco);
      lectorHuella.cancelar();
    };
  }, [escucharHuella, porCliente, mostrar]);

  return { lector, resultado, setResultado, procesando, error, porCedula, porCliente };
}

export const ESTADO = {
  ACTIVO: { texto: "Plan activo", clase: "ok" },
  POR_VENCER: { texto: "Por vencer", clase: "warn" },
  VENCIDO: { texto: "Plan vencido", clase: "bad" },
  SIN_PLAN: { texto: "Sin plan", clase: "bad" },
};
