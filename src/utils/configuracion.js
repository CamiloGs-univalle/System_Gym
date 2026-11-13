// ============================================================
// Configuración del gimnasio (Configuración → guardada en gym_configuracion)
// Un solo lugar para leerla con valores por defecto.
// ============================================================
export const CONFIG_DEFAULT = {
  nombreGimnasio: '',
  nit: '',
  direccion: '',
  telefono: '',
  email: '',
  horarioApertura: '05:00',
  horarioCierre: '22:00',
  diasLaborales: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  notificaciones: {
    diasAnticipacion: 5,   // desde cuántos días antes un plan se marca "por vencer"
    stockMinimoGlobal: 5,  // desde cuántas unidades un producto se marca "poco inventario"
  },
  turnos: {
    turnoCompleto: { horaInicio: '06:00', horaFin: '14:00' },
    medioTurno: { horaInicio: '06:00', horaFin: '10:00' },
    turnoTarde: { horaInicio: '14:00', horaFin: '22:00' },
  },
  actualizadoEn: null,
};

export function leerConfiguracion() {
  try {
    const cfg = JSON.parse(localStorage.getItem('gym_configuracion') || '{}') || {};
    return {
      ...CONFIG_DEFAULT,
      ...cfg,
      notificaciones: { ...CONFIG_DEFAULT.notificaciones, ...(cfg.notificaciones || {}) },
      turnos: {
        turnoCompleto: { ...CONFIG_DEFAULT.turnos.turnoCompleto, ...(cfg.turnos?.turnoCompleto || {}) },
        medioTurno: { ...CONFIG_DEFAULT.turnos.medioTurno, ...(cfg.turnos?.medioTurno || {}) },
        turnoTarde: { ...CONFIG_DEFAULT.turnos.turnoTarde, ...(cfg.turnos?.turnoTarde || {}) },
      },
    };
  } catch {
    return { ...CONFIG_DEFAULT };
  }
}

/** Días antes del vencimiento en que un plan se considera "por vencer" */
export const diasAvisoVencimiento = () => Math.max(1, Number(leerConfiguracion().notificaciones.diasAnticipacion) || 5);

/** Unidades desde las que un producto se muestra con poco inventario */
export const stockMinimoGlobal = () => Math.max(0, Number(leerConfiguracion().notificaciones.stockMinimoGlobal) || 5);
