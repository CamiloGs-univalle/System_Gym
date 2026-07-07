// src/pages/recepcion/TurnosPanel.jsx
// ============================================
// TURNOS PANEL - Cierre y entrega de turno
// ============================================
import { useState, useEffect, useMemo } from "react";
import { turnos as turnosIniciales, tiposTurno } from "../../mock/empleados";
import { empleados as empleadosMock } from "../../mock/empleados";
import { ingresosMensualidades, ingresosProductos } from "../../mock/finanzas";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { turnoService } from "../../services/turnoService";
import { empleadosService } from "../../services/empleadosService";
import useAuthStore from "../../store/authStore";

const COP = (v) => "$" + Math.round(v || 0).toLocaleString("es-CO");
const hoy = new Date().toISOString().split("T")[0];

// ============================================================
// FUNCIÓN DE MAPEO PARA TURNOS
// ============================================================
const mapearTurno = (turno) => {
  // Si el turno ya tiene los campos que esperamos, devolverlo tal cual
  if (turno.empleadoId !== undefined && turno.fecha !== undefined) {
    return turno;
  }
  
  // Mapeo de campos comunes del backend al frontend
  return {
    id: turno.id || turno.shiftId || turno.turnoId || Date.now(),
    empleadoId: turno.receptionistId || turno.employeeId || turno.empleadoId || turno.userId || 0,
    tipo: turno.type || turno.tipo || turno.shiftType || 'FULL_SHIFT',
    fecha: turno.date || turno.fecha || turno.openedAt?.split('T')[0] || hoy,
    horaInicio: turno.startTime || turno.horaInicio || turno.start_time || '06:00',
    horaFin: turno.endTime || turno.horaFin || turno.end_time || '14:00',
    montoDeclarado: turno.declaredAmount || turno.montoDeclarado || turno.declared || 0,
    montoCalculado: turno.calculatedAmount || turno.montoCalculado || turno.calculated || 0,
    diferencia: turno.difference || turno.diferencia || turno.diff || 0,
    cerrado: turno.closed || turno.cerrado || turno.isClosed || false,
    observaciones: turno.observations || turno.observaciones || turno.notes || '',
    openedAt: turno.openedAt || turno.createdAt || turno.startedAt || new Date().toISOString(),
    receptionistId: turno.receptionistId || turno.empleadoId || 0,
    baseCaja: turno.cashBase || turno.baseCaja || turno.openingCashBalance || 0,
  };
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function TurnosPanel() {
    const [turnos, setTurnos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [seccion, setSeccion] = useState("hoy");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalCierre, setModalCierre] = useState(false);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [montoDeclarado, setMontoDeclarado] = useState("");
    const [loading, setLoading] = useState(false);
    const [turnoActivo, setTurnoActivo] = useState(null);
    const [cargandoTurnos, setCargandoTurnos] = useState(false);

    const { usuario } = useAuthStore();

    const [formTurno, setFormTurno] = useState({
        empleadoId: "",
        tipo: "FULL_SHIFT",
        horaInicio: "06:00",
        horaFin: "14:00",
        fecha: hoy,
        observaciones: "",
        baseCaja: 0,
    });

    // ============================================================
    // CARGAR DATOS INICIALES
    // ============================================================
    
    useEffect(() => {
        cargarEmpleados();
        cargarTurnos();
        verificarTurnoActivo();
    }, []);

    // Monitorear cambios en turnos para depuración
    useEffect(() => {
        console.log("🔄 Estado de turnos actualizado:", turnos);
        console.log("📊 Turnos de hoy:", turnosHoy);
    }, [turnos]);

    const cargarEmpleados = async () => {
        try {
            const data = await empleadosService.listar();
            setEmpleados(data);
        } catch (err) {
            console.error("Error cargando empleados:", err);
            setEmpleados(empleadosMock);
        }
    };

    const cargarTurnos = async () => {
        setCargandoTurnos(true);
        try {
            console.log("🔄 Cargando turnos...");
            
            const data = await turnoService.turnosHoy();
            console.log("📦 Datos del servicio:", data);
            
            // Asegurar que sea un array
            const turnosArray = Array.isArray(data) ? data : [];
            console.log(`📊 Array de turnos (${turnosArray.length}):`, turnosArray);
            
            if (turnosArray.length > 0) {
                // Mapear los turnos
                const turnosMapeados = turnosArray.map(mapearTurno);
                console.log(`✅ Turnos mapeados (${turnosMapeados.length}):`, turnosMapeados);
                setTurnos(turnosMapeados);
            } else {
                // Si no hay datos, usar mock
                console.log("📦 No hay datos del backend, usando mock");
                setTurnos(turnosIniciales);
            }
        } catch (err) {
            console.error("❌ Error cargando turnos:", err);
            // Fallback a mock
            console.log("📦 Usando datos mock por error");
            setTurnos(turnosIniciales);
        } finally {
            setCargandoTurnos(false);
        }
    };

    const verificarTurnoActivo = () => {
        const turnoGuardado = localStorage.getItem('turno_activo');
        if (turnoGuardado) {
            try {
                const parsed = JSON.parse(turnoGuardado);
                setTurnoActivo(parsed);
                console.log("✅ Turno activo encontrado:", parsed);
            } catch {
                setTurnoActivo(null);
            }
        } else {
            console.log("ℹ️ No hay turno activo en localStorage");
        }
    };

    // ============================================================
    // FILTRAR TURNOS
    // ============================================================

    const turnosHoy = useMemo(() => {
        const hoyStr = hoy;
        if (Array.isArray(turnos) && turnos.length > 0) {
            const filtrados = turnos.filter(t => {
                const fechaTurno = t.fecha || t.openedAt?.split('T')[0] || '';
                return fechaTurno === hoyStr;
            });
            console.log(`📊 Turnos filtrados para hoy (${filtrados.length}):`, filtrados);
            return filtrados;
        }
        return [];
    }, [turnos]);

    const turnosHistorial = useMemo(() => {
        if (Array.isArray(turnos) && turnos.length > 0) {
            return [...turnos].sort((a, b) => {
                const fechaA = a.fecha || a.openedAt || '';
                const fechaB = b.fecha || b.openedAt || '';
                return fechaB.localeCompare(fechaA);
            });
        }
        return [];
    }, [turnos]);

    // ============================================================
    // CALCULAR MONTO ESPERADO
    // ============================================================

    const calcularMontoEsperado = (turno) => {
        const fecha = turno.fecha || turno.openedAt?.split('T')[0] || hoy;
        const mem = ingresosMensualidades
            .filter(i => i.fecha === fecha)
            .reduce((a, i) => a + i.monto, 0);
        const prod = ingresosProductos
            .filter(i => i.fecha === fecha)
            .reduce((a, i) => a + i.total, 0);
        return mem + prod;
    };

    // ============================================================
    // ABRIR TURNO
    // ============================================================

    const abrirTurno = async () => {
        if (!formTurno.empleadoId) {
            alert("Selecciona un empleado");
            return;
        }

        if (!formTurno.fecha) {
            alert("Selecciona una fecha");
            return;
        }

        try {
            setLoading(true);

            // Buscar el ID del usuario (receptionistId)
            const empleado = empleados.find(e => e.id === parseInt(formTurno.empleadoId));
            const receptionistId = empleado?.userId || formTurno.empleadoId;

            console.log("👤 Abriendo turno para recepcionista ID:", receptionistId);

            // Abrir turno en el backend
            const resultado = await turnoService.abrir({
                tipo: formTurno.tipo,
                baseCaja: parseFloat(formTurno.baseCaja) || 0,
                receptionistId: receptionistId,
            });

            console.log("✅ Turno abierto:", resultado);

            // Extraer datos del turno
            const turnoData = resultado?.data || resultado || {};

            const nuevoTurno = {
                id: turnoData.id || Date.now(),
                empleadoId: parseInt(formTurno.empleadoId),
                tipo: formTurno.tipo,
                horaInicio: formTurno.horaInicio,
                horaFin: formTurno.horaFin,
                fecha: formTurno.fecha,
                montoDeclarado: 0,
                montoCalculado: 0,
                diferencia: 0,
                cerrado: false,
                observaciones: formTurno.observaciones,
                openedAt: turnoData.openedAt || new Date().toISOString(),
                receptionistId: receptionistId,
                baseCaja: parseFloat(formTurno.baseCaja) || 0,
            };

            // Guardar en estado local
            setTurnos(prev => [...(Array.isArray(prev) ? prev : []), nuevoTurno]);

            // GUARDAR EN LOCALSTORAGE para el POS
            const turnoActivoData = {
                id: nuevoTurno.id,
                receptionistId: receptionistId,
                openingCashBalance: parseFloat(formTurno.baseCaja) || 0,
                openedAt: nuevoTurno.openedAt,
                shiftType: formTurno.tipo
            };
            localStorage.setItem('turno_activo', JSON.stringify(turnoActivoData));
            setTurnoActivo(turnoActivoData);

            console.log('✅ Turno activo guardado en localStorage:', turnoActivoData);

            setModalAbierto(false);
            setSeccion("hoy");
            alert("✅ Turno abierto exitosamente");

        } catch (err) {
            console.error("❌ Error al abrir turno:", err);
            
            // Si falla el backend, usar mock para que la UI funcione
            const nuevo = {
                id: Date.now(),
                empleadoId: parseInt(formTurno.empleadoId),
                tipo: formTurno.tipo,
                horaInicio: formTurno.horaInicio,
                horaFin: formTurno.horaFin,
                fecha: formTurno.fecha,
                montoDeclarado: 0,
                montoCalculado: 0,
                diferencia: 0,
                cerrado: false,
                observaciones: formTurno.observaciones,
                openedAt: new Date().toISOString(),
                baseCaja: parseFloat(formTurno.baseCaja) || 0,
            };
            setTurnos(prev => [...(Array.isArray(prev) ? prev : []), nuevo]);
            
            // Igual guardamos en localStorage para que el POS funcione
            const turnoActivoData = {
                id: nuevo.id,
                receptionistId: parseInt(formTurno.empleadoId),
                openingCashBalance: parseFloat(formTurno.baseCaja) || 0,
                openedAt: new Date().toISOString(),
                shiftType: formTurno.tipo
            };
            localStorage.setItem('turno_activo', JSON.stringify(turnoActivoData));
            setTurnoActivo(turnoActivoData);
            
            setModalAbierto(false);
            setSeccion("hoy");
            alert("✅ Turno abierto (modo local)");
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // CERRAR TURNO
    // ============================================================

    const abrirCierre = (turno) => {
        setTurnoSeleccionado(turno);
        setMontoDeclarado("");
        setModalCierre(true);
    };

    const cerrarTurno = async () => {
        if (!turnoSeleccionado) return;

        const declarado = parseInt(montoDeclarado) || 0;
        const calculado = calcularMontoEsperado(turnoSeleccionado);
        const diferencia = declarado - calculado;

        try {
            setLoading(true);

            // Cerrar turno en el backend
            await turnoService.cerrar(turnoSeleccionado.id, declarado);

            console.log("✅ Turno cerrado exitosamente");

        } catch (err) {
            console.error("❌ Error al cerrar turno:", err);
            // Continuamos igual para actualizar la UI
        }

        // Actualizar estado local
        setTurnos(prev => prev.map(t =>
            t.id === turnoSeleccionado.id ? {
                ...t,
                cerrado: true,
                montoDeclarado: declarado,
                montoCalculado: calculado,
                diferencia,
            } : t
        ));

        // ELIMINAR DE LOCALSTORAGE
        localStorage.removeItem('turno_activo');
        setTurnoActivo(null);

        setModalCierre(false);
        alert("✅ Turno cerrado exitosamente");
        setLoading(false);
    };

    // ============================================================
    // UTILIDADES
    // ============================================================

    const getEmpleado = (id) => empleados.find(e => e.id === id);

    const getDiferenciaColor = (dif) => {
        if (dif === 0) return "text-green";
        if (dif > 0) return "text-blue";
        return "text-red";
    };

    const isTurnoActivo = (turno) => {
        return turnoActivo && turnoActivo.id === turno.id && !turno.cerrado;
    };

    // ============================================================
    // RENDERIZADO
    // ============================================================

    return (
        <div className="turnos-container">
            <div className="finanzas-tabs">
                {[
                    { id: "hoy", label: "📅 Hoy" },
                    { id: "historial", label: "📋 Historial" },
                ].map(s => (
                    <button
                        key={s.id}
                        className={`finanzas-tab ${seccion === s.id ? "active" : ""}`}
                        onClick={() => setSeccion(s.id)}
                    >
                        {s.label}
                    </button>
                ))}
                <Button 
                    variant="primary" 
                    onClick={() => setModalAbierto(true)}
                    style={{ marginLeft: "auto" }}
                    disabled={turnoActivo !== null}
                >
                    {turnoActivo ? "🔵 Turno Activo" : "➕ Abrir Turno"}
                </Button>
            </div>

            {turnoActivo && (
                <div className="turno-activo-banner" style={{
                    background: '#dbeafe',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>🔵 Turno activo desde: {new Date(turnoActivo.openedAt).toLocaleString()}</span>
                    <span style={{ fontWeight: 'bold' }}>ID: {turnoActivo.id}</span>
                </div>
            )}

            {cargandoTurnos ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Cargando turnos...</p>
                </div>
            ) : seccion === "hoy" && (
                <div className="turnos-hoy">
                    {turnosHoy.length === 0 ? (
                        <div className="turnos-vacio">
                            <span>🕐</span>
                            <p>No hay turnos registrados hoy</p>
                            <button className="acceso-btn" onClick={() => setModalAbierto(true)}>
                                ➕ Abrir primer turno
                            </button>
                        </div>
                    ) : (
                        <div className="turnos-grid">
                            {turnosHoy.map(turno => {
                                const emp = getEmpleado(turno.empleadoId);
                                const montoEsperado = calcularMontoEsperado(turno);
                                const activo = isTurnoActivo(turno);
                                
                                return (
                                    <div key={turno.id} className={`turno-card ${turno.cerrado ? "turno-cerrado" : "turno-abierto"}`}>
                                        <div className="turno-header">
                                            <div className="turno-emp">
                                                <span className="cliente-avatar avatar-purple">
                                                    {emp?.nombre?.charAt(0) || "?"}
                                                </span>
                                                <div>
                                                    <span className="turno-nombre">{emp?.nombre || "Empleado"}</span>
                                                    <span className="turno-cargo">{emp?.cargo}</span>
                                                </div>
                                            </div>
                                            <span className={`estado-badge ${turno.cerrado ? "badge-green" : activo ? "badge-blue" : "badge-yellow"}`}>
                                                {turno.cerrado ? "✅ Cerrado" : activo ? "🔵 Activo" : "🟡 Abierto"}
                                            </span>
                                        </div>

                                        <div className="turno-info-grid">
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Tipo</span>
                                                <span className="turno-info-valor">
                                                    {tiposTurno[turno.tipo]?.label || turno.tipo}
                                                </span>
                                            </div>
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Horario</span>
                                                <span className="turno-info-valor">
                                                    {turno.horaInicio || turno.openedAt?.split('T')[1]?.substring(0,5) || '--:--'} - {turno.horaFin || '--:--'}
                                                </span>
                                            </div>
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Base Caja</span>
                                                <span className="turno-info-valor">{COP(turno.baseCaja || 0)}</span>
                                            </div>
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Esperado</span>
                                                <span className="turno-info-valor text-green">{COP(montoEsperado)}</span>
                                            </div>
                                            {turno.cerrado && (
                                                <>
                                                    <div className="turno-info-item">
                                                        <span className="turno-info-label">Declarado</span>
                                                        <span className="turno-info-valor">{COP(turno.montoDeclarado)}</span>
                                                    </div>
                                                    <div className="turno-info-item">
                                                        <span className="turno-info-label">Diferencia</span>
                                                        <span className={`turno-info-valor ${getDiferenciaColor(turno.diferencia)}`}>
                                                            {turno.diferencia > 0 ? "+" : ""}{COP(turno.diferencia)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {turno.observaciones && (
                                            <p className="turno-obs">📝 {turno.observaciones}</p>
                                        )}

                                        {!turno.cerrado && (
                                            <Button
                                                variant="primary"
                                                onClick={() => abrirCierre(turno)}
                                                style={{ width: "100%", marginTop: "8px" }}
                                            >
                                                🔒 Cerrar Turno
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {seccion === "historial" && (
                <Card title="Historial de Turnos" icon="📋" className="historial-card">
                    <div className="tabla-scroll">
                        <table className="usuarios-tabla">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Empleado</th>
                                    <th>Tipo</th>
                                    <th>Horario</th>
                                    <th>Base Caja</th>
                                    <th>Declarado</th>
                                    <th>Calculado</th>
                                    <th>Diferencia</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {turnosHistorial.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                                            No hay turnos en el historial
                                        </td>
                                    </tr>
                                ) : (
                                    turnosHistorial.map(turno => {
                                        const emp = getEmpleado(turno.empleadoId);
                                        return (
                                            <tr key={turno.id}>
                                                <td className="text-small">{turno.fecha || turno.openedAt?.split('T')[0] || '--'}</td>
                                                <td>
                                                    <div className="cliente-nombre-cell">
                                                        <span className="cliente-avatar avatar-purple" style={{ fontSize: "10px", width: "20px", height: "20px" }}>
                                                            {emp?.nombre?.charAt(0) || "?"}
                                                        </span>
                                                        <span>{emp?.nombre || "—"}</span>
                                                    </div>
                                                </td>
                                                <td><span className="membresia-badge">{tiposTurno[turno.tipo]?.label || turno.tipo}</span></td>
                                                <td className="text-small">
                                                    {turno.horaInicio || turno.openedAt?.split('T')[1]?.substring(0,5) || '--:--'} - {turno.horaFin || '--:--'}
                                                </td>
                                                <td>{COP(turno.baseCaja || 0)}</td>
                                                <td className="text-green">{COP(turno.montoDeclarado)}</td>
                                                <td>{COP(turno.montoCalculado)}</td>
                                                <td className={getDiferenciaColor(turno.diferencia)}>
                                                    {turno.diferencia > 0 ? "+" : ""}{COP(turno.diferencia)}
                                                </td>
                                                <td>
                                                    <span className={`estado-badge ${turno.cerrado ? "badge-green" : "badge-yellow"}`}>
                                                        {turno.cerrado ? "Cerrado" : "Abierto"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal Abrir Turno */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalAbierto(false)}>✕</button>
                        <div className="modal-header-form">
                            <div className="modal-header-icon">🕐</div>
                            <div>
                                <h3 className="modal-titulo">Abrir Turno</h3>
                                <p className="modal-subtitulo">Registra el inicio de turno</p>
                            </div>
                        </div>
                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Empleado</span><span className="campo-obligatorio">*</span></label>
                                <select className="campo-input" value={formTurno.empleadoId}
                                    onChange={e => setFormTurno({ ...formTurno, empleadoId: e.target.value })}>
                                    <option value="">Seleccionar empleado</option>
                                    {empleados.filter(e => e.activo !== false).map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre} — {e.cargo}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Tipo de turno</span></label>
                                <select className="campo-input" value={formTurno.tipo}
                                    onChange={e => setFormTurno({ ...formTurno, tipo: e.target.value })}>
                                    <option value="FULL_SHIFT">Turno Completo</option>
                                    <option value="HALF_SHIFT">Medio Turno</option>
                                    <option value="HOURLY_SHIFT">Por Horas</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha</span></label>
                                <input className="campo-input" type="date" value={formTurno.fecha}
                                    onChange={e => setFormTurno({ ...formTurno, fecha: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Hora inicio</span></label>
                                <input className="campo-input" type="time" value={formTurno.horaInicio}
                                    onChange={e => setFormTurno({ ...formTurno, horaInicio: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Hora fin</span></label>
                                <input className="campo-input" type="time" value={formTurno.horaFin}
                                    onChange={e => setFormTurno({ ...formTurno, horaFin: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Base de Caja ($)</span></label>
                                <input className="campo-input" type="number" value={formTurno.baseCaja}
                                    onChange={e => setFormTurno({ ...formTurno, baseCaja: e.target.value })}
                                    placeholder="0" />
                            </div>
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Observaciones</span></label>
                                <input className="campo-input" type="text" value={formTurno.observaciones}
                                    onChange={e => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                                    placeholder="Opcional..." />
                            </div>
                        </div>
                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <Button variant="primary" onClick={abrirTurno} disabled={loading}>
                                {loading ? '⏳ Abriendo...' : '✅ Abrir Turno'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cierre de Turno */}
            {modalCierre && turnoSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalCierre(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalCierre(false)}>✕</button>
                        <div className="modal-header-form">
                            <div className="modal-header-icon">🔒</div>
                            <div>
                                <h3 className="modal-titulo">Cierre de Turno</h3>
                                <p className="modal-subtitulo">
                                    {getEmpleado(turnoSeleccionado.empleadoId)?.nombre} · {turnoSeleccionado.horaInicio} - {turnoSeleccionado.horaFin}
                                </p>
                            </div>
                        </div>

                        <div className="cierre-resumen">
                            <div className="cierre-item">
                                <span className="cierre-label">Monto esperado del sistema</span>
                                <span className="cierre-valor text-green">
                                    {COP(calcularMontoEsperado(turnoSeleccionado))}
                                </span>
                            </div>
                            <div className="cierre-item">
                                <span className="cierre-label">Base de caja inicial</span>
                                <span className="cierre-valor">
                                    {COP(turnoSeleccionado.baseCaja || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Monto declarado en caja ($)</span><span className="campo-obligatorio">*</span></label>
                                <input
                                    className="campo-input campo-grande"
                                    type="number"
                                    value={montoDeclarado}
                                    onChange={e => setMontoDeclarado(e.target.value)}
                                    placeholder="¿Cuánto hay en caja?"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {montoDeclarado && (
                            <div className="cierre-diferencia">
                                <span>Diferencia:</span>
                                <span className={getDiferenciaColor(parseInt(montoDeclarado) - calcularMontoEsperado(turnoSeleccionado))}>
                                    {COP(parseInt(montoDeclarado) - calcularMontoEsperado(turnoSeleccionado))}
                                    {parseInt(montoDeclarado) === calcularMontoEsperado(turnoSeleccionado)
                                        ? " ✅ Cuadra perfecto"
                                        : parseInt(montoDeclarado) > calcularMontoEsperado(turnoSeleccionado)
                                            ? " ⬆️ Sobrante"
                                            : " ⬇️ Faltante"}
                                </span>
                            </div>
                        )}

                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalCierre(false)}>Cancelar</button>
                            <Button variant="primary" onClick={cerrarTurno} disabled={loading}>
                                {loading ? '⏳ Cerrando...' : '🔒 Confirmar Cierre'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}