/**
 * ============================================================
 * SERVICIO DE VENTAS - COMUNICACIÓN CON EL BACKEND
 * ============================================================
 * 
 * Este servicio maneja toda la comunicación con el backend
 * relacionada con las ventas.
 * 
 * Endpoints utilizados:
 * - POST /api/sales - Registrar una nueva venta
 * - GET /api/sales/shift/{turnoId} - Obtener ventas por turno
 * - GET /api/sales/today - Obtener ventas del día
 * 
 * @module ventasService
 * ============================================================
 */

import api from './api';
import useAuthStore from '../store/authStore';

export const ventasService = {

  /**
   * Registra una nueva venta en el backend.
   * 
   * Esta función envía los datos de la venta al backend para:
   * - Registrar la transacción
   * - Descontar el stock de los productos vendidos
   * - Registrar el método de pago
   * - Asociar la venta al turno activo
   * - Asociar la venta al usuario que la procesó
   * - Asociar la venta al cliente (opcional)
   * 
   * @async
   * @param {Array<{productId: number, quantity: number}>} items - Productos vendidos
   * @param {string} metodoPago - Método de pago: 'CASH', 'CARD', 'TRANSFER'
   * @param {number} turnoId - ID del turno activo
   * @param {string} tipo - Tipo de venta: 'PRODUCT_SALE', 'MEMBERSHIP_PAYMENT', 'DAILY_TRAINING'
   * @param {number|null} clientId - ID del cliente (opcional)
   * @returns {Promise<Object>} Respuesta del backend con los datos de la venta registrada
   * 
   * @example
   * const venta = await ventasService.registrarVenta(
   *   [{ productId: 1, quantity: 2 }],
   *   'CASH',
   *   123,
   *   'PRODUCT_SALE',
   *   456
   * );
   */
  async registrarVenta(items, metodoPago, turnoId, tipo = 'PRODUCT_SALE', clientId = null) {
    
    // ✅ Obtener el usuario actual del store de autenticación
    // Esto permite asociar la venta al usuario que la procesa
    const user = useAuthStore.getState().usuario;
    
    // ✅ Asegurar que el método de pago esté en mayúsculas
    const paymentMethod = metodoPago.toUpperCase();
    
    // ✅ Validar que el método de pago sea uno de los permitidos
    const allowedMethods = ['CASH', 'CARD', 'TRANSFER'];
    if (!allowedMethods.includes(paymentMethod)) {
      throw new Error(`Método de pago inválido: ${paymentMethod}. Debe ser: ${allowedMethods.join(', ')}`);
    }
    
    // ✅ Construir el payload para el backend
    const payload = {
      shiftId: turnoId,                           // ID del turno activo
      paymentMethod: paymentMethod,               // Método de pago (CASH, CARD, TRANSFER)
      saleType: tipo,                             // Tipo de venta
      items: items.map((item) => ({               // Lista de productos vendidos
        productId: item.productId || item.id,     // ID del producto
        quantity: item.quantity || item.cantidad || 1, // Cantidad vendida
      })),
    };
    
    // ✅ Agregar cliente si existe (para asociar la venta a un cliente)
    if (clientId) {
      payload.clientId = clientId;
    }
    
    // ✅ Agregar el usuario que procesa la venta (opcional)
    // El backend también puede obtenerlo del token JWT
    if (user?.id) {
      payload.processedByUserId = user.id;
    }
    
    // ✅ Log para depuración
    console.log('📤 Registrando venta:', JSON.stringify(payload, null, 2));
    
    // ✅ Enviar la petición al backend
    const { data } = await api.post('/sales', payload);
    return data;
  },

  /**
   * Obtiene todas las ventas asociadas a un turno específico.
   * 
   * @async
   * @param {number} turnoId - ID del turno
   * @returns {Promise<Array>} Lista de ventas del turno
   */
  async listarPorTurno(turnoId) {
    const { data } = await api.get(`/sales/shift/${turnoId}`);
    return data;
  },

  /**
   * Obtiene todas las ventas del día actual.
   * 
   * @async
   * @returns {Promise<Array>} Lista de ventas del día
   */
  async ventasHoy() {
    const { data } = await api.get('/sales/today');
    return data;
  },
};

export default ventasService;