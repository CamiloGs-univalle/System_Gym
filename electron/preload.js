// ============================================================
// Preload de System Gym
// Expone a la interfaz solo la configuración necesaria para hablar
// con el backend local: la URL (puerto elegido en el arranque) y la
// llave privada de la app. No expone Node ni acceso al sistema.
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
});
