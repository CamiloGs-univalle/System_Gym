// ============================================================
// ARCHIVO: src/services/turnoService.js
// DESCRIPCIÓN: Servicio para gestionar turnos (CRUD completo)
// VERSIÓN: 3.2 - CORREGIDA DEFINITIVAMENTE ✅
// ============================================================

import api from './api';

export const turnoService = {
    /**
     * ==========================================================
     * 1. ABRIR UN NUEVO TURNO - CORREGIDO ✅
     * POST /api/shifts
     * ==========================================================
     */
    async abrir(payload) {
        try {
            console.log("📤 Enviando solicitud POST /shifts:", payload);

            // ✅ Verificar si el empleado ya tiene turno abierto
            // ⚠️ IMPORTANTE: obtenerAbierto() NUNCA debe lanzar error por 404
            const turnoAbierto = await this.obtenerAbierto(payload.receptionistId);
            
            if (turnoAbierto) {
                // ✅ Si hay turno abierto, lanzar error
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
            
            console.log("✅ No hay turno abierto, procediendo con la creación...");

            // Formatear payload para el backend
            const payloadFormateado = {
                type: payload.type || 'FULL_SHIFT',
                cashBase: parseFloat(payload.cashBase) || 0,
                receptionistId: parseInt(payload.receptionistId),
                shiftType: payload.type || 'FULL_SHIFT',
                openingCashBalance: parseFloat(payload.cashBase) || 0,
                employeeId: parseInt(payload.receptionistId),
                openedAt: new Date().toISOString(),
                status: 'OPEN'
            };

            console.log("📤 Payload formateado:", payloadFormateado);
            const response = await api.post('/shifts', payloadFormateado);
            console.log("📥 Respuesta POST /shifts:", response.data);
            return response.data;

        } catch (error) {
            console.error("❌ Error en POST /shifts:");
            console.error("  - Status:", error.response?.status);
            console.error("  - Data:", error.response?.data);

            // Mejorar mensaje de error para el usuario
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

    /**
     * ==========================================================
     * 2. ACTUALIZAR UN TURNO (EDITAR)
     * PUT /api/shifts/{id}
     * ==========================================================
     */
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
            };

            const response = await api.put(`/shifts/${id}`, payload);
            console.log(`📥 Respuesta actualizar turno ${id}:`, response.data);
            return response.data;

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

    /**
     * ==========================================================
     * 3. CERRAR UN TURNO
     * POST /api/shifts/{id}/close
     * ==========================================================
     */
    async cerrar(id, montoIngresado) {
        try {
            const payload = {
                physicalAmount: parseFloat(montoIngresado) || 0,
                declaredAmount: parseFloat(montoIngresado) || 0
            };

            console.log(`📤 Cerrando turno ${id} con monto:`, payload);
            const response = await api.post(`/shifts/${id}/close`, payload);
            console.log(`📥 Respuesta cierre turno ${id}:`, response.data);
            return response.data;

        } catch (error) {
            console.error(`❌ Error cerrando turno ${id}:`, error);
            console.error("Detalles del error:", error.response?.data);

            if (error.response?.status === 422 && error.response?.data?.errorCode === 'SHIFT_ALREADY_CLOSED') {
                error.mensajeUsuario = `⚠️ El turno ${id} ya está cerrado. No se puede cerrar de nuevo.`;
                error.alreadyClosed = true;
            } else if (error.response?.data?.violations) {
                const mensajes = error.response.data.violations.map(v =>
                    `${v.propertyPath || 'campo'}: ${v.message}`
                ).join(' | ');
                error.mensajeUsuario = `Error de validación: ${mensajes}`;
            } else if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else {
                error.mensajeUsuario = error.message || 'Error al cerrar turno';
            }
            throw error;
        }
    },

    /**
     * ==========================================================
     * 4. OBTENER TURNO ABIERTO - CORREGIDO DEFINITIVAMENTE ✅
     * GET /api/shifts/open/{receptionistId}
     * ==========================================================
     * @param {number} receptionistId - ID del recepcionista
     * @returns {Promise<Object|null>} - Turno abierto o null si no hay
     * 
     * 🔥 IMPORTANTE: NUNCA lanza error por 404, siempre retorna null
     * ==========================================================
     */
    async obtenerAbierto(receptionistId) {
        try {
            const response = await api.get(`/shifts/open/${receptionistId}`);
            console.log(`📥 Turno abierto para recepcionista ${receptionistId}:`, response.data);
            return response.data;
        } catch (error) {
            // ✅ El 404 NO es un error, es que NO HAY TURNO ABIERTO
            if (error.response?.status === 404) {
                console.log(`ℹ️ No hay turno abierto para el recepcionista ${receptionistId} (404 - ESTO ES NORMAL)`);
                return null; // ✅ RETORNAR NULL, NO LANZAR ERROR
            }
            // ❌ Otros errores SI se lanzan (ej: 500, 403, etc.)
            console.error(`❌ Error obteniendo turno abierto (status ${error.response?.status}):`, error);
            throw error;
        }
    },

    /**
     * ==========================================================
     * 5. OBTENER TURNOS DE HOY
     * GET /api/shifts/today
     * ==========================================================
     */
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

            console.log(`✅ Turnos obtenidos: ${data.length}`);
            return data;

        } catch (error) {
            console.error("❌ Error en turnosHoy:", error);
            console.error("Detalles del error:", error.response?.data);
            return [];
        }
    },

    /**
     * ==========================================================
     * 6. OBTENER TURNOS POR RANGO DE FECHAS
     * GET /api/shifts?startDate={fecha}&endDate={fecha}
     * ==========================================================
     */
    async obtenerPorRangoFechas(fechaInicio, fechaFin) {
        try {
            console.log(`📤 Obteniendo turnos desde ${fechaInicio} hasta ${fechaFin}...`);
            const params = {};
            if (fechaInicio) params.startDate = fechaInicio;
            if (fechaFin) params.endDate = fechaFin;

            const response = await api.get('/shifts', { params });
            console.log(`📥 Turnos en rango:`, response.data);

            let data = response.data;
            if (data && data.data && Array.isArray(data.data)) {
                data = data.data;
            }
            if (!Array.isArray(data)) {
                data = [];
            }

            console.log(`✅ Turnos en rango: ${data.length}`);
            return data;

        } catch (error) {
            console.error("❌ Error obteniendo turnos por rango:", error);
            return [];
        }
    },

    /**
     * ==========================================================
     * 7. LISTAR TODOS LOS TURNOS
     * GET /api/shifts
     * ==========================================================
     */
    async listarTodos(filtros = {}) {
        try {
            console.log("📤 Listando todos los turnos...");
            const response = await api.get('/shifts', { params: filtros });
            console.log("📥 Respuesta listar turnos:", response.data);

            let data = response.data;

            if (data && data.data && Array.isArray(data.data)) {
                data = data.data;
            }

            if (!Array.isArray(data)) {
                const possibleArrays = Object.values(data || {}).filter(v => Array.isArray(v));
                if (possibleArrays.length > 0) {
                    data = possibleArrays[0];
                } else {
                    data = [];
                }
            }

            return data;

        } catch (error) {
            console.error("❌ Error listando turnos:", error);
            return [];
        }
    },

    /**
     * ==========================================================
     * 8. OBTENER UN TURNO POR ID
     * GET /api/shifts/{id}
     * ==========================================================
     */
    async obtenerPorId(id) {
        try {
            const response = await api.get(`/shifts/${id}`);
            console.log(`📥 Turno ${id}:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`❌ Error obteniendo turno ${id}:`, error);
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    /**
     * ==========================================================
     * 9. ELIMINAR UN TURNO - CON MANEJO DE 404
     * DELETE /api/shifts/{id}
     * ==========================================================
     */
    async eliminar(id) {
        try {
            console.log(`📤 Eliminando turno ${id}...`);
            const response = await api.delete(`/shifts/${id}`);
            console.log(`✅ Turno ${id} eliminado`);
            return response.data;

        } catch (error) {
            console.error(`❌ Error eliminando turno ${id}:`, error);

            if (error.response?.status === 404) {
                console.log(`ℹ️ El turno ${id} ya no existe en el backend. Considerarlo como eliminado.`);
                return {
                    success: true,
                    message: `Turno ${id} ya no existe en el sistema`,
                    alreadyDeleted: true,
                    data: { id }
                };
            }

            if (error.response?.data?.message) {
                error.mensajeUsuario = error.response.data.message;
            } else {
                error.mensajeUsuario = error.message || 'Error al eliminar el turno';
            }
            throw error;
        }
    }
};

export default turnoService;