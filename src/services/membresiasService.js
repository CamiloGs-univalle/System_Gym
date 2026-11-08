// ============================================================
// ARCHIVO: src/services/membresiasService.js
// OBSOLETO: este servicio llamaba a /api/memberships, que no existe en el
// backend. Ningún módulo lo usa. Las membresías se cobran con
// clientesService.renovarMembresia (POST /api/clients/{id}/membership) y los
// planes viven en services/gimnasio/membresiasService.js.
// Se deja para que una importación antigua falle con un mensaje claro.
// ============================================================

const noDisponible = () =>
  Promise.reject(new Error('Use clientesService.renovarMembresia: /api/memberships no existe.'));

export const membresiasService = {
  listar: noDisponible,
  obtenerPorId: noDisponible,
  crear: noDisponible,
  actualizar: noDisponible,
  eliminar: noDisponible,
};

export default membresiasService;
