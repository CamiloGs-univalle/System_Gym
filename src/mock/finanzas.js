// ============================================
// MOCK - FINANZAS
// ============================================

// Ingresos por mensualidades
export const ingresosMensualidades = [
    { id: 1, clienteId: 1, clienteNombre: "Juan Pablo Gómez", monto: 120000, tipo: "MENSUAL", fecha: "2026-06-01", metodoPago: "Efectivo" },
    { id: 2, clienteId: 2, clienteNombre: "María Alejandra Ruiz", monto: 70000, tipo: "QUINCENAL", fecha: "2026-06-15", metodoPago: "Transferencia" },
    { id: 3, clienteId: 3, clienteNombre: "Felipe Andrade", monto: 120000, tipo: "MENSUAL", fecha: "2026-05-20", metodoPago: "Efectivo" },
    { id: 4, clienteId: 4, clienteNombre: "Valentina Castro", monto: 70000, tipo: "QUINCENAL", fecha: "2026-06-10", metodoPago: "Efectivo" },
    { id: 5, clienteId: 5, clienteNombre: "Sebastián Mora", monto: 10000, tipo: "DIA", fecha: "2026-06-23", metodoPago: "Efectivo" },
    { id: 6, clienteId: 1, clienteNombre: "Juan Pablo Gómez", monto: 120000, tipo: "MENSUAL", fecha: "2026-05-01", metodoPago: "Transferencia" },
    { id: 7, clienteId: 2, clienteNombre: "María Alejandra Ruiz", monto: 70000, tipo: "QUINCENAL", fecha: "2026-06-01", metodoPago: "Efectivo" },
];

// Ingresos por ventas de productos
export const ingresosProductos = [
    { id: 1, producto: "Proteína Whey 2lb", cantidad: 2, total: 360000, fecha: "2026-06-23", turnoId: 1 },
    { id: 2, producto: "Shampoo Sachet", cantidad: 5, total: 12500, fecha: "2026-06-23", turnoId: 1 },
    { id: 3, producto: "Creatina 300g", cantidad: 1, total: 95000, fecha: "2026-06-22", turnoId: 3 },
    { id: 4, producto: "Proteína Whey 5lb", cantidad: 1, total: 320000, fecha: "2026-06-22", turnoId: 3 },
    { id: 5, producto: "Ganador de Peso 6lb", cantidad: 1, total: 250000, fecha: "2026-06-21", turnoId: null },
    { id: 6, producto: "Glutamina 300g", cantidad: 3, total: 255000, fecha: "2026-06-20", turnoId: null },
];

// Egresos / gastos
export const egresos = [
    { id: 1, concepto: "Pago nómina - Carlos Méndez", monto: 900000, fecha: "2026-06-15", categoria: "Nomina", empleadoId: 1 },
    { id: 2, concepto: "Pago nómina - Luisa Torres", monto: 900000, fecha: "2026-06-15", categoria: "Nomina", empleadoId: 2 },
    { id: 3, concepto: "Servicios públicos", monto: 350000, fecha: "2026-06-10", categoria: "Servicios", empleadoId: null },
    { id: 4, concepto: "Compra inventario suplementos", monto: 800000, fecha: "2026-06-08", categoria: "Inventario", empleadoId: null },
    { id: 5, concepto: "Pago nómina - Paula Jiménez", monto: 1400000, fecha: "2026-06-01", categoria: "Nomina", empleadoId: 3 },
    { id: 6, concepto: "Pago nómina - Roberto Suárez", monto: 1400000, fecha: "2026-06-01", categoria: "Nomina", empleadoId: 4 },
];

// Precios de membresías configurados
export const preciosMembresia = {
    MENSUAL: 120000,
    QUINCENAL: 70000,
    DIA: 10000,
};