// ============================================================
// Lector SIMULADO: permite usar todo el flujo sin lector físico.
// - Registro: genera una plantilla de prueba (no es una huella real).
// - Identificación: no disponible; la pantalla de ingreso usa la cédula.
// ============================================================
const crypto = require("crypto");

module.exports = {
    nombre: "SIMULADO",
    simulado: true,

    async disponible() {
        return true;
    },

    async capturarParaRegistro() {
        // Simula el tiempo de las 3 tomas del dedo
        await new Promise((r) => setTimeout(r, 1200));
        return {
            ok: true,
            vendor: "SIMULADO",
            template: crypto.randomBytes(48).toString("base64"),
            calidad: 100,
        };
    },

    async cargarPlantillas(plantillas) {
        return { ok: true, cargadas: plantillas.length };
    },

    async identificar() {
        return { ok: false, soportado: false, mensaje: "Modo sin lector: use la cédula." };
    },
};
