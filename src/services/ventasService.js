/**
 * ============================================================
 * SERVICIO DE VENTAS - COMUNICACIÓN CON EL BACKEND
 * ============================================================
 * 
 * Este servicio maneja todas las operaciones relacionadas con ventas.
 * Se conecta al backend a través de la API REST.
 * 
 * @module ventasService
 */

import api from './api';
import useAuthStore from '../store/authStore';
import authService from './authService';

// ============================================================
// CONSTANTES
// ============================================================

/** Métodos de pago válidos */
const VALID_PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER'];

/** Tipos de venta válidos */
const VALID_SALE_TYPES = ['PRODUCT_SALE', 'MEMBERSHIP_PAYMENT', 'DAILY_TRAINING'];

// ============================================================
// SERVICIO PRINCIPAL
// ============================================================

export const ventasService = {

  // ----------------------------------------------------------
  // MÉTODOS DE UTILIDAD
  // ----------------------------------------------------------

  /**
   * Obtiene el ID del usuario autenticado desde múltiples fuentes.
   * 
   * @returns {number|null} ID del usuario o null
   */
  getUserId() {
    console.log('🔍 getUserId() - Buscando ID del usuario...');
    
    // 1. Intentar desde authService (método más confiable)
    const userIdFromAuth = authService.getUserId();
    if (userIdFromAuth) {
      console.log('✅ ID encontrado en authService:', userIdFromAuth);
      return userIdFromAuth;
    }
    
    // 2. Intentar desde el store de Zustand
    const state = useAuthStore.getState();
    const userFromStore = state.usuario;
    
    if (userFromStore) {
      const id = userFromStore.id || userFromStore.userId || userFromStore.user_id || userFromStore.ID || null;
      if (id) {
        console.log('✅ ID encontrado en store:', id);
        return id;
      }
    }
    
    // 3. Intentar desde localStorage directamente
    try {
      // 3a. Buscar en gymcore_user
      const storedUser = localStorage.getItem('gymcore_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.id || parsed.userId || parsed.user_id || parsed.ID || null;
        if (id) {
          console.log('✅ ID encontrado en gymcore_user:', id);
          this.updateStoreWithUser(parsed, id);
          return id;
        }
      }
      
      // 3b. Buscar en gymcore-auth (persist de Zustand)
      const storedAuth = localStorage.getItem('gymcore-auth');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        const userData = parsed?.state?.usuario || parsed?.usuario;
        if (userData) {
          const id = userData.id || userData.userId || userData.user_id || userData.ID || null;
          if (id) {
            console.log('✅ ID encontrado en gymcore-auth:', id);
            this.updateStoreWithUser(userData, id);
            return id;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error leyendo localStorage:', error);
    }
    
    console.warn('⚠️ No se encontró ID en ninguna fuente');
    return null;
  },

  /**
   * Actualiza el store con los datos del usuario recuperados.
   * 
   * @param {Object} userData - Datos del usuario
   * @param {number} userId - ID del usuario
   */
  updateStoreWithUser(userData, userId) {
    try {
      const userWithId = { ...userData, id: userId };
      useAuthStore.setState({ 
        usuario: userWithId,
        isAuthenticated: true 
      });
      console.log('✅ Store actualizado con usuario ID:', userId);
    } catch (error) {
      console.error('❌ Error actualizando el store:', error);
    }
  },

  // ----------------------------------------------------------
  // MÉTODO PRINCIPAL: REGISTRAR VENTA
  // ----------------------------------------------------------

  /**
   * Registra una nueva venta en el backend.
   * 
   * @async
   * @param {Array} items - Productos vendidos [{productId, quantity, unitPrice}]
   * @param {string} metodoPago - 'CASH', 'CARD', 'TRANSFER'
   * @param {number} turnoId - ID del turno activo
   * @param {string} tipo - 'PRODUCT_SALE', 'MEMBERSHIP_PAYMENT', 'DAILY_TRAINING'
   * @param {number|null} clientId - ID del cliente (opcional)
   * @param {number} cashReceived - Efectivo recibido para calcular cambio
   * @param {number|null} totalAmount - Total de la venta (opcional, se calcula)
   * @returns {Promise<Object>} Respuesta del backend
   * @throws {Error} Si hay problemas de validación o autenticación
   */
  async registrarVenta(
    items, 
    metodoPago, 
    turnoId, 
    tipo = 'PRODUCT_SALE', 
    clientId = null, 
    cashReceived = 0, 
    totalAmount = null
  ) {
    // --------------------------------------------------------
    // 1. OBTENER Y VALIDAR userId
    // --------------------------------------------------------
    
    let userId = this.getUserId();
    
    console.log('📤 ==================================');
    console.log('📤 REGISTRANDO VENTA EN BACKEND');
    console.log('📤 ==================================');
    console.log('📤 userId obtenido:', userId);
    console.log('📤 turnoId recibido:', turnoId);
    console.log('📤 items:', items.length);
    console.log('📤 método de pago:', metodoPago);
    
    // Si no se encontró userId, error
    if (!userId) {
      console.error('❌ No se pudo obtener el userId');
      console.error('🔍 Estado del store:', useAuthStore.getState());
      console.error('🔍 authService.getUserId():', authService.getUserId());
      
      throw new Error('No hay usuario autenticado. Inicia sesión nuevamente.');
    }
    
    // --------------------------------------------------------
    // 2. VALIDAR PARÁMETROS
    // --------------------------------------------------------
    
    // Validar método de pago
    const paymentMethod = metodoPago.toUpperCase();
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error(
        `Método de pago inválido: ${paymentMethod}. Debe ser: ${VALID_PAYMENT_METHODS.join(', ')}`
      );
    }
    
    // Validar tipo de venta
    const saleType = tipo.toUpperCase();
    if (!VALID_SALE_TYPES.includes(saleType)) {
      throw new Error(
        `Tipo de venta inválido: ${saleType}. Debe ser: ${VALID_SALE_TYPES.join(', ')}`
      );
    }
    
    // Validar turno
    if (!turnoId) {
      throw new Error('No se proporcionó un ID de turno válido.');
    }
    
    // --------------------------------------------------------
    // 3. CALCULAR TOTAL
    // --------------------------------------------------------
    
    let total = totalAmount || 0;
    if (!totalAmount && items.length > 0) {
      total = items.reduce((sum, item) => {
        const unitPrice = item.unitPrice || item.precio || 0;
        const quantity = item.quantity || item.cantidad || 1;
        return sum + (unitPrice * quantity);
      }, 0);
    }
    
    // --------------------------------------------------------
    // 4. CONSTRUIR PAYLOAD
    // --------------------------------------------------------
    
    const payload = {
      shiftId: turnoId,
      processedByUserId: userId,
      items: items.map((item) => ({
        productId: item.productId || item.id,
        quantity: item.quantity || item.cantidad || 1
      })),
      paymentMethod: paymentMethod,
      cashReceived: cashReceived || total,
      clientId: clientId || null,
      saleType: saleType
    };
    
    console.log('📤 Payload final:', JSON.stringify(payload, null, 2));
    
    // --------------------------------------------------------
    // 5. ENVIAR AL BACKEND
    // --------------------------------------------------------
    
    try {
      const { data } = await api.post('/sales', payload);
      console.log('✅ Venta registrada exitosamente:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error al registrar venta:');
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', JSON.stringify(error.response?.data, null, 2));
      
      // Manejar errores de validación
      if (error.response?.data?.violations) {
        const mensajes = error.response.data.violations.map(v => 
          `${v.propertyPath || 'campo'}: ${v.message}`
        ).join('\n');
        throw new Error(`Error de validación:\n${mensajes}`);
      }
      
      // Manejar errores de negocio
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      // Re-lanzar el error original
      throw error;
    }
  },

  // ----------------------------------------------------------
  // MÉTODOS DE CONSULTA PARA CIERRE
  // ----------------------------------------------------------

  /**
   * Obtiene todas las ventas del día actual desde el backend.
   * 
   * @async
   * @returns {Promise<Array>} Lista de ventas de hoy
   */
  async ventasHoy() {
    try {
      console.log('📊 Obteniendo ventas de hoy...');
      const { data } = await api.get('/sales/today');
      console.log('✅ Ventas de hoy obtenidas:', data);
      return data;
    } catch (error) {
      console.error('❌ Error al obtener ventas de hoy:', error);
      return [];
    }
  },

  /**
   * Obtiene el resumen del día (totales por tipo y método de pago).
   * 
   * @async
   * @returns {Promise<Object>} Resumen del día
   */
  async resumenDia() {
    try {
      console.log('📊 Obteniendo resumen del día...');
      const { data } = await api.get('/sales/summary/today');
      console.log('✅ Resumen del día obtenido:', data);
      return data;
    } catch (error) {
      console.error('❌ Error al obtener resumen del día:', error);
      return {
        totalGeneral: 0,
        totalProductos: 0,
        totalMensualidades: 0,
        totalDias: 0,
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        countProductos: 0,
        countMensualidades: 0,
        countDias: 0,
        countTotal: 0,
        porHora: Array(9).fill(0)
      };
    }
  },

  /**
   * Obtiene todas las ventas del turno activo.
   * 
   * @async
   * @param {number} turnoId - ID del turno
   * @returns {Promise<Array>} Lista de ventas del turno
   */
  async ventasPorTurno(turnoId) {
    try {
      console.log(`📊 Obteniendo ventas del turno ${turnoId}...`);
      const { data } = await api.get(`/sales/shift/${turnoId}`);
      console.log('✅ Ventas del turno obtenidas:', data);
      return data;
    } catch (error) {
      console.error(`❌ Error al obtener ventas del turno ${turnoId}:`, error);
      return [];
    }
  },

  /**
   * Obtiene todas las ventas asociadas a un turno específico.
   * 
   * @async
   * @param {number} turnoId - ID del turno
   * @returns {Promise<Array>} Lista de ventas
   */
  async listarPorTurno(turnoId) {
    return this.ventasPorTurno(turnoId);
  },

  /**
   * Obtiene una venta por su ID.
   * 
   * @async
   * @param {number} id - ID de la venta
   * @returns {Promise<Object>} Datos de la venta
   * @throws {Error} Si la venta no existe
   */
  async obtenerVenta(id) {
    try {
      const { data } = await api.get(`/sales/${id}`);
      return data;
    } catch (error) {
      console.error(`❌ Error al obtener venta ${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene el total de ventas del día.
   * 
   * @async
   * @returns {Promise<number>} Total de ventas
   */
  async totalVentasHoy() {
    try {
      const resumen = await this.resumenDia();
      return resumen.totalGeneral || 0;
    } catch (error) {
      console.error('❌ Error al calcular total de ventas de hoy:', error);
      return 0;
    }
  },

  /**
   * Obtiene el detalle completo de ventas con items para el cierre.
   * 
   * @async
   * @param {number} turnoId - ID del turno (opcional)
   * @returns {Promise<Object>} Datos completos para el cierre
   */
  async obtenerDatosCierre(turnoId = null) {
    try {
      console.log('📊 Obteniendo datos para cierre...');
      
      // Si se proporciona turnoId, obtener ventas de ese turno
      let ventas = [];
      let resumen = null;
      
      if (turnoId) {
        ventas = await this.ventasPorTurno(turnoId);
        resumen = await this.resumenDia(); // Usamos resumen del día por ahora
      } else {
        // Obtener todas las ventas de hoy
        ventas = await this.ventasHoy();
        resumen = await this.resumenDia();
      }
      
      // Formatear ventas para el frontend
      const ventasFormateadas = ventas.map(v => ({
        id: v.id,
        hora: v.createdAt ? new Date(v.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        descripcion: v.description || `Venta #${v.id}`,
        total: v.total || 0,
        metodoPago: v.paymentMethod?.toLowerCase() || 'efectivo',
        tipo: this.mapearTipoVenta(v.saleType),
        cliente: v.client?.name || v.clientName || null,
        items: v.items || [],
        createdAt: v.createdAt
      }));
      
      console.log('✅ Datos para cierre obtenidos:', { ventas: ventasFormateadas.length, resumen });
      
      return {
        ventas: ventasFormateadas,
        resumen: resumen || {
          totalGeneral: ventasFormateadas.reduce((sum, v) => sum + v.total, 0),
          totalProductos: 0,
          totalMensualidades: 0,
          totalDias: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          countProductos: 0,
          countMensualidades: 0,
          countDias: 0,
          countTotal: ventasFormateadas.length,
          porHora: Array(9).fill(0)
        }
      };
      
    } catch (error) {
      console.error('❌ Error al obtener datos para cierre:', error);
      return {
        ventas: [],
        resumen: {
          totalGeneral: 0,
          totalProductos: 0,
          totalMensualidades: 0,
          totalDias: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          countProductos: 0,
          countMensualidades: 0,
          countDias: 0,
          countTotal: 0,
          porHora: Array(9).fill(0)
        }
      };
    }
  },

  /**
   * Mapea el tipo de venta del backend al formato del frontend.
   * 
   * @param {string} saleType - Tipo de venta del backend
   * @returns {string} Tipo mapeado
   */
  mapearTipoVenta(saleType) {
    const map = {
      'PRODUCT_SALE': 'producto',
      'MEMBERSHIP_PAYMENT': 'mensualidad',
      'DAILY_TRAINING': 'dia'
    };
    return map[saleType] || 'producto';
  }
};

// ============================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================

export default ventasService;