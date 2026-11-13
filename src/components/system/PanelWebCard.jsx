// ============================================================
// Panel web del administrador (consulta desde el celular).
// Este equipo envía cada 10 minutos un resumen al panel: ventas, turnos,
// clientes por vencer, inventario, gastos y pagos de nómina (desprendibles).
// El panel es solo de consulta: no puede modificar nada aquí.
// ============================================================
import { useEffect, useState } from "react";
import api from "../../services/api";

const caja = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 20 };
const input = { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 };
const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };
const boton = (color) => ({ background: color, color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 });

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function PanelWebCard() {
  const [estado, setEstado] = useState(null);
  const [url, setUrl] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const cargar = async () => {
    try {
      const { data } = await api.get("/panel-sync");
      setEstado(data?.data || null);
      setUrl(data?.data?.url || "");
    } catch {
      setEstado(null);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (/^https?:\/\//i.test(codigo.trim())) {
      setMensaje({ tipo: "error", texto: "En «Código de sincronización» va el SYNC_TOKEN del panel, no la dirección." });
      return;
    }
    setOcupado(true);
    setMensaje({ tipo: "", texto: "" });
    try {
      const { data } = await api.put("/panel-sync", { url: url.trim(), token: codigo.trim() });
      setEstado(data?.data || null);
      setCodigo("");
      setMensaje({ tipo: "ok", texto: url.trim() ? "Configuración guardada." : "Panel web desactivado." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err?.mensajeUsuario || "No se pudo guardar." });
    } finally {
      setOcupado(false);
    }
  };

  const sincronizar = async () => {
    setOcupado(true);
    setMensaje({ tipo: "", texto: "" });
    try {
      const { data } = await api.post("/panel-sync/now");
      const r = data?.data;
      setMensaje({ tipo: r?.ok ? "ok" : "error", texto: r?.message || "Listo." });
      cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err?.mensajeUsuario || "No se pudo sincronizar." });
    } finally {
      setOcupado(false);
    }
  };

  const ultimo = estado?.ultimo;

  return (
    <div style={caja}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Panel web (consulta desde el celular)</h3>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        Cada 10 minutos este equipo envía un resumen al panel: ventas, turnos, clientes por vencer, inventario,
        gastos y pagos de nómina para descargar los desprendibles. El panel solo consulta: no puede cambiar nada aquí.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div>
          <label style={etiqueta} htmlFor="panel-url">Dirección del panel</label>
          <input id="panel-url" style={input} value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mi-gimnasio.onrender.com" autoComplete="off" />
        </div>
        <div>
          <label style={etiqueta} htmlFor="panel-codigo">Código de sincronización</label>
          <input id="panel-codigo" style={input} type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)}
            placeholder={estado?.tokenConfigurado ? "•••••••• (guardado; escriba para cambiarlo)" : "El mismo SYNC_TOKEN del servidor"}
            autoComplete="new-password" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={guardar} disabled={ocupado} style={boton("#1e40af")}>Guardar</button>
        <button onClick={sincronizar} disabled={ocupado || !estado?.configurado} style={boton("#059669")}>
          {ocupado ? "Enviando..." : "Sincronizar ahora"}
        </button>
      </div>

      {mensaje.texto && (
        <p style={{ fontSize: 13, marginTop: 8, color: mensaje.tipo === "error" ? "#b91c1c" : "#065f46" }}>{mensaje.texto}</p>
      )}

      <p style={{ fontSize: 12.5, color: "#6b7280", marginTop: 10 }}>
        {!estado?.configurado
          ? "Sin configurar."
          : ultimo
            ? <>Último intento: {fechaHora(ultimo.intento)} · {ultimo.ok ? "correcto" : ultimo.mensaje}
                {ultimo.ultimoExito && !ultimo.ok ? ` · último envío correcto: ${fechaHora(ultimo.ultimoExito)}` : ""}</>
            : "Aún no se ha enviado nada. El primer envío se hace a los 2 minutos de abrir el programa."}
      </p>
    </div>
  );
}
