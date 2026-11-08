// ============================================================
// Ahorro y obligaciones de nómina.
// Responde las preguntas del dueño:
//   ¿Cuánto debería tener guardado hoy? ¿Cuánto tengo?
//   ¿Cuánto aparto en cada pago? ¿Qué viene y cuándo?
// ============================================================
import { useMemo, useState } from "react";
import { COP, formatDate } from "../../../utils/formatters";
import {
  planDeAhorro, registrarApartado, pagarObligacion, leerRegistro,
} from "../../../services/nomina/obligacionesNomina";
import { hoyISO } from "../../../services/nomina/nominaEngine";

const caja = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18 };
const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.8rem" };
const td = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem", verticalAlign: "top" };
const btn = (bg) => ({ padding: "6px 10px", background: bg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem" });

const ICONO = { PILA: "Seguridad social", PRIMA: "Prima", CESANTIAS: "Cesantías", INTERESES: "Intereses", VACACIONES: "Vacaciones" };

export default function AhorroNomina({ empleados }) {
  const [refresco, setRefresco] = useState(0);
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [abierto, setAbierto] = useState(null);
  const hoy = hoyISO();

  const plan = useMemo(() => planDeAhorro(empleados, hoy), [empleados, refresco, hoy]);
  const registro = useMemo(() => leerRegistro(), [refresco]);
  const laborales = empleados.filter(e => e.activo !== false && e.tipoVinculacion !== "PRESTACION_SERVICIOS");

  const apartar = () => {
    try {
      registrarApartado(Number(String(monto).replace(/\D/g, "")), nota.trim());
      setMensaje(`Se registró ${COP(Number(String(monto).replace(/\D/g, "")))} en el fondo de nómina.`);
      setMonto("");
      setNota("");
      setRefresco(r => r + 1);
    } catch (e) {
      setMensaje(e.message);
    }
  };

  // Vacaciones: se paga lo causado a hoy. Lo demás (prima, cesantías, intereses,
  // seguridad social) se paga completo por el periodo.
  const valorAPagar = (o) => (o.tipo === "VACACIONES" ? o.acumulado : o.total);

  const pagar = async (o, { yaPagada = false } = {}) => {
    const pregunta = yaPagada
      ? `¿Marcar "${o.titulo}" como pagada antes de usar el sistema? No se creará egreso.`
      : `¿Registrar el pago de "${o.titulo}" por ${COP(valorAPagar(o))}? Se descontará del fondo y se creará el egreso en Finanzas.`;
    if (!window.confirm(pregunta)) return;
    try {
      await pagarObligacion(o, {
        desdeFondo: !yaPagada,
        registrarEgreso: !yaPagada,
        monto: valorAPagar(o),
      });
      setMensaje(yaPagada ? `"${o.titulo}" quedó marcada como pagada.` : `Pago de "${o.titulo}" registrado.`);
      setRefresco(r => r + 1);
    } catch (e) {
      setMensaje(e.message);
    }
  };

  if (laborales.length === 0) {
    return (
      <div style={caja}>
        <p style={{ color: "#6b7280" }}>
          No hay empleados con contrato laboral activos. Las personas por prestación de servicios no generan
          prima, cesantías, vacaciones ni seguridad social a cargo del gimnasio.
        </p>
      </div>
    );
  }

  const estadoFondo = plan.faltante > 0 ? "#b91c1c" : "#065f46";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        <Dato titulo="Debería tener ahorrado hoy" valor={COP(plan.deberiaTener)}
          nota="Prima, cesantías, intereses, vacaciones y seguridad social ya causados" />
        <Dato titulo="Tiene en el fondo de nómina" valor={COP(plan.tieneAhorrado)} color={estadoFondo}
          nota={plan.faltante > 0 ? `Le faltan ${COP(plan.faltante)}` : "Está cubierto"} />
        <Dato titulo="Aparte en cada pago" valor={COP(plan.porQuincena)} color="#1d4ed8"
          nota={`Por quincena · ${COP(plan.porMes)} al mes · ${COP(plan.porDia)} al día`} />
        <Dato titulo="Costo real de la nómina al mes" valor={COP(plan.costoMensualTotal)}
          nota={`${COP(plan.nominaMes)} a empleados + ${COP(plan.porMes)} de obligaciones`} />
      </div>

      {plan.proximaGrande && (
        <div style={{ ...caja, background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <strong>Próximo pago grande:</strong> {plan.proximaGrande.titulo} por {COP(plan.proximaGrande.total)} el{" "}
          {formatDate(plan.proximaGrande.vence)} (en {plan.proximaGrande.diasParaVencer} días).
          {plan.porSemanaProxima > 0
            ? <> Para llegar a tiempo, aparte <strong>{COP(plan.porSemanaProxima)} por semana</strong>.</>
            : <> El fondo actual ya lo cubre.</>}
        </div>
      )}

      {plan.vencidas.length > 0 && (
        <div style={{ ...caja, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", fontSize: "0.9rem" }}>
          Hay {plan.vencidas.length} obligación(es) vencida(s) sin registrar como pagadas. Si ya las pagó antes de
          usar el sistema, márquelas con "Ya estaba pagada".
        </div>
      )}

      {mensaje && (
        <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontSize: "0.85rem" }}>
          {mensaje}
        </div>
      )}

      {/* Obligaciones */}
      <div style={caja}>
        <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Calendario de obligaciones</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={th}>Vence</th>
                <th style={th}>Obligación</th>
                <th style={{ ...th, textAlign: "right" }}>Causado a hoy</th>
                <th style={{ ...th, textAlign: "right" }}>Total al vencer</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {plan.obligaciones.map(o => (
                <tr key={o.clave} style={{ background: o.vencida ? "#fef2f2" : "transparent" }}>
                  <td style={td}>
                    {formatDate(o.vence)}
                    <div style={{ fontSize: "0.72rem", color: o.vencida ? "#b91c1c" : "#6b7280" }}>
                      {o.vencida ? "VENCIDA" : o.tipo === "VACACIONES" ? "aniversario" : `en ${o.diasParaVencer} días`}
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: "0.7rem", background: "#f3f4f6", padding: "1px 6px", borderRadius: 4, marginRight: 6 }}>{ICONO[o.tipo]}</span>
                    {o.titulo}
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>{o.descripcion}</div>
                    <button onClick={() => setAbierto(abierto === o.clave ? null : o.clave)}
                      style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0, fontSize: "0.75rem", marginTop: 4 }}>
                      {abierto === o.clave ? "Ocultar detalle" : "Ver por empleado"}
                    </button>
                    {abierto === o.clave && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.78rem", color: "#374151" }}>
                        {o.detalle.map(d => (
                          <li key={d.empleadoId}>{d.nombre}: {COP(d.acumulado)} causado · {COP(d.total)} total</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{COP(o.acumulado)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{COP(o.total)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button style={btn("#059669")} onClick={() => pagar(o)}>Registrar pago</button>
                    {o.vencida && (
                      <button style={{ ...btn("#6b7280"), marginLeft: 6 }} onClick={() => pagar(o, { yaPagada: true })}>Ya estaba pagada</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
          Fechas legales: prima hasta el 30 de junio y el 20 de diciembre; intereses de cesantías al empleado
          hasta el 31 de enero; cesantías al fondo hasta el 14 de febrero; seguridad social el día configurado
          del mes siguiente (depende de los dos últimos dígitos del NIT).
        </p>
      </div>

      {/* Fondo de nómina */}
      <div style={caja}>
        <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>Fondo de nómina</h3>
        <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#4b5563" }}>
          Registre aquí la plata que va separando (por ejemplo, en una cuenta de ahorros aparte). Cuando pague una
          obligación desde el fondo, se descuenta sola.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input value={monto} onChange={e => setMonto(e.target.value)} placeholder={`Valor (sugerido ${COP(plan.porQuincena)})`}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, minWidth: 200 }} />
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, flex: 1, minWidth: 160 }} />
          <button onClick={apartar} disabled={!monto} style={btn("#1d4ed8")}>Registrar apartado</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Movimiento</th>
              <th style={{ ...th, textAlign: "right" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...registro.apartados.map(a => ({ fecha: a.fecha, texto: a.nota ? `Apartado: ${a.nota}` : "Apartado", valor: a.monto, k: `a${a.id}` })),
              ...registro.pagadas.filter(p => p.desdeFondo).map(p => ({ fecha: p.fecha, texto: `Pago ${ICONO[p.tipo] || p.tipo}`, valor: -p.monto, k: `p${p.id}` })),
            ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 15).map(m => (
              <tr key={m.k}>
                <td style={td}>{formatDate(m.fecha)}</td>
                <td style={td}>{m.texto}</td>
                <td style={{ ...td, textAlign: "right", color: m.valor < 0 ? "#b91c1c" : "#065f46" }}>{COP(m.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dato({ titulo, valor, nota, color = "#111827" }) {
  return (
    <div style={{ ...caja, padding: 14 }}>
      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{titulo}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700, color }}>{valor}</div>
      {nota && <div style={{ fontSize: "0.78rem", color: "#4b5563" }}>{nota}</div>}
    </div>
  );
}
