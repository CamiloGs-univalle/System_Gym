import { guardarSincronizado } from '../storageSync';
import { fechaLocalISO } from "../../utils/formatters";
// ============================================================
// SERVICIO DE RACHA / CONSTANCIA DEL CLIENTE
// Calcula dias consecutivos de asistencia y asigna nivel de llama
// ============================================================

const STORAGE_KEY = 'gymcore_streaks';

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return {};
  } catch { return {}; }
}

function guardar(streaks) {
  guardarSincronizado(STORAGE_KEY, streaks);
}

function hoy() { return fechaLocalISO(); }

function diffDays(f1, f2) {
  return Math.round((new Date(f1) - new Date(f2)) / (86400000));
}

// Niveles de llama
const NIVELES_LLAMA = [
  { min: 0, max: 2, nivel: 0, nombre: 'Sin racha', color: '#9ca3af', emoji: '' },
  { min: 3, max: 6, nivel: 1, nombre: 'Chispa', color: '#f97316', emoji: '🔥' },
  { min: 7, max: 13, nivel: 2, nombre: 'Llamita', color: '#f59e0b', emoji: '🔥🔥' },
  { min: 14, max: 29, nivel: 3, nombre: 'Fuego', color: '#ef4444', emoji: '🔥🔥🔥' },
  { min: 30, max: 59, nivel: 4, nombre: 'Inferno', color: '#dc2626', emoji: '🔥🔥🔥🔥' },
  { min: 60, max: Infinity, nivel: 5, nombre: 'Legendario', color: '#7c3aed', emoji: '🔥🔥🔥🔥🔥' },
];

export function obtenerNivelLlama(diasConsecutivos) {
  return NIVELES_LLAMA.find(n => diasConsecutivos >= n.min && diasConsecutivos <= n.max) || NIVELES_LLAMA[0];
}

export const streakService = {
  registrarAsistencia(clienteId) {
    const streaks = cargar();
    const hoy_ = hoy();
    
    if (!streaks[clienteId]) {
      streaks[clienteId] = {
        clienteId,
        fechaUltimaAsistencia: hoy_,
        diasConsecutivos: 1,
        maxRacha: 1,
        totalVisitas: 1,
        historial: [hoy_]
      };
    } else {
      const s = streaks[clienteId];
      const diff = diffDays(hoy_, s.fechaUltimaAsistencia);
      
      if (diff === 0) return s; // Ya registro hoy
      
      if (diff === 1) {
        s.diasConsecutivos += 1;
      } else {
        s.diasConsecutivos = 1;
      }
      
      s.fechaUltimaAsistencia = hoy_;
      s.maxRacha = Math.max(s.maxRacha, s.diasConsecutivos);
      s.totalVisitas += 1;
      s.historial = [...(s.historial || []).slice(-29), hoy_];
    }
    
    streaks[clienteId] = { ...streaks[clienteId] };
    guardar(streaks);
    return streaks[clienteId];
  },

  obtenerStreak(clienteId) {
    const streaks = cargar();
    const s = streaks[clienteId] || {
      clienteId,
      fechaUltimaAsistencia: null,
      diasConsecutivos: 0,
      maxRacha: 0,
      totalVisitas: 0,
      historial: []
    };
    
    // Recalcular si hoy ya asistio o no
    if (s.fechaUltimaAsistencia) {
      const diff = diffDays(hoy(), s.fechaUltimaAsistencia);
      if (diff > 1) {
        s.diasConsecutivos = 0;
      }
    }
    
    const nivel = obtenerNivelLlama(s.diasConsecutivos);
    return { ...s, nivel };
  },

  obtenerRanking() {
    const streaks = cargar();
    return Object.values(streaks)
      .sort((a, b) => (b.diasConsecutivos || 0) - (a.diasConsecutivos || 0))
      .slice(0, 10)
      .map(s => ({
        ...s,
        nivel: obtenerNivelLlama(s.diasConsecutivos)
      }));
  },

  listarTodas() {
    const streaks = cargar();
    return Object.values(streaks).map(s => ({
      ...s,
      nivel: obtenerNivelLlama(s.diasConsecutivos || 0)
    }));
  }
};

export default streakService;
