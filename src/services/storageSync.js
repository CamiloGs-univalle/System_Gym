// ============================================================
// ARCHIVO: src/services/storageSync.js
// Guarda en la base de datos (backend) la información de los módulos
// que antes vivía solo en localStorage: planes, cartera, pagos, accesos,
// promociones, rachas, historial de nómina y configuración.
//
// - localStorage sigue funcionando como caché para lectura inmediata.
// - Al iniciar sesión se descarga lo guardado en el servidor (hidratar).
// - Cada escritura se envía al servidor (con un pequeño retraso para agrupar).
// ============================================================

import api from './api';

export const SYNC_KEYS = [
  'gymcore_accesos', 'gymcore_cartera', 'gymcore_membresias', 'gymcore_pagos',
  'gymcore_planes', 'gymcore_promociones', 'gymcore_streaks',
  'gymcore_nomina_historial', 'gymcore_nomina_pagos',
  'gym_configuracion', 'gym_membresias',
];

const timers = {};

function enviar(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return;
  let value;
  try { value = JSON.parse(raw); } catch { return; }
  api.put(`/storage/${key}`, value).catch((error) => {
    // Un recepcionista no puede modificar datos de administración (403):
    // en ese caso el cambio queda solo local, igual que antes.
    if (error?.status !== 403) {
      console.error(`No se pudo guardar "${key}" en el servidor`, error?.mensajeUsuario || error?.message);
    }
  });
}

/**
 * Guarda un valor en localStorage y lo envía al servidor.
 */
export function guardarSincronizado(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (!SYNC_KEYS.includes(key)) return;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => enviar(key), 400);
}

/**
 * Descarga del servidor los datos guardados y los deja en localStorage.
 * Si el servidor aún no tiene una clave pero este equipo sí, la sube
 * (migración de instalaciones anteriores).
 */
export async function hidratarAlmacenamiento() {
  try {
    const response = await api.get('/storage');
    const remoto = response.data?.data || {};
    for (const key of SYNC_KEYS) {
      if (Object.prototype.hasOwnProperty.call(remoto, key) && remoto[key] != null) {
        localStorage.setItem(key, JSON.stringify(remoto[key]));
      } else if (localStorage.getItem(key) != null) {
        enviar(key);
      }
    }
    return true;
  } catch (error) {
    console.error('No se pudo descargar la información guardada en el servidor', error?.message);
    return false;
  }
}
