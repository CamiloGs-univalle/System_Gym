// ============================================
// UTILS - FORMATEADORES
// ============================================

/**
 * Fecha AAAA-MM-DD en la hora local del equipo (Colombia).
 * No usar date.toISOString().split("T")[0]: eso da la fecha en UTC y,
 * después de las 7:00 p. m., devuelve el día siguiente.
 */
export const fechaLocalISO = (d = new Date()) => {
    const f = d instanceof Date ? d : new Date(d);
    const y = f.getFullYear();
    const m = String(f.getMonth() + 1).padStart(2, "0");
    const dia = String(f.getDate()).padStart(2, "0");
    return `${y}-${m}-${dia}`;
};

/** Fecha y hora local "AAAA-MM-DDTHH:mm:ss" (sin "Z"): para registros que se filtran por día. */
export const fechaHoraLocalISO = (d = new Date()) => {
    const f = d instanceof Date ? d : new Date(d);
    const hh = String(f.getHours()).padStart(2, "0");
    const mm = String(f.getMinutes()).padStart(2, "0");
    const ss = String(f.getSeconds()).padStart(2, "0");
    return `${fechaLocalISO(f)}T${hh}:${mm}:${ss}`;
};

export const COP = (v) => {
    if (v === undefined || v === null || isNaN(v)) return "$0";
    return "$" + Math.round(v).toLocaleString("es-CO");
};

// Las fechas "AAAA-MM-DD" se leen como fecha local. new Date("2026-11-14") las toma
// como medianoche UTC y en Colombia (UTC-5) mostraba el día anterior.
const parseFecha = (dateStr) => {
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
};

export const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = parseFecha(dateStr);
    return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

export const formatDateShort = (dateStr) => {
    if (!dateStr) return "—";
    const date = parseFecha(dateStr);
    return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

export const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

export const formatCurrencyInput = (value) => {
    if (!value) return "";
    const num = value.toString().replace(/[^0-9]/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("es-CO");
};

export const formatHora = (timeStr) => {
    if (!timeStr) return "";
    const clean = timeStr.toString().trim();
    if (/^\d{2}:\d{2}/.test(clean)) return clean.substring(0, 5);
    const date = new Date(`1970-01-01T${clean}`);
    if (isNaN(date)) return clean;
    return date.toTimeString().substring(0, 5);
};

export const cleanCurrencyInput = (value) => {
    if (!value) return "0";
    const num = value.toString().replace(/[^0-9]/g, "");
    if (!num) return "0";
    return num;
};

export const getInitials = (name) => {
    if (!name) return "?";
    return name
        .split(" ")
        .map(word => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

export const getAvatarColor = (name) => {
    const colors = [
        "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
        "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
        "#8b5cf6", "#14b8a6", "#84cc16", "#f97316"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const formatPhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
};

export const formatRut = (rut) => {
    if (!rut) return "";
    return rut.replace(/(\d{1,3})(?=(\d{3})+(?!\d))/g, "$1.");
};

export const calculateDaysBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate - startDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getStatusColor = (status) => {
    const colors = {
        active: "#10b981",
        inactive: "#ef4444",
        pending: "#f59e0b",
        completed: "#3b82f6",
        cancelled: "#6b7280",
        warning: "#f59e0b",
        success: "#10b981",
        error: "#ef4444"
    };
    return colors[status] || "#6b7280";
};

export const getStatusLabel = (status) => {
    const labels = {
        active: "Activo",
        inactive: "Inactivo",
        pending: "Pendiente",
        completed: "Completado",
        cancelled: "Cancelado",
        warning: "Advertencia",
        success: "Éxito",
        error: "Error"
    };
    return labels[status] || status;
};