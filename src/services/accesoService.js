// ============================================================
// Ingresos de clientes, fotos y huellas
// ============================================================
import api from './api';
import { streakService } from './gimnasio/streakService';

const datos = (r) => r?.data?.data ?? r?.data ?? null;

export const accesoService = {
  /** Registra un ingreso. Por huella: { clientId, method: 'FINGERPRINT' }; por cédula: { dni, method: 'DNI' } */
  async registrarIngreso({ clientId = null, dni = null, method = 'MANUAL' }) {
    const resultado = datos(await api.post('/access/check-in', { clientId, dni, method }));
    // La racha de asistencia se cuenta solo con ingresos permitidos
    if (resultado?.granted && resultado?.client?.id) {
      try { streakService.registrarAsistencia(resultado.client.id); } catch { /* no bloquea el ingreso */ }
    }
    return resultado;
  },

  /** Ingresos de un día (AAAA-MM-DD); por defecto hoy */
  async delDia(fecha = null) {
    try {
      const r = await api.get('/access', { params: fecha ? { date: fecha } : {} });
      return datos(r) || [];
    } catch {
      return [];
    }
  },

  // ---------- Fotos ----------
  async guardarFoto(clienteId, dataUrl) {
    return datos(await api.put(`/clients/${clienteId}/photo`, { image: dataUrl }));
  },

  async eliminarFoto(clienteId) {
    return datos(await api.delete(`/clients/${clienteId}/photo`));
  },

  /** Descarga la foto como blob (la API pide token, por eso no se usa <img src> directo) */
  async fotoBlob(clienteId) {
    const r = await api.get(`/clients/${clienteId}/photo`, { responseType: 'blob' });
    return r.data;
  },

  // ---------- Huellas ----------
  async huellasDe(clienteId) {
    try {
      return datos(await api.get(`/biometrics/clients/${clienteId}`)) || [];
    } catch {
      return [];
    }
  },

  async registrarHuella(clienteId, { finger, template, vendor, consent }) {
    return datos(await api.post(`/biometrics/clients/${clienteId}`, { finger, template, vendor, consent }));
  },

  async eliminarHuella(clienteId, finger) {
    return datos(await api.delete(`/biometrics/clients/${clienteId}/${finger}`));
  },

  async plantillas() {
    return datos(await api.get('/biometrics/templates')) || [];
  },
};

export default accesoService;
