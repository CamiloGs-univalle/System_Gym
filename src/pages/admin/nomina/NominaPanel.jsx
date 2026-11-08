import { useState, useEffect, useMemo } from "react";
import {
  obtenerParametro, esFestivo, esDominical,
  calcularValorHoraOrdinaria, calcularFactorHoraExtra,
  calcularAportesEmpleador, calcularDeducciones, calcularPrestaciones,
  liquidarNominaIndividual, liquidarNominaMensual, historialNominaService,
  festivosColombia, leerConfigNomina, proximoPeriodo
} from "../../../services/nomina/nominaEngine";
import { pagarPeriodo } from "../../../services/nomina/obligacionesNomina";
import PagosNomina from "./PagosNomina";
import AhorroNomina from "./AhorroNomina";
import ConfigNomina from "./ConfigNomina";
import { COP, formatDate } from "../../../utils/formatters";
import { empleadosService } from "../../../services/empleadosService";
import turnoService from "../../../services/turnoService";
import BoletaPago from "./BoletaPago";

export default function NominaPanel() {
  const [tab, setTab] = useState("pagos");
  const [empleados, setEmpleados] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        const emp = await empleadosService.listar();
        if (!cancelled) setEmpleados(emp.map(e => ({
          ...e,
          riesgoARL: e.riesgoARL || 1,
        })));
      } catch {
        if (!cancelled) setEmpleados([]);
      }
    };
    cargar();
    setHistorial(historialNominaService.listar());
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>Nómina</h2>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: "0.85rem" }}>
        Motor de calculo con parametros por fecha. SMMLV: {COP(obtenerParametro("SMMLV"))} | UVT: {COP(obtenerParametro("UVT"))} | Jornada: {obtenerParametro("JORNADA_MAX_SEMANAL")}h sem | Recargo Dom/Fest: {(obtenerParametro("RECARGO_DOMINICAL") * 100).toFixed(0)}%
      </p>

      {empleados.some(e => e.activo !== false && !e.fechaIngreso) && (
        <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, color: "#92400e", fontSize: "0.85rem", marginBottom: 16 }}>
          Falta la fecha de ingreso de: {empleados.filter(e => e.activo !== false && !e.fechaIngreso).map(e => e.nombre).join(", ")}.
          Regístrela en Empleados: sin ella, la prima, las cesantías y las vacaciones se calculan desde el 1 de enero.
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { id: "pagos", label: "Pagos" },
          { id: "ahorro", label: "Ahorro y obligaciones" },
          { id: "calculadora", label: "Calculadora Individual" },
          { id: "turnos", label: "Turnos → Nomina" },
          { id: "masiva", label: "Liquidacion Mensual" },
          { id: "parametros", label: "Parametros Vigentes" },
          { id: "historial", label: "Historial" },
          { id: "config", label: "Configuración" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 16px", fontSize: "0.85rem", background: tab === t.id ? "#3b82f6" : "#f3f4f6", color: tab === t.id ? "#fff" : "#374151", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pagos" && <PagosNomina empleados={empleados} />}
      {tab === "ahorro" && <AhorroNomina empleados={empleados} />}
      {tab === "config" && <ConfigNomina />}
      {tab === "calculadora" && <CalculadoraIndividual empleados={empleados} onResultado={setResultado} />}
      {tab === "turnos" && <TurnosANomina empleados={empleados} onResultado={setResultado} />}
      {tab === "masiva" && <LiquidacionMensual empleados={empleados} />}
      {tab === "parametros" && <ParametrosVigentes />}
      {tab === "historial" && <HistorialNomina historial={historial} />}
    </div>
  );
}

function CalculadoraIndividual({ empleados, onResultado }) {
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id || "");
  const [novedades, setNovedades] = useState({
    heDiurnas: 0, heNocturnas: 0, horasOrdNocturnas: 0, recargoNocturnoHoras: 0,
    horasDominicales: 0, horasFestivos: 0, bonificaciones: 0, comisiones: 0, retencionFuente: 0,
    deduccionesVoluntarias: []
  });
  const [resultado, setResultado] = useState(null);
  const [mostrarBoleta, setMostrarBoleta] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const emp = empleados.find(e => e.id === parseInt(empleadoId));

  // Se paga el próximo periodo pendiente del empleado (quincena o mes),
  // nunca dos veces el mismo, y queda registrado como egreso en Finanzas.
  const pagarNomina = async () => {
    if (!resultado || !emp) return;
    const periodo = proximoPeriodo(emp);
    if (!periodo) { alert("Este empleado no tiene periodos pendientes de pago."); return; }
    try {
      await pagarPeriodo(emp, periodo, resultado);
      setMensajeExito(`Nómina de ${emp.nombre} (${periodo.etiqueta}) pagada. Próximo pago: ${historialNominaService.proximaFechaPago(emp.id, emp) || "—"}`);
      setResultado(null);
      setMostrarBoleta(false);
      setTimeout(() => setMensajeExito(""), 5000);
    } catch (e) {
      alert(e.message);
    }
  };

  const calcular = () => {
    if (!emp) return;
    // Se liquida el próximo periodo pendiente (una quincena = 15 días)
    const periodo = proximoPeriodo(emp);
    const res = liquidarNominaIndividual(emp, novedades, null, { periodo, exonerado: leerConfigNomina().exonerado114 });
    setResultado(res);
    onResultado?.(res);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {mensajeExito && (
        <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "0.9rem", marginBottom: "8px" }}>
          ✅ {mensajeExito}
        </div>
      )}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Datos del Empleado</h3>

        <label style={lbl}>Empleado</label>
        <select style={inp} value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}>
          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.cargo}</option>)}
        </select>

        {emp && (
          <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: "0.85rem" }}>
            <div><strong>Salario:</strong> {COP(emp.salario)}</div>
            <div><strong>Cargo:</strong> {emp.cargo}</div>
            <div><strong>RIESGO ARL:</strong> Nivel {emp.riesgoARL || 3}</div>
            <div><strong>VHO:</strong> {COP(calcularValorHoraOrdinaria(emp.salario, new Date().toISOString().split("T")[0]))}/hora</div>
          </div>
        )}

        <h4 style={{ margin: "16px 0 8px", fontSize: "0.95rem" }}>Horas y Novedades</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={lbl}>HE Diurnas (horas)</label>
            <input style={inp} type="number" value={novedades.heDiurnas} onChange={e => setNovedades({ ...novedades, heDiurnas: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>HE Nocturnas (horas)</label>
            <input style={inp} type="number" value={novedades.heNocturnas} onChange={e => setNovedades({ ...novedades, heNocturnas: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Horas Ord. Nocturnas</label>
            <input style={inp} type="number" value={novedades.horasOrdNocturnas} onChange={e => setNovedades({ ...novedades, horasOrdNocturnas: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Recargo Nocturno (horas)</label>
            <input style={inp} type="number" value={novedades.recargoNocturnoHoras} onChange={e => setNovedades({ ...novedades, recargoNocturnoHoras: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Horas Dominicales</label>
            <input style={inp} type="number" value={novedades.horasDominicales} onChange={e => setNovedades({ ...novedades, horasDominicales: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Horas Festivos</label>
            <input style={inp} type="number" value={novedades.horasFestivos} onChange={e => setNovedades({ ...novedades, horasFestivos: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        <h4 style={{ margin: "16px 0 8px", fontSize: "0.95rem" }}>Otros Ingresos y Deducciones</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={lbl}>Bonificaciones</label>
            <input style={inp} type="number" value={novedades.bonificaciones} onChange={e => setNovedades({ ...novedades, bonificaciones: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Comisiones</label>
            <input style={inp} type="number" value={novedades.comisiones} onChange={e => setNovedades({ ...novedades, comisiones: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={lbl}>Retencion Fuente</label>
            <input style={inp} type="number" value={novedades.retencionFuente} onChange={e => setNovedades({ ...novedades, retencionFuente: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        <button onClick={calcular} style={{ marginTop: 16, width: "100%", padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
          Calcular Nomina
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
        {resultado ? (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Resultado: {resultado.empleadoNombre}</h3>
            {resultado.periodo?.desde && (
              <p style={{ margin: "-8px 0 12px", fontSize: "0.8rem", color: "#6b7280" }}>
                Periodo: {formatDate(resultado.periodo.desde)} a {formatDate(resultado.periodo.hasta)} ({resultado.periodo.dias} días)
              </p>
            )}

            <Section title="Devengados" items={[
              { label: "Salario Base", value: COP(resultado.devengados.salarioBase) },
              { label: `HE Diurnas (${resultado.devengados.horasExtrasDiurnas.cantidad}h)`, value: COP(resultado.devengados.horasExtrasDiurnas.valor) },
              { label: `HE Nocturnas (${resultado.devengados.horasExtrasNocturnas.cantidad}h)`, value: COP(resultado.devengados.horasExtrasNocturnas.valor) },
              { label: `Recargo Nocturno (${resultado.devengados.recargoNocturno.cantidad}h)`, value: COP(resultado.devengados.recargoNocturno.valor) },
              { label: "Bonificaciones", value: COP(resultado.devengados.bonificaciones) },
              { label: "Comisiones", value: COP(resultado.devengados.comisiones) },
              { label: "Auxilio Transporte", value: COP(resultado.devengados.auxilioTransporte) },
            ]} total={COP(resultado.devengados.total)} color="#059669" />

            <Section title="Deducciones" items={[
              { label: "Salud (4%)", value: COP(resultado.deducciones.salud) },
              { label: "Pension (4%)", value: COP(resultado.deducciones.pension) },
              { label: "Retencion Fuente", value: COP(resultado.deducciones.retencionFuente) },
              { label: "Deducciones Voluntarias", value: COP(resultado.deducciones.voluntarias) },
            ]} total={COP(resultado.deducciones.total)} color="#ef4444" />

            <div style={{ margin: "16px 0", padding: "12px", background: "#ecfdf5", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>NETO A PAGAR</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#059669" }}>{COP(resultado.netoPagar)}</div>
            </div>

            <Section title="Aportes Empleador" items={[
              { label: "Salud (8.5%)", value: COP(resultado.aportesEmpleador.salud) },
              { label: "Pension (12%)", value: COP(resultado.aportesEmpleador.pension) },
              { label: `ARL Riesgo ${resultado.aportesEmpleador.arlRiesgo} (${(resultado.aportesEmpleador.arlTarifa * 100).toFixed(3)}%)`, value: COP(resultado.aportesEmpleador.arl) },
              { label: "Caja Compensacion (4%)", value: COP(resultado.aportesEmpleador.caja) },
              { label: "SENA (2%)", value: COP(resultado.aportesEmpleador.sena) },
              { label: "ICBF (3%)", value: COP(resultado.aportesEmpleador.icbf) },
            ]} total={COP(resultado.aportesEmpleador.total)} color="#8b5cf6" />

            <Section title="Prestaciones (Proyeccion)" items={[
              { label: "Prima Servicios", value: COP(resultado.prestaciones.prima) },
              { label: "Cesantias", value: COP(resultado.prestaciones.cesantias) },
              { label: "Intereses Cesantias", value: COP(resultado.prestaciones.interesesCesantias) },
              { label: "Vacaciones", value: COP(resultado.prestaciones.vacaciones) },
            ]} total={COP(resultado.prestaciones.total)} color="#06b6d4" />

            <div style={{ marginTop: 12, padding: "12px", background: "#fef2f2", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>COSTO TOTAL EMPRESA</div>
              <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#dc2626" }}>{COP(resultado.costoTotalEmpresa)}</div>
            </div>
            <button onClick={() => setMostrarBoleta(true)} style={{ marginTop: 12, width: "100%", padding: "10px", background: "#059669", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
              💰 Pagar Nómina / Ver Boleta
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <p>Selecciona un empleado y presiona "Calcular Nomina" para ver el resultado</p>
          </div>
        )}
      </div>
      {mostrarBoleta && resultado && (
        <BoletaPago resultado={resultado} empleado={emp} onPagar={pagarNomina} onCerrar={() => setMostrarBoleta(false)} />
      )}
    </div>
  );
}

function TurnosANomina({ empleados, onResultado }) {
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id || "");
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split("T")[0]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mostrarBoleta, setMostrarBoleta] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const emp = empleados.find(e => e.id === parseInt(empleadoId));

  // Se paga el próximo periodo pendiente del empleado (quincena o mes),
  // nunca dos veces el mismo, y queda registrado como egreso en Finanzas.
  const pagarNomina = async () => {
    if (!resultado || !emp) return;
    const periodo = proximoPeriodo(emp);
    if (!periodo) { alert("Este empleado no tiene periodos pendientes de pago."); return; }
    try {
      await pagarPeriodo(emp, periodo, resultado);
      setMensajeExito(`Nómina de ${emp.nombre} (${periodo.etiqueta}) pagada. Próximo pago: ${historialNominaService.proximaFechaPago(emp.id, emp) || "—"}`);
      setResultado(null);
      setMostrarBoleta(false);
      setTimeout(() => setMensajeExito(""), 5000);
    } catch (e) {
      alert(e.message);
    }
  };

  const cargarTurnos = async () => {
    if (!empleadoId) return;
    setCargando(true);
    try {
      const empSeleccionado = empleados.find(e => e.id === parseInt(empleadoId));
      const receptionistId = empSeleccionado?.userId || empSeleccionado?.id;
      const data = await turnoService.obtenerPorRangoFechas(fechaInicio, fechaFin, null, receptionistId);
      setTurnos(data);
    } catch (e) {
      console.error("Error cargando turnos:", e);
      setTurnos([]);
    } finally {
      setCargando(false);
    }
  };

  const calcularDesdeTurnos = () => {
    if (!emp || turnos.length === 0) return;
    let heDiurnas = 0, heNocturnas = 0, horasOrdNocturnas = 0, horasDominicales = 0, horasFestivos = 0, recargoNocturnoHoras = 0;
    const JORNADA_MAX_DIA = obtenerParametro('JORNADA_MAX_SEMANAL') / 6 || 8;

    turnos.filter(t => t.cerrado || t.status?.includes('CLOSED')).forEach(t => {
      const ini = t.horaInicio || '06:00';
      const fin = t.horaFin || '14:00';
      const [hIni] = ini.split(':').map(Number);
      const [hFin] = fin.split(':').map(Number);
      let horasTrabajadas = hFin - hIni;
      if (horasTrabajadas <= 0) horasTrabajadas += 24;

      const horasExtras = Math.max(0, horasTrabajadas - JORNADA_MAX_DIA);
      const horasOrdinarias = horasTrabajadas - horasExtras;
      const fecha = t.fecha || t.scheduledDate;
      const dominical = fecha && esDominical(fecha);
      const festivo = fecha && esFestivo(fecha);

      if (dominical || festivo) {
        horasDominicales += horasOrdinarias;
        if (horasExtras > 0) horasDominicales += horasExtras;
      } else if (hIni >= 21 || hIni < 6) {
        horasOrdNocturnas += horasOrdinarias;
        recargoNocturnoHoras += horasOrdinarias;
        if (horasExtras > 0) heNocturnas += horasExtras;
      } else {
        if (horasExtras > 0) heDiurnas += horasExtras;
      }
    });

    const novedades = { heDiurnas, heNocturnas, horasOrdNocturnas, recargoNocturnoHoras, horasDominicales, horasFestivos, bonificaciones: 0, comisiones: 0, retencionFuente: 0, deduccionesVoluntarias: [] };
    // Se liquida el próximo periodo pendiente (una quincena = 15 días)
    const periodo = proximoPeriodo(emp);
    const res = liquidarNominaIndividual(emp, novedades, null, { periodo, exonerado: leerConfigNomina().exonerado114 });
    setResultado(res);
    onResultado?.(res);
  };

  const totalHorasCerrados = useMemo(() => {
    return turnos.filter(t => t.cerrado || t.status?.includes('CLOSED')).reduce((sum, t) => {
      const ini = t.horaInicio || '06:00';
      const fin = t.horaFin || '14:00';
      const [hIni] = ini.split(':').map(Number);
      const [hFin] = fin.split(':').map(Number);
      let h = hFin - hIni;
      if (h <= 0) h += 24;
      return sum + h;
    }, 0);
  }, [turnos]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {mensajeExito && (
        <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", fontSize: "0.9rem", marginBottom: "8px" }}>
          ✅ {mensajeExito}
        </div>
      )}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Turnos Trabajados</h3>
        <label style={lbl}>Empleado</label>
        <select style={inp} value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}>
          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} - {e.cargo}</option>)}
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div><label style={lbl}>Desde</label><input style={inp} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
          <div><label style={lbl}>Hasta</label><input style={inp} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} /></div>
        </div>
        <button onClick={cargarTurnos} disabled={cargando} style={{ marginTop: 12, width: "100%", padding: "8px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          {cargando ? "Cargando..." : "🔍 Buscar Turnos"}
        </button>
        {turnos.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ padding: 10, background: "#f0fdf4", borderRadius: 8, fontSize: "0.85rem", marginBottom: 8 }}>
              <strong>{turnos.length}</strong> turnos encontrados · <strong>{totalHorasCerrados}h</strong> trabajadas
            </div>
            <div style={{ maxHeight: 200, overflow: "auto", fontSize: "0.8rem" }}>
              {turnos.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                  <span>{t.fecha}</span>
                  <span>{t.horaInicio} - {t.horaFin}</span>
                  <span style={{ color: t.cerrado || t.status?.includes('CLOSED') ? '#10b981' : '#f59e0b' }}>
                    {t.cerrado || t.status?.includes('CLOSED') ? '✅' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={calcularDesdeTurnos} style={{ marginTop: 12, width: "100%", padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
              📊 Calcular Nomina desde Turnos
            </button>
          </div>
        )}
        {turnos.length === 0 && !cargando && (
          <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            No se encontraron turnos para este empleado en el rango seleccionado
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
        {resultado ? (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Resultado: {resultado.empleadoNombre}</h3>
            {resultado.periodo?.desde && (
              <p style={{ margin: "-8px 0 12px", fontSize: "0.8rem", color: "#6b7280" }}>
                Periodo: {formatDate(resultado.periodo.desde)} a {formatDate(resultado.periodo.hasta)} ({resultado.periodo.dias} días)
              </p>
            )}
            <Section title="Devengados" items={[
              { label: "Salario Base", value: COP(resultado.devengados.salarioBase) },
              { label: `HE Diurnas (${resultado.devengados.horasExtrasDiurnas.cantidad}h)`, value: COP(resultado.devengados.horasExtrasDiurnas.valor) },
              { label: `HE Nocturnas (${resultado.devengados.horasExtrasNocturnas.cantidad}h)`, value: COP(resultado.devengados.horasExtrasNocturnas.valor) },
              { label: `Recargo Nocturno (${resultado.devengados.recargoNocturno.cantidad}h)`, value: COP(resultado.devengados.recargoNocturno.valor) },
              { label: `Dominicales (${resultado.devengados.dominicales.cantidad}h)`, value: COP(resultado.devengados.dominicales.valor) },
              { label: "Auxilio Transporte", value: COP(resultado.devengados.auxilioTransporte) },
            ]} total={COP(resultado.devengados.total)} color="#059669" />
            <Section title="Deducciones" items={[
              { label: "Salud (4%)", value: COP(resultado.deducciones.salud) },
              { label: "Pension (4%)", value: COP(resultado.deducciones.pension) },
              { label: "Retencion Fuente", value: COP(resultado.deducciones.retencionFuente) },
            ]} total={COP(resultado.deducciones.total)} color="#ef4444" />
            <div style={{ margin: "16px 0", padding: "12px", background: "#ecfdf5", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>NETO A PAGAR</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#059669" }}>{COP(resultado.netoPagar)}</div>
            </div>
            <Section title="Aportes Empleador" items={[
              { label: "Salud (8.5%)", value: COP(resultado.aportesEmpleador.salud) },
              { label: "Pension (12%)", value: COP(resultado.aportesEmpleador.pension) },
              { label: `ARL Riesgo ${resultado.aportesEmpleador.arlRiesgo}`, value: COP(resultado.aportesEmpleador.arl) },
              { label: "Caja Compensacion (4%)", value: COP(resultado.aportesEmpleador.caja) },
              { label: "SENA (2%)", value: COP(resultado.aportesEmpleador.sena) },
              { label: "ICBF (3%)", value: COP(resultado.aportesEmpleador.icbf) },
            ]} total={COP(resultado.aportesEmpleador.total)} color="#8b5cf6" />
            <button onClick={() => setMostrarBoleta(true)} style={{ marginTop: 12, width: "100%", padding: "10px", background: "#059669", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
              💰 Pagar Nómina / Ver Boleta
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
            <p>Busca los turnos de un empleado y presiona "Calcular Nomina desde Turnos"</p>
          </div>
        )}
      </div>
      {mostrarBoleta && resultado && (
        <BoletaPago resultado={resultado} empleado={emp} onPagar={pagarNomina} onCerrar={() => setMostrarBoleta(false)} />
      )}
    </div>
  );
}

function LiquidacionMensual({ empleados }) {
  const [resultado, setResultado] = useState(null);

  const liquidar = () => {
    const res = liquidarNominaMensual(empleados.filter(e => e.activo !== false), {}, null, { exonerado: leerConfigNomina().exonerado114 });
    const hoy = new Date();
    res.periodo = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    setResultado(res);
    historialNominaService.guardarLiquidacion(res);
  };

  return (
    <div>
      <button onClick={liquidar} style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>
        Liquidar Nomina Mensual ({empleados.length} empleados)
      </button>

      {resultado && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatBox label="Total Devengados" value={COP(resultado.totalDevengados)} color="#059669" />
            <StatBox label="Total Deducciones" value={COP(resultado.totalDeducciones)} color="#ef4444" />
            <StatBox label="Total Neto Pagar" value={COP(resultado.totalNetoPagar)} color="#3b82f6" />
            <StatBox label="Total Aportes Empleador" value={COP(resultado.totalAportesEmpleador)} color="#8b5cf6" />
            <StatBox label="Total Prestaciones" value={COP(resultado.totalPrestaciones)} color="#06b6d4" />
            <StatBox label="Costo Total Empresa" value={COP(resultado.costoTotalEmpresa)} color="#dc2626" />
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Empleado", "Devengados", "Deducciones", "Neto", "Aportes Emp.", "Prestaciones", "Costo Total"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.liquidaciones.map(l => (
                  <tr key={l.empleadoId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{l.empleadoNombre}</td>
                    <td style={{ ...td, color: "#059669" }}>{COP(l.devengados.total)}</td>
                    <td style={{ ...td, color: "#ef4444" }}>{COP(l.deducciones.total)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{COP(l.netoPagar)}</td>
                    <td style={{ ...td, color: "#8b5cf6" }}>{COP(l.aportesEmpleador.total)}</td>
                    <td style={{ ...td, color: "#06b6d4" }}>{COP(l.prestaciones.total)}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#dc2626" }}>{COP(l.costoTotalEmpresa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ParametrosVigentes() {
  const params = [
    { cat: "SALARIALES", items: [
      { nombre: "SMMLV", valor: COP(obtenerParametro("SMMLV")), nota: "Decreto anual" },
      { nombre: "Auxilio Transporte", valor: COP(obtenerParametro("AUXILIO_TRANSPORTE")), nota: "Empleados <= 2 SMMLV" },
      { nombre: "UVT", valor: COP(obtenerParametro("UVT")), nota: "DIAN 2026" },
    ]},
    { cat: "JORNADA", items: [
      { nombre: "Jornada Maxima Semanal", valor: `${obtenerParametro("JORNADA_MAX_SEMANAL")}h`, nota: "Ley 2466/2025" },
      { nombre: "Divisor Horas Mensual", valor: `${obtenerParametro("DIVISOR_HORAS_MES")}h`, nota: "(42x52)/12 = 182" },
      { nombre: "Limite HE Diarias", valor: `${obtenerParametro("LIMITE_HE_DIARIAS")}h`, nota: "Art. 5 Ley 2466" },
      { nombre: "Limite HE Semanales", valor: `${obtenerParametro("LIMITE_HE_SEMANALES")}h`, nota: "Art. 5 Ley 2466" },
    ]},
    { cat: "RECARGOS", items: [
      { nombre: "HE Diurna", valor: `${(obtenerParametro("RECARGO_HE_DIURNA") * 100).toFixed(0)}%`, nota: "CST Art. 173" },
      { nombre: "HE Nocturna", valor: `${(obtenerParametro("RECARGO_HE_NOCTURNA") * 100).toFixed(0)}%`, nota: "CST Art. 173" },
      { nombre: "Recargo Nocturno", valor: `${(obtenerParametro("RECARGO_NOCTURNO") * 100).toFixed(0)}%`, nota: "CST Art. 160" },
      { nombre: "Dominical/Festivo", valor: `${(obtenerParametro("RECARGO_DOMINICAL") * 100).toFixed(0)}%`, nota: "Ley 2466/2025" },
    ]},
    { cat: "SEGURIDAD SOCIAL", items: [
      { nombre: "Salud Trabajador", valor: `${(obtenerParametro("SALUD_TRABAJADOR") * 100).toFixed(0)}%`, nota: "Ley 100/1993" },
      { nombre: "Pension Trabajador", valor: `${(obtenerParametro("PENSION_TRABAJADOR") * 100).toFixed(0)}%`, nota: "Ley 100/1993" },
      { nombre: "Salud Empleador", valor: `${(obtenerParametro("SALUD_EMPLEADOR") * 100).toFixed(1)}%`, nota: "Ley 100/1993" },
      { nombre: "Pension Empleador", valor: `${(obtenerParametro("PENSION_EMPLEADOR") * 100).toFixed(0)}%`, nota: "Ley 100/1993" },
      { nombre: "Caja Compensacion", valor: `${(obtenerParametro("CAJA_COMPENSACION") * 100).toFixed(0)}%`, nota: "Ley 21/1982" },
      { nombre: "SENA", valor: `${(obtenerParametro("SENA") * 100).toFixed(0)}%`, nota: "Dec. Ley 118/1948" },
      { nombre: "ICBF", valor: `${(obtenerParametro("ICBF") * 100).toFixed(0)}%`, nota: "Ley 75/1968" },
      { nombre: "Tope Cotizacion", valor: `${obtenerParametro("TOPE_COTIZACION")} SMMLV`, nota: "" },
    ]},
    { cat: "PRESTACIONES", items: [
      { nombre: "Prima Servicios", valor: `${obtenerParametro("PRIMA_SERVICIOS")} dias/año`, nota: "CST Art. 306" },
      { nombre: "Cesantias", valor: `${obtenerParametro("CESANTIAS")} mes/año`, nota: "CST Art. 249" },
      { nombre: "Intereses Cesantias", valor: `${(obtenerParametro("INTERESES_CESANTIAS") * 100).toFixed(0)}% anual`, nota: "Ley 52/1975" },
      { nombre: "Vacaciones", valor: `${obtenerParametro("VACACIONES")} dias/año`, nota: "CST Art. 186" },
    ]},
  ];

  return (
    <div>
      {params.map(cat => (
        <div key={cat.cat} style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "1rem", color: "#374151" }}>{cat.cat}</h3>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {cat.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < cat.items.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: "0.85rem" }}>
                <span>{item.nombre}</span>
                <span style={{ fontWeight: 600 }}>{item.valor}</span>
                <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{item.nota}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, padding: 16, background: "#eff6ff", borderRadius: 8 }}>
        <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "#1d4ed8" }}>Festivos Colombia {new Date().getFullYear()} (calculados automáticamente)</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {festivosColombia(new Date().getFullYear()).map(f => f.slice(5)).map(d => (
            <span key={d} style={{ padding: "2px 8px", background: "#fff", border: "1px solid #bfdbfe", borderRadius: 4, fontSize: "0.75rem" }}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistorialNomina({ historial }) {
  return (
    <div>
      {historial.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Sin liquidaciones en el historial</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["ID", "Fecha Liquidacion", "Empleados", "Neto Total", "Aportes Emp.", "Costo Total"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}>{h.id}</td>
                  <td style={td}>{formatDate(h.fechaLiquidacion)}</td>
                  <td style={td}>{h.totalEmpleados}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{COP(h.totalNetoPagar)}</td>
                  <td style={td}>{COP(h.totalAportesEmpleador)}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#dc2626" }}>{COP(h.costoTotalEmpresa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, total, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>{title}</div>
      {items.filter(i => i.value !== "$0").map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "0.8rem" }}>
          <span style={{ color: "#6b7280" }}>{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #e5e7eb", marginTop: 4, fontWeight: 600, color, fontSize: "0.9rem" }}>
        <span>Total</span><span>{total}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

const th = { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" };
const td = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6" };
const lbl = { display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#374151", marginBottom: 4, marginTop: 8 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box" };
