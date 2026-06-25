// ============================================
// CONFIGURACION PANEL - Configuración del sistema
// ============================================
import { useState, useMemo } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { COP, formatDate } from "../../utils/formatters";

export default function ConfiguracionPanel() {
    const [seccionActiva, setSeccionActiva] = useState("general");
    const [configuracion, setConfiguracion] = useState({
        // Configuración general
        nombreGimnasio: "GYM SYSTEM",
        nit: "900.123.456-7",
        direccion: "Calle 123 #45-67, Bogotá",
        telefono: "601 123 4567",
        email: "info@gymsystem.com",
        
        // Configuración de membresías
        preciosMembresia: {
            "30 días": 80000,
            "15 días": 50000,
            "Trimestral": 220000,
            "Semestral": 400000,
            "Anual": 750000
        },
        
        // Configuración de horarios
        horarioApertura: "05:00",
        horarioCierre: "22:00",
        diasLaborales: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        
        // Configuración de notificaciones
        notificaciones: {
            recordatorioVencimiento: true,
            diasAnticipacion: 3,
            notificarStockBajo: true,
            stockMinimoGlobal: 5
        },
        
        // Configuración de turnos
        turnos: {
            turnoCompleto: { horaInicio: "06:00", horaFin: "14:00" },
            medioTurno: { horaInicio: "06:00", horaFin: "10:00" },
            turnoTarde: { horaInicio: "14:00", horaFin: "22:00" }
        },
        
        // Configuración de impuestos
        impuestos: {
            iva: 19,
            retefuente: 0.5
        }
    });

    const [editando, setEditando] = useState(false);
    const [form, setForm] = useState(configuracion);

    const secciones = [
        { id: "general", label: "🏢 General", icon: "🏢" },
        { id: "membresias", label: "📋 Membresías", icon: "📋" },
        { id: "horarios", label: "🕐 Horarios", icon: "🕐" },
        { id: "turnos", label: "🔄 Turnos", icon: "🔄" },
        { id: "notificaciones", label: "🔔 Notificaciones", icon: "🔔" },
        { id: "impuestos", label: "💰 Impuestos", icon: "💰" },
    ];

    const handleChange = (categoria, campo, valor) => {
        setForm(prev => ({
            ...prev,
            [categoria]: {
                ...prev[categoria],
                [campo]: valor
            }
        }));
    };

    const handleSimpleChange = (campo, valor) => {
        setForm(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const handlePrecioChange = (tipo, valor) => {
        setForm(prev => ({
            ...prev,
            preciosMembresia: {
                ...prev.preciosMembresia,
                [tipo]: parseInt(valor) || 0
            }
        }));
    };

    const guardarConfiguracion = () => {
        setConfiguracion(form);
        setEditando(false);
        alert("✅ Configuración guardada exitosamente");
    };

    const cancelarEdicion = () => {
        setForm(configuracion);
        setEditando(false);
    };

    const renderSeccion = () => {
        switch (seccionActiva) {
            case "general":
                return (
                    <div className="config-seccion">
                        <h3>Información General del Gimnasio</h3>
                        <div className="config-form-grid">
                            <div className="config-campo">
                                <label>Nombre del Gimnasio</label>
                                <input 
                                    type="text" 
                                    value={form.nombreGimnasio}
                                    onChange={(e) => handleSimpleChange("nombreGimnasio", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo">
                                <label>NIT</label>
                                <input 
                                    type="text" 
                                    value={form.nit}
                                    onChange={(e) => handleSimpleChange("nit", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo config-campo-full">
                                <label>Dirección</label>
                                <input 
                                    type="text" 
                                    value={form.direccion}
                                    onChange={(e) => handleSimpleChange("direccion", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo">
                                <label>Teléfono</label>
                                <input 
                                    type="text" 
                                    value={form.telefono}
                                    onChange={(e) => handleSimpleChange("telefono", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    value={form.email}
                                    onChange={(e) => handleSimpleChange("email", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                        </div>

                        <div className="config-info-box">
                            <h4>📊 Resumen de la Configuración</h4>
                            <div className="config-info-grid">
                                <div className="config-info-item">
                                    <span className="info-label">Nombre</span>
                                    <span className="info-value">{configuracion.nombreGimnasio}</span>
                                </div>
                                <div className="config-info-item">
                                    <span className="info-label">NIT</span>
                                    <span className="info-value">{configuracion.nit}</span>
                                </div>
                                <div className="config-info-item">
                                    <span className="info-label">Teléfono</span>
                                    <span className="info-value">{configuracion.telefono}</span>
                                </div>
                                <div className="config-info-item">
                                    <span className="info-label">Email</span>
                                    <span className="info-value">{configuracion.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "membresias":
                return (
                    <div className="config-seccion">
                        <h3>Precios de Membresías</h3>
                        <div className="config-precios-grid">
                            {Object.entries(form.preciosMembresia).map(([tipo, precio]) => (
                                <div key={tipo} className="config-precio-item">
                                    <label>{tipo}</label>
                                    <div className="precio-input-group">
                                        <span className="precio-simbolo">$</span>
                                        <input 
                                            type="number" 
                                            value={precio}
                                            onChange={(e) => handlePrecioChange(tipo, e.target.value)}
                                            disabled={!editando}
                                            className="config-input config-input-precio"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="config-info-box">
                            <h4>💡 Información</h4>
                            <p>Los precios de membresía se aplican automáticamente al crear o editar un cliente.</p>
                            <p className="config-help">Los valores están en pesos colombianos (COP).</p>
                        </div>
                    </div>
                );

            case "horarios":
                return (
                    <div className="config-seccion">
                        <h3>Horario del Gimnasio</h3>
                        <div className="config-form-grid">
                            <div className="config-campo">
                                <label>Hora de Apertura</label>
                                <input 
                                    type="time" 
                                    value={form.horarioApertura}
                                    onChange={(e) => handleSimpleChange("horarioApertura", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo">
                                <label>Hora de Cierre</label>
                                <input 
                                    type="time" 
                                    value={form.horarioCierre}
                                    onChange={(e) => handleSimpleChange("horarioCierre", e.target.value)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo config-campo-full">
                                <label>Días Laborales</label>
                                <div className="config-dias-grid">
                                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(dia => (
                                        <label key={dia} className="config-dia-checkbox">
                                            <input 
                                                type="checkbox"
                                                checked={form.diasLaborales.includes(dia)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        handleSimpleChange("diasLaborales", [...form.diasLaborales, dia]);
                                                    } else {
                                                        handleSimpleChange("diasLaborales", form.diasLaborales.filter(d => d !== dia));
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

            case "turnos":
                return (
                    <div className="config-seccion">
                        <h3>Configuración de Turnos</h3>
                        <div className="config-turnos-grid">
                            <div className="config-turno-item">
                                <h4>Turno Completo</h4>
                                <div className="config-form-grid">
                                    <div className="config-campo">
                                        <label>Hora Inicio</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.turnoCompleto.horaInicio}
                                            onChange={(e) => handleChange("turnos", "turnoCompleto", {
                                                ...form.turnos.turnoCompleto,
                                                horaInicio: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                    <div className="config-campo">
                                        <label>Hora Fin</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.turnoCompleto.horaFin}
                                            onChange={(e) => handleChange("turnos", "turnoCompleto", {
                                                ...form.turnos.turnoCompleto,
                                                horaFin: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="config-turno-item">
                                <h4>Medio Turno</h4>
                                <div className="config-form-grid">
                                    <div className="config-campo">
                                        <label>Hora Inicio</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.medioTurno.horaInicio}
                                            onChange={(e) => handleChange("turnos", "medioTurno", {
                                                ...form.turnos.medioTurno,
                                                horaInicio: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                    <div className="config-campo">
                                        <label>Hora Fin</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.medioTurno.horaFin}
                                            onChange={(e) => handleChange("turnos", "medioTurno", {
                                                ...form.turnos.medioTurno,
                                                horaFin: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="config-turno-item">
                                <h4>Turno Tarde</h4>
                                <div className="config-form-grid">
                                    <div className="config-campo">
                                        <label>Hora Inicio</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.turnoTarde.horaInicio}
                                            onChange={(e) => handleChange("turnos", "turnoTarde", {
                                                ...form.turnos.turnoTarde,
                                                horaInicio: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                    <div className="config-campo">
                                        <label>Hora Fin</label>
                                        <input 
                                            type="time" 
                                            value={form.turnos.turnoTarde.horaFin}
                                            onChange={(e) => handleChange("turnos", "turnoTarde", {
                                                ...form.turnos.turnoTarde,
                                                horaFin: e.target.value
                                            })}
                                            disabled={!editando}
                                            className="config-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "notificaciones":
                return (
                    <div className="config-seccion">
                        <h3>Configuración de Notificaciones</h3>
                        <div className="config-notificaciones">
                            <div className="config-notificacion-item">
                                <div className="config-toggle">
                                    <label className="config-toggle-label">
                                        <input 
                                            type="checkbox" 
                                            checked={form.notificaciones.recordatorioVencimiento}
                                            onChange={(e) => handleChange("notificaciones", "recordatorioVencimiento", e.target.checked)}
                                            disabled={!editando}
                                            className="config-toggle-input"
                                        />
                                        <span className="config-toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="config-notificacion-info">
                                    <span className="config-notificacion-label">Recordatorio de vencimiento</span>
                                    <span className="config-notificacion-desc">Envía recordatorios cuando una membresía esté por vencer</span>
                                </div>
                            </div>

                            <div className="config-notificacion-item">
                                <div className="config-campo config-campo-small">
                                    <label>Días de anticipación</label>
                                    <input 
                                        type="number" 
                                        value={form.notificaciones.diasAnticipacion}
                                        onChange={(e) => handleChange("notificaciones", "diasAnticipacion", parseInt(e.target.value) || 0)}
                                        disabled={!editando}
                                        className="config-input"
                                    />
                                </div>
                            </div>

                            <div className="config-notificacion-item">
                                <div className="config-toggle">
                                    <label className="config-toggle-label">
                                        <input 
                                            type="checkbox" 
                                            checked={form.notificaciones.notificarStockBajo}
                                            onChange={(e) => handleChange("notificaciones", "notificarStockBajo", e.target.checked)}
                                            disabled={!editando}
                                            className="config-toggle-input"
                                        />
                                        <span className="config-toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="config-notificacion-info">
                                    <span className="config-notificacion-label">Notificar stock bajo</span>
                                    <span className="config-notificacion-desc">Alerta cuando el stock de un producto esté por debajo del mínimo</span>
                                </div>
                            </div>

                            <div className="config-notificacion-item">
                                <div className="config-campo config-campo-small">
                                    <label>Stock mínimo global</label>
                                    <input 
                                        type="number" 
                                        value={form.notificaciones.stockMinimoGlobal}
                                        onChange={(e) => handleChange("notificaciones", "stockMinimoGlobal", parseInt(e.target.value) || 0)}
                                        disabled={!editando}
                                        className="config-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "impuestos":
                return (
                    <div className="config-seccion">
                        <h3>Configuración de Impuestos</h3>
                        <div className="config-form-grid">
                            <div className="config-campo">
                                <label>IVA (%)</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={form.impuestos.iva}
                                    onChange={(e) => handleChange("impuestos", "iva", parseFloat(e.target.value) || 0)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                            <div className="config-campo">
                                <label>Retefuente (%)</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={form.impuestos.retefuente}
                                    onChange={(e) => handleChange("impuestos", "retefuente", parseFloat(e.target.value) || 0)}
                                    disabled={!editando}
                                    className="config-input"
                                />
                            </div>
                        </div>
                        <div className="config-info-box">
                            <h4>💰 Cálculo de Impuestos</h4>
                            <div className="config-info-grid">
                                <div className="config-info-item">
                                    <span className="info-label">IVA</span>
                                    <span className="info-value">{form.impuestos.iva}%</span>
                                </div>
                                <div className="config-info-item">
                                    <span className="info-label">Retefuente</span>
                                    <span className="info-value">{form.impuestos.retefuente}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="configuracion-container">
            <div className="configuracion-header">
                <h2>⚙️ Configuración del Sistema</h2>
                <div className="configuracion-actions">
                    {!editando ? (
                        <Button variant="primary" onClick={() => setEditando(true)}>
                            ✏️ Editar Configuración
                        </Button>
                    ) : (
                        <>
                            <Button variant="success" onClick={guardarConfiguracion}>
                                💾 Guardar Cambios
                            </Button>
                            <Button variant="danger" onClick={cancelarEdicion}>
                                ❌ Cancelar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="configuracion-body">
                {/* Sidebar de secciones */}
                <aside className="configuracion-sidebar">
                    {secciones.map(sec => (
                        <button
                            key={sec.id}
                            className={`config-sidebar-btn ${seccionActiva === sec.id ? "active" : ""}`}
                            onClick={() => setSeccionActiva(sec.id)}
                        >
                            <span className="config-sidebar-icon">{sec.icon}</span>
                            <span className="config-sidebar-label">{sec.label}</span>
                        </button>
                    ))}
                </aside>

                {/* Contenido de la sección */}
                <main className="configuracion-main">
                    <Card className="config-card">
                        {renderSeccion()}
                    </Card>
                </main>
            </div>

            {/* Estado actual de la configuración */}
            <div className="configuracion-footer">
                <div className="config-footer-info">
                    <span className="config-footer-label">Estado:</span>
                    <span className={`config-footer-status ${editando ? "status-editing" : "status-saved"}`}>
                        {editando ? "✏️ Editando" : "✅ Configuración guardada"}
                    </span>
                    <span className="config-footer-label">Última modificación:</span>
                    <span className="config-footer-date">{formatDate(new Date().toISOString())}</span>
                </div>
            </div>
        </div>
    );
}