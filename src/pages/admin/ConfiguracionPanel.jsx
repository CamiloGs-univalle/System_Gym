// ============================================================
// ARCHIVO: src/pages/admin/ConfiguracionPanel.jsx
// DESCRIPCIÓN: Panel de configuración del sistema
// VERSIÓN: 3.1 - CON FALLBACK PARA DATOS LOCALES
// ============================================================

import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { formatDate } from "../../utils/formatters";

// ============================================================
// CONSTANTES
// ============================================================
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const CONFIG_DEFAULT = {
    nombreGimnasio: "GYM SYSTEM",
    nit: "900.123.456-7",
    direccion: "Calle 123 #45-67, Bogotá",
    telefono: "601 123 4567",
    email: "info@gymsystem.com",
    horarioApertura: "05:00",
    horarioCierre: "22:00",
    diasLaborales: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    notificaciones: {
        recordatorioVencimiento: true,
        diasAnticipacion: 3,
        notificarStockBajo: true,
        stockMinimoGlobal: 5
    },
    turnos: {
        turnoCompleto: { horaInicio: "06:00", horaFin: "14:00" },
        medioTurno: { horaInicio: "06:00", horaFin: "10:00" },
        turnoTarde: { horaInicio: "14:00", horaFin: "22:00" }
    },
    impuestos: {
        iva: 19,
        retefuente: 0.5
    }
};

const MEMBRESIAS_DEFAULT = [
    { id: 1, nombre: "30 días", precio: 80000, duracion: 30 },
    { id: 2, nombre: "15 días", precio: 50000, duracion: 15 },
    { id: 3, nombre: "Trimestral", precio: 220000, duracion: 90 },
    { id: 4, nombre: "Semestral", precio: 400000, duracion: 180 },
    { id: 5, nombre: "Anual", precio: 750000, duracion: 365 }
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ConfiguracionPanel() {
    // ============================================================
    // 1. ESTADO
    // ============================================================

    const [seccionActiva, setSeccionActiva] = useState("general");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");
    const [error, setError] = useState(null);

    const [editando, setEditando] = useState(false);
    const [configuracion, setConfiguracion] = useState(CONFIG_DEFAULT);
    const [form, setForm] = useState(CONFIG_DEFAULT);
    const [membresias, setMembresias] = useState(MEMBRESIAS_DEFAULT);

    // ============================================================
    // 2. SECCIONES
    // ============================================================

    const secciones = [
        { id: "general", label: "🏢 General", icon: "🏢" },
        { id: "membresias", label: "📋 Membresías", icon: "📋" },
        { id: "horarios", label: "🕐 Horarios", icon: "🕐" },
        { id: "turnos", label: "🔄 Turnos", icon: "🔄" },
        { id: "notificaciones", label: "🔔 Notificaciones", icon: "🔔" },
        { id: "impuestos", label: "💰 Impuestos", icon: "💰" },
    ];

    // ============================================================
    // 3. CARGAR DATOS
    // ============================================================

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Intentar cargar desde localStorage
            const localConfig = localStorage.getItem('gym_configuracion');
            const localMembresias = localStorage.getItem('gym_membresias');

            if (localConfig) {
                const parsed = JSON.parse(localConfig);
                setConfiguracion(parsed);
                setForm(parsed);
            }

            if (localMembresias) {
                setMembresias(JSON.parse(localMembresias));
            }

            console.log("✅ Configuración cargada desde localStorage");
        } catch (err) {
            console.error("❌ Error cargando datos:", err);
        } finally {
            setCargando(false);
        }
    };

    // ============================================================
    // 4. MANEJADORES DE CAMBIOS
    // ============================================================

    const handleSimpleChange = (campo, valor) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
    };

    const handleChange = (categoria, campo, valor) => {
        setForm(prev => ({
            ...prev,
            [categoria]: {
                ...prev[categoria],
                [campo]: valor
            }
        }));
    };

    const handlePrecioMembresia = (id, valor) => {
        setMembresias(prev => prev.map(m => 
            m.id === id ? { ...m, precio: parseInt(valor) || 0 } : m
        ));
    };

    // ============================================================
    // 5. GUARDAR CONFIGURACIÓN
    // ============================================================

    const guardarConfiguracion = async () => {
        setGuardando(true);
        setError(null);
        setMensajeExito("");

        try {
            // Guardar en localStorage
            localStorage.setItem('gym_configuracion', JSON.stringify(form));
            localStorage.setItem('gym_membresias', JSON.stringify(membresias));

            setConfiguracion(JSON.parse(JSON.stringify(form)));
            setEditando(false);
            setMensajeExito("✅ Configuración guardada exitosamente");
            
            setTimeout(() => setMensajeExito(""), 5000);

        } catch (err) {
            console.error("❌ Error guardando:", err);
            setError("Error al guardar la configuración");
        } finally {
            setGuardando(false);
        }
    };

    const cancelarEdicion = () => {
        setForm(JSON.parse(JSON.stringify(configuracion)));
        setEditando(false);
        setError(null);
    };

    // ============================================================
    // 6. RENDER DE SECCIONES
    // ============================================================

    const renderGeneral = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Información General del Gimnasio
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Nombre del Gimnasio</label>
                    <input 
                        type="text" 
                        value={form?.nombreGimnasio || ""}
                        onChange={(e) => handleSimpleChange("nombreGimnasio", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>NIT</label>
                    <input 
                        type="text" 
                        value={form?.nit || ""}
                        onChange={(e) => handleSimpleChange("nit", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Dirección</label>
                    <input 
                        type="text" 
                        value={form?.direccion || ""}
                        onChange={(e) => handleSimpleChange("direccion", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Teléfono</label>
                    <input 
                        type="text" 
                        value={form?.telefono || ""}
                        onChange={(e) => handleSimpleChange("telefono", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Email</label>
                    <input 
                        type="email" 
                        value={form?.email || ""}
                        onChange={(e) => handleSimpleChange("email", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
            </div>

            {!editando && (
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151" }}>📊 Resumen</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                        <div><span style={{ color: "#6b7280" }}>Nombre:</span> <strong>{configuracion?.nombreGimnasio}</strong></div>
                        <div><span style={{ color: "#6b7280" }}>NIT:</span> <strong>{configuracion?.nit}</strong></div>
                        <div><span style={{ color: "#6b7280" }}>Teléfono:</span> <strong>{configuracion?.telefono}</strong></div>
                        <div><span style={{ color: "#6b7280" }}>Email:</span> <strong>{configuracion?.email}</strong></div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderMembresias = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Precios de Membresías
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {membresias.map(m => (
                    <div key={m.id} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                            {m.nombre}
                        </label>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{ color: "#6b7280", marginRight: "4px" }}>$</span>
                            <input 
                                type="number" 
                                value={m.precio || 0}
                                onChange={(e) => handlePrecioMembresia(m.id, e.target.value)}
                                disabled={!editando}
                                style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                            />
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                            Duración: {m.duracion} días
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#1e40af" }}>
                    💡 Los precios de membresía se aplican automáticamente al crear o editar un cliente.
                </p>
            </div>
        </div>
    );

    const renderHorarios = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Horario del Gimnasio
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Hora de Apertura</label>
                    <input 
                        type="time" 
                        value={form?.horarioApertura || "05:00"}
                        onChange={(e) => handleSimpleChange("horarioApertura", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Hora de Cierre</label>
                    <input 
                        type="time" 
                        value={form?.horarioCierre || "22:00"}
                        onChange={(e) => handleSimpleChange("horarioCierre", e.target.value)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Días Laborales</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {DIAS_SEMANA.map(dia => (
                            <label key={dia} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: editando ? "pointer" : "default" }}>
                                <input 
                                    type="checkbox"
                                    checked={form?.diasLaborales?.includes(dia) || false}
                                    onChange={(e) => {
                                        if (!editando) return;
                                        if (e.target.checked) {
                                            handleSimpleChange("diasLaborales", [...(form?.diasLaborales || []), dia]);
                                        } else {
                                            handleSimpleChange("diasLaborales", (form?.diasLaborales || []).filter(d => d !== dia));
                                        }
                                    }}
                                    disabled={!editando}
                                />
                                {dia}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTurnos = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Configuración de Turnos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {[
                    { key: "turnoCompleto", label: "Turno Completo" },
                    { key: "medioTurno", label: "Medio Turno" },
                    { key: "turnoTarde", label: "Turno Tarde" }
                ].map(({ key, label }) => (
                    <div key={key} style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                        <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#374151" }}>{label}</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Inicio</label>
                                <input 
                                    type="time" 
                                    value={form?.turnos?.[key]?.horaInicio || "06:00"}
                                    onChange={(e) => handleChange("turnos", key, {
                                        ...(form?.turnos?.[key] || {}),
                                        horaInicio: e.target.value
                                    })}
                                    disabled={!editando}
                                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Fin</label>
                                <input 
                                    type="time" 
                                    value={form?.turnos?.[key]?.horaFin || "14:00"}
                                    onChange={(e) => handleChange("turnos", key, {
                                        ...(form?.turnos?.[key] || {}),
                                        horaFin: e.target.value
                                    })}
                                    disabled={!editando}
                                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderNotificaciones = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Configuración de Notificaciones
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: editando ? "pointer" : "default" }}>
                        <input 
                            type="checkbox" 
                            checked={form?.notificaciones?.recordatorioVencimiento || false}
                            onChange={(e) => handleChange("notificaciones", "recordatorioVencimiento", e.target.checked)}
                            disabled={!editando}
                        />
                        <span style={{ fontWeight: "500" }}>Recordatorio de vencimiento</span>
                    </label>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Envía recordatorios cuando una membresía esté por vencer</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Días de anticipación</label>
                        <input 
                            type="number" 
                            value={form?.notificaciones?.diasAnticipacion || 3}
                            onChange={(e) => handleChange("notificaciones", "diasAnticipacion", parseInt(e.target.value) || 0)}
                            disabled={!editando}
                            style={{ width: "80px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: editando ? "pointer" : "default" }}>
                        <input 
                            type="checkbox" 
                            checked={form?.notificaciones?.notificarStockBajo || false}
                            onChange={(e) => handleChange("notificaciones", "notificarStockBajo", e.target.checked)}
                            disabled={!editando}
                        />
                        <span style={{ fontWeight: "500" }}>Notificar stock bajo</span>
                    </label>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Alerta cuando el stock esté por debajo del mínimo</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Stock mínimo global</label>
                        <input 
                            type="number" 
                            value={form?.notificaciones?.stockMinimoGlobal || 5}
                            onChange={(e) => handleChange("notificaciones", "stockMinimoGlobal", parseInt(e.target.value) || 0)}
                            disabled={!editando}
                            style={{ width: "80px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderImpuestos = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Configuración de Impuestos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>IVA (%)</label>
                    <input 
                        type="number" 
                        step="0.1"
                        value={form?.impuestos?.iva || 19}
                        onChange={(e) => handleChange("impuestos", "iva", parseFloat(e.target.value) || 0)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569" }}>Retefuente (%)</label>
                    <input 
                        type="number" 
                        step="0.1"
                        value={form?.impuestos?.retefuente || 0.5}
                        onChange={(e) => handleChange("impuestos", "retefuente", parseFloat(e.target.value) || 0)}
                        disabled={!editando}
                        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: editando ? "white" : "#f8fafc" }}
                    />
                </div>
            </div>
            {!editando && (
                <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                        <div><span style={{ color: "#6b7280" }}>IVA:</span> <strong>{form?.impuestos?.iva || 19}%</strong></div>
                        <div><span style={{ color: "#6b7280" }}>Retefuente:</span> <strong>{form?.impuestos?.retefuente || 0.5}%</strong></div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSeccion = () => {
        switch (seccionActiva) {
            case "general": return renderGeneral();
            case "membresias": return renderMembresias();
            case "horarios": return renderHorarios();
            case "turnos": return renderTurnos();
            case "notificaciones": return renderNotificaciones();
            case "impuestos": return renderImpuestos();
            default: return null;
        }
    };

    // ============================================================
    // 7. RENDER PRINCIPAL
    // ============================================================

    if (cargando) {
        return (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid #f3f4f6", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
                <p style={{ color: "#6b7280" }}>Cargando configuración...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
            {/* Mensajes */}
            {mensajeExito && (
                <div style={{ background: "#d1fae5", color: "#065f46", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #6ee7b7" }}>
                    {mensajeExito}
                </div>
            )}
            {error && editando && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #fca5a5" }}>
                    ❌ {error}
                    <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", float: "right", fontSize: "18px" }}>✕</button>
                </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #e5e7eb" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111827" }}>⚙️ Configuración del Sistema</h2>
                <div style={{ display: "flex", gap: "8px" }}>
                    {!editando ? (
                        <Button variant="primary" onClick={() => setEditando(true)}>
                            ✏️ Editar
                        </Button>
                    ) : (
                        <>
                            <Button variant="success" onClick={guardarConfiguracion} disabled={guardando}>
                                {guardando ? "⏳ Guardando..." : "💾 Guardar"}
                            </Button>
                            <Button variant="danger" onClick={cancelarEdicion} disabled={guardando}>
                                ❌ Cancelar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div style={{ display: "flex", gap: "16px", flex: 1, overflow: "hidden" }}>
                {/* Sidebar */}
                <aside style={{ width: "180px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {secciones.map(sec => {
                        const active = seccionActiva === sec.id;
                        return (
                            <button
                                key={sec.id}
                                onClick={() => setSeccionActiva(sec.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: active ? "#3b82f6" : "transparent",
                                    color: active ? "white" : "#6b7280",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: active ? "600" : "500",
                                    transition: "all 0.15s"
                                }}
                            >
                                <span>{sec.icon}</span>
                                <span>{sec.label}</span>
                            </button>
                        );
                    })}
                </aside>

                {/* Content */}
                <main style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                    <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                        {renderSeccion()}
                    </div>
                </main>
            </div>

            {/* Footer */}
            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#6b7280" }}>
                <span>Estado: <strong style={{ color: editando ? "#f59e0b" : "#10b981" }}>{editando ? "✏️ Editando" : "✅ Guardado"}</strong></span>
                <span>Última modificación: {formatDate(new Date().toISOString())}</span>
            </div>
        </div>
    );
}