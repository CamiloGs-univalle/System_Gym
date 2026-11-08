import { guardarSincronizado } from '../storageSync';
// ============================================================
// SERVICIO DE DESCUENTOS Y PROMOCIONES
// Tipos: PORCENTAJE | VALOR_FIJO | 2X1 | PRIMER_MES | REFERIDO | LEALTAD | ESTUDIANTE | CORPORATIVO
// ============================================================

const STORAGE_KEY = 'gymcore_promociones';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch { return []; }
}

function guardar(promos) {
  guardarSincronizado(STORAGE_KEY, promos);
}

function hoy() { return new Date().toISOString().split('T')[0]; }

const PROMOS_DEFAULT = [
  { id: 1, codigo: "ESTUDIANTE20", nombre: "Descuento Estudiantes", tipo: "PORCENTAJE", porcentaje: 20, aplicable: "PLANES", condiciones: { segmento: "ESTUDIANTE" }, vigenciaInicio: "2026-01-01", vigenciaFin: "2026-12-31", usosMaximos: 100, usosActuales: 0, combinable: false, autorizacionRequerida: false, estado: "ACTIVA" },
  { id: 2, codigo: "REFERIDO", nombre: "Descuento por Referido", tipo: "PORCENTAJE", porcentaje: 15, aplicable: "PLANES", condiciones: { tipoReferido: "CLIENTE" }, vigenciaInicio: "2026-01-01", vigenciaFin: null, usosMaximos: null, usosActuales: 0, combinable: false, autorizacionRequerida: false, estado: "ACTIVA" },
  { id: 3, codigo: "NUEVO10", nombre: "Descuento Primer Mes", tipo: "PRIMER_MES", porcentaje: 10, aplicable: "PLANES", condiciones: { esNuevo: true }, vigenciaInicio: "2026-01-01", vigenciaFin: "2026-12-31", usosMaximos: null, usosActuales: 0, combinable: false, autorizacionRequerida: false, estado: "ACTIVA" },
  { id: 4, codigo: "CORPORATIVO", nombre: "Plan Corporativo", tipo: "PORCENTAJE", porcentaje: 25, aplicable: "PLANES", condiciones: { segmento: "CORPORATIVO" }, vigenciaInicio: "2026-01-01", vigenciaFin: null, usosMaximos: null, usosActuales: 0, combinable: false, autorizacionRequerida: true, estado: "ACTIVA" },
  { id: 5, codigo: "BLACKFRIDAY", nombre: "Black Friday 2026", tipo: "PORCENTAJE", porcentaje: 30, aplicable: "TODO", condiciones: {}, vigenciaInicio: "2026-11-25", vigenciaFin: "2026-11-30", usosMaximos: 50, usosActuales: 0, combinable: false, autorizacionRequerida: false, estado: "ACTIVA" },
];

export const promocionesService = {
  listar() {
    const promos = cargar();
    if (promos.length === 0) {
      guardar(PROMOS_DEFAULT);
      return [...PROMOS_DEFAULT];
    }
    return promos;
  },

  obtenerPorId(id) {
    return cargar().find(p => p.id === id) || null;
  },

  obtenerPorCodigo(codigo) {
    return cargar().find(p => p.codigo === codigo && p.estado === 'ACTIVA') || null;
  },

  aplicablesA(planId, tipoCliente) {
    const hoy_ = hoy();
    return cargar().filter(p => {
      if (p.estado !== 'ACTIVA') return false;
      if (p.vigenciaInicio && hoy_ < p.vigenciaInicio) return false;
      if (p.vigenciaFin && hoy_ > p.vigenciaFin) return false;
      if (p.usosMaximos && p.usosActuales >= p.usosMaximos) return false;
      if (p.aplicable !== 'TODO' && p.aplicable !== 'PLANES') return false;
      return true;
    });
  },

  calcularDescuento(promocion, precio) {
    if (!promocion) return { descuento: 0, precioFinal: precio };
    let descuento = 0;
    if (promocion.tipo === 'PORCENTAJE' || promocion.tipo === 'PRIMER_MES' || promocion.tipo === 'ESTUDIANTE' || promocion.tipo === 'CORPORATIVO' || promocion.tipo === 'REFERIDO') {
      descuento = precio * (promocion.porcentaje / 100);
    } else if (promocion.tipo === 'VALOR_FIJO') {
      descuento = promocion.valor || 0;
    } else if (promocion.tipo === '2X1') {
      descuento = precio / 2;
    }
    const precioFinal = Math.max(0, precio - descuento);
    return { descuento: Math.round(descuento), precioFinal: Math.round(precioFinal) };
  },

  registrarUso(promocionId) {
    const promos = cargar();
    const idx = promos.findIndex(p => p.id === promocionId);
    if (idx === -1) return;
    promos[idx].usosActuales = (promos[idx].usosActuales || 0) + 1;
    if (promos[idx].usosMaximos && promos[idx].usosActuales >= promos[idx].usosMaximos) {
      promos[idx].estado = 'AGOTADA';
    }
    guardar(promos);
  },

  crear(datos) {
    const promos = cargar();
    const nueva = {
      ...datos,
      id: promos.length > 0 ? Math.max(...promos.map(p => p.id)) + 1 : 1,
      usosActuales: 0,
      estado: 'ACTIVA',
      creadoEn: new Date().toISOString()
    };
    promos.push(nueva);
    guardar(promos);
    return nueva;
  },

  actualizar(id, datos) {
    const promos = cargar();
    const idx = promos.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Promoción no encontrada");
    promos[idx] = { ...promos[idx], ...datos };
    guardar(promos);
    return promos[idx];
  },

  eliminar(id) {
    const promos = cargar();
    const idx = promos.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Promoción no encontrada");
    promos[idx].estado = 'CANCELADA';
    guardar(promos);
    return promos[idx];
  }
};

export default promocionesService;
