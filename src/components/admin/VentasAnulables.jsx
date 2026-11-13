// ============================================================
// Ventas de un día con opción de anular (solo administrador).
// Anular no borra la venta: la marca, devuelve el inventario, quita los días
// del plan (si era el último pago del cliente), resta de la caja del turno
// abierto y deja registro en auditoría.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import ventasService from "../../services/ventasService";
import { COP, fechaLocalISO } from "../../utils/formatters";

const TIPO = { PRODUCT_SALE: "Productos", MEMBERSHIP_PAYMENT: "Plan", DAILY_TRAINING: "Día" };
const METODO = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta" };

const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const td = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid #f3f4f6", verticalAlign: "top" };

export default function VentasAnulables() {
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setVentas(await ventasService.ventasDelDiaAdmin(fecha));
    } catch (e) {
      setMensaje({ tipo: "error", texto: e?.mensajeUsuario || "No se pudieron cargar las ventas." });
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmar = async () => {
    if (motivo.trim().length < 5) {
      setMensaje({ tipo: "error", texto: "Escriba el motivo (mínimo 5 caracteres)." });
      return;
    }
    try {
      const r = await ventasService.anular(anulando.id, motivo.trim());
      setMensaje({ tipo: "ok", texto: r?.message || "Venta anulada." });
      setAnulando(null);
      setMotivo("");
      cargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e?.mensajeUsuario || "No se pudo anular la venta." });
    }
  };

  const vigentes = ventas.filter((v) => !v.voided);
  const totalDia = vigentes.reduce((s, v) => s + (v.totalAmount || 0), 0);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Ventas del día</h3>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8 }} />
        <span style={{ fontSize: 13, color: "#374151" }}>{vigentes.length} ventas · <b>{COP(totalDia)}</b></span>
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0 }}>
        Solo se pueden anular ventas de un turno abierto (el dinero sale de la caja de ese turno).
      </p>

      {mensaje.texto && (
        <p style={{ fontSize: 13, color: mensaje.tipo === "error" ? "#b91c1c" : "#065f46" }}>{mensaje.texto}</p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Hora</th><th style={th}>#</th><th style={th}>Tipo</th><th style={th}>Detalle</th>
              <th style={th}>Método</th><th style={{ ...th, textAlign: "right" }}>Valor</th><th style={th}>Turno</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td style={td} colSpan={8}>Cargando…</td></tr>}
            {!cargando && ventas.length === 0 && <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={8}>No hay ventas ese día.</td></tr>}
            {ventas.map((v) => (
              <tr key={v.id} style={v.voided ? { color: "#9ca3af", textDecoration: "line-through" } : undefined}>
                <td style={td}>{new Date(v.transactionDate).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}</td>
                <td style={td}>{v.id}</td>
                <td style={td}>{TIPO[v.saleType] || v.saleType}</td>
                <td style={td}>{v.detail || (v.clientId ? `Cliente #${v.clientId}` : "—")}</td>
                <td style={td}>{METODO[v.paymentMethod] || v.paymentMethod}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{COP(v.totalAmount)}</td>
                <td style={td}>{v.shiftId}</td>
                <td style={{ ...td, textDecoration: "none" }}>
                  {v.voided
                    ? <span title={v.voidReason} style={{ fontSize: 12, color: "#b91c1c", textDecoration: "none" }}>Anulada</span>
                    : <button onClick={() => { setAnulando(v); setMotivo(""); setMensaje({ tipo: "", texto: "" }); }}
                        style={{ background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        Anular
                      </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {anulando && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2" }}>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>
            Anular la venta <b>#{anulando.id}</b> por <b>{COP(anulando.totalAmount)}</b> ({TIPO[anulando.saleType] || anulando.saleType}).
          </p>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Motivo (obligatorio): ej. cobro duplicado, el cliente devolvió el producto…"
            style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={confirmar} style={{ background: "#b91c1c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>Confirmar anulación</button>
            <button onClick={() => setAnulando(null)} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
