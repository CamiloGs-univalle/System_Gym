// src/services/turnoService.js

import api from './api';

export const turnoService = {
  async abrir({ tipo, baseCaja, receptionistId }) {
    const payload = { 
      type: tipo, 
      cashBase: baseCaja, 
      receptionistId 
    };
    const { data } = await api.post('/shifts', payload);
    return data;
  },

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
    try {
      const response = await api.get('/shifts/today');
      console.log("📥 Respuesta de turnosHoy:", response);
      
      // Extraer los datos de la respuesta
      let data = response.data || response;
      
      // Si data tiene una propiedad 'data', usarla
      if (data.data && Array.isArray(data.data)) {
        data = data.data;
      }
      
      // Si data tiene una propiedad 'shifts', usarla
      if (data.shifts && Array.isArray(data.shifts)) {
        data = data.shifts;
      }
      
      // Si data no es array, buscar un array en cualquier propiedad
      if (!Array.isArray(data)) {
        const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
        if (possibleArrays.length > 0) {
          data = possibleArrays[0];
        } else {
          data = [];
        }
      }
      
      console.log(`✅ Turnos obtenidos: ${data.length}`);
      return data;
    } catch (error) {
      console.error("❌ Error en turnosHoy:", error);
      throw error;
    }
  },
};

export default turnoService;