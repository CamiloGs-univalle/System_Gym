import api from './api';

const extraer = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
  return [];
};

export const ingresoService = {
  // PEDIDOS
  async listarPedidos() {
    const res = await api.get('/orders');
    return extraer(res);
  },

  async crearPedido(datos) {
    const res = await api.post('/orders', datos);
    return res.data;
  },

  async actualizarPedido(id, datos) {
    const res = await api.put(`/orders/${id}`, datos);
    return res.data;
  },

  async cancelarPedido(id) {
    const res = await api.delete(`/orders/${id}`);
    return res.data;
  },

  async registrarLlegada(id, datos) {
    const res = await api.post(`/orders/${id}/arrive`, datos);
    return res.data;
  },

  async confirmarPedido(id, datos) {
    const res = await api.post(`/orders/${id}/confirm`, datos);
    return res.data;
  },

  // INGRESOS
  async listarIngresos() {
    const res = await api.get('/intakes');
    return extraer(res);
  },

  async registrarIngreso(datos) {
    const res = await api.post('/intakes', datos);
    return res.data;
  },

  async completarIngreso(id, datos) {
    const res = await api.put(`/intakes/${id}`, datos);
    return res.data;
  },

  async eliminarIngreso(id) {
    const res = await api.delete(`/intakes/${id}`);
    return res.data;
  },

  // EGRESOS
  async listarEgresos() {
    const res = await api.get('/expenses');
    return extraer(res);
  },

  async registrarEgreso(datos) {
    const res = await api.post('/expenses', datos);
    return res.data;
  },

  async eliminarEgreso(id) {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },
};

export default ingresoService;
