// src/services/ventasService.js
// Bloque 2 - POS. Endpoint principal: POST /api/sales

import api from './api';

export const ventasService = {
  /**
   * @param {Array<{producto: {id}, cantidad: number}>} carritoItems - items del ventasStore
   * @param {'EFECTIVO'|'TARJETA'|'TRANSFERENCIA'} metodoPago
   * @param {number|string} turnoId
   * @param {'PRODUCTO'|'MENSUALIDAD'|'DIA_ENTRENAMIENTO'} tipo
   */
  async registrarVenta(carritoItems, metodoPago, turnoId, tipo = 'PRODUCTO') {
    const payload = {
      shiftId: turnoId,
      paymentMethod: metodoPago,
      type: tipo,
      items: carritoItems.map((item) => ({
        productId: item.producto?.id ?? item.productoId,
        quantity: item.cantidad,
      })),
    };
    const { data } = await api.post('/sales', payload);
    return data;
  },

  async listarPorTurno(turnoId) {
    const { data } = await api.get(`/sales/shift/${turnoId}`);
    return data;
  },

  async ventasHoy() {
    const { data } = await api.get('/sales/today');
    return data;
  },
};

export default ventasService;
