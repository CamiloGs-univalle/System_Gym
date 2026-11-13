import { guardarSincronizado } from '../storageSync';
import { fechaLocalISO } from "../../utils/formatters";
// ============================================================
// SERVICIO DE MEMBRESÍAS - Ciclo de vida completo del cliente
// Estado: ACTIVA | POR_VENCER | VENCIDA | MORA | BLOQUEADA | PAUSADA | CONGELADA | CANCELADA | SUSPENDIDA
// ============================================================

const STORAGE_KEY = 'gymcore_membresias';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch { return []; }
}

function guardar(membresias) {
  guardarSincronizado(STORAGE_KEY, membresias);
}

function hoy() { return fechaLocalISO(); }

function diffDays(f1, f2) {
  return Math.ceil((new Date(f1) - new Date(f2)) / (1000 * 60 * 60 * 24));
}

function calcularEstado(m, diasGracia = 5) {
  const hoy_ = hoy();
  const venc = m.fechaVencimiento;
  if (!venc) return m.estado;
  if (m.estado === 'CANCELADA' || m.estado === 'SUSPENDIDA') return m.estado;
  if (m.estado === 'CONGELADA') return 'CONGELADA';
  if (m.estado === 'PAUSADA') return 'PAUSADA';
  const diasRestantes = diffDays(venc, hoy_);
  if (diasRestantes > diasGracia) return 'ACTIVA';
  if (diasRestantes >= 0) return 'POR_VENCER';
  const diasMora = Math.abs(diasRestantes);
  if (diasMora > 30) return 'CARTERA';
  if (diasMora > 15) return 'JURIDICA';
  if (diasMora > 0) return 'MORA';
  return 'ACTIVA';
}

export const membresiasService = {
  listar() {
    const m = cargar();
    return m.map(memb => ({ ...memb, estado: calcularEstado(memb) }));
  },

  obtenerPorId(id) {
    const m = cargar().find(x => x.id === id);
    return m ? { ...m, estado: calcularEstado(m) } : null;
  },

  obtenerPorClienteId(clienteId) {
    const m = cargar().filter(x => x.clienteId === clienteId);
    return m.map(memb => ({ ...memb, estado: calcularEstado(memb) }));
  },

  obtenerActivaPorCliente(clienteId) {
    const membresias = cargar().filter(x => x.clienteId === clienteId);
    const activa = membresias.find(m => {
      const estado = calcularEstado(m);
      return ['ACTIVA', 'POR_VENCER'].includes(estado);
    });
    if (!activa) return null;
    return { ...activa, estado: calcularEstado(activa) };
  },

  crear(datos) {
    const membresias = cargar();
    const nueva = {
      id: membresias.length > 0 ? Math.max(...membresias.map(m => m.id)) + 1 : 1,
      clienteId: datos.clienteId,
      planId: datos.planId,
      planNombre: datos.planNombre || '',
      planPrecio: datos.planPrecio || 0,
      sedeId: datos.sedeId || 1,
      precioAcordado: datos.precioAcordado || datos.planPrecio || 0,
      descuento: datos.descuento || null,
      promocionAplicada: datos.promocionAplicada || null,
      fechaInicio: datos.fechaInicio || hoy(),
      fechaVencimiento: datos.fechaVencimiento || '',
      modeloCobro: datos.modeloCobro || '30_DIAS',
      diasGracia: datos.diasGracia || 5,
      estado: 'ACTIVA',
      bloqueoAcceso: false,
      entrenadorAsignado: datos.entrenadorAsignado || null,
      beneficiarios: datos.beneficiarios || [],
      congelacionesAcumuladas: 0,
      historialCambios: [],
      renovaciones: [],
      cancelacion: null,
      notas: datos.notas || '',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
    membresias.push(nueva);
    guardar(membresias);
    return nueva;
  },

  renovar(membresiaId, datosRenovacion) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    
    const m = membresias[idx];
    const diasAnteriores = diffDays(m.fechaVencimiento, hoy());
    const diasRestantes = Math.max(0, diasAnteriores);
    
    const nuevoVenc = new Date(hoy());
    if (m.modeloCobro === '30_DIAS') {
      nuevoVenc.setDate(nuevoVenc.getDate() + 30);
    } else if (m.modeloCobro === 'ANIVERSARIO') {
      nuevoVenc.setTime(new Date(m.fechaInicio).getTime());
      const mes = nuevoVenc.getMonth();
      nuevoVenc.setMonth(mes + 1);
    } else {
      nuevoVenc.setTime(new Date(m.fechaVencimiento).getTime());
      nuevoVenc.setDate(nuevoVenc.getDate() + 30);
    }
    
    membresias[idx] = {
      ...m,
      planId: datosRenovacion.planId || m.planId,
      planNombre: datosRenovacion.planNombre || m.planNombre,
      planPrecio: datosRenovacion.planPrecio || m.planPrecio,
      precioAcordado: datosRenovacion.precioAcordado || m.precioAcordado,
      // Si el backend ya calculó las fechas (cobro en caja), se usan esas
      fechaInicio: datosRenovacion.fechaInicio || hoy(),
      fechaVencimiento: datosRenovacion.fechaVencimiento || nuevoVenc.toISOString().split('T')[0],
      estado: 'ACTIVA',
      bloqueoAcceso: false,
      renovaciones: [...(m.renovaciones || []), {
        fecha: new Date().toISOString(),
        tipo: datosRenovacion.tipo || 'MANUAL',
        planAnterior: m.planId,
        planNuevo: datosRenovacion.planId || m.planId,
        montoPagado: datosRenovacion.montoPagado || 0,
        metodoPago: datosRenovacion.metodoPago || 'EFECTIVO',
        diasRestantesAnteriores: diasRestantes,
        responsable: datosRenovacion.responsable || 'Sistema'
      }],
      actualizadoEn: new Date().toISOString()
    };
    guardar(membresias);
    return membresias[idx];
  },

  congelar(membresiaId, datos) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    const m = membresias[idx];
    membresias[idx] = {
      ...m,
      estado: 'CONGELADA',
      fechaInicioCongelacion: datos.fechaInicio,
      fechaFinCongelacion: datos.fechaFin,
      motivoCongelacion: datos.motivo,
      costoCongelacion: datos.costo || 0,
      extensionVencimiento: datos.extensionVencimiento !== false,
      congelacionesAcumuladas: (m.congelacionesAcumuladas || 0) + datos.dias,
      actualizadoEn: new Date().toISOString()
    };
    guardar(membresias);
    return membresias[idx];
  },

  desCongelar(membresiaId) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    const m = membresias[idx];
    
    if (m.extensionVencimiento && m.fechaFinCongelacion) {
      const diasExt = diffDays(m.fechaFinCongelacion, m.fechaInicioCongelacion || hoy());
      const nuevoVenc = new Date(m.fechaVencimiento);
      nuevoVenc.setDate(nuevoVenc.getDate() + Math.max(0, diasExt));
      membresias[idx].fechaVencimiento = nuevoVenc.toISOString().split('T')[0];
    }
    membresias[idx].estado = calcularEstado(membresias[idx]);
    membresias[idx].actualizadoEn = new Date().toISOString();
    guardar(membresias);
    return membresias[idx];
  },

  pausar(membresiaId, motivo) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    membresias[idx].estado = 'PAUSADA';
    membresias[idx].motivoPausa = motivo;
    membresias[idx].fechaPausa = hoy();
    membresias[idx].actualizadoEn = new Date().toISOString();
    guardar(membresias);
    return membresias[idx];
  },

  cancelar(membresiaId, datos) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    membresias[idx].estado = 'CANCELADA';
    membresias[idx].cancelacion = {
      fecha: new Date().toISOString(),
      motivo: datos.motivo || 'Solicitud del cliente',
      saldo: datos.saldo || 0,
      reembolso: datos.reembolso || 0,
      responsable: datos.responsable || 'Sistema'
    };
    membresias[idx].actualizadoEn = new Date().toISOString();
    guardar(membresias);
    return membresias[idx];
  },

  cambiarPlan(membresiaId, datos) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) throw new Error("Membresía no encontrada");
    
    const m = membresias[idx];
    const diasRestantes = Math.max(0, diffDays(m.fechaVencimiento, hoy()));
    const precioDiarioAnterior = m.planPrecio / 30;
    const saldoAFavor = diasRestantes * precioDiarioAnterior;
    
    const precioDiarioNuevo = datos.nuevoPlanPrecio / (datos.nuevaDuracion || 30);
    const diasNuevoPeriodo = Math.floor(saldoAFavor / precioDiarioNuevo);
    const diferenciaPagar = Math.max(0, datos.nuevoPlanPrecio - saldoAFavor);
    
    const nuevaFechaVenc = new Date(hoy());
    nuevaFechaVenc.setDate(nuevaFechaVenc.getDate() + diasNuevoPeriodo);
    
    membresias[idx] = {
      ...m,
      planId: datos.nuevoPlanId,
      planNombre: datos.nuevoPlanNombre,
      planPrecio: datos.nuevoPlanPrecio,
      precioAcordado: datos.nuevoPlanPrecio,
      fechaVencimiento: nuevaFechaVenc.toISOString().split('T')[0],
      historialCambios: [...(m.historialCambios || []), {
        fecha: new Date().toISOString(),
        planAnterior: m.planId,
        planAnteriorNombre: m.planNombre,
        planAnteriorPrecio: m.planPrecio,
        planNuevo: datos.nuevoPlanId,
        planNuevoNombre: datos.nuevoPlanNombre,
        planNuevoPrecio: datos.nuevoPlanPrecio,
        saldoAFavor,
        diferenciaPagar,
        responsable: datos.responsable || 'Sistema'
      }],
      actualizadoEn: new Date().toISOString()
    };
    guardar(membresias);
    return membresias[idx];
  },

  actualizarEstado(membresiaId) {
    const membresias = cargar();
    const idx = membresias.findIndex(m => m.id === membresiaId);
    if (idx === -1) return null;
    membresias[idx].estado = calcularEstado(membresias[idx]);
    membresias[idx].actualizadoEn = new Date().toISOString();
    guardar(membresias);
    return membresias[idx];
  },

  estadisticas() {
    const membresias = this.listar();
    return {
      total: membresias.length,
      activas: membresias.filter(m => m.estado === 'ACTIVA').length,
      porVencer: membresias.filter(m => m.estado === 'POR_VENCER').length,
      vencidas: membresias.filter(m => m.estado === 'VENCIDA').length,
      enMora: membresias.filter(m => m.estado === 'MORA').length,
      bloqueadas: membresias.filter(m => m.estado === 'BLOQUEADA').length,
      congeladas: membresias.filter(m => m.estado === 'CONGELADA').length,
      pausadas: membresias.filter(m => m.estado === 'PAUSADA').length,
      canceladas: membresias.filter(m => m.estado === 'CANCELADA').length,
    };
  }
};

export default membresiasService;
