// ============================================================
// ARCHIVO: src/services/productosService.js
// DESCRIPCIÓN: Servicio de comunicación con el backend para productos
// VERSIÓN: 2.0 - CON LOGS MEJORADOS
// ============================================================
//
// ENDPOINTS:
// - /categories    - CRUD de categorías
// - /products      - CRUD de productos
// - /products/low-stock - Productos con stock bajo
// - /products/category/{id} - Productos por categoría
//
// ============================================================

import api from './api';

export const productosService = {
    // ============================================================
    // 1. CATEGORÍAS - CRUD
    // ============================================================

    /**
     * Lista todas las categorías
     * @returns {Promise<Object>} - Lista de categorías
     */
    async listarCategorias() {
        console.log('📤 GET /categories');
        const response = await api.get('/categories');
        console.log('📥 GET /categories:', response.data);
        return response.data;
    },

    /**
     * Crea una nueva categoría
     * @param {Object} datos - Datos de la categoría { name, description }
     * @returns {Promise<Object>} - Categoría creada
     */
    async crearCategoria(datos) {
        console.log('📤 POST /categories:', datos);
        const response = await api.post('/categories', datos);
        console.log('📥 POST /categories:', response.data);
        return response.data;
    },

    /**
     * Actualiza una categoría existente
     * @param {number} id - ID de la categoría
     * @param {Object} datos - Datos actualizados
     * @returns {Promise<Object>} - Categoría actualizada
     */
    async actualizarCategoria(id, datos) {
        console.log(`📤 PUT /categories/${id}:`, datos);
        const response = await api.put(`/categories/${id}`, datos);
        console.log(`📥 PUT /categories/${id}:`, response.data);
        return response.data;
    },

    /**
     * Elimina una categoría
     * @param {number} id - ID de la categoría
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async eliminarCategoria(id) {
        console.log(`📤 DELETE /categories/${id}`);
        const response = await api.delete(`/categories/${id}`);
        console.log(`📥 DELETE /categories/${id}:`, response.data);
        return response.data;
    },

    // ============================================================
    // 2. PRODUCTOS - CRUD
    // ============================================================

    /**
     * Lista todos los productos
     * @returns {Promise<Object>} - Lista de productos
     */
    async listarProductos() {
        console.log('📤 GET /products');
        const response = await api.get('/products');
        console.log(`📥 GET /products: ${response.data?.data?.length || 0} productos`);
        return response.data;
    },

    /**
     * Obtiene un producto por ID
     * @param {number} id - ID del producto
     * @returns {Promise<Object>} - Producto
     */
    async obtenerProductoPorId(id) {
        console.log(`📤 GET /products/${id}`);
        const response = await api.get(`/products/${id}`);
        console.log(`📥 GET /products/${id}:`, response.data);
        return response.data;
    },

    /**
     * Lista productos por categoría
     * @param {number} categoryId - ID de la categoría
     * @returns {Promise<Object>} - Lista de productos
     */
    async listarProductosPorCategoria(categoryId) {
        console.log(`📤 GET /products/category/${categoryId}`);
        const response = await api.get(`/products/category/${categoryId}`);
        console.log(`📥 GET /products/category/${categoryId}:`, response.data);
        return response.data;
    },

    /**
     * Lista productos con stock bajo
     * @returns {Promise<Object>} - Lista de productos con stock bajo
     */
    async listarProductosBajoStock() {
        console.log('📤 GET /products/low-stock');
        const response = await api.get('/products/low-stock');
        console.log('📥 GET /products/low-stock:', response.data);
        return response.data;
    },

    /**
     * Crea un nuevo producto
     * @param {Object} datos - Datos del producto
     * @returns {Promise<Object>} - Producto creado
     */
    async crearProducto(datos) {
        console.log('📤 POST /products:', datos);
        const response = await api.post('/products', datos);
        console.log('📥 POST /products:', response.data);
        return response.data;
    },

    /**
     * Actualiza un producto existente
     * @param {number} id - ID del producto
     * @param {Object} datos - Datos actualizados
     * @returns {Promise<Object>} - Producto actualizado
     */
    async actualizarProducto(id, datos) {
        console.log(`📤 PUT /products/${id}:`, datos);
        console.log(`📤 Stock enviado: ${datos.stock}`);
        const response = await api.put(`/products/${id}`, datos);
        console.log(`📥 PUT /products/${id}:`, response.data);
        console.log(`📥 Stock devuelto: ${response.data?.data?.stock || response.data?.stock || 'no definido'}`);
        return response.data;
    },

    /**
     * Elimina un producto
     * @param {number} id - ID del producto
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async eliminarProducto(id) {
        console.log(`📤 DELETE /products/${id}`);
        const response = await api.delete(`/products/${id}`);
        console.log(`📥 DELETE /products/${id}:`, response.data);
        return response.data;
    },
};

export default productosService;