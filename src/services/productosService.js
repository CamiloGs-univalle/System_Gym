// src/services/productosService.js
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
  
  async eliminarCategoria(id) {
    const { data } = await api.delete(`/categories/${id}`);
    return data;
  },

  // ---- Productos ----
  async listarProductos() {
    const { data } = await api.get('/products');
    return data;
  },
  
  async obtenerProductoPorId(id) {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
  
  async listarProductosPorCategoria(categoryId) {
    const { data } = await api.get(`/products/category/${categoryId}`);
    return data;
  },
  
  async listarProductosBajoStock() {
    const { data } = await api.get('/products/low-stock');
    return data;
  },
  
  async crearProducto(datos) {
    const { data } = await api.post('/products', datos);
    return data;
  },
  
  async actualizarProducto(id, datos) {
    const { data } = await api.put(`/products/${id}`, datos);
    return data;
  },
  
  async eliminarProducto(id) {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
};

export default productosService;