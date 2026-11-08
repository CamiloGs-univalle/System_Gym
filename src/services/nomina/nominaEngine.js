import { guardarSincronizado } from '../storageSync';
// ============================================================
// MOTOR DE NÓMINA COLOMBIANA 2026
// Parametrizable por fecha (cambios legislativos)
// Ley 2466/2025 - Jornada 42h desde julio 2026
// Recargo dominical/festivo 90% desde julio 2026
// ============================================================

// ============================================================
// TABLA DE PARÁMETROS POR FECHA
// Cada regla tiene vigenciaDesde y opcionalmente vigenciaHasta
// El motor busca la regla VIGENTE para una fecha dada
// ============================================================

const PARAMETROS = [
  // 2026: SMMLV $1.750.905 y auxilio de transporte $249.095 (decretos de diciembre de 2025).
  // Verificar contra el decreto vigente cada enero y agregar la fila del año nuevo.
  { codigo: 'SMMLV', descripcion: 'Salario Mínimo Mensual Legal Vigente', vigenciaDesde: '2026-01-01', valor: 1750905 },
  { codigo: 'SMMLV', descripcion: 'Salario Mínimo Mensual Legal Vigente', vigenciaDesde: '2025-01-01', vigenciaHasta: '2025-12-31', valor: 1300000 },
  { codigo: 'AUXILIO_TRANSPORTE', descripcion: 'Auxilio de transporte', vigenciaDesde: '2026-01-01', valor: 249095 },
  { codigo: 'AUXILIO_TRANSPORTE', descripcion: 'Auxilio de transporte', vigenciaDesde: '2025-01-01', vigenciaHasta: '2025-12-31', valor: 162000 },
  // UVT: 2024 $47.065, 2025 $49.799, 2026 $52.374 (verificar contra la resolución DIAN de cada año)
  { codigo: 'UVT', descripcion: 'Unidad de Valor Tributario', vigenciaDesde: '2026-01-01', valor: 52374 },
  { codigo: 'UVT', descripcion: 'Unidad de Valor Tributario', vigenciaDesde: '2025-01-01', vigenciaHasta: '2025-12-31', valor: 49799 },
  { codigo: 'JORNADA_MAX_SEMANAL', descripcion: 'Jornada máxima semanal', vigenciaDesde: '2026-07-15', valor: 42 },
  { codigo: 'JORNADA_MAX_SEMANAL', descripcion: 'Jornada máxima semanal', vigenciaDesde: '2025-01-01', vigenciaHasta: '2026-07-14', valor: 48 },
  { codigo: 'DIVISOR_HORAS_MES', descripcion: 'Divisor horas mensuales', vigenciaDesde: '2026-07-15', valor: 182 },
  { codigo: 'DIVISOR_HORAS_MES', descripcion: 'Divisor horas mensuales', vigenciaDesde: '2025-01-01', vigenciaHasta: '2026-07-14', valor: 208 },
  { codigo: 'RECARGO_HE_DIURNA', descripcion: 'Recargo hora extra diurna', vigenciaDesde: '2025-01-01', valor: 0.25 },
  { codigo: 'RECARGO_HE_NOCTURNA', descripcion: 'Recargo hora extra nocturna', vigenciaDesde: '2025-01-01', valor: 0.75 },
  { codigo: 'RECARGO_NOCTURNO', descripcion: 'Recargo trabajo nocturno', vigenciaDesde: '2025-01-01', valor: 0.35 },
  { codigo: 'RECARGO_DOMINICAL', descripcion: 'Recargo dominical/festivo', vigenciaDesde: '2026-07-01', vigenciaHasta: '2027-06-30', valor: 0.90 },
  { codigo: 'RECARGO_DOMINICAL', descripcion: 'Recargo dominical/festivo', vigenciaDesde: '2025-07-01', vigenciaHasta: '2026-06-30', valor: 0.80 },
  { codigo: 'RECARGO_DOMINICAL', descripcion: 'Recargo dominical/festivo', vigenciaDesde: '2027-07-01', valor: 1.00 },
  { codigo: 'LIMITE_HE_DIARIAS', descripcion: 'Máximo horas extra diarias', vigenciaDesde: '2025-07-15', valor: 2 },
  { codigo: 'LIMITE_HE_SEMANALES', descripcion: 'Máximo horas extra semanales', vigenciaDesde: '2025-07-15', valor: 12 },
  { codigo: 'SALUD_TRABAJADOR', descripcion: 'Aporte salud trabajador %', vigenciaDesde: '2025-01-01', valor: 0.04 },
  { codigo: 'PENSION_TRABAJADOR', descripcion: 'Aporte pensión trabajador %', vigenciaDesde: '2025-01-01', valor: 0.04 },
  { codigo: 'SALUD_EMPLEADOR', descripcion: 'Aporte salud empleador %', vigenciaDesde: '2025-01-01', valor: 0.085 },
  { codigo: 'PENSION_EMPLEADOR', descripcion: 'Aporte pensión empleador %', vigenciaDesde: '2025-01-01', valor: 0.12 },
  { codigo: 'CAJA_COMPENSACION', descripcion: 'Aporte caja compensación %', vigenciaDesde: '2025-01-01', valor: 0.04 },
  { codigo: 'SENA', descripcion: 'Aporte SENA %', vigenciaDesde: '2025-01-01', valor: 0.02 },
  { codigo: 'ICBF', descripcion: 'Aporte ICBF %', vigenciaDesde: '2025-01-01', valor: 0.03 },
  { codigo: 'TOPE_COTIZACION', descripcion: 'Tope cotización salarial SMMLV', vigenciaDesde: '2025-01-01', valor: 25 },
  // Prima: 30 días de salario por año (15 por semestre) = 8,33% mensual
  { codigo: 'PRIMA_SERVICIOS', descripcion: 'Prima de servicios días por año', vigenciaDesde: '2025-01-01', valor: 30 },
  { codigo: 'CESANTIAS', descripcion: 'Cesantías meses por año', vigenciaDesde: '2025-01-01', valor: 1 },
  { codigo: 'INTERESES_CESANTIAS', descripcion: 'Intereses cesantías % anual', vigenciaDesde: '2025-01-01', valor: 0.12 },
  { codigo: 'VACACIONES', descripcion: 'Días vacaciones por año', vigenciaDesde: '2025-01-01', valor: 15 },
];

// ============================================================
// FESTIVOS DE COLOMBIA (calculados para cualquier año)
// Ley 51 de 1983 (Ley Emiliani): algunos festivos se trasladan al lunes.
// Los de Semana Santa dependen de la fecha de Pascua.
// ============================================================
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function pascua(anio) {
  // Algoritmo de Meeus/Jones/Butcher
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia, 12);
}

function aLunes(fecha) {
  const d = new Date(fecha);
  const dow = d.getDay();
  if (dow !== 1) d.setDate(d.getDate() + ((8 - dow) % 7));
  return d;
}

const cacheFestivos = {};
export function festivosColombia(anio) {
  if (cacheFestivos[anio]) return cacheFestivos[anio];
  const f = (m, d) => new Date(anio, m - 1, d, 12);
  const mas = (base, dias) => { const d = new Date(base); d.setDate(d.getDate() + dias); return d; };
  const p = pascua(anio);
  const lista = [
    f(1, 1), f(5, 1), f(7, 20), f(8, 7), f(12, 8), f(12, 25),          // fijos
    aLunes(f(1, 6)), aLunes(f(3, 19)), aLunes(f(6, 29)), aLunes(f(8, 15)),
    aLunes(f(10, 12)), aLunes(f(11, 1)), aLunes(f(11, 11)),            // trasladables
    mas(p, -3), mas(p, -2),                                             // Jueves y Viernes Santo
    aLunes(mas(p, 39)), aLunes(mas(p, 60)), aLunes(mas(p, 68)),         // Ascensión, Corpus, Sagrado Corazón
  ].map(iso).sort();
  cacheFestivos[anio] = lista;
  return lista;
}

// Se mantiene el nombre anterior para la pantalla de parámetros
const FESTIVOS_2026 = festivosColombia(2026);

// Tabla retención en la fuente 2026 (simplificada)
// Tabla de retención para pagos laborales MENSUALES (Art. 383 E.T.), en UVT.
// impuesto = (base - desde) * tarifa + fijo
const TABLA_RETENCION_2026 = [
  { desde: 0, hasta: 95, tarifa: 0, fijo: 0 },
  { desde: 95, hasta: 150, tarifa: 0.19, fijo: 0 },
  { desde: 150, hasta: 360, tarifa: 0.28, fijo: 10 },
  { desde: 360, hasta: 640, tarifa: 0.33, fijo: 69 },
  { desde: 640, hasta: 945, tarifa: 0.35, fijo: 162 },
  { desde: 945, hasta: 2300, tarifa: 0.37, fijo: 268 },
  { desde: 2300, hasta: Infinity, tarifa: 0.39, fijo: 770 },
];

// Tabla ARL por nivel de riesgo 2026 (un gimnasio suele ser riesgo 1 o 2)
const TABLA_ARL = [
  { riesgo: 1, tarifa: 0.00522 },
  { riesgo: 2, tarifa: 0.01044 },
  { riesgo: 3, tarifa: 0.02436 },
  { riesgo: 4, tarifa: 0.04356 },
  { riesgo: 5, tarifa: 0.06960 },
];

// ============================================================
// FUNCIÓN PRINCIPAL: OBTENER PARÁMETRO VIGENTE
// ============================================================
export function obtenerParametro(codigo, fecha) {
  const fechaEval = fecha || new Date().toISOString().split('T')[0];
  const params = PARAMETROS
    .filter(p => p.codigo === codigo && p.vigenciaDesde <= fechaEval)
    .filter(p => !p.vigenciaHasta || p.vigenciaHasta >= fechaEval)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));
  return params.length > 0 ? params[0].valor : null;
}

export function esFestivo(fecha) {
  const f = typeof fecha === 'string' ? fecha.slice(0, 10) : iso(fecha);
  return festivosColombia(parseInt(f.slice(0, 4), 10)).includes(f);
}

export function esDominical(fecha) {
  const f = typeof fecha === 'string' ? new Date(fecha + 'T12:00:00') : fecha;
  return f.getDay() === 0;
}

export function esDescansoObligatorio(fecha) {
  return esDominical(fecha) || esFestivo(fecha);
}

// ============================================================
// CÁLCULO DE HORA ORDINARIA
// ============================================================
export function calcularValorHoraOrdinaria(salarioMensual, fecha, jornadaSemanal = null, incluyeAuxTransporte = false) {
  // El salario NO incluye el auxilio de transporte: no se le resta nada.
  // (Antes se restaba el auxilio y la hora extra salía más barata de lo legal.)
  const divisor = jornadaSemanal || obtenerParametro('DIVISOR_HORAS_MES', fecha) || 208;
  return salarioMensual / divisor;
}

// ============================================================
// CÁLCULO DE RECARGOS
// ============================================================
export function calcularRecargoHora(fecha, horaInicio) {
  const horaNum = typeof horaInicio === 'string' ? parseInt(horaInicio.split(':')[0], 10) : horaInicio;
  const esNocturna = horaNum >= 21 || horaNum < 6;
  const dominicalesFestivos = esDescansoObligatorio(fecha);

  if (dominicalesFestivos && esNocturna) return { tipo: 'DOMINICAL_NOCTURNA', recargo: 0.90, factor: 1.90 };
  if (dominicalesFestivos && !esNocturna) return { tipo: 'DOMINICAL_DIURNA', recargo: 0.90, factor: 1.90 };
  if (esNocturna) return { tipo: 'NOCTURNA', recargo: 0.35, factor: 1.35 };
  return { tipo: 'DIURNA', recargo: 0, factor: 1.0 };
}

export function calcularFactorHoraExtra(esNocturna, fecha) {
  if (esNocturna) {
    const domRecargo = esDescansoObligatorio(fecha) ? obtenerParametro('RECARGO_DOMINICAL', fecha) : 0;
    const heRecargo = obtenerParametro('RECARGO_HE_NOCTURNA', fecha);
    // Los recargos son EXCLUSIVOS, se paga el MAYOR
    if (domRecargo > heRecargo) return 1 + domRecargo;
    return 1 + heRecargo;
  }
  if (esDescansoObligatorio(fecha)) {
    return 1 + obtenerParametro('RECARGO_DOMINICAL', fecha);
  }
  return 1 + obtenerParametro('RECARGO_HE_DIURNA', fecha);
}

// ============================================================
// CÁLCULO DE BASES DE COTIZACIÓN
// ============================================================
export function calcularBasesCotizacion(devengados) {
  const topeMensual = (obtenerParametro('TOPE_COTIZACION', devengados.fecha) || 25) *
    (obtenerParametro('SMMLV', devengados.fecha) || 1300000);

  // IBC salud/pensión/ARL: lo que es salario. El auxilio de transporte NO cotiza.
  const baseSaludPension = Math.min(
    (devengados.salarioBase || 0) +
    (devengados.horasExtras || 0) +
    (devengados.recargos || 0) +
    (devengados.comisiones || 0) +
    (devengados.bonosSalariales || 0),
    topeMensual
  );

  const basePrestaciones = Math.min(
    (devengados.salarioBase || 0) +
    (devengados.promedioHE || 0) +
    (devengados.promedioRecargos || 0) +
    (devengados.comisiones || 0) +
    (devengados.bonosSalariales || 0),
    topeMensual
  );

  const baseARL = Math.min(baseSaludPension, topeMensual);

  return { baseSaludPension, basePrestaciones, baseARL, topeMensual };
}

// ============================================================
// CÁLCULO DE APORTES EMPLEADOR
// opciones.exonerado: empresa exonerada (Art. 114-1 E.T.) de salud 8,5%, SENA e ICBF
// para trabajadores que ganan menos de 10 SMMLV. Se configura en Nómina → Configuración.
// ============================================================
export function calcularAportesEmpleador(baseSaludPension, baseARL, riesgoARL = 1, fecha = null, opciones = {}) {
  const smmlv = obtenerParametro('SMMLV', fecha) || 1300000;
  const exonera = opciones.exonerado === true && baseSaludPension < smmlv * 10;

  const salud = exonera ? 0 : baseSaludPension * (obtenerParametro('SALUD_EMPLEADOR', fecha) || 0.085);
  const pension = baseSaludPension * (obtenerParametro('PENSION_EMPLEADOR', fecha) || 0.12);
  const caja = baseSaludPension * (obtenerParametro('CAJA_COMPENSACION', fecha) || 0.04);
  const sena = exonera ? 0 : baseSaludPension * (obtenerParametro('SENA', fecha) || 0.02);
  const icbf = exonera ? 0 : baseSaludPension * (obtenerParametro('ICBF', fecha) || 0.03);

  const tablaRiesgo = TABLA_ARL.find(r => r.riesgo === Number(riesgoARL)) || TABLA_ARL[0];
  const arl = baseARL * tablaRiesgo.tarifa;

  return {
    salud: Math.round(salud),
    pension: Math.round(pension),
    caja: Math.round(caja),
    sena: Math.round(sena),
    icbf: Math.round(icbf),
    arl: Math.round(arl),
    arlTarifa: tablaRiesgo.tarifa,
    arlRiesgo: tablaRiesgo.riesgo,
    exonerado: exonera,
    total: Math.round(salud + pension + caja + sena + icbf + arl)
  };
}

// ============================================================
// CÁLCULO DE DEDUCCIONES TRABAJADOR
// ============================================================
export function calcularDeducciones(baseSaludPension, retencionFuente = 0, deduccionesVoluntarias = []) {
  const salud = baseSaludPension * (obtenerParametro('SALUD_TRABAJADOR') || 0.04);
  const pension = baseSaludPension * (obtenerParametro('PENSION_TRABAJADOR') || 0.04);

  const voluntarias = deduccionesVoluntarias.reduce((sum, d) => sum + (d.valor || 0), 0);

  return {
    salud: Math.round(salud),
    pension: Math.round(pension),
    retencionFuente: Math.round(retencionFuente),
    voluntarias: Math.round(voluntarias),
    total: Math.round(salud + pension + retencionFuente + voluntarias)
  };
}

// ============================================================
// PRESTACIONES SOCIALES (provisión)
// - Prima de servicios: 30 días por año → (salario + auxilio) × días / 360
// - Cesantías: 30 días por año → (salario + auxilio) × días / 360
// - Intereses de cesantías: 12% anual sobre las cesantías → cesantías × días × 12% / 360
// - Vacaciones: 15 días hábiles por año → salario (sin auxilio) × días / 720
// basePrestaciones = salario mensual (sin auxilio); auxilioTransporte se pasa aparte.
// "dias" = días trabajados del periodo (30 = un mes).
// ============================================================
export function calcularPrestaciones(basePrestaciones, mesesTrabajados = 1, fecha = null, auxilioTransporte = 0, dias = null) {
  const d = dias != null ? dias : mesesTrabajados * 30;
  const diasPrima = obtenerParametro('PRIMA_SERVICIOS', fecha) || 30;
  const diasVacaciones = obtenerParametro('VACACIONES', fecha) || 15;
  const tasaIntereses = obtenerParametro('INTERESES_CESANTIAS', fecha) || 0.12;

  const baseConAuxilio = basePrestaciones + (auxilioTransporte || 0);
  const prima = baseConAuxilio * d * (diasPrima / 30) / 360;
  const cesantias = baseConAuxilio * d / 360;
  const intereses = cesantias * tasaIntereses * d / 360;
  const vacaciones = basePrestaciones * d * (diasVacaciones / 15) / 720;

  return {
    prima: Math.round(prima),
    cesantias: Math.round(cesantias),
    interesesCesantias: Math.round(intereses),
    vacaciones: Math.round(vacaciones),
    total: Math.round(prima + cesantias + intereses + vacaciones)
  };
}

// ============================================================
// CÁLCULO RETENCIÓN EN LA FUENTE (pagos laborales mensuales, Art. 383 E.T.)
// ============================================================
export function calcularRetencionFuente(baseGravableMensual, deduccionesLey, fecha = null) {
  const uvt = obtenerParametro('UVT', fecha) || 49799;
  const baseUVT = Math.max(0, (baseGravableMensual - deduccionesLey)) / uvt;
  const tramo = TABLA_RETENCION_2026.find(t => baseUVT > t.desde && baseUVT <= t.hasta);
  if (!tramo || tramo.tarifa === 0) return 0;
  return Math.round(((baseUVT - tramo.desde) * tramo.tarifa + tramo.fijo) * uvt);
}

// ============================================================
// FUNCIÓN PRINCIPAL: LIQUIDAR NÓMINA INDIVIDUAL
// opciones.periodo = { desde, hasta, dias } → liquida solo esos días
//   (una quincena son 15 días: se paga la mitad del salario, no el mes completo).
// opciones.exonerado → ver calcularAportesEmpleador.
// empleado.tipoVinculacion = 'PRESTACION_SERVICIOS' → solo honorarios, sin
//   deducciones, aportes ni prestaciones (el contratista cotiza por su cuenta).
// ============================================================
export function liquidarNominaIndividual(empleado, novedades = {}, fecha = null, opciones = {}) {
  const fechaLiq = fecha || opciones.periodo?.hasta || new Date().toISOString().split('T')[0];
  const dias = Math.max(0, Math.min(30, opciones.periodo?.dias ?? 30));
  const fraccion = dias / 30;
  const esContratista = empleado.tipoVinculacion === 'PRESTACION_SERVICIOS';

  // 1. Devengados
  const salarioMensual = empleado.salario || empleado.baseSalary || 0;
  const salarioBase = salarioMensual * fraccion;
  const horasExtrasDiurnas = novedades.heDiurnas || 0;
  const horasExtrasNocturnas = novedades.heNocturnas || 0;
  const horasDominicales = novedades.horasDominicales || 0;
  const horasFestivos = novedades.horasFestivos || 0;
  const recargoNocturnoHoras = novedades.recargoNocturnoHoras || 0;

  const vho = calcularValorHoraOrdinaria(salarioMensual, fechaLiq);

  const valorHEDiurna = esContratista ? 0 : horasExtrasDiurnas * vho * calcularFactorHoraExtra(false, fechaLiq);
  const valorHENocturna = esContratista ? 0 : horasExtrasNocturnas * vho * calcularFactorHoraExtra(true, fechaLiq);
  const valorRecargoNocturno = esContratista ? 0 : recargoNocturnoHoras * vho * (obtenerParametro('RECARGO_NOCTURNO', fechaLiq) || 0.35);
  const recargoDom = obtenerParametro('RECARGO_DOMINICAL', fechaLiq) || 0.90;
  const valorDominicales = esContratista ? 0 : horasDominicales * vho * (1 + recargoDom);
  const valorFestivos = esContratista ? 0 : horasFestivos * vho * (1 + recargoDom);

  const bonificaciones = novedades.bonificaciones || 0;
  const comisiones = novedades.comisiones || 0;
  const smmlv = obtenerParametro('SMMLV', fechaLiq) || 1300000;
  const auxilioMensual = (!esContratista && salarioMensual <= smmlv * 2)
    ? (obtenerParametro('AUXILIO_TRANSPORTE', fechaLiq) || 0) : 0;
  const auxilioTransporte = auxilioMensual * fraccion;

  const totalDevengado = salarioBase + valorHEDiurna + valorHENocturna + valorRecargoNocturno +
    valorDominicales + valorFestivos + bonificaciones + comisiones + auxilioTransporte;

  // 2. Deducciones (IBC sin auxilio de transporte)
  const tope = (obtenerParametro('TOPE_COTIZACION', fechaLiq) || 25) * smmlv * fraccion;
  const baseSaludPension = esContratista ? 0 : Math.min(
    salarioBase + valorHEDiurna + valorHENocturna + valorRecargoNocturno + valorDominicales + valorFestivos + comisiones + bonificaciones,
    tope
  );

  const deducciones = esContratista
    ? { salud: 0, pension: 0, retencionFuente: Math.round(novedades.retencionFuente || 0), voluntarias: 0, total: Math.round(novedades.retencionFuente || 0) }
    : calcularDeducciones(baseSaludPension, novedades.retencionFuente || 0, novedades.deduccionesVoluntarias || []);

  // 3. Neto a pagar
  const netoPagar = totalDevengado - deducciones.total;

  // 4. Aportes empleador
  const aportes = esContratista
    ? { salud: 0, pension: 0, caja: 0, sena: 0, icbf: 0, arl: 0, arlTarifa: 0, arlRiesgo: 0, exonerado: false, total: 0 }
    : calcularAportesEmpleador(baseSaludPension, baseSaludPension, empleado.riesgoARL || 1, fechaLiq, opciones);

  // 5. Prestaciones (provisión de los días liquidados)
  const prestaciones = esContratista
    ? { prima: 0, cesantias: 0, interesesCesantias: 0, vacaciones: 0, total: 0 }
    : calcularPrestaciones(salarioMensual, 1, fechaLiq, auxilioMensual, dias);

  // 6. Costo total para el gimnasio
  // (lo devengado + aportes del empleador + provisión de prestaciones)
  const costoTotal = totalDevengado + aportes.total + prestaciones.total;

  return {
    empleadoId: empleado.id || empleado.empleadoId,
    empleadoNombre: empleado.nombre || empleado.fullName,
    tipoVinculacion: esContratista ? 'PRESTACION_SERVICIOS' : 'LABORAL',
    fechaLiquidacion: fechaLiq,
    periodo: {
      anio: parseInt(fechaLiq.slice(0, 4)),
      mes: parseInt(fechaLiq.slice(5, 7)),
      desde: opciones.periodo?.desde || null,
      hasta: opciones.periodo?.hasta || null,
      dias,
    },

    devengados: {
      salarioBase: Math.round(salarioBase),
      horasExtrasDiurnas: { cantidad: horasExtrasDiurnas, valor: Math.round(valorHEDiurna) },
      horasExtrasNocturnas: { cantidad: horasExtrasNocturnas, valor: Math.round(valorHENocturna) },
      recargoNocturno: { cantidad: recargoNocturnoHoras, valor: Math.round(valorRecargoNocturno) },
      dominicales: { cantidad: horasDominicales, valor: Math.round(valorDominicales) },
      festivos: { cantidad: horasFestivos, valor: Math.round(valorFestivos) },
      bonificaciones: Math.round(bonificaciones),
      comisiones: Math.round(comisiones),
      auxilioTransporte: Math.round(auxilioTransporte),
      total: Math.round(totalDevengado)
    },

    deducciones,
    netoPagar: Math.round(netoPagar),
    aportesEmpleador: aportes,
    prestaciones,
    costoTotalEmpresa: Math.round(costoTotal),

    baseCotizacion: { saludPension: Math.round(baseSaludPension), arl: Math.round(baseSaludPension) },
    vho: Math.round(vho),

    trazabilidad: {
      parametroJornada: obtenerParametro('JORNADA_MAX_SEMANAL', fechaLiq),
      parametroDivisor: obtenerParametro('DIVISOR_HORAS_MES', fechaLiq),
      parametroSMMLV: smmlv,
      parametroUVT: obtenerParametro('UVT', fechaLiq),
      parametroRecargoDominical: recargoDom,
      calculadoEn: new Date().toISOString()
    }
  };
}

// ============================================================
// LIQUIDACIÓN MENSUAL COMPLETA
// ============================================================
export function liquidarNominaMensual(empleados, novedadesPorEmpleado = {}, fecha = null, opciones = {}) {
  const resultados = empleados.map(emp => {
    const novedades = novedadesPorEmpleado[emp.id] || novedadesPorEmpleado[emp.empleadoId] || {};
    return liquidarNominaIndividual(emp, novedades, fecha, opciones);
  });

  return {
    fechaLiquidacion: fecha || new Date().toISOString().split('T')[0],
    totalEmpleados: resultados.length,
    totalDevengados: resultados.reduce((s, r) => s + r.devengados.total, 0),
    totalDeducciones: resultados.reduce((s, r) => s + r.deducciones.total, 0),
    totalNetoPagar: resultados.reduce((s, r) => s + r.netoPagar, 0),
    totalAportesEmpleador: resultados.reduce((s, r) => s + r.aportesEmpleador.total, 0),
    totalPrestaciones: resultados.reduce((s, r) => s + r.prestaciones.total, 0),
    costoTotalEmpresa: resultados.reduce((s, r) => s + r.costoTotalEmpresa, 0),
    liquidaciones: resultados,
    parametros: {
      smmlv: obtenerParametro('SMMLV', fecha),
      uvt: obtenerParametro('UVT', fecha),
      jornadaMaxima: obtenerParametro('JORNADA_MAX_SEMANAL', fecha),
      recargoDominical: obtenerParametro('RECARGO_DOMINICAL', fecha),
      calculadoEn: new Date().toISOString()
    }
  };
}

// ============================================================
// HISTORIAL / TRAZABILIDAD
// ============================================================
const STORAGE_KEY = 'gymcore_nomina_historial';
const PAGOS_KEY = 'gymcore_nomina_pagos';
const CONFIG_KEY = 'gymcore_nomina_config';

// ============================================================
// CONFIGURACIÓN DE FECHAS DE PAGO
// ============================================================
export const CONFIG_NOMINA_DEFAULT = {
  diaPagoMensual: 30,              // 30 = último día del mes
  diasPagoQuincenal: [15, 30],     // primera y segunda quincena (30 = último día)
  ajusteDiaNoHabil: 'ANTERIOR',    // si cae domingo o festivo: 'ANTERIOR', 'SIGUIENTE' o 'NINGUNO'
  diaLimitePILA: 10,               // día del mes siguiente para pagar seguridad social (según NIT)
  exonerado114: false,             // exoneración de salud, SENA e ICBF (Art. 114-1 E.T.)
  registrarComoEgreso: true,       // cada pago crea el egreso en Finanzas
};

export function leerConfigNomina() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return { ...CONFIG_NOMINA_DEFAULT, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...CONFIG_NOMINA_DEFAULT };
  }
}

export function guardarConfigNomina(config) {
  const limpio = { ...CONFIG_NOMINA_DEFAULT, ...config };
  limpio.diaPagoMensual = Math.min(30, Math.max(1, parseInt(limpio.diaPagoMensual, 10) || 30));
  limpio.diasPagoQuincenal = (limpio.diasPagoQuincenal || [15, 30]).map((d, i) =>
    Math.min(i === 0 ? 15 : 30, Math.max(1, parseInt(d, 10) || (i === 0 ? 15 : 30))));
  limpio.diaLimitePILA = Math.min(28, Math.max(1, parseInt(limpio.diaLimitePILA, 10) || 10));
  guardarSincronizado(CONFIG_KEY, limpio);
  return limpio;
}

// ============================================================
// FECHAS Y PERIODOS DE PAGO
// ============================================================
const pad = (n) => String(n).padStart(2, '0');
export const fechaISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const hoyISO = () => iso(new Date());
const ultimoDia = (y, m) => new Date(y, m, 0).getDate();
const desdeISO = (s) => new Date(`${s}T12:00:00`);

/** Suma días a una fecha ISO */
export function sumarDias(fechaStr, dias) {
  const d = desdeISO(fechaStr);
  d.setDate(d.getDate() + dias);
  return iso(d);
}

/** Días comerciales (mes de 30 días) entre dos fechas, ambas incluidas */
export function diasComerciales(desde, hasta) {
  if (!desde || !hasta || desde > hasta) return 0;
  const [y1, m1, d1raw] = desde.split('-').map(Number);
  const [y2, m2, d2raw] = hasta.split('-').map(Number);
  const d1 = Math.min(d1raw, 30);
  const d2 = (d2raw === ultimoDia(y2, m2)) ? 30 : Math.min(d2raw, 30);
  return Math.max(0, (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1);
}

/** Fecha de pago de un mes según el día configurado, ajustada si no es hábil */
export function fechaDePago(y, m, dia, ajuste = 'ANTERIOR') {
  const ud = ultimoDia(y, m);
  const d = (dia >= 30 || dia > ud) ? ud : dia;
  let f = fechaISO(y, m, d);
  if (ajuste === 'NINGUNO') return f;
  let guard = 0;
  while (esDescansoObligatorio(f) && guard++ < 10) {
    f = sumarDias(f, ajuste === 'SIGUIENTE' ? 1 : -1);
  }
  return f;
}

const esQuincenal = (emp) => (emp.frecuenciaPago || 'MENSUAL') === 'QUINCENAL';

/** Periodos de pago de un empleado en un mes (respeta la fecha de ingreso) */
export function periodosDelMes(empleado, y, m, config = leerConfigNomina()) {
  const ud = ultimoDia(y, m);
  const base = esQuincenal(empleado)
    ? [
        { desde: fechaISO(y, m, 1), hasta: fechaISO(y, m, 15), fechaPago: fechaDePago(y, m, config.diasPagoQuincenal[0], config.ajusteDiaNoHabil), etiqueta: `1ª quincena ${pad(m)}/${y}` },
        { desde: fechaISO(y, m, 16), hasta: fechaISO(y, m, ud), fechaPago: fechaDePago(y, m, config.diasPagoQuincenal[1], config.ajusteDiaNoHabil), etiqueta: `2ª quincena ${pad(m)}/${y}` },
      ]
    : [{ desde: fechaISO(y, m, 1), hasta: fechaISO(y, m, ud), fechaPago: fechaDePago(y, m, config.diaPagoMensual, config.ajusteDiaNoHabil), etiqueta: `Mes ${pad(m)}/${y}` }];

  const ingreso = empleado.fechaIngreso || null;
  return base
    .filter(p => !ingreso || ingreso <= p.hasta)
    .map(p => {
      const desde = ingreso && ingreso > p.desde ? ingreso : p.desde;
      return {
        ...p,
        desde,
        dias: diasComerciales(desde, p.hasta),
        clave: `${empleado.id}|${p.desde}`,
        empleadoId: empleado.id,
      };
    });
}

/**
 * Periodos por pagar de un empleado hasta una fecha.
 * Empieza en el periodo siguiente al último pagado; si nunca se ha pagado,
 * en el mes actual (o el mes de ingreso si es posterior).
 */
export function periodosPendientes(empleado, hastaFecha, config = leerConfigNomina()) {
  const pagados = new Set(historialNominaService.pagosEmpleado(empleado.id).map(p => p.periodoClave).filter(Boolean));
  const ultimo = historialNominaService.ultimoPagoEmpleado(empleado.id);
  let inicio = ultimo?.periodoHasta ? sumarDias(ultimo.periodoHasta, 1) : `${hoyISO().slice(0, 7)}-01`;
  if (empleado.fechaIngreso && empleado.fechaIngreso > inicio) inicio = empleado.fechaIngreso;

  const resultado = [];
  let y = parseInt(inicio.slice(0, 4), 10);
  let m = parseInt(inicio.slice(5, 7), 10);
  for (let i = 0; i < 24; i++) {
    const periodos = periodosDelMes(empleado, y, m, config);
    for (const p of periodos) {
      if (p.hasta < inicio || pagados.has(p.clave)) continue;
      if (p.fechaPago > hastaFecha) return resultado;
      resultado.push(p);
    }
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return resultado;
}

/** Próximo periodo por pagar (aunque su fecha sea futura) */
export function proximoPeriodo(empleado, config = leerConfigNomina()) {
  return periodosPendientes(empleado, '9999-12-31', config)[0] || null;
}

// ============================================================
// HISTORIAL / PAGOS
// ============================================================
export const historialNominaService = {
  listar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  guardarLiquidacion(liquidacion) {
    const historial = this.listar();
    const nueva = {
      id: historial.length > 0 ? Math.max(...historial.map(h => h.id)) + 1 : 1,
      ...liquidacion,
      guardadoEn: new Date().toISOString()
    };
    historial.push(nueva);
    guardarSincronizado(STORAGE_KEY, historial);
    return nueva;
  },

  obtenerPorId(id) {
    return this.listar().find(h => h.id === id) || null;
  },

  obtenerPorPeriodo(anio, mes) {
    return this.listar().filter(h =>
      h.periodo?.anio === anio && h.periodo?.mes === mes
    );
  },

  // ============================================================
  // PAGOS INDIVIDUALES POR EMPLEADO
  // ============================================================
  listarPagos() {
    try {
      const raw = localStorage.getItem(PAGOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  /**
   * Registra el pago de un periodo. Si no se indica periodo, se usa el
   * próximo pendiente del empleado. No permite pagar dos veces el mismo periodo.
   */
  registrarPago(empleadoId, empleadoNombre, resultado, empleado, periodo = null, extra = {}) {
    const pagos = this.listarPagos();
    const emp = empleado || { id: empleadoId, nombre: empleadoNombre };
    const per = periodo || proximoPeriodo(emp);
    if (per && pagos.some(p => p.periodoClave === per.clave)) {
      throw new Error(`El periodo ${per.etiqueta} de ${empleadoNombre} ya fue pagado.`);
    }
    const hoy = hoyISO();

    const nuevoPago = {
      id: pagos.length > 0 ? Math.max(...pagos.map(p => p.id)) + 1 : 1,
      empleadoId,
      empleadoNombre,
      fechaPago: hoy,
      periodoClave: per?.clave || null,
      periodoEtiqueta: per?.etiqueta || null,
      periodoDesde: per?.desde || null,
      periodoHasta: per?.hasta || null,
      fechaProgramada: per?.fechaPago || null,
      diasLiquidados: per?.dias ?? 30,
      frecuenciaPago: emp?.frecuenciaPago || 'MENSUAL',
      tipoVinculacion: emp?.tipoVinculacion || 'LABORAL',
      salario: emp?.salario || 0,
      netoPagar: resultado?.netoPagar || 0,
      devengados: resultado?.devengados?.total || 0,
      deducciones: resultado?.deducciones?.total || 0,
      aportesEmpleador: resultado?.aportesEmpleador?.total || 0,
      prestaciones: resultado?.prestaciones?.total || 0,
      costoTotal: resultado?.costoTotalEmpresa || 0,
      ...extra,
      registradoEn: new Date().toISOString()
    };

    pagos.push(nuevoPago);
    guardarSincronizado(PAGOS_KEY, pagos);
    return nuevoPago;
  },

  ultimoPagoEmpleado(empleadoId) {
    const pagos = this.listarPagos().filter(p => p.empleadoId === empleadoId);
    if (pagos.length === 0) return null;
    return pagos.reduce((a, b) => ((b.periodoHasta || b.fechaPago) > (a.periodoHasta || a.fechaPago) ? b : a));
  },

  /** Fecha del próximo pago. Con el empleado completo se usa el calendario configurado. */
  proximaFechaPago(empleadoId, empleado = null) {
    if (empleado) {
      return proximoPeriodo(empleado)?.fechaPago || null;
    }
    const ultimo = this.ultimoPagoEmpleado(empleadoId);
    if (!ultimo) return null;
    const emp = { id: empleadoId, frecuenciaPago: ultimo.frecuenciaPago };
    return proximoPeriodo(emp)?.fechaPago || null;
  },

  pagosEmpleado(empleadoId) {
    return this.listarPagos().filter(p => p.empleadoId === empleadoId);
  }
};

export default {
  obtenerParametro,
  festivosColombia,
  leerConfigNomina,
  guardarConfigNomina,
  periodosDelMes,
  periodosPendientes,
  proximoPeriodo,
  diasComerciales,
  fechaDePago,
  esFestivo,
  esDominical,
  esDescansoObligatorio,
  calcularValorHoraOrdinaria,
  calcularRecargoHora,
  calcularFactorHoraExtra,
  calcularBasesCotizacion,
  calcularAportesEmpleador,
  calcularDeducciones,
  calcularPrestaciones,
  calcularRetencionFuente,
  liquidarNominaIndividual,
  liquidarNominaMensual,
  historialNominaService
};
