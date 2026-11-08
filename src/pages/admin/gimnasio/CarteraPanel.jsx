import { useState, useEffect, useMemo } from "react";
import { carteraService } from "../../../services/gimnasio/carteraService";
import { COP, formatDate } from "../../../utils/formatters";

const TRAMOS = [
  { value: "CORRIENTE", label: "Corriente", color: "#10b981" },
  { value: "1_30", label: "1-30 dias", color: "#f59e0b" },
  { value: "31_60", label: "31-60 dias", color: "#f97316" },
  { value: "61_90", label: "61-90 dias", color: "#ef4444" },
  { value: "90_MAS", label: "90+ dias", color: "#991b1b" },
];

export default function CarteraPanel() {
  const [cartera, setCartera] = useState([]);
  const [filtro, setFiltro] = useState({ tramo: "", busqueda: "" });
  const [modalGestion, setModalGestion] = useState(null);

  useEffect(() => {
    carteraService.actualizarEstados();
    setCartera(carteraService.listar());
  }, []);

  const stats = useMemo(() => {
    const activas = cartera.filter(c => c.estado !== "RECUPERADO" && c.estado !== "CASTIGADO");
    return {
      totalCuentas: activas.length,
      totalDeuda: activas.reduce((s, c) => s + (c.saldoActual || 0), 0),
      morosos: activas.filter(c => c.diasMora > 0).length,
      porTramo: TRAMOS.map(t => ({
        ...t,
        count: activas.filter(c => c.tramo === t.value).length,
        monto: activas.filter(c => c.tramo === t.value).reduce((s, c) => s + (c.saldoActual || 0), 0)
      }))
    };
  }, [cartera]);

  const carteraFiltrada = useMemo(() => {
    return cartera.filter(c => {
      if (filtro.tramo && c.tramo !== filtro.tramo) return false;
      if (filtro.busqueda) {
        const t = filtro.busqueda.toLowerCase();
        if (!c.clienteNombre?.toLowerCase().includes(t)) return false;
      }
      return true;
    }).sort((a, b) => (b.diasMora || 0) - (a.diasMora || 0));
  }, [cartera, filtro]);

  const handlePago = (carteraId, valor) => {
    carteraService.registrarPago(carteraId, valor);
    carteraService.actualizarEstados();
    setCartera(carteraService.listar());
    setModalGestion(null);
  };

  const handleGestion = (carteraId, datos) => {
    carteraService.registrarGestion(carteraId, datos);
    setCartera(carteraService.listar());
    setModalGestion(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "1.5rem" }}>Cartera y Cobranza</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <StatCard label="Cuentas Activas" value={stats.totalCuentas} color="#3b82f6" />
        <StatCard label="Total Deuda" value={COP(stats.totalDeuda)} color="#ef4444" />
        <StatCard label="Morosos" value={stats.morosos} color="#f59e0b" />
        {stats.porTramo.map(t => (
          <div key={t.value} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", borderLeft: `4px solid ${t.color}` }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{t.label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{t.count}</div>
            <div style={{ fontSize: "0.8rem", color: t.color }}>{COP(t.monto)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input type="text" placeholder="Buscar cliente..." value={filtro.busqueda} onChange={e => setFiltro({ ...filtro, busqueda: e.target.value })} style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }} />
        <select value={filtro.tramo} onChange={e => setFiltro({ ...filtro, tramo: e.target.value })} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
          <option value="">Todos los tramos</option>
          {TRAMOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["Cliente", "Concepto", "Vencimiento", "Dias Mora", "Saldo", "Tramo", "Acciones"].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carteraFiltrada.map(c => {
              const tramoInfo = TRAMOS.find(t => t.value === c.tramo) || TRAMOS[0];
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}>{c.clienteNombre}</td>
                  <td style={td}>{c.concepto}</td>
                  <td style={td}>{formatDate(c.fechaVencimiento)}</td>
                  <td style={{ ...td, fontWeight: 600, color: c.diasMora > 30 ? "#ef4444" : c.diasMora > 0 ? "#f59e0b" : "#10b981" }}>{c.diasMora || 0}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#ef4444" }}>{COP(c.saldoActual)}</td>
                  <td style={td}>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", background: tramoInfo.color + "20", color: tramoInfo.color }}>{tramoInfo.label}</span>
                  </td>
                  <td style={td}>
                    <button onClick={() => setModalGestion(c)} style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}>Gestionar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {carteraFiltrada.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Sin cuentas en cartera</div>}
      </div>

      {modalGestion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={() => setModalGestion(null)}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "400px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>Gestionar: {modalGestion.clienteNombre}</h3>
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Saldo: {COP(modalGestion.saldoActual)} | Dias mora: {modalGestion.diasMora}</p>
            <ModalGestionCartera cartera={modalGestion} onPago={handlePago} onGestion={handleGestion} onCerrar={() => setModalGestion(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ModalGestionCartera({ cartera, onPago, onGestion, onCerrar }) {
  const [tab, setTab] = useState("pago");
  const [valorPago, setValorPago] = useState("");
  const [gestion, setGestion] = useState({ tipo: "LLAMADA", resultado: "", compromiso: "", notas: "" });

  return (
    <div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {["pago", "gestion", "acuerdo"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 12px", fontSize: "0.8rem", background: tab === t ? "#3b82f6" : "#f3f4f6", color: tab === t ? "#fff" : "#374151", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            {t === "pago" ? "Registrar Pago" : t === "gestion" ? "Gestion Cobranza" : "Acuerdo Pago"}
          </button>
        ))}
      </div>

      {tab === "pago" && (
        <div>
          <label style={lbl}>Valor a pagar</label>
          <input style={inp} type="number" value={valorPago} onChange={e => setValorPago(e.target.value)} placeholder="Ej: 80000" />
          <button onClick={() => { if (valorPago) onPago(cartera.id, parseFloat(valorPago)); }} style={{ marginTop: 12, padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Registrar Pago</button>
        </div>
      )}

      {tab === "gestion" && (
        <div>
          <label style={lbl}>Tipo de gestion</label>
          <select style={inp} value={gestion.tipo} onChange={e => setGestion({ ...gestion, tipo: e.target.value })}>
            {["LLAMADA", "WHATSAPP", "EMAIL", "CARTA", "VISITA", "JURIDICA"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label style={lbl}>Resultado</label>
          <input style={inp} value={gestion.resultado} onChange={e => setGestion({ ...gestion, resultado: e.target.value })} placeholder="Ej: Cliente promete pagar el viernes" />
          <label style={lbl}>Compromiso de pago</label>
          <input style={inp} type="date" value={gestion.compromiso} onChange={e => setGestion({ ...gestion, compromiso: e.target.value })} />
          <button onClick={() => onGestion(cartera.id, gestion)} style={{ marginTop: 12, padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Registrar Gestion</button>
        </div>
      )}

      {tab === "acuerdo" && (
        <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Funcionalidad de acuerdo de pago en desarrollo. Permite dividir la deuda en cuotas.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onCerrar} style={{ padding: "8px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}>Cerrar</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" };
const td = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6" };
const lbl = { display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#374151", marginBottom: 4, marginTop: 8 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box" };
