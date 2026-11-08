/**
 * ============================================================
 * ARCHIVO: src/services/turnoService.js
 * VERSIÓN: 3.5 - CORREGIDA ✅
 * ============================================================
 */

import api from './api';
import { formatHora } from '../utils/formatters';

// ============================================================
// HORARIOS CONFIGURADOS POR EL ADMIN (gym_configuracion)
// ============================================================

const HORARIOS_DEFAULT = {
    FULL_SHIFT: { horaInicio: "06:00", horaFin: "14:00" },
    HALF_SHIFT: { horaInicio: "06:00", horaFin: "10:00" },
    HOURLY_SHIFT: { horaInicio: "14:00", horaFin: "22:00" },
};

/**
 * Obtiene los horarios por tipo de turno desde la configuración
 * que el admin guardó en gym_configuracion. Si no existe,
 * usa valores por defecto.
 */
export const obtenerHorariosConfigurados = () => {
    try {
        const cfg = JSON.parse(localStorage.getItem('gym_configuracion') || '{}');
        const turnos = cfg?.turnos || {};
        return {
            FULL_SHIFT: {
                horaInicio: turnos.turnoCompleto?.horaInicio || HORARIOS_DEFAULT.FULL_SHIFT.horaInicio,
                horaFin: turnos.turnoCompleto?.horaFin || HORARIOS_DEFAULT.FULL_SHIFT.horaFin,
            },
            HALF_SHIFT: {
                horaInicio: turnos.medioTurno?.horaInicio || HORARIOS_DEFAULT.HALF_SHIFT.horaInicio,
                horaFin: turnos.medioTurno?.horaFin || HORARIOS_DEFAULT.HALF_SHIFT.horaFin,
            },
            HOURLY_SHIFT: {
                horaInicio: turnos.turnoTarde?.horaInicio || HORARIOS_DEFAULT.HOURLY_SHIFT.horaInicio,
                horaFin: turnos.turnoTarde?.horaFin || HORARIOS_DEFAULT.HOURLY_SHIFT.horaFin,
            },
        };
    } catch (e) {
        console.warn('⚠️ No se pudo leer gym_configuracion:', e);
        return HORARIOS_DEFAULT;
    }
};

// ============================================================
// MAPEO DE ESTADOS
// ============================================================

const ESTADOS_CERRADOS = ['CLOSED', 'CLOSED_SUCCESSFUL', 'CLOSED_WITH_SHORTAGE', 'CLOSED_WITH_SURPLUS'];

const mapearEstado = (estado) => {
    if (!estado) return { cerrado: false, status: 'OPEN' };
    
    const cerrado = ESTADOS_CERRADOS.includes(estado);
    return {
        cerrado: cerrado,
        status: estado,
        label: cerrado ? '🔒 Cerrado' : '🟢 Abierto'
    };
};

/**
 * Mapea un turno del backend al formato del frontend
 */
const mapearTurno = (turno) => {
    if (!turno) return null;
    
    const estado = mapearEstado(turno.status);
    
    return {
        id: turno.id || turno.shiftId || Date.now(),
        empleadoId: turno.receptionistId || turno.employeeId || turno.empleadoId || 0,
        nombreEmpleado: turno.employeeName || turno.nombreEmpleado || '',
        tipo: turno.type || turno.tipo || turno.shiftType || 'FULL_SHIFT',
        fecha: turno.scheduledDate || turno.date || turno.fecha || turno.openedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        horaInicio: formatHora(turno.startTime) || formatHora(turno.horaInicio) || '06:00',
        horaFin: formatHora(turno.endTime) || formatHora(turno.horaFin) || '14:00',
        montoDeclarado: turno.declaredAmount || turno.montoDeclarado || 0,
        montoCalculado: turno.calculatedAmount || turno.montoCalculado || 0,
        diferencia: turno.difference || turno.diferencia || 0,
        // ✅ Estado corregido
        cerrado: estado.cerrado,
        status: estado.status,
        estadoLabel: estado.label,
        observaciones: turno.observations || turno.observaciones || turno.notes || '',
        openedAt: turno.openedAt || turno.createdAt || new Date().toISOString(),
        closedAt: turno.closedAt || turno.cerradoEn || null,
        receptionistId: turno.receptionistId || turno.empleadoId || 0,
        baseCaja: turno.cashBase || turno.baseCaja || turno.openingCashBalance || 0,
        esLocal: turno.esLocal || false,
        totalVentas: turno.totalSales || turno.totalVentas || 0,
        physicalCashCounted: turno.physicalCashCounted || turno.physicalCash || 0,
        cashDifference: turno.cashDifference || turno.diferencia || 0,
        closingNotes: turno.closingNotes || '',
    };
};

// ============================================================
// SERVICIO PRINCIPAL
// ============================================================

export const turnoService = {
    async abrir(payload) {
        try {
            console.log("📤 Enviando solicitud POST /shifts:", payload);

            const turnoAbierto = await this.obtenerAbierto(payload.receptionistId);
            
            if (turnoAbierto) {
                const error = new Error('El recepcionista ya tiene un turno abierto');
                error.response = {
                    status: 422,
                    data: {
                        message: `El recepcionista ya tiene un turno abierto (ID: ${turnoAbierto.id})`,
                        turnoAbierto: turnoAbierto
                    }
                };
                error.mensajeUsuario = `⚠️ El recepcionista ya tiene un turno abierto (ID: ${turnoAbierto.id}). Debe cerrarlo antes de abrir uno nuevo.`;
                throw error;
            }

            const payloadFormateado = {
                type: payload.type || 'FULL_SHIFT',
                cashBase: parseFloat(payload.cashBase) || 0,
                receptionistId: parseInt(payload.receptionistId),
                shiftType: payload.type || 'FULL_SHIFT',
                openingCashBalance: parseFloat(payload.cashBase) || 0,
                employeeId: parseInt(payload.receptionistId),
                openedAt: new Date().toISOString(),
                status: 'OPEN',
                scheduledDate: payload.scheduledDate || payload.date || null,
                startTime: payload.startTime || payload.horaInicio || null,
                endTime: payload.endTime || payload.horaFin || null,
                observations: payload.observations || payload.observaciones || '',
            };

            console.log("📤 Payload formateado:", payloadFormateado);
            const response = await api.post('/shifts', payloadFormateado);
            console.log("📥 Respuesta POST /shifts:", response.data);
            
            const data = response.data?.data || response.data;
            return mapearTurno(data);

        } catch (error) {
            console.error("❌ Error en POST /shifts:", error);
            if (error.response?.data?.violations) {
                const mensajes = error.response.data.violations.map(v =>
                    `${v.propertyPath || 'campo'}: ${v.message}`
                ).join(' | ');
                error.mensajeUsuario = `Error de validación: ${mensajes}`;
            } else if (error.response?.data?.title) {
                error.mensajeUsuario = `${error.response.data.title}: ${error.response.data.detail || ''}`;
            } else if (!error.mensajeUsuario) {
                error.mensajeUsuario = error.message || 'Error al abrir turno';
            }
            throw error;
        }
    },

    async actualizarTurno(id, datos) {
        try {
            console.log(`📤 Actualizando turno ${id}:`, datos);

            const payload = {
                type: datos.type || 'FULL_SHIFT',
                cashBase: parseFloat(datos.cashBase) || 0,
                receptionistId: parseInt(datos.receptionistId) || 0,
                observations: datos.observations || datos.observaciones || '',
                shiftType: datos.type || 'FULL_SHIFT',
                openingCashBalance: parseFloat(datos.cashBase) || 0,
                employeeId: parseInt(datos.receptionistId) || 0,
                scheduledDate: datos.scheduledDate || datos.date || null,
                startTime: datos.startTime || datos.horaInicio || null,
                endTime: datos.endTime || datos.horaFin || null,
            };

            const response = await api.put(`/shifts/${id}`, payload);
            console.log(`📥 Respuesta actualizar turno ${id}:`, response.data);
            
            const data = response.data?.data || response.data;
            return mapearTurno(data);

        } catch (error) {
            console.error(`❌ Error actualizando turno ${id}:`, error);
            if (error.response?.status === 404) {
                throw new Error(`Turno ${id} no encontrado. No se puede actualizar.`);
            }
            if (error.response?.data?.violations) {
                const mensajes = error.response.data.violations.map(v =>
                    `${v.propertyPath || 'campo'}: ${v.message}`
                ).join(' | ');
                error.mensajeUsuario = `Error de validación: ${mensajes}`;
            } else if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else {
                error.mensajeUsuario = error.message || 'Error al actualizar turno';
            }
            throw error;
        }
    },

    async cerrar(id, montoIngresado) {
        try {
            const payload = {
                physicalCash: parseFloat(montoIngresado) || 0,
                closingNotes: ''
            };

            console.log(`📤 Cerrando turno ${id} con monto:`, payload);
            const response = await api.post(`/shifts/${id}/close`, payload);
            console.log(`📥 Respuesta cierre turno ${id}:`, response.data);
            
            const data = response.data?.data || response.data;
            const turno = mapearTurno(data?.shift || data);
            return { ...turno, veredicto: response.data?.message || data?.verdict || null };

        } catch (error) {
            console.error(`❌ Error cerrando turno ${id}:`, error);
            
            if (error.status === 409 ||
                error.errorCode === 'SHIFT_ALREADY_CLOSED' ||
                error.response?.status === 409 || 
                error.response?.data?.errorCode === 'SHIFT_ALREADY_CLOSED' ||
                error.response?.data?.message?.includes('ya está cerrado')) {
                error.mensajeUsuario = `⚠️ El turno ${id} ya está cerrado.`;
                error.alreadyClosed = true;
            } else if (error.response?.data?.violations) {
                const mensajes = error.response.data.violations.map(v =>
                    `${v.propertyPath || 'campo'}: ${v.message}`
                ).join(' | ');
                error.mensajeUsuario = `Error de validación: ${mensajes}`;
            } else if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else {
                error.mensajeUsuario = error.mensajeUsuario || error.message || 'Error al cerrar turno';
            }
            throw error;
        }
    },

    async reprogramar(id, nuevaFecha) {
        try {
            console.log(`📤 Reprogramando turno ${id} a la fecha ${nuevaFecha}...`);
            const response = await api.put(`/shifts/${id}/reprogram`, { newDate: nuevaFecha });
            console.log(`📥 Respuesta reprogramar turno ${id}:`, response.data);

            const data = response.data?.data || response.data;
            return mapearTurno(data);

        } catch (error) {
            console.error(`❌ Error reprogramando turno ${id}:`, error);
            if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else {
                error.mensajeUsuario = error.message || 'Error al reprogramar el turno';
            }
            throw error;
        }
    },

    async obtenerAbierto(receptionistId) {
        try {
            const response = await api.get(`/shifts/open/${receptionistId}`);
            console.log(`📥 Turno abierto para recepcionista ${receptionistId}:`, response.data);
            
            const data = response.data?.data || response.data;
            return mapearTurno(data);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`ℹ️ No hay turno abierto para el recepcionista ${receptionistId} (404 - ESTO ES NORMAL)`);
                return null;
            }
            console.error(`❌ Error obteniendo turno abierto (status ${error.response?.status}):`, error);
            throw error;
        }
    },

    async turnosHoy() {
        try {
            console.log("📤 Obteniendo turnos de hoy...");
            const response = await api.get('/shifts/today');
            console.log("📥 Respuesta de turnosHoy:", response.data);

            let data = response.data;

            if (data && data.data && Array.isArray(data.data)) {
                data = data.data;
            }

            if (data && data.shifts && Array.isArray(data.shifts)) {
                data = data.shifts;
            }

            if (data && !Array.isArray(data)) {
                const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
                if (possibleArrays.length > 0) {
                    data = possibleArrays[0];
                } else {
                    data = [];
                }
            }

            if (!data) {
                data = [];
            }

            const turnosMapeados = data.map(mapearTurno).filter(t => t !== null);
            console.log(`✅ Turnos obtenidos: ${turnosMapeados.length}`);
            return turnosMapeados;

        } catch (error) {
            console.error("❌ Error en turnosHoy:", error);
            return [];
        }
    },

    async obtenerPorRangoFechas(fechaInicio, fechaFin, status = null, receptionistId = null) {
        try {
            console.log(`📤 Obteniendo turnos desde ${fechaInicio} hasta ${fechaFin}...`);
            const params = {};
            if (fechaInicio) params.startDate = fechaInicio;
            if (fechaFin) params.endDate = fechaFin;
            if (status) params.status = status;
            if (receptionistId) params.receptionistId = receptionistId;

            const response = await api.get('/shifts', { params });
            console.log(`📥 Turnos en rango:`, response.data);

            let data = response.data;
            
            if (data && data.data) {
                if (Array.isArray(data.data)) {
                    data = data.data;
                } else if (data.data.data && Array.isArray(data.data.data)) {
                    data = data.data.data;
                }
            }
            
            if (!Array.isArray(data)) {
                data = [];
            }

            const turnosMapeados = data.map(mapearTurno).filter(t => t !== null);
            console.log(`✅ Turnos en rango: ${turnosMapeados.length}`);
            return turnosMapeados;

        } catch (error) {
            console.error("❌ Error obteniendo turnos por rango:", error);
            return [];
        }
    },

    async listarTodos(filtros = {}) {
        try {
            console.log("📤 Listando todos los turnos...");
            
            // ✅ Usar el nuevo endpoint /shifts con parámetros
            const params = {};
            if (filtros.startDate) params.startDate = filtros.startDate;
            if (filtros.endDate) params.endDate = filtros.endDate;
            if (filtros.status) params.status = filtros.status;
            if (filtros.receptionistId) params.receptionistId = filtros.receptionistId;

            const response = await api.get('/shifts', { params });
            console.log("📥 Respuesta listar turnos:", response.data);

            let data = response.data;
            
            if (data && data.data) {
                if (Array.isArray(data.data)) {
                    data = data.data;
                } else if (data.data.data && Array.isArray(data.data.data)) {
                    data = data.data.data;
                }
            }
            
            if (!Array.isArray(data)) {
                data = [];
            }

            const turnosMapeados = data.map(mapearTurno).filter(t => t !== null);
            console.log(`✅ Turnos listados: ${turnosMapeados.length}`);
            return turnosMapeados;

        } catch (error) {
            console.error("❌ Error listando turnos:", error);
            
            // ✅ Fallback a /shifts/today si el endpoint no existe
            if (error.response?.status === 404 || error.response?.status === 405) {
                console.log("ℹ️ /shifts no disponible, usando /shifts/today como fallback");
                return await this.turnosHoy();
            }
            
            return [];
        }
    },

    async obtenerPorId(id) {
        try {
            const response = await api.get(`/shifts/${id}`);
            console.log(`📥 Turno ${id}:`, response.data);
            
            const data = response.data?.data || response.data;
            return mapearTurno(data);
        } catch (error) {
            console.error(`❌ Error obteniendo turno ${id}:`, error);
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    async eliminar(id) {
        try {
            console.log(`📤 Eliminando turno ${id}...`);
            const response = await api.delete(`/shifts/${id}`);
            console.log(`✅ Turno ${id} eliminado`);
            return response.data;

        } catch (error) {
            console.error(`❌ Error eliminando turno ${id}:`, error);
            
            if (error.response?.status === 404) {
                console.log(`ℹ️ El turno ${id} ya no existe en el backend.`);
                return {
                    success: true,
                    message: `Turno ${id} ya no existe en el sistema`,
                    alreadyDeleted: true,
                    data: { id }
                };
            }
            
            if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else if (error.response?.status === 400) {
                error.mensajeUsuario = 'No se puede eliminar un turno abierto. Debe cerrarlo primero.';
            } else {
                error.mensajeUsuario = error.message || 'Error al eliminar el turno';
            }
            throw error;
        }
    }
};

export default turnoService;