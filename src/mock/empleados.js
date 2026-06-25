// ============================================
// MOCK - EMPLEADOS + TURNOS
// ============================================

export const frecuenciaPago = {
    QUINCENAL: { label: "Quincenal", dias: 15 },
    MENSUAL: { label: "Mensual", dias: 30 },
};

export const empleados = [
    {
        id: 1,
        nombre: "Carlos Méndez",
        cedula: "1020304050",
        celular: "3001234567",
        cargo: "Entrenador",
        salario: 1800000,
        frecuenciaPago: "QUINCENAL",
        fechaIngreso: "2023-01-15",
        ultimoPago: "2026-06-15",
        proximoPago: "2026-06-30",
        activo: true,
    },
    {
        id: 2,
        nombre: "Luisa Fernanda Torres",
        cedula: "1030405060",
        celular: "3107654321",
        cargo: "Entrenador",
        salario: 1800000,
        frecuenciaPago: "QUINCENAL",
        fechaIngreso: "2023-03-10",
        ultimoPago: "2026-06-15",
        proximoPago: "2026-06-30",
        activo: true,
    },
    {
        id: 3,
        nombre: "Paula Jiménez",
        cedula: "1050607080",
        celular: "3167890123",
        cargo: "Recepcionista",
        salario: 1400000,
        frecuenciaPago: "MENSUAL",
        fechaIngreso: "2024-02-01",
        ultimoPago: "2026-06-01",
        proximoPago: "2026-07-01",
        activo: true,
    },
    {
        id: 4,
        nombre: "Roberto Suárez",
        cedula: "1060708090",
        celular: "3178901234",
        cargo: "Recepcionista",
        salario: 1400000,
        frecuenciaPago: "MENSUAL",
        fechaIngreso: "2024-05-10",
        ultimoPago: "2026-06-01",
        proximoPago: "2026-07-01",
        activo: true,
    },
];

export const tiposTurno = {
    COMPLETO: { label: "Turno Completo", horas: 8 },
    MEDIO: { label: "Medio Turno", horas: 4 },
    HORAS: { label: "Por Horas", horas: null },
};

export const turnos = [
    {
        id: 1,
        empleadoId: 3,
        tipo: "COMPLETO",
        horaInicio: "06:00",
        horaFin: "14:00",
        fecha: "2026-06-23",
        montoDeclarado: 850000,
        montoCalculado: 850000,
        diferencia: 0,
        cerrado: true,
        observaciones: "",
    },
    {
        id: 2,
        empleadoId: 4,
        tipo: "MEDIO",
        horaInicio: "14:00",
        horaFin: "18:00",
        fecha: "2026-06-23",
        montoDeclarado: 320000,
        montoCalculado: 310000,
        diferencia: 10000,
        cerrado: true,
        observaciones: "Diferencia de $10.000 en efectivo",
    },
    {
        id: 3,
        empleadoId: 3,
        tipo: "COMPLETO",
        horaInicio: "06:00",
        horaFin: "14:00",
        fecha: "2026-06-22",
        montoDeclarado: 1200000,
        montoCalculado: 1200000,
        diferencia: 0,
        cerrado: true,
        observaciones: "",
    },
];