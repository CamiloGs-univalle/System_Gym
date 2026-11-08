import api from './api';

const toFrontendFormat = (data) => {
  if (!data) return null;
  const mem = data.currentMembership || data.current_membership || null;
  const hoy = new Date();
  let diasRestantes = 0;
  let estadoMembresia = 'NINGUNA';
  if (mem?.expirationDate || mem?.expiration_date) {
    const exp = new Date(mem.expirationDate || mem.expiration_date);
    diasRestantes = Math.max(0, Math.ceil((exp - hoy) / 86400000));
    if (diasRestantes > 5) estadoMembresia = 'ACTIVA';
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
  };
  const texto = String(tipo || '').toLowerCase().trim();
  if (map[texto]) return map[texto];
  // Formato "30 días", "90 dias", etc.
  const dias = parseInt(texto, 10);
  const porDias = { 1: 'DAILY', 30: 'MONTHLY', 90: 'QUARTERLY', 180: 'SEMIANNUAL', 365: 'ANNUAL' };
  return porDias[dias] || 'MONTHLY';
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
