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
    // ✅ OBTENER EL TOTAL CORRECTAMENTE
    // El total puede estar en diferentes lugares según la estructura del backend
    const total = v.total || v.amount || v.totalAmount || v.subtotal || 0;
    
    // ✅ OBTENER EL MÉTODO DE PAGO
    const metodo = v.metodoPago || v.paymentMethod || v.payment || 'efectivo';
    
    // ✅ OBTENER EL TIPO DE VENTA
    const tipo = v.tipo || v.saleType || v.type || 'producto';
    
    console.log(`📊 Procesando venta ${v.id}: total=${total}, metodo=${metodo}, tipo=${tipo}`);

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
      // Si no se reconoce, asumir producto
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
      // Si no se reconoce, asumir efectivo
      efectivo += total;
    }
  });

  // Calcular total general
  const totalGeneral = totalProductos + totalMensualidades + totalDias;
  const countTotal = countProductos + countMensualidades + countDias;

  // Calcular distribución por hora
  const porHora = Array(9).fill(0);
  ventas.forEach(v => {
    if (v.hora) {
      try {
        const partes = v.hora.split(':');
        let hora = parseInt(partes[0]);
        
        // Convertir a formato 12h para el índice
        if (hora >= 12) {
          hora = hora - 12;
        }
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

  console.log('📊 Resumen calculado:', {
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
    countTotal
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
// STORE DE VENTAS
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

      /**
       * Carga las ventas del día desde el backend.
       * 
       * @async
       */
      async cargarVentas() {
        set({ loading: true, error: null });
        try {
          console.log('📊 Cargando ventas del día...');
          const response = await ventasService.ventasHoy();
          console.log('📥 Respuesta del backend:', response);
          
          // ✅ EXTRAER DATOS CORRECTAMENTE
          const data = extraerDatos(response);
          console.log('📦 Datos extraídos:', data);
          console.log('📦 Primer elemento:', data[0]);
          
          // Formatear ventas para el frontend
          const ventasFormateadas = data.map(v => {
            // ✅ Extraer el total de donde sea que esté
            const total = v.total || v.amount || v.totalAmount || v.subtotal || v.price || 0;
            
            // ✅ Extraer el método de pago
            const metodoPago = v.paymentMethod || v.metodoPago || v.payment || 'efectivo';
            
            // ✅ Extraer el tipo
            const tipo = v.saleType || v.tipo || v.type || 'producto';
            
            // ✅ Extraer la hora
            const hora = v.createdAt || v.date || v.fecha || v.createdDate;
            const horaFormateada = hora 
              ? new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
              : '--:--';
            
            // ✅ Extraer la descripción
            const descripcion = v.description || v.descripcion || v.client?.name || v.clientName || `Venta #${v.id}`;
            
            // ✅ Extraer el cliente
            const cliente = v.client?.name || v.clientName || null;
            
            console.log(`📝 Venta #${v.id}: total=${total}, metodo=${metodoPago}, tipo=${tipo}`);
            
            return {
              id: v.id,
              hora: horaFormateada,
              descripcion: descripcion,
              total: total, // ✅ Asegurar que el total se guarde correctamente
              metodoPago: metodoPago.toLowerCase(),
              tipo: ventasService.mapearTipoVenta(tipo),
              cliente: cliente,
              items: v.items || [],
              createdAt: v.createdAt || v.createdDate || v.date,
              original: v // Guardar datos originales por si acaso
            };
          });
          
          set({ ventas: ventasFormateadas, loading: false });
          console.log('✅ Ventas cargadas:', ventasFormateadas.length);
          console.log('✅ Total general:', ventasFormateadas.reduce((sum, v) => sum + v.total, 0));
          return ventasFormateadas;
        } catch (error) {
          console.error('❌ Error cargando ventas:', error);
          set({ error: error.message, loading: false });
          return [];
        }
      },

      /**
       * Carga las ventas de un turno específico.
       * 
       * @async
       * @param {number} turnoId - ID del turno
       */
      async cargarVentasPorTurno(turnoId) {
        set({ loading: true, error: null });
        try {
          console.log(`📊 Cargando ventas del turno ${turnoId}...`);
          const response = await ventasService.ventasPorTurno(turnoId);
          console.log('📥 Respuesta del backend:', response);
          
          // ✅ EXTRAER DATOS CORRECTAMENTE
          const data = extraerDatos(response);
          console.log('📦 Datos extraídos:', data);
          
          const ventasFormateadas = data.map(v => {
            // ✅ Extraer el total de donde sea que esté
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
          console.log('✅ Ventas del turno cargadas:', ventasFormateadas.length);
          console.log('✅ Total general:', ventasFormateadas.reduce((sum, v) => sum + v.total, 0));
          return ventasFormateadas;
        } catch (error) {
          console.error(`❌ Error cargando ventas del turno ${turnoId}:`, error);
          set({ error: error.message, loading: false });
          return [];
        }
      },

      /**
       * Agrega una venta al estado local (usado después de registrar una venta).
       * 
       * @param {Object} venta - Datos de la venta
       */
      agregarVenta(venta) {
        console.log('📝 Agregando venta al store:', venta);
        
        // ✅ Extraer el total correctamente
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
        
        console.log('✅ Venta agregada al store. Total ventas:', get().ventas.length);
        console.log('✅ Total de la venta agregada:', total);
      },

      /**
       * Establece el turno activo.
       * 
       * @param {Object} turno - Datos del turno
       */
      setTurnoActivo(turno) {
        set({ 
          turnoActivo: turno,
          jornada: {
            ...get().jornada,
            turnoId: turno?.id || null,
            fecha: new Date().toISOString()
          }
        });
        console.log('✅ Turno activo establecido:', turno?.id || 'null');
      },

      /**
       * Cierra la jornada con los datos de cuadre.
       * 
       * @param {Object} data - Datos del cierre
       */
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
        
        console.log('✅ Jornada cerrada:', cierreData);
      },

      /**
       * Reinicia el estado para una nueva jornada.
       */
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
        console.log('✅ Jornada reiniciada');
      },

      /**
       * Obtiene el resumen de ventas calculado.
       * 
       * @returns {Object} Resumen de ventas
       */
      getResumen() {
        return calcularResumen(get().ventas);
      },

      /**
       * Obtiene la cantidad de ventas.
       * 
       * @returns {number} Cantidad de ventas
       */
      getCantidadVentas() {
        return get().ventas.length;
      },

      /**
       * Obtiene el total general de ventas.
       * 
       * @returns {number} Total general
       */
      getTotalGeneral() {
        const resumen = calcularResumen(get().ventas);
        return resumen.totalGeneral;
      },

      /**
       * Limpia los errores.
       */
      clearError() {
        set({ error: null });
      }
    }),
    {
      // --------------------------------------------------------
      // CONFIGURACIÓN DE PERSISTENCIA
      // --------------------------------------------------------
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