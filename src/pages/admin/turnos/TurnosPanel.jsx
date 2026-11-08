/**
 * ============================================================
 * ARCHIVO: src/pages/admin/turnos/TurnosPanel.jsx
 * VERSIÓN: 6.0 - CORREGIDA ✅
 *
 * CAMBIOS respecto a la v5.0:
 *  - TIPOS_TURNO ahora solo contiene los 3 valores que el backend
 *    realmente acepta (FULL_SHIFT, HALF_SHIFT, HOURLY_SHIFT). Antes
 *    había 6 claves (incluía MORNING/AFTERNOON/NIGHT) que el enum
 *    ShiftType de Java no reconoce -> el backend rechazaba el turno.
 *  - mapearTurno ahora lee turno.scheduledDate (nuevo campo del
 *    backend) para saber a qué día del calendario pertenece el
 *    turno, en vez de derivarlo siempre de openedAt.
 *  - Se agrega moverTurno(): handler que se pasa a <Calendario /> y
 *    que se dispara cuando se suelta (drop) una tarjeta arrastrada.
 *    Llama a turnoService.reprogramar() y refresca los datos.
 * ============================================================
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { COP, formatDate, formatHora, formatCurrencyInput } from "../../../utils/formatters";
import { turnoService } from "../../../services/turnoService";
import { empleadosService } from "../../../services/empleadosService";
import authService from "../../../services/authService";
import useAuthStore from "../../../store/authStore";
import EditarTurno from "./EditarTurno";
import CrearTurno from "./CrearTurno";
import Historia from "./Historia";
import Calendario from "./Calendario";

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const hoy = new Date().toISOString().split("T")[0];

// ✅ CORREGIDO: solo los 3 tipos que existen en el enum ShiftType del backend.
export const TIPOS_TURNO = {
    FULL_SHIFT: { label: "Turno Completo", icon: "🔄", color: "#3b82f6", bg: "#dbeafe" },
    HALF_SHIFT: { label: "Medio Turno", icon: "🌓", color: "#8b5cf6", bg: "#ede9fe" },
    HOURLY_SHIFT: { label: "Turno Tarde", icon: "🌆", color: "#f59e0b", bg: "#fef3c7" },
};

export const ESTADOS_TURNO = {
    OPEN: { label: "🟢 Abierto", color: "#10b981" },
    CLOSED: { label: "🔒 Cerrado", color: "#6b7280" },
    PENDING: { label: "⏳ Pendiente", color: "#f59e0b" },
};

// ============================================================
// FUNCIÓN DE MAPEO DE TURNOS
// ============================================================

export const mapearTurno = (turno) => ({
    id: turno.id || turno.shiftId || Date.now(),
    empleadoId: turno.receptionistId || turno.employeeId || turno.empleadoId || 0,
    nombreEmpleado: turno.employeeName || turno.nombreEmpleado || '',
    tipo: turno.type || turno.tipo || turno.shiftType || 'FULL_SHIFT',
    fecha: turno.scheduledDate || turno.date || turno.fecha || turno.openedAt?.split('T')[0] || hoy,
    dia: turno.dia !== undefined ? turno.dia : new Date(turno.scheduledDate || turno.date || turno.openedAt || Date.now()).getDay() || 0,
    horaInicio: formatHora(turno.startTime) || formatHora(turno.horaInicio) || '06:00',
    horaFin: formatHora(turno.endTime) || formatHora(turno.horaFin) || '14:00',
    montoDeclarado: turno.declaredAmount || turno.montoDeclarado || turno.physicalCashCounted || 0,
    montoCalculado: turno.calculatedAmount || turno.montoCalculado || turno.expectedAmount || 0,
    diferencia: turno.difference || turno.diferencia || turno.cashDifference || 0,
    cerrado: turno.closed || turno.cerrado || false,
    observaciones: turno.observations || turno.observaciones || turno.notes || turno.closingNotes || '',
    openedAt: turno.openedAt || turno.createdAt || new Date().toISOString(),
    closedAt: turno.closedAt || turno.cerradoEn || null,
    receptionistId: turno.receptionistId || turno.empleadoId || 0,
    baseCaja: turno.cashBase || turno.baseCaja || turno.openingCashBalance || 0,
    esLocal: turno.esLocal || false,
    totalVentas: turno.totalSales || turno.totalVentas || turno.totalProductSales || 0,
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function TurnosPanel() {
    // Datos principales
    const [turnos, setTurnos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);
    const [modoVista, setModoVista] = useState("hoy");

    // UI y navegación
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [mensajeExito, setMensajeExito] = useState("");

    // Filtros y búsqueda
    const [busqueda, setBusqueda] = useState("");
    const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // Modales
    const [modalCrear, setModalCrear] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalCierre, setModalCierre] = useState(false);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [modalEmergencia, setModalEmergencia] = useState(false);
    const [modalEliminar, setModalEliminar] = useState(null);

    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [montoDeclarado, setMontoDeclarado] = useState("");
    const [loading, setLoading] = useState(false);

    // Fecha por defecto para "Nuevo Turno" cuando se dispara desde una
    // celda del calendario (clic en "+ Agregar" de un día concreto).
    const [fechaCrearDefault, setFechaCrearDefault] = useState(hoy);

    const { usuario } = useAuthStore();

    useEffect(() => {
        cargarDatos();
        verificarTurnoActivo();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        setError(null);
        try {
            const [empleadosData, turnosData] = await Promise.all([
                empleadosService.listar(),
                turnoService.listarTodos()
            ]);
            setEmpleados(empleadosData);
            if (Array.isArray(turnosData) && turnosData.length > 0) {
                const turnosMapeados = turnosData.map(mapearTurno);
                turnosMapeados.sort((a, b) => b.fecha.localeCompare(a.fecha));
                setTurnos(turnosMapeados);
            } else {
                setTurnos([]);
            }
        } catch (err) {
            console.error("❌ Error cargando datos:", err);
            setError("Error al cargar los datos. Por favor, recarga la página.");
            setTurnos([]);
        } finally {
            setCargando(false);
        }
    };

    const verificarTurnoActivo = async () => {
        try {
            let usuarioId = usuario?.id || usuario?.userId || usuario?.user_id;

            if (!usuarioId) {
                usuarioId = authService.getUserId?.() || null;
            }

            if (!usuarioId) {
                const storedUser = localStorage.getItem('gymcore-user');
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        usuarioId = parsed.id || parsed.userId || parsed.user_id || null;
                    } catch (e) {
                        console.warn('⚠️ Error parseando usuario almacenado:', e);
                    }
                }
            }

            if (!usuarioId) {
                usuarioId = usuario?.id || null;
            }

            if (!usuarioId) {
                setTurnoActivo(null);
                localStorage.removeItem('turno_activo');
                return;
            }

            const turnoAbierto = await turnoService.obtenerAbierto(usuarioId);

            if (turnoAbierto) {
                const turnoFormateado = mapearTurno(turnoAbierto);
                setTurnoActivo(turnoFormateado);
                localStorage.setItem('turno_activo', JSON.stringify(turnoFormateado));
            } else {
                setTurnoActivo(null);
                localStorage.removeItem('turno_activo');
            }
        } catch (error) {
            console.error('❌ Error verificando turno:', error);
            const localData = localStorage.getItem('turno_activo');
            if (localData) {
                try {
                    setTurnoActivo(JSON.parse(localData));
                } catch {
                    setTurnoActivo(null);
                }
            }
        }
    };

    const getNombreEmpleado = useCallback((id) => {
        if (!id) return 'Sin empleado';
        const emp = empleados.find(e => e.id === id || e.userId === id);
        return emp?.nombre || emp?.fullName || `Empleado #${id}`;
    }, [empleados]);

    const getTipoInfo = (tipo) => TIPOS_TURNO[tipo] || TIPOS_TURNO.FULL_SHIFT;

    const getDiferenciaColor = (dif) => {
        if (dif === 0) return "#059669";
        if (dif > 0) return "#2563eb";
        return "#dc2626";
    };

    const turnosFiltradosGlobal = useMemo(() => {
        let resultado = [...turnos];

        if (busqueda.trim()) {
            const bus = busqueda.toLowerCase().trim();
            resultado = resultado.filter(t =>
                t.nombreEmpleado?.toLowerCase().includes(bus) ||
                String(t.id).includes(bus) ||
                t.tipo?.toLowerCase().includes(bus)
            );
        }
        if (filtroEmpleado !== "todos") {
            const empFiltro = empleados.find(e => String(e.id) === String(filtroEmpleado));
            const empFiltroUserId = empFiltro?.userId;
            resultado = resultado.filter(t =>
                t.empleadoId === parseInt(filtroEmpleado) ||
                t.receptionistId === parseInt(filtroEmpleado) ||
                (empFiltroUserId && t.receptionistId === empFiltroUserId)
            );
        }
        if (filtroTipo !== "todos") {
            resultado = resultado.filter(t => t.tipo === filtroTipo);
        }
        if (filtroEstado !== "todos") {
            const cerrado = filtroEstado === "closed";
            resultado = resultado.filter(t => t.cerrado === cerrado);
        }
        if (fechaInicio) resultado = resultado.filter(t => t.fecha >= fechaInicio);
        if (fechaFin) resultado = resultado.filter(t => t.fecha <= fechaFin);

        return resultado;
    }, [turnos, busqueda, filtroEmpleado, filtroTipo, filtroEstado, fechaInicio, fechaFin]);

    const turnosHoy = useMemo(() => turnos.filter(t => t.fecha === hoy), [turnos]);

    const estadisticas = useMemo(() => {
        const total = turnos.length;
        const abiertos = turnos.filter(t => !t.cerrado).length;
        const cerrados = turnos.filter(t => t.cerrado).length;
        const totalBase = turnos.reduce((sum, t) => sum + (t.baseCaja || 0), 0);
        const totalDeclarado = turnos.reduce((sum, t) => sum + (t.montoDeclarado || 0), 0);
        const totalDiferencia = turnos.reduce((sum, t) => sum + (t.diferencia || 0), 0);
        const totalVentas = turnos.reduce((sum, t) => sum + (t.totalVentas || 0), 0);
        return { total, abiertos, cerrados, totalBase, totalDeclarado, totalDiferencia, totalVentas };
    }, [turnos]);

    // ============================================================
    // CRUD
    // ============================================================

    const abrirCrearTurno = (fecha = hoy) => {
        setFechaCrearDefault(fecha);
        setModalCrear(true);
        setError(null);
    };

    const abrirEditarTurno = (turno) => {
        if (turno.cerrado) {
            // Los turnos cerrados son solo lectura: mostrar detalle en su lugar
            setModalDetalle(turno);
            return;
        }
        setTurnoSeleccionado(turno);
        setModalEditar(true);
        setError(null);
    };

    const abrirCierreTurno = (turno) => {
        if (turno.cerrado) {
            setError("Este turno ya está cerrado");
            return;
        }
        setTurnoSeleccionado(turno);
        setMontoDeclarado("");
        setError(null);
        setModalCierre(true);
    };

    const cerrarTurno = async () => {
        if (!turnoSeleccionado) return;
        const declarado = parseFloat(montoDeclarado) || 0;
        if (declarado <= 0) {
            setError("Ingresa un monto declarado válido");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await turnoService.cerrar(turnoSeleccionado.id, declarado);
            await cargarDatos();
            await verificarTurnoActivo();
            setMensajeExito(`✅ Turno ${turnoSeleccionado.id} cerrado correctamente`);
            setModalCierre(false);
            setTimeout(() => setMensajeExito(""), 5000);
        } catch (err) {
            console.error("❌ Error cerrando turno:", err);
            setError(err.mensajeUsuario || err.message || "Error al cerrar el turno");
        } finally {
            setLoading(false);
        }
    };

    const confirmarEliminar = (turno) => setModalEliminar(turno);

    const eliminarTurno = async () => {
        if (!modalEliminar) return;
        const turnoId = modalEliminar.id;
        const eraTurnoActivo = turnoActivo && turnoActivo.id === turnoId;
        setLoading(true);
        setError(null);
        try {
            await turnoService.eliminar(turnoId);
            setMensajeExito(`🗑️ Turno ${turnoId} eliminado correctamente`);
            await cargarDatos();
            if (eraTurnoActivo) await verificarTurnoActivo();
            setModalEliminar(null);
            setTimeout(() => setMensajeExito(""), 5000);
        } catch (err) {
            console.error(`❌ Error eliminando turno ${turnoId}:`, err);
            setError(err.mensajeUsuario || err.message || "Error al eliminar el turno");
        } finally {
            setLoading(false);
        }
    };

    const forzarCierreTurno = async () => {
        if (!confirm("⚠️ ¿Seguro que quieres forzar el cierre del turno?\nEsto cerrará el turno sin verificar montos.")) return;
        setLoading(true);
        setError(null);
        try {
            const usuarioId = usuario?.id;
            const turnoAbierto = await turnoService.obtenerAbierto(usuarioId);
            if (!turnoAbierto) {
                setError("No se encontró un turno abierto para forzar el cierre");
                setLoading(false);
                return;
            }
            await turnoService.cerrar(turnoAbierto.id, 0);
            await verificarTurnoActivo();
            await cargarDatos();
            setMensajeExito(`✅ Turno ${turnoAbierto.id} cerrado forzosamente`);
            setModalEmergencia(false);
            setTimeout(() => setMensajeExito(""), 5000);
        } catch (error) {
            console.error("❌ Error forzando cierre:", error);
            setError(`Error al forzar cierre: ${error.mensajeUsuario || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetearFiltros = () => {
        setBusqueda("");
        setFiltroEmpleado("todos");
        setFiltroTipo("todos");
        setFiltroEstado("todos");
        setFechaInicio("");
        setFechaFin("");
    };

    // ✅ NUEVO: se dispara al soltar (drop) una tarjeta en otro día del
    // calendario. Solo se permite mover turnos que están abiertos
    // (uno cerrado ya es historial contable, no se debe "editar" su fecha).
    const moverTurno = async (turnoId, nuevaFecha) => {
        const turno = turnos.find(t => t.id === turnoId);
        if (!turno) return;
        if (turno.fecha === nuevaFecha) return;
        if (turno.cerrado) {
            setError("No se puede reprogramar un turno ya cerrado");
            return;
        }

        // Actualización optimista para que el drag se sienta instantáneo
        setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, fecha: nuevaFecha } : t));

        try {
            await turnoService.reprogramar(turnoId, nuevaFecha);
            setMensajeExito(`✅ Turno ${turnoId} movido al ${formatDate(nuevaFecha)}`);
            setTimeout(() => setMensajeExito(""), 4000);
        } catch (err) {
            console.error("❌ Error reprogramando turno:", err);
            setError(err.mensajeUsuario || err.message || "Error al mover el turno");
            // revertir si falló en el backend
            await cargarDatos();
        }
    };

    const handleCrearExito = () => {
        setModalCrear(false);
        cargarDatos();
        verificarTurnoActivo();
        setMensajeExito("✅ Turno creado correctamente");
        setTimeout(() => setMensajeExito(""), 5000);
    };

    const handleEditarExito = () => {
        setModalEditar(false);
        cargarDatos();
        setMensajeExito("✅ Turno actualizado correctamente");
        setTimeout(() => setMensajeExito(""), 5000);
    };

    const renderCards = () => {
        if (turnosHoy.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px' }}>
                    <span style={{ fontSize: '48px' }}>🕐</span>
                    <p style={{ margin: '16px 0' }}>No hay turnos registrados hoy</p>
                    <Button variant="primary" onClick={() => abrirCrearTurno(hoy)}>➕ Crear turno</Button>
                </div>
            );
        }
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                {turnosHoy.map(turno => {
                    const nombre = getNombreEmpleado(turno.empleadoId || turno.receptionistId);
                    const activo = turnoActivo && turnoActivo.id === turno.id && !turno.cerrado;
                    const tipoInfo = getTipoInfo(turno.tipo);
                    return (
                        <div key={turno.id} style={{
                            background: 'white', borderRadius: '12px', padding: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: turno.cerrado ? '1px solid #e5e7eb' : '1px solid #93c5fd',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: turno.cerrado ? '#9ca3af' : tipoInfo.color,
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px', fontWeight: 'bold'
                                    }}>
                                        {nombre?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{nombre}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {turno.id}</div>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
                                    background: turno.cerrado ? '#dcfce7' : activo ? '#dbeafe' : '#fef3c7',
                                    color: turno.cerrado ? '#166534' : activo ? '#1e40af' : '#92400e'
                                }}>
                                    {turno.cerrado ? "✅ Cerrado" : activo ? "🔵 Activo" : "🟡 Abierto"}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px', fontSize: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Tipo</div>
                                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span>{tipoInfo.icon}</span>{tipoInfo.label}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Horario</div>
                                    <div style={{ fontWeight: '500' }}>{turno.horaInicio} - {turno.horaFin}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Base</div>
                                    <div style={{ fontWeight: '500', color: '#059669' }}>{COP(turno.baseCaja || 0)}</div>
                                </div>
                                {turno.cerrado && (
                                    <>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Declarado</div>
                                            <div style={{ fontWeight: '500', color: '#059669' }}>{COP(turno.montoDeclarado)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Diferencia</div>
                                            <div style={{ fontWeight: '500', color: getDiferenciaColor(turno.diferencia) }}>
                                                {turno.diferencia > 0 ? "+" : ""}{COP(turno.diferencia)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Ventas</div>
                                            <div style={{ fontWeight: '500', color: '#2563eb' }}>{COP(turno.totalVentas || 0)}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button onClick={() => setModalDetalle(turno)} style={{ padding: '5px 10px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flex: 1 }}>👁️ Detalle</button>
                                <button onClick={() => abrirEditarTurno(turno)} style={{ padding: '5px 10px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                {!turno.cerrado && (
                                    <>
                                        <button onClick={() => abrirCierreTurno(turno)} style={{ padding: '5px 10px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🔒</button>
                                        <button onClick={() => confirmarEliminar(turno)} style={{ padding: '5px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (cargando) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p>Cargando turnos...</p>
            </div>
        );
    }

    return (
        <div className="turnos-container" style={{ padding: '20px' }}>
            {mensajeExito && (
                <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #6ee7b7' }}>
                    <span>✅ {mensajeExito}</span>
                    <button onClick={() => setMensajeExito("")} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                </div>
            )}

            {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fca5a5' }}>
                    <span>❌ {error}</span>
                    <div>
                        {error.includes('turno abierto') && (
                            <button onClick={() => setModalEmergencia(true)} style={{ marginRight: '8px', padding: '3px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🚨 Forzar Cierre</button>
                        )}
                        <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Total Turnos</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{estadisticas.total}</div>
                </div>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Abiertos</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{estadisticas.abiertos}</div>
                </div>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Cerrados</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b7280' }}>{estadisticas.cerrados}</div>
                </div>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>{COP(estadisticas.totalVentas)}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
                <button onClick={() => setModoVista("hoy")} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: modoVista === "hoy" ? '#3b82f6' : '#f3f4f6', color: modoVista === "hoy" ? 'white' : '#374151', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>📅 Hoy ({turnosHoy.length})</button>
                <button onClick={() => setModoVista("calendario")} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: modoVista === "calendario" ? '#3b82f6' : '#f3f4f6', color: modoVista === "calendario" ? 'white' : '#374151', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>📆 Calendario</button>
                <button onClick={() => setModoVista("historial")} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: modoVista === "historial" ? '#3b82f6' : '#f3f4f6', color: modoVista === "historial" ? 'white' : '#374151', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>📋 Historial</button>
                <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: mostrarFiltros ? '#3b82f6' : '#f3f4f6', color: mostrarFiltros ? 'white' : '#374151', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>🔍 Filtros {mostrarFiltros ? '▲' : '▼'}</button>

                <div style={{ flex: 1 }}></div>

                <Button variant="primary" onClick={() => abrirCrearTurno(hoy)} disabled={turnoActivo !== null || loading} size="small">
                    {turnoActivo ? "🔵 Turno Activo" : "➕ Nuevo Turno"}
                </Button>

                <button onClick={() => setModalEmergencia(true)} style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }} title="Forzar cierre de turno (emergencia)">🚨</button>
            </div>

            {mostrarFiltros && (
                <div style={{ background: 'white', padding: '14px', borderRadius: '8px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>🔍 Buscar</label>
                        <input type="text" placeholder="ID, empleado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>👤 Empleado</label>
                        <select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}>
                            <option value="todos">Todos</option>
                            {empleados.map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>📋 Tipo</label>
                        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}>
                            <option value="todos">Todos</option>
                            {Object.entries(TIPOS_TURNO).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>📊 Estado</label>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}>
                            <option value="todos">Todos</option>
                            <option value="open">Abiertos</option>
                            <option value="closed">Cerrados</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>📅 Desde</label>
                        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>📅 Hasta</label>
                        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={resetearFiltros} style={{ padding: '5px 12px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>🔄 Limpiar</button>
                    </div>
                </div>
            )}

            {turnoActivo && modoVista === "hoy" && (
                <div style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '14px' }}>
                    <span>🔵 <strong>Turno activo</strong> ID: {turnoActivo.id} - {getNombreEmpleado(turnoActivo.receptionistId)}</span>
                    <div>
                        <span style={{ fontSize: '12px', marginRight: '10px' }}>Base: {COP(turnoActivo.baseCaja || 0)}</span>
                        <button onClick={() => abrirCierreTurno(turnoActivo)} style={{ padding: '3px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🔒 Cerrar</button>
                    </div>
                </div>
            )}

            {modoVista === "hoy" && renderCards()}
            {modoVista === "calendario" && (
                <Calendario
                    turnos={turnos}
                    empleados={empleados}
                    onCrearTurno={abrirCrearTurno}
                    onEditarTurno={abrirEditarTurno}
                    onCerrarTurno={abrirCierreTurno}
                    onMoverTurno={moverTurno}
                    getNombreEmpleado={getNombreEmpleado}
                    getTipoInfo={getTipoInfo}
                />
            )}
            {modoVista === "historial" && (
                <Historia
                    turnos={turnosFiltradosGlobal}
                    empleados={empleados}
                    onEditarTurno={abrirEditarTurno}
                    onCerrarTurno={abrirCierreTurno}
                    onEliminarTurno={confirmarEliminar}
                    onDetalleTurno={setModalDetalle}
                    getNombreEmpleado={getNombreEmpleado}
                    getTipoInfo={getTipoInfo}
                    getDiferenciaColor={getDiferenciaColor}
                />
            )}

            {modalCrear && (
                <CrearTurno
                    empleados={empleados}
                    fechaDefault={fechaCrearDefault}
                    onClose={() => setModalCrear(false)}
                    onSuccess={handleCrearExito}
                />
            )}

            {modalEditar && turnoSeleccionado && (
                <EditarTurno
                    turnoId={turnoSeleccionado.id}
                    turno={turnoSeleccionado}
                    empleados={empleados}
                    onClose={() => setModalEditar(false)}
                    onSuccess={handleEditarExito}
                />
            )}

            {modalCierre && turnoSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalCierre(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '95%', background: 'white', borderRadius: '12px', padding: '24px' }}>
                        <button className="modal-close" onClick={() => setModalCierre(false)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '28px' }}>🔒</div>
                            <h3 style={{ margin: '0' }}>Cierre de Turno</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '13px' }}>
                                {getNombreEmpleado(turnoSeleccionado.empleadoId || turnoSeleccionado.receptionistId)} • ID: {turnoSeleccionado.id}
                            </p>
                        </div>
                        <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Base de Caja:</span>
                                <span style={{ fontWeight: 'bold', color: '#059669' }}>{COP(turnoSeleccionado.baseCaja || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span>Ventas del turno:</span>
                                <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{COP(turnoSeleccionado.totalVentas || 0)}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Monto declarado en caja ($) *</label>
                            <input type="text" inputMode="numeric" value={formatCurrencyInput(montoDeclarado)} onChange={e => setMontoDeclarado(e.target.value.replace(/[^0-9]/g, ''))} placeholder="¿Cuánto hay en caja?" autoFocus style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalCierre(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                            <Button variant="primary" onClick={cerrarTurno} disabled={loading}>{loading ? '⏳ Cerrando...' : '🔒 Confirmar Cierre'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {modalEmergencia && (
                <div className="modal-overlay" onClick={() => setModalEmergencia(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '95%', background: 'white', borderRadius: '12px', padding: '24px', border: '2px solid #dc2626' }}>
                        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                            <div style={{ fontSize: '40px' }}>🚨</div>
                            <h3 style={{ color: '#dc2626', margin: '8px 0' }}>Forzar Cierre de Turno</h3>
                            <p style={{ color: '#6b7280', fontSize: '13px' }}>Esto cerrará el turno actual sin verificar el monto en caja.<br /><strong>Usa esto solo si el turno está bloqueado.</strong></p>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #fecaca', fontSize: '13px' }}>
                            <p style={{ margin: 0 }}>⚠️ <strong>Advertencia:</strong> Esta acción es irreversible. El turno se cerrará con monto $0.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalEmergencia(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={forzarCierreTurno} disabled={loading} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '⏳ Cerrando...' : '🚨 Forzar Cierre'}</button>
                        </div>
                    </div>
                </div>
            )}

            {modalDetalle && (
                <div className="modal-overlay" onClick={() => setModalDetalle(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%', background: 'white', borderRadius: '12px', padding: '24px' }}>
                        <button className="modal-close" onClick={() => setModalDetalle(null)} style={{ float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '28px' }}>📋</div>
                            <h3 style={{ margin: '0' }}>Detalle del Turno</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '13px' }}>ID: {modalDetalle.id}</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Empleado</div><div style={{ fontWeight: '500' }}>{getNombreEmpleado(modalDetalle.empleadoId || modalDetalle.receptionistId)}</div></div>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Tipo</div><div style={{ fontWeight: '500' }}>{getTipoInfo(modalDetalle.tipo).icon} {getTipoInfo(modalDetalle.tipo).label}</div></div>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Fecha</div><div style={{ fontWeight: '500' }}>{formatDate(modalDetalle.fecha)}</div></div>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Horario</div><div style={{ fontWeight: '500' }}>{modalDetalle.horaInicio} - {modalDetalle.horaFin}</div></div>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Base Caja</div><div style={{ fontWeight: '500', color: '#059669' }}>{COP(modalDetalle.baseCaja || 0)}</div></div>
                            <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Estado</div><div style={{ fontWeight: '500', color: modalDetalle.cerrado ? '#6b7280' : '#10b981' }}>{modalDetalle.cerrado ? "🔒 Cerrado" : "🟢 Abierto"}</div></div>
                            {modalDetalle.cerrado && (
                                <>
                                    <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Declarado</div><div style={{ fontWeight: '500', color: '#059669' }}>{COP(modalDetalle.montoDeclarado)}</div></div>
                                    <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Diferencia</div><div style={{ fontWeight: '500', color: getDiferenciaColor(modalDetalle.diferencia) }}>{modalDetalle.diferencia > 0 ? "+" : ""}{COP(modalDetalle.diferencia)}</div></div>
                                    <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div><div style={{ fontWeight: '500', color: '#2563eb' }}>{COP(modalDetalle.totalVentas || 0)}</div></div>
                                    <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Cierre</div><div style={{ fontWeight: '500' }}>{formatDate(modalDetalle.closedAt)}</div></div>
                                </>
                            )}
                        </div>
                        {modalDetalle.observaciones && (
                            <div style={{ marginTop: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px', fontSize: '13px' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Observaciones</div>
                                <div>{modalDetalle.observaciones}</div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalDetalle(null)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
                            <Button variant="primary" size="small" onClick={() => { const detalle = modalDetalle; setModalDetalle(null); abrirEditarTurno(detalle); }}>✏️ Editar</Button>
                        </div>
                    </div>
                </div>
            )}

            {modalEliminar && (
                <div className="modal-overlay" onClick={() => setModalEliminar(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '95%', background: 'white', borderRadius: '12px', padding: '24px', border: '2px solid #dc2626' }}>
                        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                            <div style={{ fontSize: '40px' }}>⚠️</div>
                            <h3 style={{ color: '#dc2626', margin: '8px 0' }}>Confirmar Eliminación</h3>
                            <p style={{ color: '#6b7280', fontSize: '13px' }}>¿Estás seguro de eliminar el turno <strong>#{modalEliminar.id}</strong>?</p>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #fecaca', fontSize: '13px' }}>
                            <p style={{ margin: 0 }}>⚠️ <strong>Advertencia:</strong> Esta acción es irreversible.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalEliminar(null)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={eliminarTurno} disabled={loading} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{loading ? '⏳ Eliminando...' : '🗑️ Eliminar'}</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease-out; }
                .modal-card { max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease-out; }
                .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 4px 8px; border-radius: 4px; }
                .modal-close:hover { background: #f3f4f6; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}