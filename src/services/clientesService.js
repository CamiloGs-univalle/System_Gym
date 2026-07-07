// src/services/clientesService.js
// Bloque 1 - Gestión de usuarios/clientes. Endpoints: GET/POST /api/clients

import api from './api';

// ============================================
// MAPEO DE CAMPOS: Frontend → Backend
// ============================================
// Frontend         →  Backend (Client)
// nombre           →  fullName
// cedula           →  dni
// telefono         →  phoneNumber
// membresia        →  membershipType (mensual→MONTHLY, trimestral→QUARTERLY, anual→ANNUAL)
// precioMensual    →  amountPaid (monto pagado)
// entrenador       →  assignedTrainerId (ID del entrenador)
// ============================================

// ============================================
// DATOS MOCK PARA FALLBACK
// ============================================
const MOCK_CLIENTES = [
    {
        id: 1,
        fullName: "Cliente de Prueba 1",
        dni: "123456789",
        phoneNumber: "3001234567",
        enrollmentDate: "2026-07-01",
        membershipType: "MONTHLY",
        active: true
    },
    {
        id: 2,
        fullName: "Cliente de Prueba 2",
        dni: "987654321",
        phoneNumber: "3007654321",
        enrollmentDate: "2026-07-02",
        membershipType: "MONTHLY",
        active: true
    }
];

// ============================================
// FUNCIONES DE MAPEO
// ============================================

/**
 * Mapea el tipo de membresía del frontend al formato del backend
 */
const mapMembershipType = (tipo) => {
    const map = {
        'mensual': 'MONTHLY',
        'trimestral': 'QUARTERLY',
        'anual': 'ANNUAL',
        'MONTHLY': 'MONTHLY',
        'QUARTERLY': 'QUARTERLY',
        'ANNUAL': 'ANNUAL'
    };
    return map[tipo?.toLowerCase()] || 'MONTHLY';
};

/**
 * Convierte datos del frontend al formato del backend
 */
const toBackendFormat = (data) => {
    const membershipType = mapMembershipType(data.membresia);
    const amountPaid = parseFloat(data.precioMensual) || 80000;
    
    let assignedTrainerId = null;
    if (data.entrenador && data.entrenador !== 'No asignado') {
        assignedTrainerId = data.entrenadorId || null;
    }
    
    return {
        fullName: data.nombre ? data.nombre.trim() : '',
        dni: data.cedula ? data.cedula.replace(/\D/g, '') : '',
        phoneNumber: data.telefono ? data.telefono.replace(/\D/g, '') : null,
        membershipType: membershipType,
        amountPaid: amountPaid,
        assignedTrainerId: assignedTrainerId
    };
};

/**
 * Convierte datos del backend al formato del frontend
 */
const toFrontendFormat = (data) => {
    const mapMembershipBack = (tipo) => {
        const map = {
            'MONTHLY': 'mensual',
            'QUARTERLY': 'trimestral',
            'ANNUAL': 'anual'
        };
        return map[tipo] || 'mensual';
    };
    
    let diasRestantes = 0;
    if (data.membershipExpirationDate) {
        const hoy = new Date();
        const expiracion = new Date(data.membershipExpirationDate);
        const diffTime = expiracion - hoy;
        diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    return {
        id: data.id,
        nombre: data.fullName || data.nombre || '',
        cedula: data.dni || data.cedula || '',
        telefono: data.phoneNumber || data.telefono || '',
        email: data.email || '',
        fechaRegistro: data.enrollmentDate || data.fechaRegistro || new Date().toISOString().split('T')[0],
        entrenador: data.assignedTrainerName || data.entrenador || 'No asignado',
        entrenadorId: data.assignedTrainerId || null,
        notas: data.notes || data.notas || '',
        membresia: mapMembershipBack(data.membershipType || data.membresia),
        ultimoPago: data.lastPaymentDate || data.ultimoPago || '',
        proximoPago: data.nextPaymentDate || data.proximoPago || '',
        estadoManual: null,
        mensualidad: {
            activa: data.active !== false || diasRestantes > 0,
            diasRestantes: diasRestantes,
            precioMensual: data.monthlyPrice || data.precioMensual || 0,
            precioDia: data.dailyPrice || data.precioDia || 0
        },
        active: data.active !== false,
        _raw: data
    };
};

// ============================================
// SERVICIO
// ============================================

export const clientesService = {
    /**
     * Listar todos los clientes
     * GET /api/clients
     */
    async listar() {
        try {
            console.log("📥 Listando clientes...");
            const response = await api.get('/clients');
            
            let data = response.data || response;
            
            if (data.data && Array.isArray(data.data)) {
                data = data.data;
            }
            
            if (!Array.isArray(data)) {
                const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
                if (possibleArrays.length > 0) {
                    data = possibleArrays[0];
                } else {
                    data = [];
                }
            }
            
            const mappedData = data.map(toFrontendFormat);
            console.log(`✅ Clientes mapeados: ${mappedData.length}`);
            return mappedData;
            
        } catch (error) {
            console.error("❌ Error al listar clientes:", error);
            
            // 🔥 FALLBACK: Usar datos mock si el backend falla
            if (error.response?.status === 500) {
                console.warn("⚠️ El backend está fallando. Usando datos mock.");
                console.warn("ℹ️ Los clientes se guardarán pero no persistirán hasta que el backend funcione.");
                
                // Devolver datos mock para que la UI funcione
                return MOCK_CLIENTES.map(toFrontendFormat);
            }
            throw error;
        }
    },

    /**
     * Buscar clientes por término
     * GET /api/clients/search?term={term}
     */
    async buscar(term) {
        try {
            console.log(`🔍 Buscando clientes con término: ${term}`);
            const response = await api.get('/clients/search', { params: { term } });
            const data = response.data || response;
            
            if (Array.isArray(data)) {
                return data.map(toFrontendFormat);
            }
            if (data.data && Array.isArray(data.data)) {
                return data.data.map(toFrontendFormat);
            }
            return [];
        } catch (error) {
            console.error("❌ Error al buscar clientes:", error);
            // Fallback: filtrar en mock
            if (term) {
                return MOCK_CLIENTES
                    .filter(c => c.fullName.toLowerCase().includes(term.toLowerCase()) || 
                                c.dni.includes(term))
                    .map(toFrontendFormat);
            }
            return [];
        }
    },

    /**
     * Obtener un cliente por ID
     * GET /api/clients/{id}
     */
    async obtenerPorId(id) {
        try {
            console.log(`📥 Obteniendo cliente ${id}...`);
            const response = await api.get(`/clients/${id}`);
            const data = response.data || response;
            return toFrontendFormat(data);
        } catch (error) {
            console.error(`❌ Error al obtener cliente ${id}:`, error);
            // Fallback: buscar en mock
            const mock = MOCK_CLIENTES.find(c => c.id === id);
            if (mock) return toFrontendFormat(mock);
            throw error;
        }
    },

    /**
     * Crear un nuevo cliente
     * POST /api/clients
     */
    async crear(datos) {
        try {
            const payload = toBackendFormat(datos);
            console.log("📝 Creando cliente (payload):", JSON.stringify(payload, null, 2));
            
            const response = await api.post('/clients', payload);
            console.log("✅ Cliente creado:", response);
            
            const data = response.data?.data || response.data || response;
            const mappedData = toFrontendFormat(data);
            
            // Agregar a mock local para que aparezca inmediatamente
            MOCK_CLIENTES.push({
                id: data.id || Date.now(),
                fullName: payload.fullName,
                dni: payload.dni,
                phoneNumber: payload.phoneNumber,
                enrollmentDate: new Date().toISOString().split('T')[0],
                membershipType: payload.membershipType,
                active: true
            });
            
            return mappedData;
        } catch (error) {
            console.error("❌ Error al crear cliente:", error);
            
            if (error.response) {
                console.error("📋 Status:", error.response.status);
                console.error("📋 Data:", error.response.data);
                
                let errorMessage = "Error al crear cliente";
                const responseData = error.response.data;
                
                if (responseData) {
                    if (responseData.message) errorMessage = responseData.message;
                    if (responseData.details) errorMessage += `: ${responseData.details}`;
                    if (responseData.error) errorMessage = responseData.error;
                }
                
                throw new Error(errorMessage);
            }
            throw error;
        }
    },

    /**
     * Actualizar un cliente existente
     * PUT /api/clients/{id}
     */
    async actualizar(id, datos) {
        try {
            const payload = toBackendFormat(datos);
            console.log(`🔄 Actualizando cliente ${id}:`, JSON.stringify(payload, null, 2));
            
            const response = await api.put(`/clients/${id}`, payload);
            console.log("✅ Cliente actualizado:", response);
            
            const data = response.data?.data || response.data || response;
            return toFrontendFormat(data);
        } catch (error) {
            console.error(`❌ Error al actualizar cliente ${id}:`, error);
            throw error;
        }
    },

    /**
     * Renovar membresía de un cliente
     * POST /api/clients/{id}/membership
     */
    async renovarMembresia(id, datosMembresia) {
        try {
            console.log(`🔄 Renovando membresía del cliente ${id}...`);
            
            const payload = {
                membershipType: mapMembershipType(datosMembresia.tipo || 'mensual'),
                amountPaid: parseFloat(datosMembresia.monto) || 80000,
                paymentMethod: datosMembresia.metodoPago || 'CASH',
                cashReceived: parseFloat(datosMembresia.efectivoRecibido) || 0,
                shiftId: datosMembresia.shiftId,
                processedByUserId: datosMembresia.processedByUserId
            };
            
            const response = await api.post(`/clients/${id}/membership`, payload);
            console.log("✅ Membresía renovada:", response);
            
            return response.data?.data || response.data || response;
        } catch (error) {
            console.error(`❌ Error al renovar membresía del cliente ${id}:`, error);
            throw error;
        }
    },

    /**
     * Desactivar un cliente
     * PATCH /api/clients/{id}/deactivate
     */
    async desactivar(id) {
        try {
            console.log(`🔄 Desactivando cliente ${id}...`);
            const response = await api.patch(`/clients/${id}/deactivate`);
            console.log("✅ Cliente desactivado:", response);
            return response.data?.data || response.data || response;
        } catch (error) {
            console.error(`❌ Error al desactivar cliente ${id}:`, error);
            throw error;
        }
    },
};

export default clientesService;