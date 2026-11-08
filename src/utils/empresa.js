// Datos del gimnasio tomados de Configuración (para boletas y reportes).
export function datosEmpresa() {
  try {
    const cfg = JSON.parse(localStorage.getItem('gym_configuracion') || '{}');
    return {
      nombre: cfg.nombreGimnasio || 'Mi gimnasio',
      nit: cfg.nit || '',
      direccion: cfg.direccion || '',
    };
  } catch {
    return { nombre: 'Mi gimnasio', nit: '', direccion: '' };
  }
}
