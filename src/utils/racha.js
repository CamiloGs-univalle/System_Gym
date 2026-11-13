// ============================================================
// Niveles de racha (días seguidos con ingreso). La racha la calcula
// el servidor (GET /api/access/stats/{id}); aquí solo se nombra el nivel.
// ============================================================
const NIVELES_LLAMA = [
  { min: 0, max: 2, nivel: 0, nombre: 'Sin racha', color: '#9ca3af' },
  { min: 3, max: 6, nivel: 1, nombre: 'Chispa', color: '#f97316' },
  { min: 7, max: 13, nivel: 2, nombre: 'Llamita', color: '#f59e0b' },
  { min: 14, max: 29, nivel: 3, nombre: 'Fuego', color: '#ef4444' },
  { min: 30, max: 59, nivel: 4, nombre: 'Inferno', color: '#dc2626' },
  { min: 60, max: Infinity, nivel: 5, nombre: 'Legendario', color: '#7c3aed' },
];

export function obtenerNivelLlama(diasConsecutivos = 0) {
  return NIVELES_LLAMA.find((n) => diasConsecutivos >= n.min && diasConsecutivos <= n.max) || NIVELES_LLAMA[0];
}
