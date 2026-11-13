// ============================================================
// Puente biométrico de System Gym (proceso principal de Electron)
// ------------------------------------------------------------
// La interfaz no habla directo con el lector: pide acciones por IPC
// y este módulo usa el "proveedor" del lector configurado.
//
// Proveedores:
//   - SIMULADO (por defecto): no hay lector. El registro genera una
//     plantilla de prueba y la pantalla de ingreso usa la cédula.
//   - ZKTECO: lectores USB ZK9500 / SLK20R / ZK4500 (ver zkteco.js).
//
// Se elige con la variable de entorno SYSTEMGYM_LECTOR=ZKTECO o con el
// archivo %USERPROFILE%\.gymcore\lector.json  { "proveedor": "ZKTECO" }
// ============================================================
const fs = require("fs");
const path = require("path");
const os = require("os");

function leerProveedorConfigurado() {
    if (process.env.SYSTEMGYM_LECTOR) return process.env.SYSTEMGYM_LECTOR.toUpperCase();
    try {
        const file = path.join(os.homedir(), ".gymcore", "lector.json");
        const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
        return String(cfg.proveedor || "SIMULADO").toUpperCase();
    } catch {
        return "SIMULADO";
    }
}

let proveedor = null;

function obtenerProveedor() {
    if (proveedor) return proveedor;
    const nombre = leerProveedorConfigurado();
    try {
        proveedor = nombre === "ZKTECO" ? require("./zkteco") : require("./simulado");
    } catch (e) {
        proveedor = require("./simulado");
        proveedor.errorCarga = `No se pudo cargar el lector ${nombre}: ${e.message}`;
    }
    return proveedor;
}

/** Registra los canales IPC que usa la interfaz (ver preload.js). */
function registrarIpc(ipcMain) {
    ipcMain.handle("huella:estado", async () => {
        const p = obtenerProveedor();
        let conectado = false;
        let detalle = p.errorCarga || null;
        try {
            conectado = await p.disponible();
        } catch (e) {
            detalle = e.message;
        }
        return { proveedor: p.nombre, simulado: p.simulado === true, conectado, detalle };
    });

    // Captura la huella (varias tomas) y devuelve la plantilla en Base64 para guardarla
    ipcMain.handle("huella:capturar-registro", async () => {
        const p = obtenerProveedor();
        return p.capturarParaRegistro();
    });

    // Carga en memoria del lector las plantillas de los clientes (identificación 1:N)
    ipcMain.handle("huella:cargar-plantillas", async (_e, plantillas) => {
        const p = obtenerProveedor();
        return p.cargarPlantillas(Array.isArray(plantillas) ? plantillas : []);
    });

    // Espera a que alguien ponga el dedo y devuelve { clientId } o { reconocida: false }
    ipcMain.handle("huella:identificar", async (_e, timeoutMs) => {
        const p = obtenerProveedor();
        return p.identificar(Number(timeoutMs) || 15000);
    });

    ipcMain.handle("huella:cancelar", async () => {
        const p = obtenerProveedor();
        if (p.cancelar) p.cancelar();
        return true;
    });
}

function cerrar() {
    if (proveedor && proveedor.cerrar) {
        try { proveedor.cerrar(); } catch { /* noop */ }
    }
}

module.exports = { registrarIpc, cerrar };
