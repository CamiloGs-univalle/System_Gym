import { guardarSincronizado } from '../storageSync';
import { fechaLocalISO, fechaHoraLocalISO } from "../../utils/formatters";
// ============================================================
// SERVICIO DE PAGOS - Registro completo de transacciones
// Métodos: EFECTIVO | DEBITO | CREDITO | TRANSFERENCIA | PSE | QR | CONVENIO | MIXTO
// Estados: PENDIENTE | PARCIAL | PAGADO | ANULADO | RECHAZADO | REEMBOLSADO
// ============================================================

const STORAGE_KEY = 'gymcore_pagos';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch { return []; }
}

function guardar(pagos) {
  guardarSincronizado(STORAGE_KEY, pagos);
}

export const pagosService = {
  listar() {
    return cargar();
  },

  obtenerPorId(id) {
    return cargar().find(p => p.id === id) || null;
  },

  listarPorCliente(clienteId) {
    return cargar().filter(p => p.clienteId === clienteId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  listarPorMembresia(membresiaId) {
    return cargar().filter(p => p.membresiaId === membresiaId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  listarPorPeriodo(fechaInicio, fechaFin) {
    return cargar().filter(p => {
      const f = p.fecha;
      return f >= fechaInicio && f <= fechaFin;
    });
  },

  listarPorMetodoPago(metodo) {
    return cargar().filter(p => p.metodoPago === metodo);
  },

  crear(datos) {
    const pagos = cargar();
    const nuevo = {
      id: pagos.length > 0 ? Math.max(...pagos.map(p => p.id)) + 1 : 1,
      clienteId: datos.clienteId,
      clienteNombre: datos.clienteNombre || '',
      membresiaId: datos.membresiaId || null,
      facturaId: datos.facturaId || null,
      fecha: datos.fecha || fechaHoraLocalISO(),
      hora: datos.hora || new Date().toTimeString().slice(0, 5),
      caja: datos.caja || 'CAJA_PRINCIPAL',
      sedeId: datos.sedeId || 1,
      empleadoId: datos.empleadoId || null,
      empleadoNombre: datos.empleadoNombre || '',
      
      metodoPago: datos.metodoPago || 'EFECTIVO',
      detalleMetodos: datos.detalleMetodos || [],
      
      valorTotal: datos.valorTotal || 0,
      valorAplicado: datos.valorAplicado || datos.valorTotal || 0,
      concepto: datos.concepto || 'MEMBRESIA',
      conceptoDetalle: datos.conceptoDetalle || '',
      
      referencia: datos.referencia || '',
      autorizacion: datos.autorizacion || '',
      
      estado: datos.estado || 'PAGADO',
      
      comprobante: datos.comprobante || {
        tipo: 'RECIBO',
        numero: `REC-${String(pagos.length + 1).padStart(6, '0')}`
      },
      
      impuestos: datos.impuestos || { base: datos.valorTotal || 0, iva: 0, retefuente: 0 },
      
      notas: datos.notas || '',
      creadoEn: new Date().toISOString()
    };
    
    pagos.push(nuevo);
    guardar(pagos);
    return nuevo;
  },

  registrarPagoMembresia(membresiaId, clienteId, clienteNombre, monto, metodoPago, datosExtra = {}) {
    return this.crear({
      clienteId,
      clienteNombre,
      membresiaId,
      valorTotal: monto,
      valorAplicado: monto,
      metodoPago,
      concepto: 'MEMBRESIA',
      conceptoDetalle: datosExtra.planNombre || 'Membresía mensual',
      empleadoId: datosExtra.empleadoId,
      empleadoNombre: datosExtra.empleadoNombre,
      sedeId: datosExtra.sedeId,
      notas: datosExtra.notas || '',
      estado: 'PAGADO'
    });
  },

  registrarPagoParcial(membresiaId, clienteId, clienteNombre, monto, metodoPago, datosExtra = {}) {
    return this.crear({
      clienteId,
      clienteNombre,
      membresiaId,
      valorTotal: datosExtra.valorTotal || monto,
      valorAplicado: monto,
      metodoPago,
      concepto: 'PAGO_PARCIAL',
      conceptoDetalle: `Pago parcial de ${monto.toLocaleString('es-CO')}`,
      empleadoId: datosExtra.empleadoId,
      empleadoNombre: datosExtra.empleadoNombre,
      sedeId: datosExtra.sedeId,
      notas: datosExtra.notas || '',
      estado: 'PARCIAL'
    });
  },

  registrarVentaProducto(clienteId, clienteNombre, items, metodoPago, datosExtra = {}) {
    const total = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    return this.crear({
      clienteId,
      clienteId: clienteId || null,
      clienteNombre: clienteNombre || 'Cliente General',
      valorTotal: total,
      valorAplicado: total,
      metodoPago,
      concepto: 'PRODUCTO',
      conceptoDetalle: items.map(i => `${i.nombre} x${i.cantidad}`).join(', '),
      empleadoId: datosExtra.empleadoId,
      empleadoNombre: datosExtra.empleadoNombre,
      sedeId: datosExtra.sedeId,
      impuestos: { base: total, iva: 0, retefuente: 0 },
      estado: 'PAGADO'
    });
  },

  anular(pagoId, motivo) {
    const pagos = cargar();
    const idx = pagos.findIndex(p => p.id === pagoId);
    if (idx === -1) throw new Error("Pago no encontrado");
    pagos[idx].estado = 'ANULADO';
    pagos[idx].motivoAnulacion = motivo;
    pagos[idx].fechaAnulacion = new Date().toISOString();
    guardar(pagos);
    return pagos[idx];
  },

  reembolsar(pagoId, valor, motivo) {
    const pagos = cargar();
    const idx = pagos.findIndex(p => p.id === pagoId);
    if (idx === -1) throw new Error("Pago no encontrado");
    pagos[idx].estado = 'REEMBOLSADO';
    pagos[idx].valorReembolsado = valor;
    pagos[idx].motivoReembolso = motivo;
    pagos[idx].fechaReembolso = new Date().toISOString();
    guardar(pagos);
    return pagos[idx];
  },

  estadisticas() {
    const pagos = cargar().filter(p => p.estado !== 'ANULADO');
    const mesActual = fechaLocalISO().slice(0, 7);
    const pagosMes = pagos.filter(p => p.fecha?.startsWith(mesActual));
    
    return {
      total: pagos.length,
      pagados: pagos.filter(p => p.estado === 'PAGADO').length,
      parciales: pagos.filter(p => p.estado === 'PARCIAL').length,
      anulados: pagos.filter(p => p.estado === 'ANULADO').length,
      totalMonto: pagos.reduce((sum, p) => sum + (p.valorAplicado || 0), 0),
      montoMes: pagosMes.reduce((sum, p) => sum + (p.valorAplicado || 0), 0),
      porMetodo: {
        efectivo: pagos.filter(p => p.metodoPago === 'EFECTIVO').reduce((s, p) => s + (p.valorAplicado || 0), 0),
        debito: pagos.filter(p => p.metodoPago === 'DEBITO').reduce((s, p) => s + (p.valorAplicado || 0), 0),
        credito: pagos.filter(p => p.metodoPago === 'CREDITO').reduce((s, p) => s + (p.valorAplicado || 0), 0),
        transferencia: pagos.filter(p => p.metodoPago === 'TRANSFERENCIA').reduce((s, p) => s + (p.valorAplicado || 0), 0),
        pse: pagos.filter(p => p.metodoPago === 'PSE').reduce((s, p) => s + (p.valorAplicado || 0), 0),
        qr: pagos.filter(p => p.metodoPago === 'QR').reduce((s, p) => s + (p.valorAplicado || 0), 0),
      }
    };
  }
};

export default pagosService;
