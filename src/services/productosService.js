// src/services/productosService.js
// Bloque 2 - Inventario. Endpoints: /api/categories y /api/products

import api from './api';

export const productosService = {
  // ---- Categorías ----
  async listarCategorias() {
    const { data } = await api.get('/categories');
    return data;
  },

  async crearCategoria(datos) {
    const { data } = await api.post('/categories', datos);
    return data;
  },

  async actualizarCategoria(id, datos) {
    const { data } = await api.put(`/categories/${id}`, datos);
    return data;
  },

  // ---- Productos ----
  async listar() {
    const { data } = await api.get('/products');
    return data;
  },

  async obtenerPorId(id) {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },

  async listarPorCategoria(categoryId) {
    const { data } = await api.get(`/products/category/${categoryId}`);
    return data;
  },

  async listarBajoStock() {
    const { data } = await api.get('/products/low-stock');
    return data;
  },

  async crear(datos) {
    const { data } = await api.post('/products', datos);
    return data;
  },

  async actualizar(id, datos) {
    const { data } = await api.put(`/products/${id}`, datos);
    return data;
  },
};

export default productosService;
