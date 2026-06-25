// ============================================
// TURNOS PANEL - Cierre y entrega de turno
// ============================================
import { useState, useMemo } from "react";
import { turnos as turnosIniciales, tiposTurno } from "../../mock/empleados";
import { empleados } from "../../mock/empleados";
import { ingresosMensualidades, ingresosProductos } from "../../mock/finanzas";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const COP = (v) => "$" + Math.round(v || 0).toLocaleString("es-CO");
const hoy = new Date().toISOString().split("T")[0];

export default function TurnosPanel() {
    const [turnos, setTurnos] = useState(turnosIniciales);
    const [seccion, setSeccion] = useState("hoy");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalCierre, setModalCierre] = useState(false);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [montoDeclarado, setMontoDeclarado] = useState("");

    const [formTurno, setFormTurno] = useState({
        empleadoId: "",
        tipo: "COMPLETO",
        horaInicio: "06:00",
        horaFin: "14:00",
        fecha: hoy,
        observaciones: "",
    });

    const turnosHoy = useMemo(() =>
        turnos.filter(t => t.fecha === hoy),
        [turnos]);

    const turnosHistorial = useMemo(() =>
        [...turnos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
        [turnos]);

    const calcularMontoEsperado = (turno) => {
        const mem = ingresosMensualidades
            .filter(i => i.fecha === turno.fecha)
            .reduce((a, i) => a + i.monto, 0);
        const prod = ingresosProductos
            .filter(i => i.fecha === turno.fecha)
            .reduce((a, i) => a + i.total, 0);
        return mem + prod;
    };

    const abrirTurno = () => {
        if (!formTurno.empleadoId) { alert("Selecciona un empleado"); return; }
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
        };
        setTurnos([...turnos, nuevo]);
        setModalAbierto(false);
        setSeccion("hoy");
    };

    const abrirCierre = (turno) => {
        setTurnoSeleccionado(turno);
        setMontoDeclarado("");
        setModalCierre(true);
    };

    const cerrarTurno = () => {
        const declarado = parseInt(montoDeclarado) || 0;
        const calculado = calcularMontoEsperado(turnoSeleccionado);
        const diferencia = declarado - calculado;
        setTurnos(turnos.map(t => t.id === turnoSeleccionado.id ? {
            ...t,
            cerrado: true,
            montoDeclarado: declarado,
            montoCalculado: calculado,
            diferencia,
        } : t));
        setModalCierre(false);
    };

    const getEmpleado = (id) => empleados.find(e => e.id === id);

    const getDiferenciaColor = (dif) => {
        if (dif === 0) return "text-green";
        if (dif > 0) return "text-blue";
        return "text-red";
    };

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
                <Button variant="primary" onClick={() => setModalAbierto(true)}
                    style={{ marginLeft: "auto" }}>
                    ➕ Abrir Turno
                </Button>
            </div>

            {seccion === "hoy" && (
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
                                return (
                                    <div key={turno.id} className={`turno-card ${turno.cerrado ? "turno-cerrado" : "turno-abierto"}`}>
                                        <div className="turno-header">
                                            <div className="turno-emp">
                                                <span className="cliente-avatar avatar-purple">
                                                    {emp?.nombre.charAt(0) || "?"}
                                                </span>
                                                <div>
                                                    <span className="turno-nombre">{emp?.nombre || "Empleado"}</span>
                                                    <span className="turno-cargo">{emp?.cargo}</span>
                                                </div>
                                            </div>
                                            <span className={`estado-badge ${turno.cerrado ? "badge-green" : "badge-yellow"}`}>
                                                {turno.cerrado ? "✅ Cerrado" : "🟡 Abierto"}
                                            </span>
                                        </div>

                                        <div className="turno-info-grid">
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Tipo</span>
                                                <span className="turno-info-valor">
                                                    {tiposTurno[turno.tipo]?.label}
                                                </span>
                                            </div>
                                            <div className="turno-info-item">
                                                <span className="turno-info-label">Horario</span>
                                                <span className="turno-info-valor">{turno.horaInicio} - {turno.horaFin}</span>
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
                                    <th>Declarado</th>
                                    <th>Calculado</th>
                                    <th>Diferencia</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {turnosHistorial.map(turno => {
                                    const emp = getEmpleado(turno.empleadoId);
                                    return (
                                        <tr key={turno.id}>
                                            <td className="text-small">{turno.fecha}</td>
                                            <td>
                                                <div className="cliente-nombre-cell">
                                                    <span className="cliente-avatar avatar-purple" style={{ fontSize: "10px", width: "20px", height: "20px" }}>
                                                        {emp?.nombre.charAt(0) || "?"}
                                                    </span>
                                                    <span>{emp?.nombre || "—"}</span>
                                                </div>
                                            </td>
                                            <td><span className="membresia-badge">{tiposTurno[turno.tipo]?.label}</span></td>
                                            <td className="text-small">{turno.horaInicio} - {turno.horaFin}</td>
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
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

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
                                    {empleados.filter(e => e.activo).map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre} — {e.cargo}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Tipo de turno</span></label>
                                <select className="campo-input" value={formTurno.tipo}
                                    onChange={e => setFormTurno({ ...formTurno, tipo: e.target.value })}>
                                    <option value="COMPLETO">Turno Completo (8h)</option>
                                    <option value="MEDIO">Medio Turno (4h)</option>
                                    <option value="HORAS">Por Horas</option>
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
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Observaciones</span></label>
                                <input className="campo-input" type="text" value={formTurno.observaciones}
                                    onChange={e => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                                    placeholder="Opcional..." />
                            </div>
                        </div>
                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <Button variant="primary" onClick={abrirTurno}>✅ Abrir Turno</Button>
                        </div>
                    </div>
                </div>
            )}

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
                            <Button variant="primary" onClick={cerrarTurno}>🔒 Confirmar Cierre</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}