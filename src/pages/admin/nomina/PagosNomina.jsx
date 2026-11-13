// ============================================================
// Pagos de nómina: qué hay que pagar, a quién, cuánto y cuándo.
// Cada pago queda en el historial (no se puede pagar dos veces el mismo
// periodo) y se registra como egreso "Nómina" en Finanzas.
// ============================================================
import { useMemo, useState } from "react";
import { COP, formatDate, fechaLocalISO } from "../../../utils/formatters";
import { proximosPagosNomina, pagarPeriodo } from "../../../services/nomina/obligacionesNomina";
import { historialNominaService, hoyISO } from "../../../services/nomina/nominaEngine";

const caja = { background: "#fff", border: "1px solid var(--sg-line)", borderRadius: 20, padding: 20, boxShadow: "var(--sg-shadow-sm)" };
const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.8rem" };
const td = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem" };

export default function PagosNomina({ empleados }) {
  const [refresco, setRefresco] = useState(0);
  const [pagando, setPagando] = useState(null);
  const [desdeCaja, setDesdeCaja] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const hoy = hoyISO();
  const pagos = useMemo(() => proximosPagosNomina(empleados, 45, hoy), [empleados, refresco, hoy]);
  const historial = useMemo(
    () => historialNominaService.listarPagos().slice().sort((a, b) => (b.registradoEn || "").localeCompare(a.registradoEn || "")).slice(0, 15),
    [refresco]
  );

  const atrasados = pagos.filter(p => p.atrasado);
  const proximos7 = pagos.filter(p => !p.atrasado && p.fechaPago <= sumar(hoy, 7));
  const totalProximos = pagos.filter(p => p.fechaPago <= sumar(hoy, 15)).reduce((s, p) => s + p.neto, 0);

  const pagar = async (p) => {
    if (!window.confirm(`¿Registrar el pago de ${COP(p.neto)} a ${p.empleado.nombre} (${p.etiqueta})?`)) return;
    setPagando(p.clave);
    setMensaje("");
    try {
      await pagarPeriodo(p.empleado, p, p.liquidacion, { desdeCaja });
      setMensaje(`Pago registrado: ${p.empleado.nombre}, ${p.etiqueta}, ${COP(p.neto)}.`);
      setRefresco(r => r + 1);
    } catch (e) {
      setMensaje(e.message);
      setRefresco(r => r + 1);
    } finally {
      setPagando(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Dato titulo="Pagos atrasados" valor={atrasados.length} color={atrasados.length ? "#b91c1c" : "#065f46"}
          nota={atrasados.length ? COP(atrasados.reduce((s, p) => s + p.neto, 0)) : "Al día"} />
        <Dato titulo="Pagos en los próximos 7 días" valor={proximos7.length} color="#1d4ed8"
          nota={COP(proximos7.reduce((s, p) => s + p.neto, 0))} />
        <Dato titulo="Plata para nómina (15 días)" valor={COP(totalProximos)} color="#111827"
          nota="Neto a pagar a empleados" />
      </div>

      {mensaje && (
        <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontSize: "0.85rem" }}>
          {mensaje}
        </div>
      )}

      <div style={caja}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Próximos pagos (45 días)</h3>
          <label style={{ fontSize: "0.85rem", color: "#374151", display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={desdeCaja} onChange={e => setDesdeCaja(e.target.checked)} />
            Pagar con efectivo de la caja del turno abierto
          </label>
        </div>
        {pagos.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>No hay pagos pendientes en los próximos 45 días.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f9fafb" }}>
                <tr>
                  <th style={th}>Fecha de pago</th>
                  <th style={th}>Empleado</th>
                  <th style={th}>Periodo</th>
                  <th style={{ ...th, textAlign: "right" }}>Neto a pagar</th>
                  <th style={{ ...th, textAlign: "right" }}>Apartar para prestaciones y seguridad social</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.clave} style={{ background: p.atrasado ? "#fef2f2" : "transparent" }}>
                    <td style={td}>
                      {formatDate(p.fechaPago)}
                      {p.atrasado && <span style={{ marginLeft: 6, color: "#b91c1c", fontWeight: 600, fontSize: "0.75rem" }}>ATRASADO</span>}
                    </td>
                    <td style={td}>
                      {p.empleado.nombre}
                      {p.empleado.tipoVinculacion === "PRESTACION_SERVICIOS" && (
                        <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Prestación de servicios</div>
                      )}
                    </td>
                    <td style={td}>{p.etiqueta} · {p.dias} días</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{COP(p.neto)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#92400e" }}>{p.provision ? COP(p.provision) : "—"}</td>
                    <td style={td}>
                      <button onClick={() => pagar(p)} disabled={pagando === p.clave} className="sg-btn sg-btn-primary sg-btn-sm">
                        {pagando === p.clave ? "Registrando..." : "Registrar pago"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
          Las fechas siguen la configuración de nómina; si caen domingo o festivo se ajustan. Para horas extra,
          recargos o bonificaciones use la Calculadora Individual antes de pagar.
        </p>
      </div>

      <div style={caja}>
        <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Últimos pagos registrados</h3>
        {historial.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Aún no hay pagos.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={th}>Pagado el</th>
                <th style={th}>Empleado</th>
                <th style={th}>Periodo</th>
                <th style={{ ...th, textAlign: "right" }}>Neto</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td style={td}>{formatDate(h.fechaPago)}</td>
                  <td style={td}>{h.empleadoNombre}</td>
                  <td style={td}>{h.periodoEtiqueta || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{COP(h.netoPagar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function sumar(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return fechaLocalISO(d);
}

function Dato({ titulo, valor, nota, color }) {
  return (
    <div style={{ ...caja, padding: 14 }}>
      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{titulo}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{valor}</div>
      {nota && <div style={{ fontSize: "0.8rem", color: "#4b5563" }}>{nota}</div>}
    </div>
  );
}
