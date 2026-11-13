// ============================================================
// Acceso al lector de huella desde la interfaz.
// En la app de escritorio usa el puente de Electron (window.systemGym.huella).
// En el navegador (desarrollo) usa un modo simulado equivalente.
// ============================================================
const puente = () => (typeof window !== 'undefined' ? window.systemGym?.huella : null);

const aleatorio = () => {
  const bytes = new Uint8Array(48);
  (window.crypto || globalThis.crypto).getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
};

export const lectorHuella = {
  async estado() {
    const p = puente();
    if (!p) return { proveedor: 'SIMULADO', simulado: true, conectado: true, detalle: null };
    try {
      return await p.estado();
    } catch (e) {
      return { proveedor: 'DESCONOCIDO', simulado: true, conectado: false, detalle: e.message };
    }
  },

  async capturarRegistro() {
    const p = puente();
    if (!p) {
      await new Promise((r) => setTimeout(r, 1200));
      return { ok: true, vendor: 'SIMULADO', template: aleatorio(), calidad: 100 };
    }
    return p.capturarRegistro();
  },

  async cargarPlantillas(plantillas) {
    const p = puente();
    return p ? p.cargarPlantillas(plantillas) : { ok: true, cargadas: plantillas.length };
  },

  async identificar(timeoutMs = 15000) {
    const p = puente();
    return p ? p.identificar(timeoutMs) : { ok: false, soportado: false };
  },

  async cancelar() {
    const p = puente();
    if (p) await p.cancelar();
  },
};

export const DEDOS = [
  { id: 'RIGHT_INDEX', label: 'Índice derecho' },
  { id: 'RIGHT_THUMB', label: 'Pulgar derecho' },
  { id: 'RIGHT_MIDDLE', label: 'Medio derecho' },
  { id: 'LEFT_INDEX', label: 'Índice izquierdo' },
  { id: 'LEFT_THUMB', label: 'Pulgar izquierdo' },
  { id: 'LEFT_MIDDLE', label: 'Medio izquierdo' },
];

export const nombreDedo = (id) =>
  DEDOS.find((d) => d.id === id)?.label || String(id || '').replace('_', ' ').toLowerCase();

export default lectorHuella;
