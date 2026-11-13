// ============================================================
// Historial de pagos (solo administrador).
// Sale de las ventas registradas en la caja: una sola fuente de verdad.
// Un pago no se edita ni se borra: si hubo un error se anula la venta
// (Finanzas → Ventas y anulaciones), con motivo y registro en auditoría.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { pagosService } from "../../../services/gimnasio/pagosService";
import { COP, fechaLocalISO } from "../../../utils/formatters";

const TIPOS = { PRODUCT_SALE: "Productos", MEMBERSHIP_PAYMENT: "Plan", DAILY_TRAINING: "Día" };
const METODOS = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta" };

const hace = (dias) => { const d = new Date(); d.setDate(d.getDate() - dias); return fechaLocalISO(d); };
const td = { padding: "10px 12px", fontSize: "0.85rem", borderBottom: "1px solid #f3f4f6" };
const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.8rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" };
const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px" };

export default function PagosPanel() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState({ desde: hace(30), hasta: fechaLocalISO(), tipo: "MEMBERSHIP", metodo: "", busqueda: "", anuladas: false });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setPagos(await pagosService.listar({ desde: filtro.desde, hasta: filtro.hasta, tipo: filtro.tipo }));
    } catch (e) {
      setError(e?.mensajeUsuario || "No se pudieron cargar los pagos.");
    } finally {
      setCargando(false);
    }
  }, [filtro.desde, filtro.hasta, filtro.tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const t = filtro.busqueda.trim().toLowerCase();
    return pagos.filter((p) => {
      if (!filtro.anuladas && p.voided) return false;
      if (filtro.metodo && p.paymentMethod !== filtro.metodo) return false;
      if (t && !(p.clientName || "").toLowerCase().includes(t) && !(p.detail || "").toLowerCase().includes(t) && String(p.id) !== t) return false;
      return true;
    });
  }, [pagos, filtro]);

  const resumen = useMemo(() => {
    const vigentes = visibles.filter((p) => !p.voided);
    const porMetodo = {};
    for (const p of vigentes) porMetodo[p.paymentMethod] = (porMetodo[p.paymentMethod] || 0) + p.amount;
    return { cantidad: vigentes.length, total: vigentes.reduce((s, p) => s + p.amount, 0), porMetodo };
  }, [visibles]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Historial de pagos</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
          {resumen.cantidad} pagos · <b>{COP(resumen.total)}</b>
          {Object.entries(resumen.porMetodo).map(([m, v]) => <span key={m}> · {METODOS[m] || m}: {COP(v)}</span>)}
        </p>
        <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: "0.8rem" }}>
          Los pagos se registran en la caja. Para corregir uno, anule la venta en Finanzas → Ventas y anulaciones.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} style={input} />
        <span style={{ color: "#6b7280" }}>a</span>
        <input type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} style={input} />
        <select value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })} style={input}>
          <option value="MEMBERSHIP">Planes</option>
          <option value="PRODUCT">Productos</option>
          <option value="">Todo</option>
        </select>
        <select value={filtro.metodo} onChange={(e) => setFiltro({ ...filtro, metodo: e.target.value })} style={input}>
          <option value="">Todos los métodos</option>
          {Object.entries(METODOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="text" placeholder="Buscar cliente, producto o #…" value={filtro.busqueda}
          onChange={(e) => setFiltro({ ...filtro, busqueda: e.target.value })} style={{ ...input, flex: 1, minWidth: 200 }} />
        <label style={{ fontSize: "0.85rem", color: "#374151", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={filtro.anuladas} onChange={(e) => setFiltro({ ...filtro, anuladas: e.target.checked })} /> Ver anuladas
        </label>
      </div>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["#", "Fecha", "Cliente", "Tipo", "Detalle", "Método", "Valor", "Turno"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {cargando && <tr><td style={td} colSpan={8}>Cargando…</td></tr>}
            {!cargando && visibles.slice(0, 300).map((p) => (
              <tr key={p.id} style={p.voided ? { color: "#9ca3af", textDecoration: "line-through" } : undefined} title={p.voided ? `Anulada: ${p.voidReason || ""}` : undefined}>
                <td style={td}>{p.id}</td>
                <td style={td}>{new Date(p.date).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                <td style={td}>{p.clientName || "—"}</td>
                <td style={td}>{TIPOS[p.type] || p.type}</td>
                <td style={td}>{p.detail || "—"}</td>
                <td style={td}>{METODOS[p.paymentMethod] || p.paymentMethod}</td>
                <td style={{ ...td, fontWeight: 600, color: p.voided ? undefined : "#059669" }}>{COP(p.amount)}</td>
                <td style={td}>{p.shiftId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && visibles.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No hay pagos en ese periodo.</div>}
        {visibles.length > 300 && <div style={{ padding: 12, textAlign: "center", color: "#6b7280", fontSize: "0.8rem" }}>Se muestran los 300 más recientes. Acorte el periodo para ver los demás.</div>}
      </div>
    </div>
  );
}
