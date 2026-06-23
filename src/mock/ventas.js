// mock/ventas.js
// Ventas simuladas de la jornada actual (8h)
// Cada venta replica exactamente lo que generaría handleVenta() en POSPanel

export const ventasDelDia = [
  {
    id: 1,
    hora: "07:12",
    horaNum: 7,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Carlos Gómez",
    cliente: "Carlos Gómez",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 100000,
    cambio: 20000,
    metodoPago: "efectivo",
  },
  {
    id: 2,
    hora: "07:35",
    horaNum: 7,
    tipo: "producto",
    descripcion: "Agua 500ml x2 + Proteína barra",
    cliente: null,
    items: [
      { nombre: "Agua 500ml", cantidad: 2, precio: 2000 },
      { nombre: "Proteína barra", cantidad: 1, precio: 14000 },
    ],
    total: 18000,
    pagoRecibido: 20000,
    cambio: 2000,
    metodoPago: "efectivo",
  },
  {
    id: 3,
    hora: "08:01",
    horaNum: 8,
    tipo: "dia",
    descripcion: "Pago x día — Laura Ríos",
    cliente: "Laura Ríos",
    items: [{ nombre: "Pago por día", cantidad: 1, precio: 5000 }],
    total: 5000,
    pagoRecibido: 5000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 4,
    hora: "08:23",
    horaNum: 8,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Andrés Muñoz",
    cliente: "Andrés Muñoz",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 80000,
    cambio: 0,
    metodoPago: "transferencia",
  },
  {
    id: 5,
    hora: "09:05",
    horaNum: 9,
    tipo: "producto",
    descripcion: "Guantes de entrenamiento",
    cliente: null,
    items: [{ nombre: "Guantes entrenamiento", cantidad: 1, precio: 35000 }],
    total: 35000,
    pagoRecibido: 35000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 6,
    hora: "09:44",
    horaNum: 9,
    tipo: "dia",
    descripcion: "Pago x día — Sofía Vargas",
    cliente: "Sofía Vargas",
    items: [{ nombre: "Pago por día", cantidad: 1, precio: 5000 }],
    total: 5000,
    pagoRecibido: 10000,
    cambio: 5000,
    metodoPago: "efectivo",
  },
  {
    id: 7,
    hora: "10:15",
    horaNum: 10,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Paula Díaz",
    cliente: "Paula Díaz",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 80000,
    cambio: 0,
    metodoPago: "transferencia",
  },
  {
    id: 8,
    hora: "10:52",
    horaNum: 10,
    tipo: "producto",
    descripcion: "Bebida energética x3",
    cliente: null,
    items: [{ nombre: "Bebida energética", cantidad: 3, precio: 7000 }],
    total: 21000,
    pagoRecibido: 21000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 9,
    hora: "11:30",
    horaNum: 11,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Julián Castro",
    cliente: "Julián Castro",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 100000,
    cambio: 20000,
    metodoPago: "efectivo",
  },
  {
    id: 10,
    hora: "12:08",
    horaNum: 12,
    tipo: "dia",
    descripcion: "Pago x día — Miguel Torres",
    cliente: "Miguel Torres",
    items: [{ nombre: "Pago por día", cantidad: 1, precio: 5000 }],
    total: 5000,
    pagoRecibido: 5000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 11,
    hora: "12:45",
    horaNum: 12,
    tipo: "producto",
    descripcion: "Cuerda para saltar + Agua 500ml",
    cliente: null,
    items: [
      { nombre: "Cuerda para saltar", cantidad: 1, precio: 20000 },
      { nombre: "Agua 500ml", cantidad: 1, precio: 2000 },
    ],
    total: 22000,
    pagoRecibido: 22000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 12,
    hora: "13:20",
    horaNum: 13,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Valentina Ruiz",
    cliente: "Valentina Ruiz",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 80000,
    cambio: 0,
    metodoPago: "transferencia",
  },
  {
    id: 13,
    hora: "14:10",
    horaNum: 14,
    tipo: "dia",
    descripcion: "Pago x día — Camilo Parra",
    cliente: "Camilo Parra",
    items: [{ nombre: "Pago por día", cantidad: 1, precio: 5000 }],
    total: 5000,
    pagoRecibido: 5000,
    cambio: 0,
    metodoPago: "efectivo",
  },
  {
    id: 14,
    hora: "14:55",
    horaNum: 14,
    tipo: "producto",
    descripcion: "Suplemento proteico 1kg",
    cliente: null,
    items: [{ nombre: "Suplemento proteico 1kg", cantidad: 1, precio: 45000 }],
    total: 45000,
    pagoRecibido: 50000,
    cambio: 5000,
    metodoPago: "efectivo",
  },
  {
    id: 15,
    hora: "15:30",
    horaNum: 15,
    tipo: "mensualidad",
    descripcion: "Mensualidad — Daniela Mora",
    cliente: "Daniela Mora",
    items: [{ nombre: "Mensualidad", cantidad: 1, precio: 80000 }],
    total: 80000,
    pagoRecibido: 80000,
    cambio: 0,
    metodoPago: "transferencia",
  },
];

// Helpers de agregación reutilizables por CierrePanel y cualquier otro módulo
export const calcularResumen = (ventas) => {
  const mensualidades = ventas.filter((v) => v.tipo === "mensualidad");
  const dias = ventas.filter((v) => v.tipo === "dia");
  const productos = ventas.filter((v) => v.tipo === "producto");

  const totalMensualidades = mensualidades.reduce((s, v) => s + v.total, 0);
  const totalDias = dias.reduce((s, v) => s + v.total, 0);
  const totalProductos = productos.reduce((s, v) => s + v.total, 0);
  const totalGeneral = totalMensualidades + totalDias + totalProductos;

  const efectivo = ventas
    .filter((v) => v.metodoPago === "efectivo")
    .reduce((s, v) => s + v.total, 0);
  const transferencia = ventas
    .filter((v) => v.metodoPago === "transferencia")
    .reduce((s, v) => s + v.total, 0);

  // Ingresos agrupados por hora (7am–3pm = índices 0–7)
  const porHora = Array(8).fill(0);
  ventas.forEach((v) => {
    const idx = v.horaNum - 7;
    if (idx >= 0 && idx < 8) porHora[idx] += v.total;
  });

  return {
    totalGeneral,
    totalMensualidades,
    totalDias,
    totalProductos,
    countMensualidades: mensualidades.length,
    countDias: dias.length,
    countProductos: productos.length,
    efectivo,
    transferencia,
    porHora,
  };
};