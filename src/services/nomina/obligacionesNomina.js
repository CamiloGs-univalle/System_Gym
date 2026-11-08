// ============================================================
// ARCHIVO: src/services/nomina/obligacionesNomina.js
// Lo que el dueño del gimnasio necesita saber de la nómina:
//   - Qué pagos de nómina vienen y cuándo.
//   - Qué obligaciones legales vienen (seguridad social, prima, cesantías,
//     intereses de cesantías, vacaciones), cuánto valen y cuándo vencen.
//   - Cuánto debería tener ahorrado hoy y cuánto apartar en cada pago.
//   - Un "fondo de nómina" para registrar lo que va apartando.
// Los pagos se registran también como egresos en Finanzas (backend).
// ============================================================
import api from '../api';
import { guardarSincronizado } from '../storageSync';
import {
  obtenerParametro, liquidarNominaIndividual, leerConfigNomina, periodosDelMes,
  periodosPendientes, historialNominaService, diasComerciales, fechaDePago,
  fechaISO, hoyISO, sumarDias,
} from './nominaEngine';

const REGISTRO_KEY = 'gymcore_nomina_obligaciones';

export const CATEGORIA_NOMINA = 'Nómina';
export const CATEGORIA_SEGURIDAD_SOCIAL = 'Seguridad social';
export const CATEGORIA_PRESTACIONES = 'Prestaciones sociales';

const redondear = (n) => Math.round(n || 0);

// ============================================================
// REGISTRO LOCAL (sincronizado con el servidor)
// { apartados: [{id, fecha, monto, nota}], pagadas: [{id, clave, tipo, fecha, monto, desdeFondo}] }
// ============================================================
export function leerRegistro() {
  try {
    const raw = localStorage.getItem(REGISTRO_KEY);
    const r = raw ? JSON.parse(raw) : {};
    return { apartados: r.apartados || [], pagadas: r.pagadas || [] };
  } catch {
    return { apartados: [], pagadas: [] };
  }
}

function guardarRegistro(registro) {
  guardarSincronizado(REGISTRO_KEY, registro);
}

const nuevoId = (lista) => (lista.length ? Math.max(...lista.map(x => x.id || 0)) + 1 : 1);

// ============================================================
// EMPLEADOS QUE GENERAN OBLIGACIONES
// ============================================================
const esLaboral = (e) => e.activo !== false && e.tipoVinculacion !== 'PRESTACION_SERVICIOS' && (e.salario || 0) > 0;

function auxilioMensual(empleado, fecha) {
  const smmlv = obtenerParametro('SMMLV', fecha) || 1300000;
  return (empleado.salario || 0) <= smmlv * 2 ? (obtenerParametro('AUXILIO_TRANSPORTE', fecha) || 0) : 0;
}

const max = (a, b) => (a > b ? a : b);
const min = (a, b) => (a < b ? a : b);

// ============================================================
// OBLIGACIONES (agrupadas por tipo y fecha de vencimiento)
// Cada obligación: { clave, tipo, titulo, vence, total, acumulado, pagada, vencida, detalle[] }
//   total     = lo que habrá que pagar en la fecha de vencimiento
//   acumulado = lo que ya se "debe" a hoy (lo que debería estar ahorrado)
// ============================================================
export function calcularObligaciones(empleados, hoy = hoyISO(), config = leerConfigNomina()) {
  const registro = leerRegistro();
  const pagadas = new Set(registro.pagadas.map(p => p.clave));
  const laborales = empleados.filter(esLaboral);
  const anio = parseInt(hoy.slice(0, 4), 10);
  const mes = parseInt(hoy.slice(5, 7), 10);
  const grupos = {};

  const agregar = (clave, tipo, titulo, vence, desc, empleado, total, acumulado) => {
    if (total <= 0 && acumulado <= 0) return;
    if (!grupos[clave]) {
      grupos[clave] = { clave, tipo, titulo, vence, descripcion: desc, total: 0, acumulado: 0, detalle: [] };
    }
    grupos[clave].total += total;
    grupos[clave].acumulado += acumulado;
    grupos[clave].detalle.push({ empleadoId: empleado.id, nombre: empleado.nombre, total: redondear(total), acumulado: redondear(acumulado) });
  };

  for (const e of laborales) {
    const ingreso = e.fechaIngreso || fechaISO(anio, 1, 1);
    const salario = e.salario || 0;
    const aux = auxilioMensual(e, hoy);
    const baseAux = salario + aux;

    // ---------- Prima de servicios (semestre actual y, si no se pagó, el anterior) ----------
    const semestres = [];
    if (mes <= 6) {
      semestres.push({ y: anio, s: 1 });
      semestres.push({ y: anio - 1, s: 2 });
    } else {
      semestres.push({ y: anio, s: 2 });
      semestres.push({ y: anio, s: 1 });
    }
    semestres.forEach(({ y, s }, idx) => {
      const ini = s === 1 ? fechaISO(y, 1, 1) : fechaISO(y, 7, 1);
      const fin = s === 1 ? fechaISO(y, 6, 30) : fechaISO(y, 12, 31);
      const vence = s === 1 ? fechaISO(y, 6, 30) : fechaISO(y, 12, 20);
      const desde = max(ini, ingreso);
      if (desde > fin) return;
      const clave = `PRIMA|${y}-S${s}`;
      if (idx === 1 && pagadas.has(clave)) return;
      const diasTotal = diasComerciales(desde, fin);
      const diasHoy = diasComerciales(desde, min(hoy, fin));
      agregar(clave, 'PRIMA', `Prima de servicios ${s === 1 ? '1er' : '2º'} semestre ${y}`, vence,
        'Se paga a cada empleado: la mitad del salario (más auxilio) por semestre trabajado.',
        e, baseAux * diasTotal / 360, baseAux * diasHoy / 360);
    });

    // ---------- Cesantías e intereses (año actual y, si no se pagaron, el anterior) ----------
    [anio, anio - 1].forEach((y, idx) => {
      const ini = fechaISO(y, 1, 1);
      const fin = fechaISO(y, 12, 31);
      const desde = max(ini, ingreso);
      if (desde > fin) return;
      const diasTotal = diasComerciales(desde, fin);
      const diasHoy = diasComerciales(desde, min(hoy, fin));
      const cesTotal = baseAux * diasTotal / 360;
      const cesHoy = baseAux * diasHoy / 360;

      const claveCes = `CESANTIAS|${y}`;
      if (!(idx === 1 && pagadas.has(claveCes))) {
        agregar(claveCes, 'CESANTIAS', `Cesantías ${y}`, fechaISO(y + 1, 2, 14),
          'Se consignan en el fondo de cesantías de cada empleado (no se le entregan en mano).',
          e, cesTotal, cesHoy);
      }
      const claveInt = `INTERESES|${y}`;
      if (!(idx === 1 && pagadas.has(claveInt))) {
        agregar(claveInt, 'INTERESES', `Intereses de cesantías ${y}`, fechaISO(y + 1, 1, 31),
          'Se pagan directamente al empleado: 12% anual sobre sus cesantías.',
          e, cesTotal * 0.12 * diasTotal / 360, cesHoy * 0.12 * diasHoy / 360);
      }
    });

    // ---------- Seguridad social (PILA): mes anterior (si no se pagó) y mes actual ----------
    [[anio, mes - 1], [anio, mes]].forEach(([y0, m0], idx) => {
      let y = y0, m = m0;
      if (m < 1) { m = 12; y -= 1; }
      const ini = fechaISO(y, m, 1);
      const fin = fechaISO(y, m, new Date(y, m, 0).getDate());
      const desde = max(ini, ingreso);
      if (desde > fin) return;
      const clave = `PILA|${y}-${String(m).padStart(2, '0')}`;
      if (idx === 0 && pagadas.has(clave)) return;
      const dias = diasComerciales(desde, fin);
      const liq = liquidarNominaIndividual(e, {}, fin, { periodo: { desde, hasta: fin, dias }, exonerado: config.exonerado114 });
      const totalMes = liq.aportesEmpleador.total + liq.deducciones.salud + liq.deducciones.pension;
      const diasHoy = diasComerciales(desde, min(hoy, fin));
      const sigY = m === 12 ? y + 1 : y;
      const sigM = m === 12 ? 1 : m + 1;
      agregar(clave, 'PILA', `Seguridad social (PILA) ${String(m).padStart(2, '0')}/${y}`,
        fechaDePago(sigY, sigM, config.diaLimitePILA, 'ANTERIOR'),
        'Salud, pensión, ARL y caja de compensación. Incluye lo descontado a los empleados (8%).',
        e, totalMes, dias ? totalMes * diasHoy / dias : 0);
      if (grupos[clave]) {
        grupos[clave].parteEmpleados = (grupos[clave].parteEmpleados || 0) + liq.deducciones.salud + liq.deducciones.pension;
      }
    });

    // ---------- Vacaciones (se acumulan desde el ingreso o el último pago) ----------
    const pagosVac = registro.pagadas.filter(p => p.tipo === 'VACACIONES' && p.empleadoId === e.id);
    const desdeVac = pagosVac.length
      ? sumarDias(pagosVac.map(p => p.hastaFecha || p.fecha).sort().pop(), 1)
      : ingreso;
    const diasVac = diasComerciales(desdeVac, hoy);
    const montoVac = salario * diasVac / 720;
    const aniversario = (() => {
      const [, im, id] = ingreso.split('-');
      let a = fechaISO(anio, Number(im), Math.min(Number(id), 28));
      if (a < hoy) a = fechaISO(anio + 1, Number(im), Math.min(Number(id), 28));
      return a;
    })();
    agregar(`VACACIONES|${e.id}`, 'VACACIONES', `Vacaciones de ${e.nombre}`, aniversario,
      '15 días hábiles pagados por cada año trabajado. Se pagan cuando el empleado sale a vacaciones.',
      e, montoVac, montoVac);
  }

  return Object.values(grupos)
    .map(g => ({
      ...g,
      total: redondear(g.total),
      acumulado: redondear(g.acumulado),
      parteEmpleados: redondear(g.parteEmpleados || 0),
      pagada: pagadas.has(g.clave),
      vencida: !pagadas.has(g.clave) && g.vence < hoy,
      diasParaVencer: Math.round((new Date(`${g.vence}T12:00:00`) - new Date(`${hoy}T12:00:00`)) / 86400000),
    }))
    .filter(g => !g.pagada)
    .sort((a, b) => a.vence.localeCompare(b.vence));
}

// ============================================================
// PRÓXIMOS PAGOS DE NÓMINA (todos los empleados)
// ============================================================
export function proximosPagosNomina(empleados, diasAdelante = 45, hoy = hoyISO(), config = leerConfigNomina()) {
  const hasta = sumarDias(hoy, diasAdelante);
  const lista = [];
  for (const e of empleados.filter(x => x.activo !== false && (x.salario || 0) > 0)) {
    for (const p of periodosPendientes(e, hasta, config)) {
      const liq = liquidarNominaIndividual(e, {}, p.hasta, { periodo: p, exonerado: config.exonerado114 });
      lista.push({
        ...p,
        empleado: e,
        neto: liq.netoPagar,
        costoTotal: liq.costoTotalEmpresa,
        provision: liq.prestaciones.total + liq.aportesEmpleador.total + liq.deducciones.salud + liq.deducciones.pension,
        atrasado: p.fechaPago < hoy,
        liquidacion: liq,
      });
    }
  }
  return lista.sort((a, b) => a.fechaPago.localeCompare(b.fechaPago));
}

// ============================================================
// PLAN DE AHORRO
// ============================================================
export function saldoFondo(registro = leerRegistro()) {
  const entradas = registro.apartados.reduce((s, a) => s + (a.monto || 0), 0);
  const salidas = registro.pagadas.filter(p => p.desdeFondo).reduce((s, p) => s + (p.monto || 0), 0);
  return redondear(entradas - salidas);
}

/**
 * Resumen para el dueño:
 * - deberiaTener: lo que ya se debe a hoy y aún no se ha pagado (prima, cesantías,
 *   intereses, vacaciones y seguridad social acumuladas).
 * - tieneAhorrado: saldo del fondo de nómina.
 * - porMes / porQuincena: lo que hay que apartar en cada pago para no quedarse corto.
 * - proximaGrande: la siguiente obligación grande y cuánto apartar por semana para llegar.
 */
export function planDeAhorro(empleados, hoy = hoyISO(), config = leerConfigNomina()) {
  const obligaciones = calcularObligaciones(empleados, hoy, config);
  const registro = leerRegistro();
  const deberiaTener = obligaciones.reduce((s, o) => s + o.acumulado, 0);
  const tieneAhorrado = saldoFondo(registro);
  const faltante = Math.max(0, deberiaTener - tieneAhorrado);

  // Provisión mensual (30 días) de todos los empleados con contrato laboral
  const [y, m] = [parseInt(hoy.slice(0, 4), 10), parseInt(hoy.slice(5, 7), 10)];
  const finMes = fechaISO(y, m, new Date(y, m, 0).getDate());
  let porMes = 0;
  let nominaMes = 0;
  for (const e of empleados.filter(esLaboral)) {
    const liq = liquidarNominaIndividual(e, {}, finMes, { periodo: { desde: fechaISO(y, m, 1), hasta: finMes, dias: 30 }, exonerado: config.exonerado114 });
    porMes += liq.prestaciones.total + liq.aportesEmpleador.total + liq.deducciones.salud + liq.deducciones.pension;
    nominaMes += liq.netoPagar;
  }
  for (const e of empleados.filter(x => x.activo !== false && x.tipoVinculacion === 'PRESTACION_SERVICIOS')) {
    nominaMes += e.salario || 0;
  }

  const grandes = obligaciones.filter(o => ['PRIMA', 'CESANTIAS', 'INTERESES'].includes(o.tipo) && !o.vencida);
  const proximaGrande = grandes[0] || null;
  let porSemanaProxima = 0;
  if (proximaGrande) {
    const semanas = Math.max(1, Math.ceil(proximaGrande.diasParaVencer / 7));
    // El fondo se reparte primero a las obligaciones vencidas y a la seguridad social
    const urgentes = obligaciones.filter(o => o.vencida || o.tipo === 'PILA').reduce((s, o) => s + o.acumulado, 0);
    const disponible = Math.max(0, tieneAhorrado - urgentes);
    porSemanaProxima = Math.max(0, proximaGrande.total - disponible) / semanas;
  }

  return {
    obligaciones,
    deberiaTener: redondear(deberiaTener),
    tieneAhorrado,
    faltante: redondear(faltante),
    porMes: redondear(porMes),
    porQuincena: redondear(porMes / 2),
    porDia: redondear(porMes / 30),
    nominaMes: redondear(nominaMes),
    costoMensualTotal: redondear(nominaMes + porMes),
    proximaGrande,
    porSemanaProxima: redondear(porSemanaProxima),
    vencidas: obligaciones.filter(o => o.vencida),
  };
}

// ============================================================
// ACCIONES
// ============================================================
async function crearEgreso({ concepto, categoria, monto, empleadoId = null, desdeCaja = false }) {
  if (!leerConfigNomina().registrarComoEgreso || monto <= 0) return null;
  try {
    const { data } = await api.post('/expenses', {
      concept: concepto,
      category: categoria,
      amount: Math.round(monto),
      expenseDate: hoyISO(),
      employeeId: empleadoId,
      intakeId: null,
      paymentMethod: desdeCaja ? 'CASH' : null,
    });
    return data?.data?.id || null;
  } catch (error) {
    throw new Error('El pago quedó registrado en nómina, pero no se pudo crear el egreso en Finanzas: ' + (error?.mensajeUsuario || error?.message));
  }
}

/** Paga un periodo de nómina de un empleado y lo registra como egreso. */
export async function pagarPeriodo(empleado, periodo, liquidacion, { desdeCaja = false } = {}) {
  const pago = historialNominaService.registrarPago(
    empleado.id, empleado.nombre, liquidacion, empleado, periodo, { desdeCaja });
  await crearEgreso({
    concepto: `Pago nómina ${empleado.nombre} - ${periodo.etiqueta}`,
    categoria: CATEGORIA_NOMINA,
    monto: liquidacion.netoPagar,
    empleadoId: empleado.id,
    desdeCaja,
  });
  return pago;
}

/** Registra dinero apartado en el fondo de nómina. */
export function registrarApartado(monto, nota = '') {
  const valor = Math.round(Number(monto) || 0);
  if (valor === 0) throw new Error('Indique un valor.');
  const registro = leerRegistro();
  registro.apartados.push({ id: nuevoId(registro.apartados), fecha: hoyISO(), monto: valor, nota });
  guardarRegistro(registro);
  return registro;
}

/** Marca una obligación como pagada y crea los egresos correspondientes. */
export async function pagarObligacion(obligacion, { desdeFondo = true, monto = null, registrarEgreso = true } = {}) {
  const valor = Math.round(monto ?? obligacion.total);
  const registro = leerRegistro();
  if (registro.pagadas.some(p => p.clave === obligacion.clave && obligacion.tipo !== 'VACACIONES')) {
    throw new Error('Esta obligación ya está registrada como pagada.');
  }
  const base = { fecha: hoyISO(), desdeFondo, tipo: obligacion.tipo };

  if (obligacion.tipo === 'VACACIONES') {
    const empId = obligacion.detalle[0]?.empleadoId;
    registro.pagadas.push({ ...base, id: nuevoId(registro.pagadas), clave: `${obligacion.clave}|${hoyISO()}`, monto: valor, empleadoId: empId, hastaFecha: hoyISO() });
  } else {
    registro.pagadas.push({ ...base, id: nuevoId(registro.pagadas), clave: obligacion.clave, monto: valor });
  }
  guardarRegistro(registro);

  // "Ya estaba pagada" (pagos hechos antes de usar el sistema): no se crea egreso
  if (!registrarEgreso) return registro;

  if (obligacion.tipo === 'PILA') {
    // La parte descontada a los empleados ya es salario (categoría Nómina);
    // la parte del empleador es un costo adicional (Seguridad social).
    const parteEmpleados = obligacion.parteEmpleados || 0;
    await crearEgreso({ concepto: `${obligacion.titulo} - aportes del empleador`, categoria: CATEGORIA_SEGURIDAD_SOCIAL, monto: valor - parteEmpleados });
    if (parteEmpleados > 0) {
      await crearEgreso({ concepto: `${obligacion.titulo} - descuentos a empleados`, categoria: CATEGORIA_NOMINA, monto: parteEmpleados });
    }
  } else {
    await crearEgreso({ concepto: obligacion.titulo, categoria: CATEGORIA_PRESTACIONES, monto: valor });
  }
  return registro;
}

/** Deshace la marca de pagada (por error). No borra el egreso creado en Finanzas. */
export function deshacerPagoObligacion(clave) {
  const registro = leerRegistro();
  registro.pagadas = registro.pagadas.filter(p => p.clave !== clave);
  guardarRegistro(registro);
  return registro;
}
