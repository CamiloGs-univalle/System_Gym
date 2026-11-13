import { guardarSincronizado } from '../storageSync';
import { fechaLocalISO, fechaHoraLocalISO } from "../../utils/formatters";
// ============================================================
// SERVICIO DE CARTERA - Control de morosidad y cobranza
// Tramos: CORRIENTE | 1_30 | 31_60 | 61_90 | 90_MAS
// Estados: CORRIENTE | EN_GESTION | ACUERDO | JURIDICO | CASTIGADO | RECUPERADO
// ============================================================

const STORAGE_KEY = 'gymcore_cartera';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch { return []; }
}

function guardar(cartera) {
  guardarSincronizado(STORAGE_KEY, cartera);
}

function hoy() { return fechaLocalISO(); }

function diffDays(f1, f2) {
  return Math.ceil((new Date(f1) - new Date(f2)) / (1000 * 60 * 60 * 24));
}

function calcularTramo(diasMora) {
  if (diasMora <= 0) return 'CORRIENTE';
  if (diasMora <= 30) return '1_30';
  if (diasMora <= 60) return '31_60';
  if (diasMora <= 90) return '61_90';
  return '90_MAS';
}

export const carteraService = {
  listar() { return cargar(); },

  obtenerPorId(id) {
    return cargar().find(c => c.id === id) || null;
  },

  listarPorCliente(clienteId) {
    return cargar().filter(c => c.clienteId === clienteId).sort((a, b) => new Date(b.fechaVencimiento) - new Date(a.fechaVencimiento));
  },

  listarPorTramo(tramo) {
    return cargar().filter(c => c.tramo === tramo);
  },

  listarPorEstado(estado) {
    return cargar().filter(c => c.estado === estado);
  },

  crearDesdeFactura(datos) {
    const cartera = cargar();
    const nuevo = {
      id: cartera.length > 0 ? Math.max(...cartera.map(c => c.id)) + 1 : 1,
      clienteId: datos.clienteId,
      clienteNombre: datos.clienteNombre || '',
      concepto: datos.concepto || 'MEMBRESIA',
      facturaId: datos.facturaId || null,
      fechaVencimiento: datos.fechaVencimiento,
      fechaEmision: datos.fechaEmision || hoy(),
      diasMora: Math.max(0, diffDays(hoy(), datos.fechaVencimiento)),
      saldoInicial: datos.valor,
      pagosParciales: 0,
      saldoActual: datos.valor,
      tramo: 'CORRIENTE',
      gestiones: [],
      acuerdoPago: null,
      bloqueoAcceso: false,
      estado: 'CORRIENTE',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
    cartera.push(nuevo);
    guardar(cartera);
    return nuevo;
  },

  registrarPago(carteraId, valor) {
    const cartera = cargar();
    const idx = cartera.findIndex(c => c.id === carteraId);
    if (idx === -1) throw new Error("Cuenta de cartera no encontrada");
    
    const c = cartera[idx];
    const nuevosPagos = c.pagosParciales + valor;
    const nuevoSaldo = Math.max(0, c.saldoInicial - nuevosPagos);
    
    cartera[idx] = {
      ...c,
      pagosParciales: nuevosPagos,
      saldoActual: nuevoSaldo,
      estado: nuevoSaldo <= 0 ? 'RECUPERADO' : c.estado,
      actualizadoEn: new Date().toISOString()
    };
    guardar(cartera);
    return cartera[idx];
  },

  registrarGestion(carteraId, gestion) {
    const cartera = cargar();
    const idx = cartera.findIndex(c => c.id === carteraId);
    if (idx === -1) throw new Error("Cuenta de cartera no encontrada");
    
    const nuevaGestion = {
      id: (cartera[idx].gestiones?.length || 0) + 1,
      fecha: fechaHoraLocalISO(),
      tipo: gestion.tipo || 'LLAMADA',
      resultado: gestion.resultado || '',
      compromiso: gestion.compromiso || '',
      proximaGestion: gestion.proximaGestion || null,
      responsable: gestion.responsable || 'Sistema',
      notas: gestion.notas || ''
    };
    
    cartera[idx].gestiones = [...(cartera[idx].gestiones || []), nuevaGestion];
    cartera[idx].estado = 'EN_GESTION';
    cartera[idx].actualizadoEn = new Date().toISOString();
    guardar(cartera);
    return cartera[idx];
  },

  crearAcuerdoPago(carteraId, acuerdo) {
    const cartera = cargar();
    const idx = cartera.findIndex(c => c.id === carteraId);
    if (idx === -1) throw new Error("Cuenta de cartera no encontrada");
    
    cartera[idx].acuerdoPago = {
      fechaCreacion: new Date().toISOString(),
      cuotas: acuerdo.cuotas || [],
      cuotasPagadas: 0,
      estado: 'ACTIVO',
      responsable: acuerdo.responsable || 'Sistema'
    };
    cartera[idx].estado = 'ACUERDO';
    cartera[idx].actualizadoEn = new Date().toISOString();
    guardar(cartera);
    return cartera[idx];
  },

  actualizarEstados() {
    const cartera = cargar();
    let actualizadas = 0;
    
    cartera.forEach((c, idx) => {
      if (c.estado === 'RECUPERADO' || c.estado === 'CASTIGADO' || c.estado === 'JURIDICO') return;
      
      const diasMora = Math.max(0, diffDays(hoy(), c.fechaVencimiento));
      const nuevoTramo = calcularTramo(diasMora);
      
      if (nuevoTramo !== c.tramo || diasMora !== c.diasMora) {
        cartera[idx].diasMora = diasMora;
        cartera[idx].tramo = nuevoTramo;
        cartera[idx].bloqueoAcceso = diasMora > 15;
        
        if (diasMora > 90 && c.estado !== 'JURIDICO') {
          cartera[idx].estado = 'JURIDICO';
        }
        actualizadas++;
      }
    });
    
    if (actualizadas > 0) guardar(cartera);
    return { actualizadas };
  },

  estadisticas() {
    const cartera = this.listar();
    const activas = cartera.filter(c => c.estado !== 'RECUPERADO' && c.estado !== 'CASTIGADO');
    
    return {
      totalCuentas: cartera.length,
      cuentasActivas: activas.length,
      totalDeuda: activas.reduce((s, c) => s + c.saldoActual, 0),
      porTramo: {
        corriente: activas.filter(c => c.tramo === 'CORRIENTE'),
        '1_30': activas.filter(c => c.tramo === '1_30'),
        '31_60': activas.filter(c => c.tramo === '31_60'),
        '61_90': activas.filter(c => c.tramo === '61_90'),
        '90_MAS': activas.filter(c => c.tramo === '90_MAS')
      },
      morosos: activas.filter(c => c.diasMora > 0).length,
      conBloqueo: activas.filter(c => c.bloqueoAcceso).length,
      recuperados: cartera.filter(c => c.estado === 'RECUPERADO').length
    };
  }
};

export default carteraService;
