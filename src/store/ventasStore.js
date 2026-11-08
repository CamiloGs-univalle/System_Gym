/**
 * ============================================================
 * STORE DE VENTAS - GESTIÓN DE VENTAS Y CIERRE DE CAJA
 * ============================================================
 * 
 * Maneja el estado de las ventas, el turno activo y el cierre de caja.
 * 
 * @module ventasStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ventasService } from '../services/ventasService';

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Extrae los datos de la respuesta del backend
 * Maneja diferentes estructuras de respuesta
 */
const extraerDatos = (response) => {
  // Si ya es un array, devolverlo
  if (Array.isArray(response)) return response;
  
  // Si tiene data que es array
  if (response?.data && Array.isArray(response.data)) return response.data;
  
  // Si tiene data.data que es array
  if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
  
  // Si tiene data.content que es array (para paginación)
  if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
  
  // Si tiene data y es un objeto con array
  if (response?.data) {
    const possibleArrays = Object.values(response.data).filter(v => Array.isArray(v));
    if (possibleArrays.length > 0) return possibleArrays[0];
  }
  
  // Si tiene success y data
  if (response?.success && response?.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  console.warn('⚠️ No se pudo extraer datos de la respuesta:', response);
  return [];
};

/**
 * Calcula el resumen de ventas a partir de una lista.
 * 
 * @param {Array} ventas - Lista de ventas
 * @returns {Object} Resumen calculado
 */
export const calcularResumen = (ventas) => {
  if (!ventas || ventas.length === 0) {
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

  // Inicializar contadores
  let totalProductos = 0;
  let totalMensualidades = 0;
  let totalDias = 0;
  let efectivo = 0;
  let transferencia = 0;
  let tarjeta = 0;
  let countProductos = 0;
  let countMensualidades = 0;
  let countDias = 0;

  // Procesar cada venta
  ventas.forEach(v => {
    const total = v.total || v.amount || v.totalAmount || v.subtotal || 0;
    const metodo = v.metodoPago || v.paymentMethod || v.payment || 'efectivo';
    const tipo = v.tipo || v.saleType || v.type || 'producto';

    // Sumar por tipo
    const tipoLower = tipo.toLowerCase();
    if (tipoLower === 'producto' || tipoLower === 'product_sale') {
      totalProductos += total;
      countProductos++;
    } else if (tipoLower === 'mensualidad' || tipoLower === 'membership_payment') {
      totalMensualidades += total;
      countMensualidades++;
    } else if (tipoLower === 'dia' || tipoLower === 'daily_training') {
      totalDias += total;
      countDias++;
    } else {
      totalProductos += total;
      countProductos++;
    }

    // Sumar por método de pago
    const metodoLower = metodo.toLowerCase();
    if (metodoLower === 'efectivo' || metodoLower === 'cash') {
      efectivo += total;
    } else if (metodoLower === 'transferencia' || metodoLower === 'transfer' || metodoLower === 'bank') {
      transferencia += total;
    } else if (metodoLower === 'tarjeta' || metodoLower === 'card') {
      tarjeta += total;
    } else {
      efectivo += total;
    }
  });

  const totalGeneral = totalProductos + totalMensualidades + totalDias;
  const countTotal = countProductos + countMensualidades + countDias;

  // Calcular distribución por hora
  const porHora = Array(9).fill(0);
  ventas.forEach(v => {
    if (v.hora) {
      try {
        const partes = v.hora.split(':');
        let hora = parseInt(partes[0]);
        if (hora >= 12) hora = hora - 12;
        if (hora >= 7 && hora <= 15) {
          const idx = hora - 7;
          const total = v.total || v.amount || 0;
          porHora[idx] = (porHora[idx] || 0) + total;
        }
      } catch (e) {
        // Ignorar errores de parseo
      }
    }
  });

  return {
    totalGeneral,
    totalProductos,
    totalMensualidades,
    totalDias,
    efectivo,
    transferencia,
    tarjeta,
    countProductos,
    countMensualidades,
    countDias,
    countTotal,
    porHora
  };
};

// ============================================================
// CREAR EL STORE CON ZUSTAND
// ============================================================

export const useVentasStore = create(
  persist(
    (set, get) => ({
      // --------------------------------------------------------
      // ESTADO INICIAL
      // --------------------------------------------------------
      ventas: [],
      jornada: {
        cerrada: false,
        cierreData: null,
        turnoId: null,
        fecha: null
      },
      turnoActivo: null,
      loading: false,
      error: null,

      // --------------------------------------------------------
      // ACCIONES
      // --------------------------------------------------------

      async cargarVentas() {
        set({ loading: true, error: null });
        try {
          const response = await ventasService.ventasHoy();
          const data = extraerDatos(response);
          
          const ventasFormateadas = data.map(v => {
            const total = v.total || v.amount || v.totalAmount || v.subtotal || v.price || 0;
            const metodoPago = v.paymentMethod || v.metodoPago || v.payment || 'efectivo';
            const tipo = v.saleType || v.tipo || v.type || 'producto';
            const hora = v.createdAt || v.date || v.fecha || v.createdDate;
            const horaFormateada = hora 
              ? new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
              : '--:--';
            
            return {
              id: v.id,
              hora: horaFormateada,
              descripcion: v.description || v.descripcion || v.client?.name || v.clientName || `Venta #${v.id}`,
              total: total,
              metodoPago: metodoPago.toLowerCase(),
              tipo: ventasService.mapearTipoVenta(tipo),
              cliente: v.client?.name || v.clientName || null,
              items: v.items || [],
              createdAt: v.createdAt || v.createdDate || v.date,
              original: v
            };
          });
          
          set({ ventas: ventasFormateadas, loading: false });
          return ventasFormateadas;
        } catch (error) {
          console.error('❌ Error cargando ventas:', error);
          set({ error: error.message, loading: false });
          return [];
        }
      },

      async cargarVentasPorTurno(turnoId) {
        set({ loading: true, error: null });
        try {
          const response = await ventasService.ventasPorTurno(turnoId);
          const data = extraerDatos(response);
          
          const ventasFormateadas = data.map(v => {
            const total = v.total || v.amount || v.totalAmount || v.subtotal || v.price || 0;
            const metodoPago = v.paymentMethod || v.metodoPago || v.payment || 'efectivo';
            const tipo = v.saleType || v.tipo || v.type || 'producto';
            const hora = v.createdAt || v.date || v.fecha;
            const horaFormateada = hora 
              ? new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
              : '--:--';
            
            return {
              id: v.id,
              hora: horaFormateada,
              descripcion: v.description || v.descripcion || v.client?.name || `Venta #${v.id}`,
              total: total,
              metodoPago: metodoPago.toLowerCase(),
              tipo: ventasService.mapearTipoVenta(tipo),
              cliente: v.client?.name || v.clientName || null,
              items: v.items || [],
              createdAt: v.createdAt || v.createdDate,
              original: v
            };
          });
          
          set({ ventas: ventasFormateadas, loading: false });
          return ventasFormateadas;
        } catch (error) {
          console.error(`❌ Error cargando ventas del turno ${turnoId}:`, error);
          set({ error: error.message, loading: false });
          return [];
        }
      },

      agregarVenta(venta) {
        const total = venta.total || venta.amount || venta.totalAmount || 0;
        
        const ventaFormateada = {
          id: venta.id || Date.now(),
          hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          descripcion: venta.descripcion || `Venta #${venta.id}`,
          total: total,
          metodoPago: venta.metodoPago || venta.paymentMethod || 'efectivo',
          tipo: venta.tipo || venta.saleType || 'producto',
          cliente: venta.cliente || null,
          items: venta.items || [],
          createdAt: venta.createdAt || new Date().toISOString(),
          original: venta
        };
        
        set(state => ({
          ventas: [...state.ventas, ventaFormateada]
        }));
      },

      setTurnoActivo(turno) {
        set({ 
          turnoActivo: turno,
          jornada: {
            ...get().jornada,
            turnoId: turno?.id || null,
            fecha: new Date().toISOString()
          }
        });
      },

      cerrarJornada(data) {
        const fecha = new Date().toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const hora = new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const cierreData = {
          ...data,
          fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1),
          hora,
          totalVentas: data.totalVentas || 0
        };
        
        set({
          jornada: {
            cerrada: true,
            cierreData: cierreData,
            turnoId: get().turnoActivo?.id || null,
            fecha: new Date().toISOString()
          }
        });
      },

      reiniciarJornada() {
        set({
          ventas: [],
          jornada: {
            cerrada: false,
            cierreData: null,
            turnoId: null,
            fecha: null
          },
          error: null
        });
      },

      getResumen() {
        return calcularResumen(get().ventas);
      },

      getCantidadVentas() {
        return get().ventas.length;
      },

      getTotalGeneral() {
        const resumen = calcularResumen(get().ventas);
        return resumen.totalGeneral;
      },

      clearError() {
        set({ error: null });
      }
    }),
    {
      name: 'gymcore-ventas',
      partialize: (state) => ({
        ventas: state.ventas,
        jornada: state.jornada,
        turnoActivo: state.turnoActivo
      })
    }
  )
);

export default useVentasStore;