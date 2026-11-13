import api from './api';
import { fechaLocalISO } from '../utils/formatters';
import { diasAvisoVencimiento } from '../utils/configuracion';

/** Días de acceso que le quedan (hoy incluido) hasta la fecha de vencimiento AAAA-MM-DD. */
const diasDeAcceso = (vencimiento) => {
  const [y1, m1, d1] = fechaLocalISO().split('-').map(Number);
  const [y2, m2, d2] = String(vencimiento).slice(0, 10).split('-').map(Number);
  if (!y2 || !m2 || !d2) return 0;
  const dias = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
  return Math.max(0, dias);
};

const toFrontendFormat = (data) => {
  if (!data) return null;
  const mem = data.currentMembership || data.current_membership || null;
  let diasRestantes = 0;
  let estadoMembresia = 'NINGUNA';
  if (mem?.expirationDate || mem?.expiration_date) {
    // La fecha de vencimiento es el último día con acceso (incluido).
    // Se compara por fecha local, no por hora UTC, para coincidir con el backend.
    diasRestantes = diasDeAcceso(mem.expirationDate || mem.expiration_date);
    if (diasRestantes > diasAvisoVencimiento()) estadoMembresia = 'ACTIVA';
    else if (diasRestantes > 0) estadoMembresia = 'POR_VENCER';
    else estadoMembresia = 'VENCIDA';
  }

  return {
    id: data.id,
    nombre: data.fullName || data.nombre || '',
    cedula: data.dni || data.cedula || '',
    telefono: data.phoneNumber || data.telefono || '',
    email: data.email || '',
    fechaRegistro: data.enrollmentDate || data.fecha_registro || '',
    entrenadorId: data.assignedTrainerId || data.entrenadorId || null,
    entrenador: data.assignedTrainerName || data.entrenador || 'No asignado',
    notas: data.notes || data.notas || '',
    activo: data.active !== false,
    fotoVersion: data.photoUpdatedAt || null,
    membresia: mem ? {
      tipo: mem.type || mem.tipo || '',
      fechaInicio: mem.startDate || mem.fecha_inicio || '',
      fechaVencimiento: mem.expirationDate || mem.fecha_vencimiento || '',
      montoPagado: mem.amountPaid || mem.monto_pagado || 0,
      estado: estadoMembresia,
      diasRestantes
    } : null,
    _raw: data
  };
};

// Acepta los nombres en español y en inglés que usan los formularios
export const mapMembresia = (tipo) => {
  const map = {
    mensual: 'MONTHLY', monthly: 'MONTHLY',
    trimestral: 'QUARTERLY', quarterly: 'QUARTERLY',
    semestral: 'SEMIANNUAL', semiannual: 'SEMIANNUAL',
    anual: 'ANNUAL', annual: 'ANNUAL',
    diario: 'DAILY', daily: 'DAILY', dia: 'DAILY', 'día': 'DAILY',
    DAILY: 'DAILY', MONTHLY: 'MONTHLY', QUARTERLY: 'QUARTERLY', SEMIANNUAL: 'SEMIANNUAL', ANNUAL: 'ANNUAL',
  };
  const texto = String(tipo || '').toLowerCase().trim();
  if (map[texto]) return map[texto];
  // Formato "30 días", "90 dias", etc.
  const dias = parseInt(texto, 10);
  const porDias = { 1: 'DAILY', 30: 'MONTHLY', 90: 'QUARTERLY', 180: 'SEMIANNUAL', 365: 'ANNUAL' };
  return porDias[dias] || 'MONTHLY';
};

/**
 * Tipo de membresía del backend según el plan (nombre o duración en días).
 * Se usa al cobrar un plan en caja para que el vencimiento coincida con el plan.
 */
export const tipoMembresiaDePlan = (plan) => {
  const nombre = String(plan?.nombre || '').toLowerCase();
  const dias = Number(plan?.duracion) || 30;
  if (nombre.includes('diario') || nombre.includes('día') || nombre.includes('dia ') || dias === 1) return 'DAILY';
  if (nombre.includes('anual') || dias >= 365) return 'ANNUAL';
  if (nombre.includes('semestr') || dias >= 180) return 'SEMIANNUAL';
  if (nombre.includes('trimestr') || dias >= 90) return 'QUARTERLY';
  return 'MONTHLY';
};

const toBackendFormat = (data) => {
  const monto = parseFloat(data.precioMensual) || 0;
  // Solo se cobra membresía si se eligió un plan con precio: nunca un valor por defecto
  const cobra = (Boolean(data.planId) || data.cobrarMembresia === true) && monto > 0;
  return {
    fullName: (data.nombre || '').trim(),
    dni: (data.cedula || '').replace(/\D/g, ''),
    phoneNumber: data.telefono ? data.telefono.replace(/\D/g, '') : null,
    membershipType: cobra ? mapMembresia(data.membresia) : null,
    amountPaid: cobra ? monto : 0,
    paymentMethod: data.metodoPago || 'CASH',
    cashReceived: 0,
    shiftId: data.shiftId || null,
    assignedTrainerId: data.entrenadorId || null,
    active: data.activo !== false
  };
};

export const clientesService = {
  async listar({ incluirInactivos = false } = {}) {
    try {
      const response = await api.get('/clients', { params: incluirInactivos ? { includeInactive: true } : {} });
      let data = response.data;
      if (data?.data && Array.isArray(data.data)) data = data.data;
      else if (!Array.isArray(data)) data = [];
      return data.map(toFrontendFormat).filter(Boolean);
    } catch (error) {
      console.error("Error listar clientes:", error);
      return [];
    }
  },

  async buscar(term) {
    try {
      const response = await api.get('/clients/search', { params: { term } });
      let data = response.data;
      if (Array.isArray(data)) return data.map(toFrontendFormat).filter(Boolean);
      if (data?.data && Array.isArray(data.data)) return data.data.map(toFrontendFormat).filter(Boolean);
      return [];
    } catch (error) {
      console.error("Error buscar clientes:", error);
      return [];
    }
  },

  async obtenerPorId(id) {
    try {
      const response = await api.get(`/clients/${id}`);
      const data = response.data?.data || response.data;
      return toFrontendFormat(data);
    } catch (error) {
      console.error(`Error obtener cliente ${id}:`, error);
      throw error;
    }
  },

  async crear(datos) {
    try {
      const payload = toBackendFormat(datos);
      const response = await api.post('/clients', payload);
      const data = response.data?.data || response.data;
      return toFrontendFormat(data);
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const msg = error.response.data?.message || error.response.data?.error || '';
        if (status === 409) throw new Error('Ya existe un cliente con esta cedula');
        if (status === 400) throw new Error(msg || 'Datos invalidos');
      }
      throw error;
    }
  },

  async actualizar(id, datos) {
    try {
      const payload = toBackendFormat(datos);
      const response = await api.put(`/clients/${id}`, payload);
      const data = response.data?.data || response.data;
      return toFrontendFormat(data);
    } catch (error) {
      console.error(`Error actualizar cliente ${id}:`, error);
      throw error;
    }
  },

  async renovarMembresia(id, datosMembresia) {
    try {
      const monto = parseFloat(datosMembresia.monto);
      if (!(monto > 0)) {
        throw new Error('Indique el valor cobrado por la membresía.');
      }
      const payload = {
        membershipType: mapMembresia(datosMembresia.tipo || 'mensual'),
        amountPaid: monto,
        paymentMethod: datosMembresia.metodoPago || 'CASH',
        cashReceived: parseFloat(datosMembresia.efectivoRecibido) || 0,
        shiftId: datosMembresia.shiftId,
        processedByUserId: datosMembresia.processedByUserId
      };
      const response = await api.post(`/clients/${id}/membership`, payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error renovar membresia cliente ${id}:`, error);
      throw error;
    }
  },

  async desactivar(id) {
    try {
      await api.delete(`/clients/${id}`);
      return true;
    } catch (error) {
      console.error(`Error desactivar cliente ${id}:`, error);
      throw error;
    }
  }
};

export default clientesService;
