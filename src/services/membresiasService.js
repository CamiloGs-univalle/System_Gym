// ============================================================
// ARCHIVO: src/services/membresiasService.js
// DESCRIPCIÓN: Servicio para gestionar membresías
// ============================================================

import api from './api';

export const membresiasService = {
    /**
     * Lista todas las membresías
     * GET /api/memberships
     */
    async listar() {
        try {
            const { data } = await api.get('/memberships');
            console.log('📥 Membresías obtenidas:', data);
            
            // Extraer datos de la respuesta
            let membresias = data;
            if (data?.data && Array.isArray(data.data)) {
                membresias = data.data;
            }
            if (data?.data?.data && Array.isArray(data.data.data)) {
                membresias = data.data.data;
            }
            
            return Array.isArray(membresias) ? membresias : [];
        } catch (error) {
            console.error('❌ Error listando membresías:', error);
            // Si falla, devolver membresías por defecto
            return [
                { id: 1, nombre: "30 días", tipo: "30 días", precio: 80000, duracion: 30 },
                { id: 2, nombre: "15 días", tipo: "15 días", precio: 50000, duracion: 15 },
                { id: 3, nombre: "Trimestral", tipo: "Trimestral", precio: 220000, duracion: 90 },
                { id: 4, nombre: "Semestral", tipo: "Semestral", precio: 400000, duracion: 180 },
                { id: 5, nombre: "Anual", tipo: "Anual", precio: 750000, duracion: 365 }
            ];
        }
    },

    /**
     * Obtiene una membresía por ID
     * GET /api/memberships/{id}
     */
    async obtenerPorId(id) {
        try {
            const { data } = await api.get(`/memberships/${id}`);
            console.log(`📥 Membresía ${id}:`, data);
            return data;
        } catch (error) {
            console.error(`❌ Error obteniendo membresía ${id}:`, error);
            throw error;
        }
    },

    /**
     * Crea una nueva membresía
     * POST /api/memberships
     */
    async crear(membresia) {
        try {
            const { data } = await api.post('/memberships', membresia);
            console.log('✅ Membresía creada:', data);
            return data;
        } catch (error) {
            console.error('❌ Error creando membresía:', error);
            throw error;
        }
    },

    /**
     * Actualiza una membresía existente
     * PUT /api/memberships/{id}
     */
    async actualizar(id, membresia) {
        try {
            const { data } = await api.put(`/memberships/${id}`, membresia);
            console.log(`✅ Membresía ${id} actualizada:`, data);
            return data;
        } catch (error) {
            console.error(`❌ Error actualizando membresía ${id}:`, error);
            throw error;
        }
    },

    /**
     * Elimina una membresía
     * DELETE /api/memberships/{id}
     */
    async eliminar(id) {
        try {
            const { data } = await api.delete(`/memberships/${id}`);
            console.log(`✅ Membresía ${id} eliminada:`, data);
            return data;
        } catch (error) {
            console.error(`❌ Error eliminando membresía ${id}:`, error);
            throw error;
        }
    }
};

export default membresiasService;