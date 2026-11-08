import { guardarSincronizado } from '../storageSync';
// ============================================================
// SERVICIO DE ACCESOS / ASISTENCIA
// Control de entrada/salida al gimnasio
// Estados: PERMITIDO | DENEGADO
// ============================================================

const STORAGE_KEY = 'gymcore_accesos';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch { return []; }
}

function guardar(accesos) {
  guardarSincronizado(STORAGE_KEY, accesos);
}

export const accesosService = {
  listar() { return cargar(); },

  listarPorCliente(clienteId) {
    return cargar().filter(a => a.clienteId === clienteId).sort((a, b) => new Date(b.fechaEntrada) - new Date(a.fechaEntrada));
  },

  listarPorFecha(fecha) {
    return cargar().filter(a => a.fechaEntrada?.startsWith(fecha));
  },

  listarPorSede(sedeId, fecha) {
    return cargar().filter(a => a.sedeId === sedeId && (!fecha || a.fechaEntrada?.startsWith(fecha)));
  },

  registrarEntrada(datos) {
    const accesos = cargar();
    
    // Verificar si hay una entrada abierta (sin salida)
    const entradaAbierta = accesos.find(a => a.clienteId === datos.clienteId && !a.fechaSalida);
    if (entradaAbierta) {
      return { exito: false, motivo: 'Ya tiene una entrada registrada sin salida', acceso: entradaAbierta };
    }
    
    const nuevo = {
      id: accesos.length > 0 ? Math.max(...accesos.map(a => a.id)) + 1 : 1,
      clienteId: datos.clienteId,
      clienteNombre: datos.clienteNombre || '',
      membresiaId: datos.membresiaId || null,
      sedeId: datos.sedeId || 1,
      fechaEntrada: datos.fechaEntrada || new Date().toISOString(),
      fechaSalida: null,
      puntoAcceso: datos.puntoAcceso || 'RECEPCION',
      empleadoValidadorId: datos.empleadoId || null,
      empleadoValidadorNombre: datos.empleadoNombre || '',
      resultado: 'PERMITIDO',
      motivoDenegado: null,
      tipoVisita: datos.tipoVisita || 'ENTRENAMIENTO',
      duracion: 0,
      dispositivo: datos.dispositivo || 'WEB'
    };
    
    accesos.push(nuevo);
    guardar(accesos);
    return { exito: true, acceso: nuevo };
  },

  registrarSalida(accesoId) {
    const accesos = cargar();
    const idx = accesos.findIndex(a => a.id === accesoId);
    if (idx === -1) throw new Error("Acceso no encontrado");
    
    const entrada = new Date(accesos[idx].fechaEntrada);
    const salida = new Date();
    const duracionMs = salida - entrada;
    const duracionMin = Math.round(duracionMs / (1000 * 60));
    
    accesos[idx].fechaSalida = salida.toISOString();
    accesos[idx].duracion = duracionMin;
    guardar(accesos);
    return accesos[idx];
  },

  validarAcceso(clienteId, membresia, sede) {
    if (!membresia) return { permitido: false, motivo: 'SIN_MEMBRESIA' };
    
    const estadosPermitidos = ['ACTIVA', 'POR_VENCER'];
    if (!estadosPermitidos.includes(membresia.estado)) {
      return { permitido: false, motivo: `MEMBRESIA_${membresia.estado}` };
    }
    
    if (membresia.bloqueoAcceso) {
      return { permitido: false, motivo: 'ACCESO_BLOQUEADO' };
    }
    
    return { permitido: true, membresiaId: membresia.id, plan: membresia.planNombre };
  },

  estadisticas() {
    const accesos = cargar();
    const hoy_ = new Date().toISOString().split('T')[0];
    const accesosHoy = accesos.filter(a => a.fechaEntrada?.startsWith(hoy_));
    
    return {
      total: accesos.length,
      hoy: accesosHoy.length,
      unicosHoy: new Set(accesosHoy.map(a => a.clienteId)).size,
      duracionPromedio: accesosHoy.filter(a => a.duracion > 0).reduce((s, a) => s + a.duracion, 0) / (accesosHoy.filter(a => a.duracion > 0).length || 1),
      porDia: accesos.reduce((acc, a) => {
        const dia = a.fechaEntrada?.split('T')[0];
        if (dia) acc[dia] = (acc[dia] || 0) + 1;
        return acc;
      }, {})
    };
  }
};

export default accesosService;
