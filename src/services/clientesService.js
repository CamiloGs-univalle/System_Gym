// src/services/clientesService.js
// Bloque 1 - Gestión de usuarios/clientes. Endpoints: GET/POST /api/clients

import api from './api';

export const clientesService = {
  async listar() {
    const { data } = await api.get('/clients');
    return data;
  },

  async buscar(term) {
    const { data } = await api.get('/clients/search', { params: { term } });
    return data;
  },

  async obtenerPorId(id) {
    const { data } = await api.get(`/clients/${id}`);
    return data;
  },

  /**
   * @param {object} datos - { nombre, cedula, telefono, tipo, entrenadorId, ... }
   */
  async crear(datos) {
    const { data } = await api.post('/clients', datos);
    return data;
  },

  /**
   * Renueva o crea la membresía de un cliente.
   * @param {number|string} id
   * @param {object} datosMembresia - { fechaPago, diasPlan, ... }
   */
  async renovarMembresia(id, datosMembresia) {
    const { data } = await api.post(`/clients/${id}/membership`, datosMembresia);
    return data;
  },
};

export default clientesService;
