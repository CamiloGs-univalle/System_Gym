// src/services/turnoService.js
// Bloque 4 - Turnos y arqueo ciego. Endpoints: /api/shifts

import api from './api';

export const turnoService = {
  /**
   * @param {object} datos - { tipo, baseCaja, receptionistId }
   */
  async abrir({ tipo, baseCaja, receptionistId }) {
    const payload = { type: tipo, cashBase: baseCaja, receptionistId };
    const { data } = await api.post('/shifts', payload);
    return data;
  },

  /**
   * @param {number|string} id - id del turno abierto
   * @param {number} montoIngresado - monto físico contado (arqueo ciego)
   */
  async cerrar(id, montoIngresado) {
    const { data } = await api.post(`/shifts/${id}/close`, {
      physicalAmount: montoIngresado,
    });
    return data;
  },

  async obtenerAbierto(receptionistId) {
    const { data } = await api.get(`/shifts/open/${receptionistId}`);
    return data;
  },

  async turnosHoy() {
    const { data } = await api.get('/shifts/today');
    return data;
  },
};

export default turnoService;
