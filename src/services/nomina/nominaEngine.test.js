import { describe, it, expect } from 'vitest';
import {
  clasificarHorasTurno, calcularRecargoHora, esHoraNocturna, obtenerParametro, calcularDeducciones,
} from './nominaEngine';

describe('hora nocturna (Ley 2466 de 2025)', () => {
  it('desde el 25-dic-2025 empieza a las 7:00 p. m.', () => {
    expect(esHoraNocturna(19, '2026-11-12')).toBe(true);
    expect(esHoraNocturna(18.99, '2026-11-12')).toBe(false);
    expect(esHoraNocturna(5.5, '2026-11-12')).toBe(true);
    expect(esHoraNocturna(6, '2026-11-12')).toBe(false);
  });
  it('antes del 25-dic-2025 empezaba a las 9:00 p. m.', () => {
    expect(esHoraNocturna(19, '2025-06-10')).toBe(false);
    expect(esHoraNocturna(21, '2025-06-10')).toBe(true);
  });
});

describe('clasificarHorasTurno', () => {
  it('turno de tarde 14:00-22:00 con jornada de 7 h', () => {
    expect(clasificarHorasTurno('2026-11-12', '14:00', '22:00', 7)).toEqual({
      ordDiurnas: 5, ordNocturnas: 2, extraDiurnas: 0, extraNocturnas: 1,
    });
  });
  it('turno que pasa la medianoche 22:00-06:00', () => {
    expect(clasificarHorasTurno('2026-11-12', '22:00', '06:00', 8)).toEqual({
      ordDiurnas: 0, ordNocturnas: 8, extraDiurnas: 0, extraNocturnas: 0,
    });
  });
  it('turno de mañana sin horas nocturnas', () => {
    expect(clasificarHorasTurno('2026-11-12', '06:00', '14:00', 8).ordDiurnas).toBe(8);
  });
});

describe('recargos por fecha', () => {
  it('el recargo dominical sube por etapas', () => {
    expect(obtenerParametro('RECARGO_DOMINICAL', '2025-08-01')).toBe(0.8);
    expect(obtenerParametro('RECARGO_DOMINICAL', '2026-11-13')).toBe(0.9);
    expect(obtenerParametro('RECARGO_DOMINICAL', '2027-08-01')).toBe(1);
  });
  it('domingo nocturno suma dominical y nocturno', () => {
    // 15-nov-2026 es domingo
    expect(calcularRecargoHora('2026-11-15', '20:00')).toEqual({ tipo: 'DOMINICAL_NOCTURNA', recargo: 1.25, factor: 2.25 });
    expect(calcularRecargoHora('2026-11-15', '10:00').recargo).toBe(0.9);
    expect(calcularRecargoHora('2026-11-12', '19:30').tipo).toBe('NOCTURNA');
    expect(calcularRecargoHora('2026-11-12', '18:30').tipo).toBe('DIURNA');
  });
});

describe('deducciones del trabajador', () => {
  it('salud y pensión 4 % cada una', () => {
    const d = calcularDeducciones(1750905, 0, [], '2026-11-13');
    expect(d.salud).toBe(70036);
    expect(d.pension).toBe(70036);
  });
});
