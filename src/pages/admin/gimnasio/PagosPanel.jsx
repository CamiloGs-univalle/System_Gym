import { useState, useEffect, useMemo } from "react";
import { pagosService } from "../../../services/gimnasio/pagosService";
import { COP, formatDate, fechaHoraLocalISO } from "../../../utils/formatters";

const METODOS = [
  { value: "EFECTIVO", label: "Efectivo", icon: "$" },
  { value: "DEBITO", label: "Debito", icon: "D" },
  { value: "CREDITO", label: "Credito", icon: "C" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "T" },
  { value: "PSE", label: "PSE", icon: "P" },
  { value: "QR", label: "QR", icon: "Q" },
];

const CONCEPTOS = [
  { value: "MEMBRESIA", label: "Membresia" },
  { value: "PAGO_PARCIAL", label: "Pago Parcial" },
  { value: "PRODUCTO", label: "Producto" },
  { value: "SERVICIO", label: "Servicio" },
  { value: "OTRO", label: "Otro" },
];

const ESTADOS_COLOR = {
  PAGADO: { background: "#dcfce7", color: "#166534" },
  PARCIAL: { background: "#fef9c3", color: "#854d0e" },
  PENDIENTE: { background: "#f3f4f6", color: "#374151" },
  ANULADO: { background: "#fef2f2", color: "#991b1b" },
  REEMBOLSADO: { background: "#ede9fe", color: "#5b21b6" },
};

export default function PagosPanel() {
  const [pagos, setPagos] = useState([]);
  const [filtro, setFiltro] = useState({ busqueda: "", metodo: "", concepto: "", estado: "" });
  const [modalRegistrar, setModalRegistrar] = useState(false);

  useEffect(() => { setPagos(pagosService.listar()); }, []);

  const pagosFiltrados = useMemo(() => {
    return pagos.filter(p => {
      if (filtro.busqueda) {
        const t = filtro.busqueda.toLowerCase();
        if (!p.clienteNombre?.toLowerCase().includes(t) && !p.comprobante?.numero?.toLowerCase().includes(t)) return false;
      }
      if (filtro.metodo && p.metodoPago !== filtro.metodo) return false;
      if (filtro.concepto && p.concepto !== filtro.concepto) return false;
      if (filtro.estado && p.estado !== filtro.estado) return false;
      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pagos, filtro]);

  const stats = useMemo(() => ({
    total: pagos.filter(p => p.estado !== "ANULADO").length,
    montoTotal: pagos.filter(p => p.estado !== "ANULADO").reduce((s, p) => s + (p.valorAplicado || 0), 0),
  }), [pagos]);

  const handleRegistrar = (datos) => {
    pagosService.crear(datos);
    setPagos(pagosService.listar());
    setModalRegistrar(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Historial de Pagos</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
            {stats.total} transacciones - {COP(stats.montoTotal)} total
          </p>
        </div>
        <button onClick={() => setModalRegistrar(true)} style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          + Registrar Pago
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Buscar cliente o comprobante..." value={filtro.busqueda} onChange={e => setFiltro({ ...filtro, busqueda: e.target.value })} style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }} />
        <select value={filtro.metodo} onChange={e => setFiltro({ ...filtro, metodo: e.target.value })} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <option value="">Todos los metodos</option>
          {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filtro.estado} onChange={e => setFiltro({ ...filtro, estado: e.target.value })} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <option value="">Todos los estados</option>
          <option value="PAGADO">Pagado</option>
          <option value="PARCIAL">Parcial</option>
          <option value="ANULADO">Anulado</option>
        </select>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["#", "Fecha", "Cliente", "Concepto", "Metodo", "Monto", "Estado", "Comprobante"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagosFiltrados.slice(0, 50).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{formatDate(p.fecha)}</td>
                <td style={td}>{p.clienteNombre || "General"}</td>
                <td style={td}>{CONCEPTOS.find(c => c.value === p.concepto)?.label || p.concepto}</td>
                <td style={td}>{METODOS.find(m => m.value === p.metodoPago)?.label || p.metodoPago}</td>
                <td style={{ ...td, fontWeight: 600, color: "#059669" }}>{COP(p.valorAplicado)}</td>
                <td style={td}>
                  <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", ...ESTADOS_COLOR[p.estado] }}>{p.estado}</span>
                </td>
                <td style={td}>{p.comprobante?.numero || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagosFiltrados.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No se encontraron pagos</div>}
      </div>

      {modalRegistrar && <ModalPago onGuardar={handleRegistrar} onCancelar={() => setModalRegistrar(false)} />}
    </div>
  );
}

function ModalPago({ onGuardar, onCancelar }) {
  const [form, setForm] = useState({ clienteNombre: "", valorTotal: "", metodoPago: "EFECTIVO", concepto: "MEMBRESIA", notas: "" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={onCancelar}>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "450px" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px" }}>Registrar Pago</h3>
        <label style={lbl}>Cliente</label>
        <input style={inp} value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })} placeholder="Nombre del cliente" />
        <label style={lbl}>Valor</label>
        <input style={inp} type="number" value={form.valorTotal} onChange={e => setForm({ ...form, valorTotal: e.target.value })} />
        <label style={lbl}>Metodo de Pago</label>
        <select style={inp} value={form.metodoPago} onChange={e => setForm({ ...form, metodoPago: e.target.value })}>
          {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <label style={lbl}>Concepto</label>
        <select style={inp} value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })}>
          {CONCEPTOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label style={lbl}>Notas</label>
        <textarea style={{ ...inp, height: 60 }} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button onClick={onCancelar} style={{ padding: "8px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onGuardar({ ...form, valorTotal: parseFloat(form.valorTotal) || 0, fecha: fechaHoraLocalISO() })} style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

const td = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6" };
const lbl = { display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#374151", marginBottom: 4, marginTop: 8 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box" };
