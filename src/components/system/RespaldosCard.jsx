// ============================================================
// Respaldos de la base de datos (solo administrador).
// - Copia automática cada noche (11:00 p. m.) y al arrancar si ese día no hay copia.
// - Copia adicional en una carpeta externa (Google Drive, OneDrive, USB…).
// - Verificar una copia (se hace sola el día 1 de cada mes) y restaurarla.
//   La restauración se aplica al reiniciar la app (la base no puede estar abierta).
// ============================================================
import { useEffect, useState } from "react";
import api from "../../services/api";

const tamano = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** "systemgym_2026-11-13_230000.db" → "13 nov 2026, 11:00 p. m." */
function fechaRespaldo(nombre) {
  const m = /systemgym_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(nombre || "");
  if (!m) return nombre;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return d.toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const caja = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 20 };
const btn = (fondo = "#1e40af") => ({ background: fondo, color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 });
const btnSuave = { background: "#f3f4f6", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12 };

export default function RespaldosCard() {
  const [lista, setLista] = useState([]);
  const [config, setConfig] = useState(null);
  const [carpeta, setCarpeta] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const enElectron = Boolean(window.systemGym?.sistema);

  const avisar = (tipo, texto) => setMensaje({ tipo, texto });

  const cargar = async () => {
    try {
      const [l, c] = await Promise.all([api.get("/backups"), api.get("/backups/config")]);
      setLista(l.data?.data || []);
      const cfg = c.data?.data || null;
      setConfig(cfg);
      setCarpeta(cfg?.extraDir || "");
    } catch {
      setLista([]);
    }
  };

  useEffect(() => { cargar(); }, []);

  const correr = async (clave, fn) => {
    setOcupado(clave);
    avisar("", "");
    try {
      await fn();
    } catch (err) {
      avisar("error", err?.mensajeUsuario || err?.message || "No se pudo completar la acción.");
    } finally {
      setOcupado("");
    }
  };

  const crear = () => correr("crear", async () => {
    await api.post("/backups");
    avisar("ok", "Respaldo creado correctamente.");
    await cargar();
  });

  const elegirCarpeta = async () => {
    const elegida = await window.systemGym.sistema.elegirCarpeta("Carpeta para la copia externa de respaldos");
    if (elegida) setCarpeta(elegida);
  };

  const guardarCarpeta = () => correr("carpeta", async () => {
    const r = await api.put("/backups/config", { extraDir: carpeta });
    setConfig(r.data?.data || null);
    avisar("ok", carpeta ? "Carpeta externa guardada. El próximo respaldo se copiará allí." : "Copia externa desactivada.");
  });

  const verificar = (nombre) => correr(`v:${nombre}`, async () => {
    const r = (await api.post(`/backups/${encodeURIComponent(nombre)}/verify`)).data?.data;
    avisar(r?.ok ? "ok" : "error", r?.ok
      ? `Copia del ${fechaRespaldo(nombre)} verificada: ${r.clients} clientes y ${r.sales} ventas.`
      : `La copia del ${fechaRespaldo(nombre)} tiene problemas: ${r?.detail}`);
    await cargar();
  });

  const restaurar = (nombre) => {
    const ok = window.confirm(
      `¿Restaurar la información del ${fechaRespaldo(nombre)}?\n\n` +
      "Todo lo registrado después de esa fecha dejará de verse. Antes de restaurar se hace un respaldo del estado actual, " +
      "así que se puede volver atrás.\n\nLa restauración se aplica al reiniciar System Gym.");
    if (!ok) return;
    correr(`r:${nombre}`, async () => {
      await api.post(`/backups/${encodeURIComponent(nombre)}/restore`);
      await cargar();
      avisar("ok", "Restauración programada. Reinicie System Gym para aplicarla.");
    });
  };

  const cancelarRestauracion = () => correr("cancelar", async () => {
    await api.delete("/backups/restore-pending");
    await cargar();
    avisar("ok", "Restauración cancelada.");
  });

  const ultima = config?.lastVerify;

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Respaldos de la información</h3>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Copia automática todas las noches y al abrir el programa. Se guardan en {config?.localDir || ".gymcore\\backups"}.
          </p>
        </div>
        <button onClick={crear} disabled={Boolean(ocupado)} style={btn()}>
          {ocupado === "crear" ? "Creando..." : "Crear respaldo ahora"}
        </button>
      </div>

      {config?.pendingRestore && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 13, color: "#92400e", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: 1 }}>Hay una restauración programada desde <b>{fechaRespaldo(config.pendingRestore)}</b>. Se aplicará al reiniciar.</span>
          {enElectron && <button style={btn("#b45309")} onClick={() => window.systemGym.sistema.reiniciar()}>Reiniciar ahora</button>}
          <button style={btnSuave} onClick={cancelarRestauracion} disabled={Boolean(ocupado)}>Cancelar</button>
        </div>
      )}

      {/* Copia externa */}
      <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f9fafb", border: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Copia externa (recomendado)</p>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          Elija una carpeta de Google Drive, OneDrive o un disco externo. Si el computador se daña, la información queda a salvo allí.
          {!config?.extraDir && <b style={{ color: "#b91c1c" }}> Hoy los respaldos están solo en este computador.</b>}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={carpeta} onChange={(e) => setCarpeta(e.target.value)} placeholder="Ej.: G:\Mi unidad\Respaldos System Gym"
            style={{ flex: 1, minWidth: 240, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
          {enElectron && <button style={btnSuave} onClick={elegirCarpeta}>Elegir carpeta…</button>}
          <button style={btn("#065f46")} onClick={guardarCarpeta} disabled={Boolean(ocupado) || carpeta === (config?.extraDir || "")}>
            {ocupado === "carpeta" ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <p style={{ fontSize: 13, marginTop: 10, color: mensaje.tipo === "error" ? "#b91c1c" : "#065f46" }}>{mensaje.texto}</p>
      )}

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
        Última verificación: {ultima
          ? <>{new Date(ultima.verifiedAt).toLocaleDateString("es-CO")} · {fechaRespaldo(ultima.name)} · {ultima.ok ? <b style={{ color: "#065f46" }}>correcta</b> : <b style={{ color: "#b91c1c" }}>con problemas</b>}</>
          : "nunca (se verifica sola el día 1 de cada mes)"}
      </p>

      <ul style={{ marginTop: 8, fontSize: 13, color: "#374151", maxHeight: 220, overflowY: "auto", listStyle: "none", padding: 0 }}>
        {lista.length === 0 && <li style={{ color: "#9ca3af" }}>Aún no hay respaldos.</li>}
        {lista.slice(0, 15).map((b) => (
          <li key={b.name} style={{ padding: "6px 0", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1 }}>{fechaRespaldo(b.name)} <span style={{ color: "#9ca3af" }}>· {tamano(b.sizeBytes)}</span></span>
            <button style={btnSuave} disabled={Boolean(ocupado)} onClick={() => verificar(b.name)}>
              {ocupado === `v:${b.name}` ? "Verificando…" : "Verificar"}
            </button>
            <button style={{ ...btnSuave, color: "#b91c1c" }} disabled={Boolean(ocupado)} onClick={() => restaurar(b.name)}>
              {ocupado === `r:${b.name}` ? "Programando…" : "Restaurar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
