// src/services/empleadosService.js

import api from './api';

// ============================================
// MAPEO DE CAMPOS: Frontend → Backend
// ============================================
// Frontend (form)  →  Backend (Employee)
// nombre           →  fullName
// cargo            →  position
// salario          →  baseSalary
// frecuenciaPago   →  payrollCycle (QUINCENAL → BIWEEKLY, MENSUAL → MONTHLY)
// activo           →  active
// ============================================

/**
 * Convierte datos del frontend al formato del backend para Employee
 */
const toBackendFormat = (data) => {
    const payrollCycle = data.frecuenciaPago === 'QUINCENAL' ? 'BIWEEKLY' : 'MONTHLY';
    
    return {
        fullName: data.nombre ? data.nombre.trim() : '',
        position: data.cargo || 'Entrenador',
        baseSalary: parseFloat(data.salario) || 0,
        payrollCycle: payrollCycle,
        active: data.activo ? true : false,
    };
};

/**
 * Convierte datos del backend al formato del frontend
 */
const toFrontendFormat = (data) => {
    return {
        id: data.id,
        nombre: data.fullName || '',
        cedula: data.dni || data.cedula || `EMP-${data.id}`,
        celular: data.phoneNumber || data.celular || '',
        cargo: data.position || 'Entrenador',
        salario: data.baseSalary || 0,
        frecuenciaPago: data.payrollCycle === 'BIWEEKLY' ? 'QUINCENAL' : 
                        data.payrollCycle === 'MONTHLY' ? 'MENSUAL' : 'QUINCENAL',
        fechaIngreso: data.hireDate || data.fechaIngreso || new Date().toISOString().split('T')[0],
        ultimoPago: data.lastPaymentDate || '',
        proximoPago: data.nextPaymentDate || '',
        activo: data.active === true || data.active === 1,
        username: data.username || '',
        userId: data.userId || data.user_id || null,
    };
};

export const empleadosService = {
    /**
     * Listar todos los empleados
     * GET /api/employees
     */
    async listar() {
        try {
            console.log("📥 Listando empleados...");
            const response = await api.get('/employees');
            
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
            console.log(`✅ Empleados mapeados: ${mappedData.length}`);
            
            return mappedData;
        } catch (error) {
            console.error("❌ Error al listar empleados:", error);
            throw error;
        }
    },

    /**
     * Obtener un empleado por ID
     * GET /api/employees/{id}
     */
    async obtenerPorId(id) {
        try {
            console.log(`📥 Obteniendo empleado ${id}...`);
            const response = await api.get(`/employees/${id}`);
            const data = response.data || response;
            return toFrontendFormat(data);
        } catch (error) {
            console.error(`❌ Error al obtener empleado ${id}:`, error);
            throw error;
        }
    },

    /**
     * Crear un nuevo empleado
     * POST /api/employees
     * 
     * Si el empleado es Recepcionista, crea el usuario automáticamente en /api/users
     */
    async crear(datos) {
        try {
            console.log("=================================");
            console.log("📝 CREANDO EMPLEADO");
            console.log("=================================");
            console.log("📦 Datos recibidos:", datos);
            
            let userId = null;
            
            // ============================================
            // 1. CREAR USUARIO (SOLO PARA RECEPCIONISTAS)
            // ============================================
            if (datos.cargo === "Recepcionista" && datos.username && datos.password) {
                console.log("👤 Creando usuario para recepcionista:", datos.username);
                
                try {
                    const userPayload = {
                        fullName: datos.nombre,
                        username: datos.username,
                        password: datos.password,
                        role: "RECEPTIONIST",
                        active: true
                    };
                    
                    console.log("📤 Enviando usuario al backend:", userPayload);
                    
                    const userResponse = await api.post('/users', userPayload);
                    console.log("✅ Usuario creado:", userResponse.data);
                    
                    // Extraer el ID del usuario
                    const userData = userResponse.data?.data || userResponse.data || userResponse;
                    userId = userData.id;
                    
                    console.log("📌 User ID obtenido:", userId);
                    
                } catch (userError) {
                    console.error("❌ Error al crear usuario:", userError);
                    
                    if (userError.response) {
                        const status = userError.response.status;
                        const data = userError.response.data;
                        
                        if (status === 409 || data?.code === "DUPLICATE_USERNAME") {
                            throw new Error(`❌ El usuario "${datos.username}" ya existe. Por favor, usa otro nombre de usuario.`);
                        }
                        
                        if (status === 403) {
                            throw new Error("❌ No tienes permisos para crear usuarios. Solo los Administradores pueden hacer esto.");
                        }
                        
                        throw new Error(data?.message || "Error al crear el usuario");
                    }
                    throw userError;
                }
            }
            
            // ============================================
            // 2. CREAR EL EMPLEADO
            // ============================================
            const payload = toBackendFormat(datos);
            
            // Si tenemos userId, lo agregamos al payload
            if (userId) {
                payload.userId = userId;
            }
            
            console.log("📤 Creando empleado con payload:", JSON.stringify(payload, null, 2));
            
            const response = await api.post('/employees', payload);
            console.log("✅ Empleado creado:", response.data);
            
            const data = response.data?.data || response.data || response;
            const empleadoMapeado = toFrontendFormat(data);
            
            // Si es recepcionista, agregar el username al resultado
            if (datos.cargo === "Recepcionista") {
                empleadoMapeado.username = datos.username;
                empleadoMapeado.userId = userId;
            }
            
            console.log("=================================");
            console.log("✅ EMPLEADO CREADO EXITOSAMENTE");
            console.log("=================================");
            console.log("ID:", empleadoMapeado.id);
            console.log("Nombre:", empleadoMapeado.nombre);
            console.log("Cargo:", empleadoMapeado.cargo);
            if (empleadoMapeado.username) {
                console.log("👤 Usuario:", empleadoMapeado.username);
                console.log("🔑 Contraseña:", datos.password);
            }
            
            return empleadoMapeado;
            
        } catch (error) {
            console.error("=================================");
            console.error("❌ ERROR AL CREAR EMPLEADO");
            console.error("=================================");
            console.error(error);
            
            // Si el error es del backend
            if (error.response) {
                console.error("📋 Status:", error.response.status);
                console.error("📋 Data:", error.response.data);
                
                let errorMessage = "Error al crear empleado";
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
     * Actualizar un empleado existente
     * PUT /api/employees/{id}
     */
    async actualizar(id, datos) {
        try {
            const payload = toBackendFormat(datos);
            console.log(`🔄 Actualizando empleado ${id}:`, JSON.stringify(payload, null, 2));
            
            const response = await api.put(`/employees/${id}`, payload);
            console.log("✅ Empleado actualizado:", response);
            
            const data = response.data?.data || response.data || response;
            return toFrontendFormat(data);
        } catch (error) {
            console.error(`❌ Error al actualizar empleado ${id}:`, error);
            throw error;
        }
    },

    /**
     * Cambiar estado de un empleado (activo/inactivo)
     * PATCH /api/employees/{id}/status
     */
    async cambiarEstado(id, active) {
        try {
            console.log(`🔄 Cambiando estado de empleado ${id} a ${active}`);
            
            const response = await api.patch(`/employees/${id}/status`, null, {
                params: { active: active },
            });
            
            console.log("✅ Estado cambiado:", response);
            const data = response.data?.data || response.data || response;
            return data;
        } catch (error) {
            console.error(`❌ Error al cambiar estado de empleado ${id}:`, error);
            throw error;
        }
    },

    /**
     * Obtener proyección de nómina
     * GET /api/employees/payroll/projection
     */
    async proyeccionNomina() {
        try {
            const response = await api.get('/employees/payroll/projection');
            return response.data?.data || response.data || response;
        } catch (error) {
            console.error("❌ Error al obtener proyección de nómina:", error);
            throw error;
        }
    },
};

export default empleadosService;