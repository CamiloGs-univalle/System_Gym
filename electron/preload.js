// ============================================================
// Preload de System Gym
// Expone a la interfaz solo lo necesario: la configuración del backend
// local, el lector de huella y la pantalla de ingreso (quiosco).
// No expone Node ni acceso al sistema de archivos.
// ============================================================
const { contextBridge, ipcRenderer } = require("electron");

let cached = null;

contextBridge.exposeInMainWorld("systemGym", {
    getConfig: () => {
        if (!cached) {
            cached = ipcRenderer.sendSync("systemgym:get-config");
        }
        return cached;
    },

    huella: {
        estado: () => ipcRenderer.invoke("huella:estado"),
        capturarRegistro: () => ipcRenderer.invoke("huella:capturar-registro"),
        cargarPlantillas: (plantillas) => ipcRenderer.invoke("huella:cargar-plantillas", plantillas),
        identificar: (timeoutMs) => ipcRenderer.invoke("huella:identificar", timeoutMs),
        cancelar: () => ipcRenderer.invoke("huella:cancelar"),
    },

    // Reemplazos de alert()/confirm() que no dejan la ventana sin teclado (ver main.js)
    dialogo: {
        alert: (mensaje) => ipcRenderer.sendSync("dialogo:alert", String(mensaje ?? "")),
        confirm: (mensaje) => ipcRenderer.sendSync("dialogo:confirm", String(mensaje ?? "")) === true,
    },

    quiosco: {
        abrir: () => ipcRenderer.invoke("quiosco:abrir"),
        cerrar: () => ipcRenderer.invoke("quiosco:cerrar"),
        pantallaCompleta: () => ipcRenderer.invoke("quiosco:pantalla-completa"),
    },
});
