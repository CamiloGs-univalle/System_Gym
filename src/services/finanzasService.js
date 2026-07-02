// src/services/finanzasService.js
// Endpoints: /api/finance/report, /api/reports/summary

import api from './api';

export const finanzasService = {
  async reporte(startDate, endDate) {
    const { data } = await api.get('/finance/report', { params: { startDate, endDate } });
    return data;
  },

  async reporteHoy() {
    const { data } = await api.get('/finance/report/today');
    return data;
  },

  async reporteMes() {
    const { data } = await api.get('/finance/report/month');
    return data;
  },

  async resumen(startDate, endDate) {
    const { data } = await api.get('/reports/summary', { params: { startDate, endDate } });
    return data;
  },
};

export default finanzasService;
