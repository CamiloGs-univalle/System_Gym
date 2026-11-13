// ============================================================
// Configuración de nómina: fechas de pago, seguridad social y exoneración.
// ============================================================
import { useState } from "react";
import { leerConfigNomina, guardarConfigNomina, fechaDePago } from "../../../services/nomina/nominaEngine";
import { formatDate } from "../../../utils/formatters";

const caja = { background: "#fff", border: "1px solid var(--sg-line)", borderRadius: 20, padding: 20, boxShadow: "var(--sg-shadow-sm)" };
const lbl = { display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4, marginTop: 12 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box" };
const ayuda = { fontSize: "0.75rem", color: "#6b7280", marginTop: 4 };

const opcionesDia = (max) => Array.from({ length: max }, (_, i) => i + 1);

export default function ConfigNomina() {
  const [cfg, setCfg] = useState(leerConfigNomina());
  const [mensaje, setMensaje] = useState("");

  const guardar = () => {
    const limpio = guardarConfigNomina(cfg);
    setCfg(limpio);
    setMensaje("Configuración guardada. Los próximos pagos ya usan estas fechas.");
    setTimeout(() => setMensaje(""), 4000);
  };

  const hoy = new Date();
  const [y, m] = [hoy.getFullYear(), hoy.getMonth() + 1];
  const ejemplo = (dia) => formatDate(fechaDePago(y, m, Number(dia), cfg.ajusteDiaNoHabil));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <div style={caja}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Fechas de pago</h3>

        <label style={lbl}>Empleados con pago mensual: día de pago</label>
        <select style={inp} value={cfg.diaPagoMensual} onChange={e => setCfg({ ...cfg, diaPagoMensual: Number(e.target.value) })}>
          {opcionesDia(29).map(d => <option key={d} value={d}>Día {d}</option>)}
          <option value={30}>Último día del mes</option>
        </select>
        <div style={ayuda}>Este mes: {ejemplo(cfg.diaPagoMensual)}</div>

        <label style={lbl}>Empleados con pago quincenal: primera quincena</label>
        <select style={inp} value={cfg.diasPagoQuincenal[0]}
          onChange={e => setCfg({ ...cfg, diasPagoQuincenal: [Number(e.target.value), cfg.diasPagoQuincenal[1]] })}>
          {opcionesDia(15).map(d => <option key={d} value={d}>Día {d}</option>)}
        </select>
        <div style={ayuda}>Este mes: {ejemplo(cfg.diasPagoQuincenal[0])}</div>

        <label style={lbl}>Segunda quincena</label>
        <select style={inp} value={cfg.diasPagoQuincenal[1]}
          onChange={e => setCfg({ ...cfg, diasPagoQuincenal: [cfg.diasPagoQuincenal[0], Number(e.target.value)] })}>
          {opcionesDia(29).filter(d => d > 15).map(d => <option key={d} value={d}>Día {d}</option>)}
          <option value={30}>Último día del mes</option>
        </select>
        <div style={ayuda}>Este mes: {ejemplo(cfg.diasPagoQuincenal[1])}</div>

        <label style={lbl}>Si el día de pago cae domingo o festivo</label>
        <select style={inp} value={cfg.ajusteDiaNoHabil} onChange={e => setCfg({ ...cfg, ajusteDiaNoHabil: e.target.value })}>
          <option value="ANTERIOR">Pagar el día hábil anterior</option>
          <option value="SIGUIENTE">Pagar el día hábil siguiente</option>
          <option value="NINGUNO">Pagar ese mismo día</option>
        </select>
      </div>

      <div style={caja}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Seguridad social y registro</h3>

        <label style={lbl}>Día límite para pagar la PILA (mes siguiente)</label>
        <select style={inp} value={cfg.diaLimitePILA} onChange={e => setCfg({ ...cfg, diaLimitePILA: Number(e.target.value) })}>
          {opcionesDia(28).map(d => <option key={d} value={d}>Día {d}</option>)}
        </select>
        <div style={ayuda}>
          Depende de los dos últimos dígitos del NIT o cédula del gimnasio. Consúltelo en el operador de PILA
          (ej. Mi Planilla, SOI, Aportes en Línea) y ajústelo aquí.
        </div>

        <label style={{ ...lbl, display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 500 }}>
          <input type="checkbox" checked={cfg.exonerado114} onChange={e => setCfg({ ...cfg, exonerado114: e.target.checked })} />
          <span>
            El gimnasio está exonerado de salud (8,5%), SENA e ICBF por empleados que ganan menos de 10 salarios mínimos
            (Art. 114-1 E.T.).
            <span style={{ ...ayuda, display: "block" }}>
              Aplica, en general, a sociedades (SAS, Ltda.) y a personas naturales con dos o más empleados. Confírmelo con
              su contador; si no está seguro, déjelo sin marcar (el sistema calcula de más, no de menos).
            </span>
          </span>
        </label>

        <label style={{ ...lbl, display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 500 }}>
          <input type="checkbox" checked={cfg.registrarComoEgreso} onChange={e => setCfg({ ...cfg, registrarComoEgreso: e.target.checked })} />
          <span>Registrar cada pago de nómina y de obligaciones como egreso en Finanzas</span>
        </label>

        <button onClick={guardar} style={{ marginTop: 18, width: "100%", padding: 10, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
          Guardar configuración
        </button>
        {mensaje && <p style={{ color: "#065f46", fontSize: "0.85rem", marginTop: 10 }}>{mensaje}</p>}
      </div>
    </div>
  );
}
