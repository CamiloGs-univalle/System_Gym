// ============================================================
// Lector ZKTeco (ZK9500, SLK20R, ZK4500) — PENDIENTE DE CONECTAR
// ------------------------------------------------------------
// Este archivo define lo que hay que implementar cuando llegue el lector.
// Se usa el "ZKFinger SDK for Windows" (libzkfp.dll), que se instala con
// el driver del lector, llamado desde Node con una librería FFI (koffi).
//
// Pasos del SDK (API C de ZKFinger):
//   ZKFPM_Init()                          -> iniciar
//   ZKFPM_OpenDevice(0)                   -> abrir el primer lector
//   ZKFPM_DBInit()                        -> base en memoria para 1:N
//   Registro: 3 x ZKFPM_AcquireFingerprint(...) y ZKFPM_DBMerge(...) -> plantilla
//   Carga:    ZKFPM_DBAdd(db, idInterno, plantilla) por cada huella guardada
//   Ingreso:  ZKFPM_AcquireFingerprint(...) en ciclo y ZKFPM_DBIdentify(...)
//   Cierre:   ZKFPM_CloseDevice / ZKFPM_DBFree / ZKFPM_Terminate
//
// Mientras no esté implementado, el sistema sigue funcionando en modo
// SIMULADO (ingreso por cédula). Para activarlo, cree el archivo
// %USERPROFILE%\.gymcore\lector.json con { "proveedor": "ZKTECO" }.
// ============================================================

const NO_LISTO = "El lector ZKTeco aún no está conectado al sistema. Se usa el ingreso por cédula.";

module.exports = {
    nombre: "ZKTECO",
    simulado: false,

    async disponible() {
        throw new Error(NO_LISTO);
    },

    async capturarParaRegistro() {
        return { ok: false, mensaje: NO_LISTO };
    },

    async cargarPlantillas() {
        return { ok: false, mensaje: NO_LISTO };
    },

    async identificar() {
        return { ok: false, soportado: false, mensaje: NO_LISTO };
    },

    cancelar() {},
    cerrar() {},
};
