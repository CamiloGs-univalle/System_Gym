// src/services/empleadosService.js
// Endpoints: /api/employees

import api from './api';

export const empleadosService = {
  async listar() {
    const { data } = await api.get('/employees');
    return data;
  },

  async obtenerPorId(id) {
    const { data } = await api.get(`/employees/${id}`);
    return data;
  },

  async crear(datos) {
    const { data } = await api.post('/employees', datos);
    return data;
  },

  async actualizar(id, datos) {
    const { data } = await api.put(`/employees/${id}`, datos);
    return data;
  },

  async cambiarEstado(id, active) {
    const { data } = await api.patch(`/employees/${id}/status`, null, {
      params: { active },
    });
    return data;
  },

  async proyeccionNomina() {
    const { data } = await api.get('/employees/payroll/projection');
    return data;
  },
};

export default empleadosService;
