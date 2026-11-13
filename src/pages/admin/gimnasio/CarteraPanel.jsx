// ============================================================
// Cartera y cobranza (solo administrador).
// Lista los clientes con el plan vencido (o por vencer) con sus días de mora,
// su último pago y las gestiones de cobro (llamadas, WhatsApp…), que quedan
// guardadas en la base de datos. El pago se recibe en la caja.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { carteraService, TIPOS_CONTACTO, RESULTADOS } from "../../../services/gimnasio/carteraService";
import { COP, formatDate } from "../../../utils/formatters";

const TRAMOS = [
  { value: "POR_VENCER", label: "Por vencer", color: "#3b82f6" },
  { value: "1_30", label: "1-30 días", color: "#f59e0b" },
  { value: "31_60", label: "31-60 días", color: "#f97316" },
  { value: "61_90", label: "61-90 días", color: "#ef4444" },
  { value: "90_MAS", label: "Más de 90", color: "#991b1b" },
];
const etiqueta = (lista, v) => lista.find((x) => x.value === v)?.label || v;
const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.8rem" };
const td = { padding: "10px 12px", fontSize: "0.85rem", verticalAlign: "top" };
const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", boxSizing: "border-box" };

/** Enlace de WhatsApp con un mensaje de recordatorio (números de Colombia) */
function enlaceWhatsApp(c) {
  const num = String(c.phone || "").replace(/\D/g, "");
  if (num.length < 10) return null;
  const tel = num.length === 10 ? `57${num}` : num;
  const texto = `Hola ${c.fullName.split(" ")[0]}, te escribimos del gimnasio. Tu plan venció el ${formatDate(c.expirationDate)}. ¡Te esperamos para renovarlo y seguir entrenando!`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}

export default function CarteraPanel() {
  const [cartera, setCartera] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState({ busqueda: "", tramo: "" });
  const [seleccion, setSeleccion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setCartera(await carteraService.listar());
    } catch (e) {
      setError(e?.mensajeUsuario || "No se pudo cargar la cartera.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const stats = useMemo(() => ({
    vencidos: cartera.filter((c) => c.daysOverdue > 0).length,
    porVencer: cartera.filter((c) => c.bracket === "POR_VENCER").length,
    valorEstimado: cartera.filter((c) => c.daysOverdue > 0).reduce((s, c) => s + (c.lastPaymentAmount || 0), 0),
    porTramo: TRAMOS.map((t) => ({ ...t, count: cartera.filter((c) => c.bracket === t.value).length })),
  }), [cartera]);

  const filtrada = useMemo(() => {
    const t = filtro.busqueda.trim().toLowerCase();
    return cartera.filter((c) => {
      if (filtro.tramo && c.bracket !== filtro.tramo) return false;
      if (t && !c.fullName.toLowerCase().includes(t) && !String(c.dni).includes(t)) return false;
      return true;
    });
  }, [cartera, filtro]);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Cartera y cobranza</h2>
      <p style={{ margin: "4px 0 16px", color: "#6b7280", fontSize: "0.875rem" }}>
        Clientes con el plan vencido en los últimos 180 días o que vence en los próximos 3. El pago se recibe en la caja.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Tarjeta titulo="Plan vencido" valor={stats.vencidos} color="#ef4444" />
        <Tarjeta titulo="Por vencer" valor={stats.porVencer} color="#3b82f6" />
        <Tarjeta titulo="Por recuperar (estimado)" valor={COP(stats.valorEstimado)} color="#f59e0b" nota="Según el último pago de cada uno" />
        {stats.porTramo.filter((t) => t.value !== "POR_VENCER").map((t) => (
          <Tarjeta key={t.value} titulo={t.label} valor={t.count} color={t.color} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="text" placeholder="Buscar por nombre o cédula…" value={filtro.busqueda}
          onChange={(e) => setFiltro({ ...filtro, busqueda: e.target.value })} style={{ ...input, flex: 1 }} />
        <select value={filtro.tramo} onChange={(e) => setFiltro({ ...filtro, tramo: e.target.value })} style={input}>
          <option value="">Todos los tramos</option>
          {TRAMOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>{["Cliente", "Plan", "Venció", "Días", "Último pago", "Última gestión", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {cargando && <tr><td style={td} colSpan={7}>Cargando…</td></tr>}
            {!cargando && filtrada.map((c) => {
              const tramo = TRAMOS.find((t) => t.value === c.bracket) || TRAMOS[0];
              const wa = enlaceWhatsApp(c);
              return (
                <tr key={c.clientId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}><b>{c.fullName}</b><div style={{ color: "#6b7280", fontSize: "0.75rem" }}>CC {c.dni}{c.phone ? ` · ${c.phone}` : ""}</div></td>
                  <td style={td}>{c.plan || "—"}</td>
                  <td style={td}>{formatDate(c.expirationDate)}</td>
                  <td style={td}><span style={{ padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", background: tramo.color + "20", color: tramo.color, fontWeight: 600 }}>{c.daysOverdue > 0 ? c.daysOverdue : tramo.label}</span></td>
                  <td style={td}>{c.lastPaymentAmount ? <>{COP(c.lastPaymentAmount)}<div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{formatDate(c.lastPaymentDate)}</div></> : "—"}</td>
                  <td style={td}>{c.lastNote ? <>{etiqueta(TIPOS_CONTACTO, c.lastNote.contactType)} · {etiqueta(RESULTADOS, c.lastNote.result)}<div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{formatDate(c.lastNote.createdAt)}{c.lastNote.promiseDate ? ` · promete ${formatDate(c.lastNote.promiseDate)}` : ""}</div></> : <span style={{ color: "#9ca3af" }}>Sin gestión</span>}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ marginRight: 6, fontSize: "0.75rem", color: "#15803d", fontWeight: 600 }}>WhatsApp</a>}
                    <button onClick={() => setSeleccion(c)} style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}>Gestionar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!cargando && filtrada.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No hay clientes en cartera.</div>}
      </div>

      {seleccion && <ModalGestion cliente={seleccion} onCerrar={() => setSeleccion(null)} onGuardado={cargar} />}
    </div>
  );
}

function Tarjeta({ titulo, valor, color, nota }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{titulo}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{valor}</div>
      {nota && <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{nota}</div>}
    </div>
  );
}

function ModalGestion({ cliente, onCerrar, onGuardado }) {
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState({ tipo: "LLAMADA", resultado: "CONTESTO", nota: "", fechaCompromiso: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { carteraService.gestiones(cliente.clientId).then(setHistorial).catch(() => setHistorial([])); }, [cliente.clientId]);

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      await carteraService.registrarGestion(cliente.clientId, form);
      onGuardado();
      onCerrar();
    } catch (e) {
      setError(e?.mensajeUsuario || "No se pudo guardar la gestión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={onCerrar}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 460, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px" }}>{cliente.fullName}</h3>
        <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "#6b7280" }}>
          Plan {cliente.plan || "—"} · venció el {formatDate(cliente.expirationDate)}{cliente.daysOverdue > 0 ? ` (${cliente.daysOverdue} días)` : ""}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={input}>
            {TIPOS_CONTACTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value })} style={input}>
            {RESULTADOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {form.resultado === "PROMETIO_PAGO" && (
          <label style={{ display: "block", marginTop: 8, fontSize: "0.8rem", color: "#374151" }}>
            ¿Cuándo vendrá a pagar?
            <input type="date" value={form.fechaCompromiso} onChange={(e) => setForm({ ...form, fechaCompromiso: e.target.value })} style={{ ...input, width: "100%", marginTop: 4 }} />
          </label>
        )}
        <textarea value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} rows={3} placeholder="Notas (opcional)" style={{ ...input, width: "100%", marginTop: 8 }} />
        {error && <p style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={guardar} disabled={guardando} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>{guardando ? "Guardando…" : "Registrar gestión"}</button>
          <button onClick={onCerrar} style={{ padding: "8px 16px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }}>Cerrar</button>
        </div>
        <h4 style={{ margin: "20px 0 8px", fontSize: "0.9rem" }}>Historial</h4>
        {historial.length === 0 && <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Sin gestiones anteriores.</p>}
        {historial.map((g) => (
          <div key={g.id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6", fontSize: "0.85rem" }}>
            <b>{etiqueta(TIPOS_CONTACTO, g.contactType)}</b> · {etiqueta(RESULTADOS, g.result)}
            <span style={{ color: "#6b7280" }}> · {formatDate(g.createdAt)}{g.createdByName ? ` · ${g.createdByName}` : ""}</span>
            {g.promiseDate && <div style={{ color: "#15803d" }}>Prometió pagar el {formatDate(g.promiseDate)}</div>}
            {g.note && <div style={{ color: "#374151" }}>{g.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
