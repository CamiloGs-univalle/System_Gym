// ============================================================
// Cartera: clientes con el plan vencido o por vencer (los calcula el
// servidor con los datos reales) y gestiones de cobro guardadas en la base
// de datos. El pago siempre se hace en la caja, para que quede en el turno.
// ============================================================
import api from '../api';

const datos = (r) => r?.data?.data ?? [];

export const TIPOS_CONTACTO = [
  { value: 'LLAMADA', label: 'Llamada' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'CORREO', label: 'Correo' },
  { value: 'PRESENCIAL', label: 'En persona' },
];

export const RESULTADOS = [
  { value: 'CONTESTO', label: 'Contestó' },
  { value: 'NO_CONTESTO', label: 'No contestó' },
  { value: 'PROMETIO_PAGO', label: 'Prometió pagar' },
  { value: 'NO_VOLVERA', label: 'No volverá' },
  { value: 'OTRO', label: 'Otro' },
];

export const carteraService = {
  async listar({ maxDias = 180, diasPorVencer = 3 } = {}) {
    return datos(await api.get('/receivables', { params: { maxDays: maxDias, dueDays: diasPorVencer } }));
  },
  async gestiones(clienteId) {
    return datos(await api.get(`/receivables/${clienteId}/notes`));
  },
  async registrarGestion(clienteId, { tipo, resultado, nota, fechaCompromiso }) {
    const r = await api.post(`/receivables/${clienteId}/notes`, {
      contactType: tipo, result: resultado, note: nota || null, promiseDate: fechaCompromiso || null,
    });
    return r?.data?.data;
  },
};

export default carteraService;
