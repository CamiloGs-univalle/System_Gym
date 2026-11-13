import { guardarSincronizado } from '../storageSync';
// ============================================================
// SERVICIO DE PLANES - Modelo expandido
// Almacena en localStorage como fuente primaria,
// sincroniza con backend cuando disponible
// ============================================================

const STORAGE_KEY = 'gymcore_planes';

const PLANES_DEFAULT = [
  { id: 1, nombre: "Mensual Básico", tipo: "MEMBRESIA", categoria: "MUSCULACION", precio: 80000, duracion: 30, unidadDuracion: "DIAS", renovacion: "MANUAL", accesosIncluidos: ["MUSCULACION"], serviciosIncluidos: [], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 2, nombre: "Mensual Full", tipo: "MEMBRESIA", categoria: "FULL", precio: 120000, duracion: 30, unidadDuracion: "DIAS", renovacion: "MANUAL", accesosIncluidos: ["MUSCULACION", "CARDIO", "CLASES_GRUPALES", "SAUNA"], serviciosIncluidos: ["TOWEL", "LOCKER"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 3, nombre: "Trimestral", tipo: "MEMBRESIA", categoria: "FULL", precio: 220000, duracion: 90, unidadDuracion: "DIAS", renovacion: "MANUAL", accesosIncluidos: ["MUSCULACION", "CARDIO", "CLASES_GRUPALES", "SAUNA"], serviciosIncluidos: ["TOWEL", "LOCKER", "PARQUEADERO"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 4, nombre: "Semestral", tipo: "MEMBRESIA", categoria: "FULL", precio: 400000, duracion: 180, unidadDuracion: "DIAS", renovacion: "MANUAL", accesosIncluidos: ["MUSCULACION", "CARDIO", "CLASES_GRUPALES", "SAUNA", "SPA"], serviciosIncluidos: ["TOWEL", "LOCKER", "PARQUEADERO"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 5, nombre: "Anual", tipo: "MEMBRESIA", categoria: "PREMIUM", precio: 750000, duracion: 365, unidadDuracion: "DIAS", renovacion: "AUTOMATICA", accesosIncluidos: ["MUSCULACION", "CARDIO", "CLASES_GRUPALES", "SAUNA", "SPA", "ZONA_VIP"], serviciosIncluidos: ["TOWEL", "LOCKER", "PARQUEADERO", "INVITADOS"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 6, nombre: "Diario", tipo: "MEMBRESIA", categoria: "MUSCULACION", precio: 15000, duracion: 1, unidadDuracion: "DIAS", renovacion: "NO_RENOVABLE", accesosIncluidos: ["MUSCULACION", "CARDIO"], serviciosIncluidos: [], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 7, nombre: "Personal Training (12 sesiones)", tipo: "SERVICIO", categoria: "ENTRENAMIENTO_PERSONAL", precio: 300000, duracion: 12, unidadDuracion: "SESIONES", renovacion: "NO_RENOVABLE", accesosIncluidos: [], serviciosIncluidos: ["PERSONAL_TRAINING"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 30, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
  { id: 8, nombre: "Nutrición (4 sesiones)", tipo: "SERVICIO", categoria: "NUTRICION", precio: 160000, duracion: 4, unidadDuracion: "SESIONES", renovacion: "NO_RENOVABLE", accesosIncluidos: [], serviciosIncluidos: ["NUTRICION"], horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO", estado: "ACTIVO", creadoEn: "2026-01-01" },
];

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    guardarSincronizado(STORAGE_KEY, PLANES_DEFAULT);
    return [...PLANES_DEFAULT];
  } catch {
    return [...PLANES_DEFAULT];
  }
}

function guardar(planes) {
  guardarSincronizado(STORAGE_KEY, planes);
}

export const planesService = {
  listar() {
    return cargar();
  },

  obtenerPorId(id) {
    return cargar().find(p => p.id === id) || null;
  },

  filtrar(filtros = {}) {
    let planes = cargar();
    if (filtros.tipo) planes = planes.filter(p => p.tipo === filtros.tipo);
    if (filtros.categoria) planes = planes.filter(p => p.categoria === filtros.categoria);
    if (filtros.estado) planes = planes.filter(p => p.estado === filtros.estado);
    if (filtros.sede) planes = planes.filter(p => p.sedePrincipal === filtros.sede);
    if (filtros.precioMin) planes = planes.filter(p => p.precio >= filtros.precioMin);
    if (filtros.precioMax) planes = planes.filter(p => p.precio <= filtros.precioMax);
    return planes;
  },

  crear(datos) {
    const planes = cargar();
    const nuevo = {
      ...datos,
      id: planes.length > 0 ? Math.max(...planes.map(p => p.id)) + 1 : 1,
      estado: "ACTIVO",
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
    planes.push(nuevo);
    guardar(planes);
    return nuevo;
  },

  actualizar(id, datos) {
    const planes = cargar();
    const idx = planes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Plan no encontrado");
    planes[idx] = { ...planes[idx], ...datos, actualizadoEn: new Date().toISOString() };
    guardar(planes);
    return planes[idx];
  },

  eliminar(id) {
    const planes = cargar();
    const idx = planes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Plan no encontrado");
    planes[idx].estado = "INACTIVO";
    planes[idx].actualizadoEn = new Date().toISOString();
    guardar(planes);
    return planes[idx];
  },

  /** Reemplaza la lista completa de planes (Configuración → Planes y precios) */
  guardarTodos(planes) {
    guardar(planes);
    return planes;
  },

  obtenerPrecioDiario(plan) {
    if (!plan) return 0;
    if (plan.unidadDuracion === "DIAS") return plan.precio / plan.duracion;
    if (plan.unidadDuracion === "MESES") return plan.precio / (plan.duracion * 30);
    if (plan.unidadDuracion === "SESIONES") return 0;
    return plan.precio / 30;
  }
};

export default planesService;
