// ============================================================
// ARCHIVO: src/pages/Turnos/TurnosPanel.jsx
// DESCRIPCIÓN: Panel de gestión de turnos para SUPER ADMIN
// FUNCIONALIDADES: CRUD completo + Forzar Cierre + Filtros + Estadísticas
// VERSIÓN: 3.0 - CORREGIDA (404 ya no se muestra como error)
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { COP, formatDate } from "../../utils/formatters";
import { turnoService } from "../../services/turnoService";
import { empleadosService } from "../../services/empleadosService";
import useAuthStore from "../../store/authStore";

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const hoy = new Date().toISOString().split("T")[0];

// ============================================================
// TIPOS DE TURNO
// ============================================================

const TIPOS_TURNO = {
    FULL_SHIFT: { label: "Turno Completo", icon: "🔄", color: "#3b82f6" },
    HALF_SHIFT: { label: "Medio Turno", icon: "🌓", color: "#8b5cf6" },
    HOURLY_SHIFT: { label: "Por Horas", icon: "⏰", color: "#f59e0b" },
};

const ESTADOS_TURNO = {
    OPEN: { label: "🟢 Abierto", color: "#10b981" },
    CLOSED: { label: "🔒 Cerrado", color: "#6b7280" },
    PENDING: { label: "⏳ Pendiente", color: "#f59e0b" },
};

// ============================================================
// MAPEO DE TURNOS
// ============================================================

const mapearTurno = (turno) => ({
    id: turno.id || turno.shiftId || Date.now(),
    empleadoId: turno.receptionistId || turno.employeeId || turno.empleadoId || 0,
    nombreEmpleado: turno.employeeName || turno.nombreEmpleado || '',
    tipo: turno.type || turno.tipo || turno.shiftType || 'FULL_SHIFT',
    fecha: turno.date || turno.fecha || turno.openedAt?.split('T')[0] || hoy,
    horaInicio: turno.startTime || turno.horaInicio || '06:00',
    horaFin: turno.endTime || turno.horaFin || '14:00',
    montoDeclarado: turno.declaredAmount || turno.montoDeclarado || 0,
    montoCalculado: turno.calculatedAmount || turno.montoCalculado || 0,
    diferencia: turno.difference || turno.diferencia || 0,
    cerrado: turno.closed || turno.cerrado || false,
    observaciones: turno.observations || turno.observaciones || turno.notes || '',
    openedAt: turno.openedAt || turno.createdAt || new Date().toISOString(),
    closedAt: turno.closedAt || turno.cerradoEn || null,
    receptionistId: turno.receptionistId || turno.empleadoId || 0,
    baseCaja: turno.cashBase || turno.baseCaja || turno.openingCashBalance || 0,
    esLocal: turno.esLocal || false,
    totalVentas: turno.totalSales || turno.totalVentas || 0,
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function TurnosPanel() {
    // ============================================================
    // 1. ESTADO DEL COMPONENTE
    // ============================================================

    // Datos principales
    const [turnos, setTurnos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);

    // UI y navegación
    const [seccion, setSeccion] = useState("hoy");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [mensajeExito, setMensajeExito] = useState("");
    const [mensajeInfo, setMensajeInfo] = useState("");

    // Filtros y búsqueda
    const [busqueda, setBusqueda] = useState("");
    const [filtroEmpleado, setFiltroEmpleado] = useState("todos");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // Modales
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalCierre, setModalCierre] = useState(false);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [modalEmergencia, setModalEmergencia] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);
    const [modalConfirmarEliminar, setModalConfirmarEliminar] = useState(null);

    // Turnos seleccionados
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [turnosSeleccionados, setTurnosSeleccionados] = useState([]);

    // Formularios
    const [formTurno, setFormTurno] = useState({
        empleadoId: "",
        tipo: "FULL_SHIFT",
        fecha: hoy,
        horaInicio: "06:00",
        horaFin: "14:00",
        baseCaja: 0,
        observaciones: "",
    });
    const [montoDeclarado, setMontoDeclarado] = useState("");
    const [loading, setLoading] = useState(false);

    const { usuario } = useAuthStore();

    // ============================================================
    // 2. EFECTOS Y CICLO DE VIDA
    // ============================================================

    useEffect(() => {
        cargarDatos();
        verificarTurnoActivo();
    }, []);

    /**
     * Carga los datos iniciales: empleados y turnos de hoy
     */
    const cargarDatos = async () => {
        setCargando(true);
        setError(null);

        try {
            const [empleadosData, turnosData] = await Promise.all([
                empleadosService.listar(),
                turnoService.turnosHoy()
            ]);

            setEmpleados(empleadosData);

            if (Array.isArray(turnosData) && turnosData.length > 0) {
                const turnosMapeados = turnosData.map(mapearTurno);
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

    /**
     * ✅ Verifica si hay un turno activo para el usuario actual
     * El 404 NO es un error, es que NO HAY TURNO ABIERTO
     */
    const verificarTurnoActivo = async () => {
        try {
            const usuarioId = usuario?.id || 1;
            
            // ✅ Esta función ya maneja el 404 internamente y retorna null
            const turnoAbierto = await turnoService.obtenerAbierto(usuarioId);

            if (turnoAbierto) {
                const turnoFormateado = mapearTurno(turnoAbierto);
                setTurnoActivo(turnoFormateado);
                localStorage.setItem('turno_activo', JSON.stringify(turnoFormateado));
                console.log("✅ Turno activo sincronizado:", turnoFormateado);
            } else {
                // ✅ Esto es NORMAL - no hay turno activo
                setTurnoActivo(null);
                localStorage.removeItem('turno_activo');
                console.log("ℹ️ No hay turno activo (comportamiento normal)");
                // ✅ NO se setea error - es un estado normal
            }

        } catch (error) {
            // ❌ Solo capturar errores REALES (que no sean 404)
            console.error("❌ Error verificando turno:", error);
            
            // ⚠️ Solo mostrar error si es algo diferente a "no hay turno"
            if (error.response?.status !== 404) {
                setError(`Error al verificar turno activo: ${error.message || 'Error desconocido'}`);
            }
            
            // Fallback a localStorage
            const localData = localStorage.getItem('turno_activo');
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    setTurnoActivo(parsed);
                } catch {
                    setTurnoActivo(null);
                }
            }
        }
    };

    // ============================================================
    // 3. FILTROS Y UTILIDADES
    // ============================================================

    const turnosFiltrados = useMemo(() => {
        let resultado = [...turnos];

        // Filtro por búsqueda
        if (busqueda.trim()) {
            const bus = busqueda.toLowerCase().trim();
            resultado = resultado.filter(t =>
                t.nombreEmpleado?.toLowerCase().includes(bus) ||
                String(t.id).includes(bus) ||
                t.tipo?.toLowerCase().includes(bus)
            );
        }

        // Filtro por empleado
        if (filtroEmpleado !== "todos") {
            resultado = resultado.filter(t =>
                t.empleadoId === parseInt(filtroEmpleado) ||
                t.receptionistId === parseInt(filtroEmpleado)
            );
        }

        // Filtro por tipo
        if (filtroTipo !== "todos") {
            resultado = resultado.filter(t => t.tipo === filtroTipo);
        }

        // Filtro por estado
        if (filtroEstado !== "todos") {
            const cerrado = filtroEstado === "closed";
            resultado = resultado.filter(t => t.cerrado === cerrado);
        }

        // Filtro por fecha
        if (fechaInicio) {
            resultado = resultado.filter(t => t.fecha >= fechaInicio);
        }
        if (fechaFin) {
            resultado = resultado.filter(t => t.fecha <= fechaFin);
        }

        return resultado;
    }, [turnos, busqueda, filtroEmpleado, filtroTipo, filtroEstado, fechaInicio, fechaFin]);

    const turnosHoy = useMemo(() => {
        return turnos.filter(t => t.fecha === hoy);
    }, [turnos]);

    const turnosHistorial = useMemo(() => {
        return [...turnos]
            .filter(t => t.fecha !== hoy)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }, [turnos]);

    /**
     * Estadísticas del panel
     */
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

    /**
     * Obtiene el nombre del empleado por ID
     */
    const getNombreEmpleado = useCallback((id) => {
        if (!id) return 'Sin empleado';
        const emp = empleados.find(e => e.id === id || e.userId === id);
        return emp?.nombre || emp?.fullName || `Empleado #${id}`;
    }, [empleados]);

    const getTipoLabel = (tipo) => {
        return TIPOS_TURNO[tipo]?.label || tipo || 'Sin tipo';
    };

    const getTipoIcon = (tipo) => {
        return TIPOS_TURNO[tipo]?.icon || '📋';
    };

    const getTipoColor = (tipo) => {
        return TIPOS_TURNO[tipo]?.color || '#6b7280';
    };

    const getDiferenciaColor = (dif) => {
        if (dif === 0) return "#059669";
        if (dif > 0) return "#2563eb";
        return "#dc2626";
    };

    const getEstadoLabel = (cerrado) => {
        return cerrado ? ESTADOS_TURNO.CLOSED.label : ESTADOS_TURNO.OPEN.label;
    };

    const getEstadoColor = (cerrado) => {
        return cerrado ? ESTADOS_TURNO.CLOSED.color : ESTADOS_TURNO.OPEN.color;
    };

    // ============================================================
    // 4. FUNCIÓN: LIMPIAR TURNOS FANTASMAS
    // ============================================================

    const limpiarTurnosFantasmas = () => {
        if (!confirm("⚠️ ¿Eliminar todos los turnos que no existen en el backend?")) return;

        const idsFrontend = turnos.map(t => t.id);
        if (idsFrontend.length === 0) {
            setError("ℹ️ No hay turnos para verificar");
            setTimeout(() => setError(null), 3000);
            return;
        }

        const eliminarFantasmas = async () => {
            setLoading(true);
            let eliminados = 0;

            for (const id of idsFrontend) {
                try {
                    await turnoService.obtenerPorId(id);
                } catch (error) {
                    if (error.response?.status === 404) {
                        console.log(`🗑️ Turno ${id} no existe en backend, eliminando...`);
                        setTurnos(prev => prev.filter(t => t.id !== id));
                        eliminados++;
                    }
                }
            }

            if (eliminados > 0) {
                setMensajeExito(`✅ ${eliminados} turnos fantasmas eliminados`);
                if (turnoActivo && !turnos.some(t => t.id === turnoActivo.id)) {
                    localStorage.removeItem('turno_activo');
                    setTurnoActivo(null);
                }
                await cargarDatos();
                setTimeout(() => setMensajeExito(""), 5000);
            } else {
                setError("ℹ️ No se encontraron turnos fantasmas");
                setTimeout(() => setError(null), 3000);
            }
            setLoading(false);
        };

        eliminarFantasmas();
    };

    // ============================================================
    // 5. FUNCIONES CRUD - CREAR TURNO
    // ============================================================

    const abrirModal = () => {
        setFormTurno({
            empleadoId: "",
            tipo: "FULL_SHIFT",
            fecha: hoy,
            horaInicio: "06:00",
            horaFin: "14:00",
            baseCaja: 0,
            observaciones: "",
        });
        setError(null);
        setModalAbierto(true);
    };

    const crearTurno = async () => {
        if (!formTurno.empleadoId) {
            setError("Selecciona un empleado");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                type: formTurno.tipo,
                cashBase: parseFloat(formTurno.baseCaja) || 0,
                receptionistId: parseInt(formTurno.empleadoId),
            };

            console.log("📤 Creando turno:", payload);

            const resultado = await turnoService.abrir(payload);
            console.log("✅ Turno creado:", resultado);

            const turnoData = resultado?.data || resultado || {};
            const nuevoTurno = mapearTurno(turnoData);
            setTurnos(prev => [nuevoTurno, ...prev]);

            localStorage.setItem('turno_activo', JSON.stringify({
                id: nuevoTurno.id,
                receptionistId: nuevoTurno.receptionistId,
                openingCashBalance: nuevoTurno.baseCaja,
                openedAt: nuevoTurno.openedAt,
                shiftType: nuevoTurno.tipo
            }));
            setTurnoActivo(nuevoTurno);

            setMensajeExito(`✅ Turno creado correctamente (ID: ${nuevoTurno.id})`);
            setModalAbierto(false);
            setTimeout(() => setMensajeExito(""), 5000);

        } catch (err) {
            console.error("❌ Error creando turno:", err);

            if (err.response?.status === 422 || err.mensajeUsuario?.includes('turno abierto')) {
                setError(err.mensajeUsuario || "⚠️ El empleado ya tiene un turno abierto");
                try {
                    const turnoAbierto = await turnoService.obtenerAbierto(parseInt(formTurno.empleadoId));
                    if (turnoAbierto) {
                        setTurnoActivo(mapearTurno(turnoAbierto));
                    }
                } catch (e) {
                    console.error("Error obteniendo turno abierto:", e);
                }
            } else {
                setError(err.mensajeUsuario || err.message || "Error al crear el turno");
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 6. FUNCIONES CRUD - EDITAR TURNO
    // ============================================================

    const abrirEditar = (turno) => {
        setTurnoSeleccionado(turno);
        setFormTurno({
            empleadoId: turno.empleadoId || turno.receptionistId || "",
            tipo: turno.tipo || "FULL_SHIFT",
            fecha: turno.fecha || hoy,
            horaInicio: turno.horaInicio || "06:00",
            horaFin: turno.horaFin || "14:00",
            baseCaja: turno.baseCaja || 0,
            observaciones: turno.observaciones || "",
        });
        setError(null);
        setModalEditar(true);
    };

    const guardarEdicion = async () => {
        if (!turnoSeleccionado) return;

        setLoading(true);
        setError(null);

        try {
            const datosActualizados = {
                name: formTurno.nombre || turnoSeleccionado.nombreEmpleado,
                type: formTurno.tipo,
                cashBase: parseFloat(formTurno.baseCaja) || 0,
                receptionistId: parseInt(formTurno.empleadoId),
                observations: formTurno.observaciones,
            };

            await turnoService.actualizarTurno(turnoSeleccionado.id, datosActualizados);

            setTurnos(prev => prev.map(t =>
                t.id === turnoSeleccionado.id ? { ...t, ...datosActualizados } : t
            ));

            setMensajeExito(`✅ Turno ${turnoSeleccionado.id} actualizado correctamente`);
            setModalEditar(false);
            setTimeout(() => setMensajeExito(""), 5000);

        } catch (err) {
            console.error("❌ Error editando turno:", err);
            setError(err.message || "Error al editar el turno");
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 7. FUNCIONES CRUD - CERRAR TURNO
    // ============================================================

    const abrirCierre = (turno) => {
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
            console.log(`🔒 Cerrando turno ${turnoSeleccionado.id} con $${declarado}`);

            const resultado = await turnoService.cerrar(turnoSeleccionado.id, declarado);
            console.log("✅ Turno cerrado:", resultado);

            const turnoData = resultado?.data || resultado || {};
            const turnoActualizado = mapearTurno({
                ...turnoSeleccionado,
                ...turnoData,
                cerrado: true,
                montoDeclarado: declarado,
                closedAt: new Date().toISOString(),
            });

            setTurnos(prev => prev.map(t =>
                t.id === turnoSeleccionado.id ? turnoActualizado : t
            ));

            localStorage.removeItem('turno_activo');
            setTurnoActivo(null);

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

    // ============================================================
    // 8. FUNCIONES CRUD - FORZAR CIERRE (EMERGENCIA)
    // ============================================================

    const abrirEmergencia = () => {
        setModalEmergencia(true);
        setError(null);
    };

    const forzarCierreTurno = async () => {
        if (!confirm("⚠️ ¿Seguro que quieres forzar el cierre del turno?\nEsto cerrará el turno sin verificar montos.")) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const usuarioId = usuario?.id || 1;
            const turnoAbierto = await turnoService.obtenerAbierto(usuarioId);

            if (!turnoAbierto) {
                setError("No se encontró un turno abierto para forzar el cierre");
                setLoading(false);
                return;
            }

            console.log("🔍 Turno abierto encontrado para forzar cierre:", turnoAbierto);

            await turnoService.cerrar(turnoAbierto.id, 0);

            localStorage.removeItem('turno_activo');
            setTurnoActivo(null);

            await cargarDatos();

            setMensajeExito(`✅ Turno ${turnoAbierto.id} cerrado forzosamente`);
            setModalEmergencia(false);
            setTimeout(() => setMensajeExito(""), 5000);

            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error("❌ Error forzando cierre:", error);
            setError(`Error al forzar cierre: ${error.mensajeUsuario || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 9. FUNCIONES CRUD - ELIMINAR TURNO
    // ============================================================

    const confirmarEliminar = (turno) => {
        setModalConfirmarEliminar(turno);
    };

    const eliminarTurno = async () => {
        if (!modalConfirmarEliminar) return;

        const turno = modalConfirmarEliminar;
        const turnoId = turno.id;
        const eraTurnoActivo = turnoActivo && turnoActivo.id === turnoId;

        setLoading(true);
        setError(null);

        try {
            console.log(`🗑️ Intentando eliminar turno ${turnoId}...`);

            const resultado = await turnoService.eliminar(turnoId);

            if (resultado?.alreadyDeleted) {
                console.log(`ℹ️ El turno ${turnoId} ya había sido eliminado del backend`);
                setError(`⚠️ El turno ${turnoId} ya no existía en el sistema. Limpiando...`);
            } else {
                console.log(`✅ Turno ${turnoId} eliminado correctamente`);
                setMensajeExito(`🗑️ Turno ${turnoId} eliminado correctamente`);
            }

            setTurnos(prev => prev.filter(t => t.id !== turnoId));

            if (eraTurnoActivo) {
                localStorage.removeItem('turno_activo');
                setTurnoActivo(null);
            }

            await cargarDatos();
            setModalConfirmarEliminar(null);

            setTimeout(() => {
                setMensajeExito("");
                setError(null);
            }, 5000);

        } catch (err) {
            console.error(`❌ Error eliminando turno ${turnoId}:`, err);
            setError(err.message || "Error al eliminar el turno");
            await cargarDatos();
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 10. FUNCIONES CRUD - VER DETALLE
    // ============================================================

    const verDetalle = (turno) => {
        setModalDetalle(turno);
    };

    // ============================================================
    // 11. FUNCIÓN: RESETEAR FILTROS
    // ============================================================

    const resetearFiltros = () => {
        setBusqueda("");
        setFiltroEmpleado("todos");
        setFiltroTipo("todos");
        setFiltroEstado("todos");
        setFechaInicio("");
        setFechaFin("");
    };

    // ============================================================
    // 12. RENDERIZADO DEL COMPONENTE
    // ============================================================

    if (cargando) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <p>Cargando turnos...</p>
            </div>
        );
    }

    return (
        <div className="turnos-container">
            {/* ==========================================================
                SECCIÓN: MENSAJES
                ========================================================== */}
            {mensajeExito && (
                <div style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #6ee7b7'
                }}>
                    <span>✅ {mensajeExito}</span>
                    <button onClick={() => setMensajeExito("")} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                </div>
            )}

            {mensajeInfo && (
                <div style={{
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #93c5fd'
                }}>
                    <span>ℹ️ {mensajeInfo}</span>
                    <button onClick={() => setMensajeInfo("")} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                </div>
            )}

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #fca5a5'
                }}>
                    <span>❌ {error}</span>
                    <div>
                        {error.includes('turno abierto') && (
                            <button
                                onClick={abrirEmergencia}
                                style={{
                                    marginRight: '8px',
                                    padding: '4px 12px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                🚨 Forzar Cierre
                            </button>
                        )}
                        <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                    </div>
                </div>
            )}

            {/* ==========================================================
                SECCIÓN: ESTADÍSTICAS
                ========================================================== */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Turnos</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.total}</div>
                </div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Abiertos</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{estadisticas.abiertos}</div>
                </div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Cerrados</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{estadisticas.cerrados}</div>
                </div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Ventas</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>{COP(estadisticas.totalVentas)}</div>
                </div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Diferencia Total</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: getDiferenciaColor(estadisticas.totalDiferencia) }}>
                        {estadisticas.totalDiferencia > 0 ? "+" : ""}{COP(estadisticas.totalDiferencia)}
                    </div>
                </div>
            </div>

            {/* ==========================================================
                SECCIÓN: TABS Y BOTONES
                ========================================================== */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                <button
                    onClick={() => setSeccion("hoy")}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: seccion === "hoy" ? '#3b82f6' : '#f3f4f6',
                        color: seccion === "hoy" ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    📅 Hoy ({turnosHoy.length})
                </button>

                <button
                    onClick={() => setSeccion("historial")}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: seccion === "historial" ? '#3b82f6' : '#f3f4f6',
                        color: seccion === "historial" ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    📋 Historial ({turnosHistorial.length})
                </button>

                <button
                    onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: mostrarFiltros ? '#3b82f6' : '#f3f4f6',
                        color: mostrarFiltros ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    🔍 Filtros {mostrarFiltros ? '▲' : '▼'}
                </button>

                <div style={{ flex: 1 }}></div>

                <Button
                    variant="primary"
                    onClick={abrirModal}
                    disabled={turnoActivo !== null || loading}
                >
                    {turnoActivo ? "🔵 Turno Activo" : "➕ Nuevo Turno"}
                </Button>

                <button
                    onClick={abrirEmergencia}
                    style={{
                        padding: '8px 16px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                    title="Forzar cierre de turno (emergencia)"
                >
                    🚨
                </button>

                <button
                    onClick={limpiarTurnosFantasmas}
                    style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                    title="Eliminar turnos que no existen en el backend"
                    disabled={loading}
                >
                    🧹
                </button>
            </div>

            {/* ==========================================================
                SECCIÓN: FILTROS
                ========================================================== */}
            {mostrarFiltros && (
                <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px'
                }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>🔍 Buscar</label>
                        <input
                            type="text"
                            placeholder="ID, empleado..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>👤 Empleado</label>
                        <select
                            value={filtroEmpleado}
                            onChange={(e) => setFiltroEmpleado(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="todos">Todos</option>
                            {empleados.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>📋 Tipo</label>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="todos">Todos</option>
                            {Object.entries(TIPOS_TURNO).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>📊 Estado</label>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="todos">Todos</option>
                            <option value="open">Abiertos</option>
                            <option value="closed">Cerrados</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>📅 Desde</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>📅 Hasta</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={resetearFiltros}
                            style={{
                                padding: '6px 16px',
                                background: '#f3f4f6',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            🔄 Limpiar
                        </button>
                    </div>
                </div>
            )}

            {/* ==========================================================
                SECCIÓN: BANNER DE TURNO ACTIVO
                ========================================================== */}
            {turnoActivo && seccion === "hoy" && (
                <div style={{
                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <span>🔵 <strong>Turno activo</strong> ID: {turnoActivo.id} - {getNombreEmpleado(turnoActivo.receptionistId)}</span>
                    <div>
                        <span style={{ fontSize: '12px', marginRight: '12px' }}>
                            Base: {COP(turnoActivo.openingCashBalance || 0)}
                        </span>
                        <button
                            onClick={() => abrirCierre(turnoActivo)}
                            style={{
                                padding: '4px 12px',
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🔒 Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* ==========================================================
                SECCIÓN: HOY
                ========================================================== */}
            {seccion === "hoy" && (
                <div>
                    {turnosHoy.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px' }}>
                            <span style={{ fontSize: '48px' }}>🕐</span>
                            <p style={{ margin: '16px 0' }}>No hay turnos registrados hoy</p>
                            <Button variant="primary" onClick={abrirModal}>➕ Crear turno</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                            {turnosHoy.map(turno => {
                                const nombre = getNombreEmpleado(turno.empleadoId || turno.receptionistId);
                                const activo = turnoActivo && turnoActivo.id === turno.id && !turno.cerrado;

                                return (
                                    <div key={turno.id} style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        border: turno.cerrado ? '1px solid #e5e7eb' : '1px solid #93c5fd',
                                        transition: 'all 0.2s'
                                    }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    background: turno.cerrado ? '#9ca3af' : '#8b5cf6',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {nombre?.charAt(0) || "?"}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{nombre}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>ID: {turno.id}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    background: turno.cerrado ? '#dcfce7' : activo ? '#dbeafe' : '#fef3c7',
                                                    color: turno.cerrado ? '#166534' : activo ? '#1e40af' : '#92400e'
                                                }}>
                                                    {turno.cerrado ? "✅ Cerrado" : activo ? "🔵 Activo" : "🟡 Abierto"}
                                                </span>
                                                {turno.cerrado && (
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        background: '#d1fae5',
                                                        color: '#065f46'
                                                    }}>
                                                        {formatDate(turno.closedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Datos */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Tipo</div>
                                                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>{getTipoIcon(turno.tipo)}</span>
                                                    {getTipoLabel(turno.tipo)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Horario</div>
                                                <div style={{ fontWeight: '500' }}>{turno.horaInicio} - {turno.horaFin}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Base</div>
                                                <div style={{ fontWeight: '500', color: '#059669' }}>{COP(turno.baseCaja || 0)}</div>
                                            </div>
                                            {turno.cerrado && (
                                                <>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Declarado</div>
                                                        <div style={{ fontWeight: '500', color: '#059669' }}>{COP(turno.montoDeclarado)}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Diferencia</div>
                                                        <div style={{ fontWeight: '500', color: getDiferenciaColor(turno.diferencia) }}>
                                                            {turno.diferencia > 0 ? "+" : ""}{COP(turno.diferencia)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div>
                                                        <div style={{ fontWeight: '500', color: '#2563eb' }}>{COP(turno.totalVentas || 0)}</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => verDetalle(turno)}
                                                style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1 }}
                                            >
                                                👁️ Detalle
                                            </button>
                                            <button
                                                onClick={() => abrirEditar(turno)}
                                                style={{ padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            {!turno.cerrado && (
                                                <>
                                                    <button
                                                        onClick={() => abrirCierre(turno)}
                                                        style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        🔒 Cerrar
                                                    </button>
                                                    <button
                                                        onClick={() => confirmarEliminar(turno)}
                                                        style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ==========================================================
                SECCIÓN: HISTORIAL (CON FILTROS)
                ========================================================== */}
            {seccion === "historial" && (
                <Card title="Historial de Turnos" icon="📋">
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        Mostrando {turnosFiltrados.length} de {turnos.length} turnos
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Fecha</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Empleado</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Base</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Declarado</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Diferencia</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Ventas</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Estado</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {turnosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                            No hay turnos que coincidan con los filtros
                                        </td>
                                    </tr>
                                ) : (
                                    turnosFiltrados.map(turno => (
                                        <tr key={turno.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '10px', fontWeight: '500' }}>#{turno.id}</td>
                                            <td style={{ padding: '10px' }}>{formatDate(turno.fecha)}</td>
                                            <td style={{ padding: '10px' }}>
                                                {getNombreEmpleado(turno.empleadoId || turno.receptionistId)}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    background: getTipoColor(turno.tipo) + '20',
                                                    color: getTipoColor(turno.tipo)
                                                }}>
                                                    {getTipoLabel(turno.tipo)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>{COP(turno.baseCaja || 0)}</td>
                                            <td style={{ padding: '10px', color: '#059669' }}>{COP(turno.montoDeclarado)}</td>
                                            <td style={{ padding: '10px', color: getDiferenciaColor(turno.diferencia) }}>
                                                {turno.diferencia > 0 ? "+" : ""}{COP(turno.diferencia)}
                                            </td>
                                            <td style={{ padding: '10px', color: '#2563eb' }}>{COP(turno.totalVentas || 0)}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    background: turno.cerrado ? '#dcfce7' : '#fef3c7',
                                                    color: turno.cerrado ? '#166534' : '#92400e'
                                                }}>
                                                    {turno.cerrado ? "✅ Cerrado" : "🟡 Abierto"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => verDetalle(turno)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                                    title="Ver detalle"
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => abrirEditar(turno)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => confirmarEliminar(turno)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ==========================================================
                MODAL: CREAR TURNO
                ========================================================== */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '550px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <button className="modal-close" onClick={() => setModalAbierto(false)} style={{
                            float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                        }}>✕</button>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '32px' }}>🕐</div>
                            <h3 style={{ margin: '0' }}>Nuevo Turno</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>Registra el inicio de un nuevo turno</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Empleado *</label>
                                <select
                                    value={formTurno.empleadoId}
                                    onChange={e => setFormTurno({ ...formTurno, empleadoId: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Seleccionar empleado</option>
                                    {empleados.filter(e => e.activo !== false).map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.nombre} — {e.cargo || 'Empleado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tipo de Turno</label>
                                <select
                                    value={formTurno.tipo}
                                    onChange={e => setFormTurno({ ...formTurno, tipo: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    {Object.entries(TIPOS_TURNO).map(([key, val]) => (
                                        <option key={key} value={key}>{val.icon} {val.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Base de Caja ($)</label>
                                <input
                                    type="number"
                                    value={formTurno.baseCaja}
                                    onChange={e => setFormTurno({ ...formTurno, baseCaja: e.target.value })}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    min="0"
                                    step="100"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Observaciones</label>
                                <textarea
                                    value={formTurno.observaciones}
                                    onChange={e => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                                    placeholder="Notas adicionales..."
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '60px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalAbierto(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <Button variant="primary" onClick={crearTurno} disabled={loading}>
                                {loading ? '⏳ Creando...' : '✅ Crear Turno'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
                MODAL: EDITAR TURNO
                ========================================================== */}
            {modalEditar && turnoSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalEditar(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '550px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <button className="modal-close" onClick={() => setModalEditar(false)} style={{
                            float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                        }}>✕</button>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '32px' }}>✏️</div>
                            <h3 style={{ margin: '0' }}>Editar Turno #{turnoSeleccionado.id}</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>Actualiza la información del turno</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Empleado *</label>
                                <select
                                    value={formTurno.empleadoId}
                                    onChange={e => setFormTurno({ ...formTurno, empleadoId: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="">Seleccionar empleado</option>
                                    {empleados.filter(e => e.activo !== false).map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.nombre} — {e.cargo || 'Empleado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tipo de Turno</label>
                                <select
                                    value={formTurno.tipo}
                                    onChange={e => setFormTurno({ ...formTurno, tipo: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    {Object.entries(TIPOS_TURNO).map(([key, val]) => (
                                        <option key={key} value={key}>{val.icon} {val.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Base de Caja ($)</label>
                                <input
                                    type="number"
                                    value={formTurno.baseCaja}
                                    onChange={e => setFormTurno({ ...formTurno, baseCaja: e.target.value })}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    min="0"
                                    step="100"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Observaciones</label>
                                <textarea
                                    value={formTurno.observaciones}
                                    onChange={e => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                                    placeholder="Notas adicionales..."
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '60px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalEditar(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <Button variant="primary" onClick={guardarEdicion} disabled={loading}>
                                {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
                MODAL: CERRAR TURNO
                ========================================================== */}
            {modalCierre && turnoSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalCierre(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '500px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px'
                    }}>
                        <button className="modal-close" onClick={() => setModalCierre(false)} style={{
                            float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                        }}>✕</button>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '32px' }}>🔒</div>
                            <h3 style={{ margin: '0' }}>Cierre de Turno</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
                                {getNombreEmpleado(turnoSeleccionado.empleadoId || turnoSeleccionado.receptionistId)} • ID: {turnoSeleccionado.id}
                            </p>
                        </div>

                        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
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
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Monto declarado en caja ($) *</label>
                            <input
                                type="number"
                                value={montoDeclarado}
                                onChange={e => setMontoDeclarado(e.target.value)}
                                placeholder="¿Cuánto hay en caja?"
                                autoFocus
                                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '18px' }}
                                min="0"
                                step="100"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalCierre(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <Button variant="primary" onClick={cerrarTurno} disabled={loading}>
                                {loading ? '⏳ Cerrando...' : '🔒 Confirmar Cierre'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
                MODAL: FORZAR CIERRE
                ========================================================== */}
            {modalEmergencia && (
                <div className="modal-overlay" onClick={() => setModalEmergencia(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '450px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        border: '2px solid #dc2626'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '48px' }}>🚨</div>
                            <h3 style={{ color: '#dc2626', margin: '8px 0' }}>Forzar Cierre de Turno</h3>
                            <p style={{ color: '#6b7280' }}>
                                Esto cerrará el turno actual sin verificar el monto en caja.
                                <br />
                                <strong>Usa esto solo si el turno está bloqueado.</strong>
                            </p>
                        </div>

                        <div style={{
                            background: '#fef2f2',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: '1px solid #fecaca'
                        }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>
                                ⚠️ <strong>Advertencia:</strong> Esta acción es irreversible.
                                El turno se cerrará con monto $0.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setModalEmergencia(false)}
                                style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={forzarCierreTurno}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading ? '⏳ Cerrando...' : '🚨 Forzar Cierre'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
                MODAL: CONFIRMAR ELIMINAR
                ========================================================== */}
            {modalConfirmarEliminar && (
                <div className="modal-overlay" onClick={() => setModalConfirmarEliminar(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '450px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        border: '2px solid #dc2626'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '48px' }}>⚠️</div>
                            <h3 style={{ color: '#dc2626', margin: '8px 0' }}>Confirmar Eliminación</h3>
                            <p style={{ color: '#6b7280' }}>
                                ¿Estás seguro de eliminar el turno <strong>#{modalConfirmarEliminar.id}</strong>?
                                <br />
                                {modalConfirmarEliminar.nombreEmpleado && (
                                    <span>Empleado: {modalConfirmarEliminar.nombreEmpleado}</span>
                                )}
                            </p>
                        </div>

                        <div style={{
                            background: '#fef2f2',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: '1px solid #fecaca'
                        }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>
                                ⚠️ <strong>Advertencia:</strong> Esta acción es irreversible.
                                El turno será eliminado permanentemente.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setModalConfirmarEliminar(null)}
                                style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={eliminarTurno}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================
                MODAL: DETALLE
                ========================================================== */}
            {modalDetalle && (
                <div className="modal-overlay" onClick={() => setModalDetalle(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                        maxWidth: '550px',
                        width: '95%',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '24px'
                    }}>
                        <button className="modal-close" onClick={() => setModalDetalle(null)} style={{
                            float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                        }}>✕</button>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '32px' }}>📋</div>
                            <h3 style={{ margin: '0' }}>Detalle del Turno</h3>
                            <p style={{ color: '#6b7280', margin: '4px 0 0' }}>ID: {modalDetalle.id}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Empleado</div>
                                <div style={{ fontWeight: '500' }}>{getNombreEmpleado(modalDetalle.empleadoId || modalDetalle.receptionistId)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Tipo</div>
                                <div style={{ fontWeight: '500' }}>{getTipoIcon(modalDetalle.tipo)} {getTipoLabel(modalDetalle.tipo)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Fecha</div>
                                <div style={{ fontWeight: '500' }}>{formatDate(modalDetalle.fecha)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Horario</div>
                                <div style={{ fontWeight: '500' }}>{modalDetalle.horaInicio} - {modalDetalle.horaFin}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Base Caja</div>
                                <div style={{ fontWeight: '500', color: '#059669' }}>{COP(modalDetalle.baseCaja || 0)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Estado</div>
                                <div style={{ fontWeight: '500', color: getEstadoColor(modalDetalle.cerrado) }}>
                                    {getEstadoLabel(modalDetalle.cerrado)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Apertura</div>
                                <div style={{ fontWeight: '500', fontSize: '13px' }}>{formatDate(modalDetalle.openedAt)}</div>
                            </div>
                            {modalDetalle.cerrado && (
                                <>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Cierre</div>
                                        <div style={{ fontWeight: '500', fontSize: '13px' }}>{formatDate(modalDetalle.closedAt)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Declarado</div>
                                        <div style={{ fontWeight: '500', color: '#059669' }}>{COP(modalDetalle.montoDeclarado)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Diferencia</div>
                                        <div style={{ fontWeight: '500', color: getDiferenciaColor(modalDetalle.diferencia) }}>
                                            {modalDetalle.diferencia > 0 ? "+" : ""}{COP(modalDetalle.diferencia)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Ventas</div>
                                        <div style={{ fontWeight: '500', color: '#2563eb' }}>{COP(modalDetalle.totalVentas || 0)}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {modalDetalle.observaciones && (
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Observaciones</div>
                                <div>{modalDetalle.observaciones}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalDetalle(null)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cerrar
                            </button>
                            <Button variant="primary" onClick={() => {
                                const detalle = modalDetalle;
                                setModalDetalle(null);
                                abrirEditar(detalle);
                            }}>
                                ✏️ Editar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}