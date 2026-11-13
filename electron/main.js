// ============================================================
// System Gym - Proceso principal de Electron
// ------------------------------------------------------------
// - Arranca el backend (Quarkus) en un puerto libre elegido al azar.
// - Genera una llave aleatoria en cada arranque: solo esta app la conoce,
//   así una página web abierta en el mismo PC no puede usar la API local.
// - Usa el Java incluido en el instalador (carpeta "jre"); si no existe,
//   busca un Java 21 instalado en el equipo.
// - Nunca cierra procesos ajenos.
// ============================================================
const { app, BrowserWindow, dialog, ipcMain, shell, screen, session } = require("electron");
const biometria = require("./biometria");
const { spawn, execSync } = require("child_process");
const crypto = require("crypto");
const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const os = require("os");

const isDev = process.env.NODE_ENV === "development";
const DEV_BACKEND_PORT = 8080;

let backendProcess = null;
let backendPort = null;
let appKey = null;
let mainWindow = null;
let kioskWindow = null;

// ============================================================
// LOG EN ARCHIVO (diagnóstico)
// ============================================================
function logToFile(line) {
    try {
        const logDir = path.join(app.getPath("userData"), "logs");
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, "app.log"), `[${new Date().toISOString()}] ${line}\n`);
    } catch (e) {
        // sin log no se detiene la app
    }
}

// ============================================================
// UNA SOLA INSTANCIA: dos backends sobre la misma base de datos la dañarían
// ============================================================
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ============================================================
// BACKEND
// ============================================================
function resolveBackendJar() {
    if (process.env.GYMCORE_BACKEND_JAR) return process.env.GYMCORE_BACKEND_JAR;
    if (app.isPackaged) return path.join(process.resourcesPath, "backend", "quarkus-run.jar");
    return path.join(__dirname, "../../backendGym/target/quarkus-app/quarkus-run.jar");
}

function findJavaExecutable() {
    const exeName = process.platform === "win32" ? "java.exe" : "java";

    // 1) Java incluido en el instalador (recomendado: no depende del PC del cliente)
    const bundled = app.isPackaged
        ? path.join(process.resourcesPath, "jre", "bin", exeName)
        : path.join(__dirname, "..", "jre", "bin", exeName);
    if (fs.existsSync(bundled)) return bundled;

    // 2) JAVA_HOME
    const javaHome = process.env.JAVA_HOME;
    if (javaHome) {
        const exe = path.join(javaHome, "bin", exeName);
        if (fs.existsSync(exe)) return exe;
    }

    // 3) Rutas comunes de Java 21 en Windows
    const vendorDirs = [
        "C:\\Program Files\\Java",
        "C:\\Program Files\\Eclipse Adoptium",
        "C:\\Program Files\\Microsoft",
        "C:\\Program Files\\Zulu",
    ];
    for (const dir of vendorDirs) {
        try {
            const matches = fs.readdirSync(dir).filter((f) => /(jdk|jre|zulu)-?21/i.test(f));
            for (const m of matches) {
                const exe = path.join(dir, m, "bin", exeName);
                if (fs.existsSync(exe)) return exe;
            }
        } catch (e) { /* carpeta no existe */ }
    }

    // 4) PATH
    try {
        const cmd = process.platform === "win32" ? "where java 2>NUL" : "which java";
        const result = execSync(cmd, { encoding: "utf8" }).trim();
        if (result) return result.split(/\r?\n/)[0].trim();
    } catch (e) { /* no está en PATH */ }

    return null;
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", reject);
        srv.listen(0, "127.0.0.1", () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

function checkBackendHealthy(port, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/q/health/ready`, { timeout: timeoutMs }, (res) => {
            let body = "";
            res.on("data", (c) => (body += c));
            res.on("end", () => {
                let ok = false;
                try {
                    ok = res.statusCode === 200 && JSON.parse(body).status === "UP";
                } catch (e) { /* respuesta no válida */ }
                resolve(ok);
            });
        });
        req.on("error", () => resolve(false));
        req.on("timeout", () => { req.destroy(); resolve(false); });
    });
}

async function waitForBackend(port, maxAttempts = 60, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        if (backendProcess && backendProcess.exitCode !== null) return false;
        if (await checkBackendHealthy(port)) return true;
        await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
}

async function startBackend() {
    // En desarrollo se reutiliza un backend ya levantado (mvn quarkus:dev) sin llave
    if (isDev && (await checkBackendHealthy(DEV_BACKEND_PORT))) {
        logToFile("[backend] Usando backend de desarrollo en el puerto 8080");
        backendPort = DEV_BACKEND_PORT;
        appKey = null;
        return { ok: true };
    }

    const jar = resolveBackendJar();
    if (!jar || !fs.existsSync(jar)) {
        logToFile(`[backend] JAR no encontrado: ${jar}`);
        return { ok: false, reason: "No se encontró el servidor de la aplicación. Reinstale System Gym." };
    }

    const javaExe = findJavaExecutable();
    if (!javaExe) {
        logToFile("[backend] Java no encontrado");
        return {
            ok: false,
            reason: "No se encontró Java 21. Reinstale System Gym (el instalador lo incluye) o instale Java 21 desde https://adoptium.net/",
        };
    }

    aplicarRestauracionPendiente();

    backendPort = await getFreePort();
    appKey = crypto.randomBytes(32).toString("hex");
    logToFile(`[backend] Java: ${javaExe} | JAR: ${jar} | puerto ${backendPort}`);

    const env = {
        ...process.env,
        QUARKUS_HTTP_PORT: String(backendPort),
        SYSTEMGYM_APP_SECRET: appKey,
    };
    const equipo = idEquipo();
    if (equipo) env.SYSTEMGYM_MACHINE_ID = equipo;
    const llaveLicencia = leerLlavePublicaLicencia();
    if (llaveLicencia) env.SYSTEMGYM_LICENSE_PUBLIC_KEY = llaveLicencia;
    backendProcess = spawn(javaExe, ["-jar", jar], { env, stdio: "ignore", windowsHide: true });
    backendProcess.on("error", (err) => logToFile(`[backend] Error: ${err.message}`));
    backendProcess.on("exit", (code) => logToFile(`[backend] Terminó con código ${code}`));

    const ok = await waitForBackend(backendPort);
    return ok ? { ok: true } : { ok: false, reason: "El servidor de la aplicación no respondió a tiempo." };
}

// ============================================================
// LICENCIA: la llave PÚBLICA viaja con la app (electron/license-public.pem).
// Sin ese archivo el licenciamiento queda desactivado (modo desarrollo).
// La llave privada nunca va en el repositorio (ver tools/licencias).
// ============================================================
function leerLlavePublicaLicencia() {
    if (process.env.SYSTEMGYM_LICENSE_PUBLIC_KEY) return process.env.SYSTEMGYM_LICENSE_PUBLIC_KEY;
    try {
        const pem = fs.readFileSync(path.join(__dirname, "license-public.pem"), "utf8").trim();
        if (pem.includes("BEGIN PUBLIC KEY")) return pem;
    } catch (e) { /* sin llave: licencia desactivada */ }
    logToFile("[licencia] No hay electron/license-public.pem: licenciamiento desactivado");
    return null;
}

// Código del equipo para licencias atadas a un PC: SHA-256 del MachineGuid de Windows
// (no cambia al reinstalar System Gym). Se muestran 16 caracteres.
function idEquipo() {
    try {
        let base = "";
        if (process.platform === "win32") {
            const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
                { encoding: "utf8", windowsHide: true });
            base = (/MachineGuid\s+REG_SZ\s+(\S+)/i.exec(out) || [])[1] || "";
        }
        if (!base) base = `${os.hostname()}|${os.userInfo().username}`;
        return crypto.createHash("sha256").update(base).digest("hex").slice(0, 16).toUpperCase();
    } catch (e) {
        logToFile(`[licencia] No se pudo calcular el código del equipo: ${e.message}`);
        return null;
    }
}

// ============================================================
// RESTAURACIÓN DE RESPALDOS
// El backend no puede reemplazar su propia base de datos mientras la usa:
// deja ~/.gymcore/restore-pending.json y aquí se aplica antes de arrancarlo.
// La base actual se conserva como gymcore.db.antes-de-restaurar-<fecha>.
// ============================================================
function aplicarRestauracionPendiente() {
    const dirDatos = path.join(os.homedir(), ".gymcore");
    const pendiente = path.join(dirDatos, "restore-pending.json");
    if (!fs.existsSync(pendiente)) return;
    try {
        const { backup, db, name } = JSON.parse(fs.readFileSync(pendiente, "utf8"));
        const dentro = (p) => path.resolve(p).startsWith(path.resolve(dirDatos) + path.sep);
        if (!backup || !db || !dentro(backup) || !dentro(db) || !fs.existsSync(backup)) {
            throw new Error("Instrucción de restauración no válida");
        }
        const sello = new Date().toISOString().replace(/[:.]/g, "-");
        if (fs.existsSync(db)) fs.renameSync(db, `${db}.antes-de-restaurar-${sello}`);
        for (const extra of ["-journal", "-wal", "-shm"]) {
            if (fs.existsSync(db + extra)) fs.renameSync(db + extra, `${db}${extra}.antes-de-restaurar-${sello}`);
        }
        fs.copyFileSync(backup, db);
        logToFile(`[respaldo] Restaurado desde ${name || backup}`);
        dialog.showMessageBoxSync({
            type: "info", title: "System Gym",
            message: "Se restauró la información del respaldo seleccionado.",
            detail: `Respaldo: ${name || path.basename(backup)}\nLa información anterior quedó guardada en la carpeta .gymcore por si necesita volver atrás.`,
            buttons: ["Aceptar"],
        });
    } catch (e) {
        logToFile(`[respaldo] No se pudo restaurar: ${e.message}`);
        dialog.showMessageBoxSync({
            type: "error", title: "System Gym",
            message: "No se pudo restaurar el respaldo.", detail: e.message, buttons: ["Aceptar"],
        });
    } finally {
        try { fs.unlinkSync(pendiente); } catch (e) { /* noop */ }
    }
}

// Elegir carpeta (copia externa de respaldos) y reiniciar la app (tras restaurar)
ipcMain.handle("sistema:elegir-carpeta", async (event, titulo) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const r = await dialog.showOpenDialog(win, {
        title: String(titulo || "Elegir carpeta"),
        properties: ["openDirectory", "createDirectory"],
    });
    return r.canceled ? null : r.filePaths[0] || null;
});
ipcMain.handle("sistema:reiniciar", () => {
    app.relaunch();
    app.quit();
    return true;
});

// Lector de huella (proveedor simulado o real, ver electron/biometria)
biometria.registrarIpc(ipcMain);

// ============================================================
// PANTALLA DE INGRESO (quiosco): se abre en el segundo monitor si existe
// ============================================================
function rutaApp(query) {
    return isDev
        ? { url: `http://localhost:5173/?${query}` }
        : { file: path.join(__dirname, "../dist/index.html"), query: Object.fromEntries(new URLSearchParams(query)) };
}

function abrirQuiosco() {
    if (kioskWindow && !kioskWindow.isDestroyed()) {
        kioskWindow.show();
        kioskWindow.focus();
        return { ok: true, yaAbierta: true };
    }
    const pantallas = screen.getAllDisplays();
    const principal = screen.getPrimaryDisplay();
    const externa = pantallas.find((d) => d.id !== principal.id);
    const destino = externa || principal;
    kioskWindow = new BrowserWindow({
        x: destino.bounds.x,
        y: destino.bounds.y,
        width: destino.bounds.width,
        height: destino.bounds.height,
        fullscreen: Boolean(externa),
        autoHideMenuBar: true,
        title: "System Gym - Ingreso",
        backgroundColor: "#0b1220",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    kioskWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    kioskWindow.on("closed", () => { kioskWindow = null; });
    const ruta = rutaApp("modo=quiosco");
    if (ruta.url) kioskWindow.loadURL(ruta.url);
    else kioskWindow.loadFile(ruta.file, { query: ruta.query });
    return { ok: true, monitorExterno: Boolean(externa) };
}

ipcMain.handle("quiosco:abrir", () => abrirQuiosco());
ipcMain.handle("quiosco:cerrar", () => {
    if (kioskWindow && !kioskWindow.isDestroyed()) kioskWindow.close();
    return true;
});
ipcMain.handle("quiosco:pantalla-completa", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setFullScreen(!win.isFullScreen());
    return true;
});

// ============================================================
// AVISOS Y CONFIRMACIONES
// ------------------------------------------------------------
// Los alert()/confirm() nativos de Chromium en Electron (Windows) dejan la
// ventana sin foco de teclado: después de uno, los campos ya no reciben lo que
// se escribe hasta reiniciar o cambiar de ventana. La interfaz los reemplaza
// por estos diálogos, que al cerrarse devuelven el foco a la ventana.
// ============================================================
function devolverFoco(win) {
    if (!win || win.isDestroyed()) return;
    win.blur();
    win.focus();
    win.webContents.focus();
}

function textoDialogo(mensaje) {
    const texto = String(mensaje ?? "");
    return texto.length > 2000 ? texto.slice(0, 2000) + "…" : texto;
}

ipcMain.on("dialogo:alert", (event, mensaje) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const texto = textoDialogo(mensaje);
    const esError = /error|no se pudo|❌|inválid|invalid/i.test(texto);
    dialog.showMessageBoxSync(win, {
        type: esError ? "warning" : "info",
        title: "System Gym",
        message: texto,
        buttons: ["Aceptar"],
        noLink: true,
    });
    devolverFoco(win);
    event.returnValue = true;
});

ipcMain.on("dialogo:confirm", (event, mensaje) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const respuesta = dialog.showMessageBoxSync(win, {
        type: "question",
        title: "System Gym",
        message: textoDialogo(mensaje),
        buttons: ["Aceptar", "Cancelar"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
    });
    devolverFoco(win);
    event.returnValue = respuesta === 0;
});

// La interfaz pide la configuración de forma síncrona al cargar (ver preload.js)
ipcMain.on("systemgym:get-config", (event) => {
    event.returnValue = {
        apiUrl: backendPort ? `http://127.0.0.1:${backendPort}/api` : null,
        appKey,
    };
});

// ============================================================
// VENTANA
// ============================================================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        title: "System Gym",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    const win = mainWindow;
    logToFile(`[app] Ventana creada | mode=${isDev ? "development" : "production"}`);

    // Al volver a la ventana (Alt+Tab, clic) el teclado vuelve a los campos
    win.on("focus", () => {
        if (!win.isDestroyed()) win.webContents.focus();
    });

    // Solo se guardan en disco los errores del renderer. Los mensajes
    // informativos pueden contener datos sensibles y no se persisten.
    win.webContents.on("console-message", (event, level, message, line, sourceId) => {
        const isError = level === 3 || level === "error";
        if (!isError && !isDev) return;
        const safe = String(message).replace(/(password|contraseña|token)[^,}\n]*/gi, "$1: [oculto]");
        logToFile(`[renderer:${level}] ${safe} (${sourceId}:${line})`);
    });

    // Ventanas nuevas: solo la de impresión (about:blank). Enlaces externos, al navegador.
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url === "about:blank" || url === "") {
            return { action: "allow" };
        }
        if (/^https?:\/\//i.test(url)) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });

    // La ventana principal nunca navega fuera de la app
    win.webContents.on("will-navigate", (event, url) => {
        const allowed = isDev ? url.startsWith("http://localhost:5173") : url.startsWith("file://");
        if (!allowed) event.preventDefault();
    });

    win.webContents.on("render-process-gone", (event, details) => {
        logToFile(`[CRASH] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
        try { win.reload(); } catch (e) { /* noop */ }
    });
    win.webContents.on("unresponsive", () => logToFile("[WARN] La ventana dejó de responder"));
    win.webContents.on("responsive", () => logToFile("[INFO] La ventana volvió a responder"));

    if (isDev) {
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady().then(async () => {
    logToFile("[app] Iniciando...");

    // Permisos del navegador: solo la cámara (para la foto de los clientes)
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
        const soloVideo = permission === "media" && (details.mediaTypes || []).every((t) => t === "video");
        callback(soloVideo);
    });
    session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === "media");
    const result = await startBackend();

    if (!result.ok) {
        logToFile(`[app] Backend NO disponible: ${result.reason}`);
        stopBackend();
        const { response } = await dialog.showMessageBox({
            type: "error",
            title: "System Gym",
            message: "No se pudo iniciar System Gym.",
            detail: result.reason,
            buttons: ["Reintentar", "Salir"],
            defaultId: 0,
        });
        if (response === 0) {
            app.relaunch();
        }
        app.exit(response === 0 ? 0 : 1);
        return;
    }

    logToFile("[app] Backend OK, creando ventana");
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

function stopBackend() {
    if (backendProcess) {
        logToFile("[app] Terminando backend PID " + backendProcess.pid);
        try { backendProcess.kill(); } catch (e) { /* noop */ }
        backendProcess = null;
    }
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
    logToFile("[app] Cerrando...");
    biometria.cerrar();
    stopBackend();
});
