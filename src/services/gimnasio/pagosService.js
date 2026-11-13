// ============================================================
// Historial de pagos: sale de las ventas registradas en la caja
// (GET /api/payments). Antes era un JSON aparte que podía no coincidir
// con la caja. Para corregir un pago se anula la venta (Finanzas).
// ============================================================
import api from '../api';
import { fechaLocalISO } from '../../utils/formatters';

const datos = (r) => r?.data?.data ?? [];

export const pagosService = {
  /** Pagos entre dos fechas (AAAA-MM-DD). tipo: 'MEMBERSHIP' | 'PRODUCT' | undefined (todos) */
  async listar({ desde, hasta, tipo, clienteId } = {}) {
    const hoy = fechaLocalISO();
    return datos(await api.get('/payments', {
      params: { from: desde || undefined, to: hasta || hoy, type: tipo || undefined, clientId: clienteId || undefined },
    }));
  },
};

export default pagosService;
