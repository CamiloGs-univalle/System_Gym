// src/pages/admin/turnos/CrearTurno.jsx
// VERSIÓN 2.0 - CORREGIDA ✅

import { useState } from "react";
import Button from "../../../components/ui/Button";
import { turnoService, obtenerHorariosConfigurados } from "../../../services/turnoService";
import { TIPOS_TURNO } from "./TurnosPanel";
import { formatCurrencyInput, cleanCurrencyInput } from "../../../utils/formatters";

const hoy = new Date().toISOString().split("T")[0];
const horariosConfig = obtenerHorariosConfigurados();

export default function CrearTurno({ empleados, onClose, onSuccess, fechaDefault = hoy }) {
    const [form, setForm] = useState({
        empleadoId: "",
        tipo: "FULL_SHIFT", // ✅ clave válida (antes: "FULL")
        fecha: fechaDefault,
        horaInicio: horariosConfig.FULL_SHIFT.horaInicio,
        horaFin: horariosConfig.FULL_SHIFT.horaFin,
        baseCaja: 0,
        observaciones: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setTipo = (tipo) => {
        // Horarios por defecto según el tipo de turno (desde configuración del admin)
        const horario = horariosConfig[tipo] || horariosConfig.FULL_SHIFT;
        setForm(prev => ({ ...prev, tipo, horaInicio: horario.horaInicio, horaFin: horario.horaFin }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.empleadoId) {
            setError("Selecciona un empleado");
            return;
        }

        if (form.horaFin <= form.horaInicio) {
            setError("La hora de fin debe ser posterior a la hora de inicio");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const empleadoSel = empleados.find(e => String(e.id) === String(form.empleadoId));
            const payload = {
                type: form.tipo, // ✅ ya es un valor válido del enum ShiftType
                cashBase: parseFloat(cleanCurrencyInput(form.baseCaja)) || 0,
                receptionistId: empleadoSel?.userId || parseInt(form.empleadoId),
                date: form.fecha, // ✅ ahora sí llega hasta turnoService.abrir()
                scheduledDate: form.fecha,
                startTime: form.horaInicio,
                endTime: form.horaFin,
                observations: form.observaciones,
            };

            await turnoService.abrir(payload);
            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error("❌ Error creando turno:", err);
            if (err.response?.status === 422 || err.mensajeUsuario?.includes('turno abierto')) {
                setError(err.mensajeUsuario || "⚠️ El empleado ya tiene un turno abierto");
            } else {
                setError(err.mensajeUsuario || err.message || "Error al crear el turno");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{
                maxWidth: '500px', width: '95%', background: 'white', borderRadius: '12px',
                padding: '24px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '28px' }}>🕐</div>
                        <h3 style={{ margin: 0, fontSize: '20px' }}>Nuevo Turno</h3>
                        <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '13px' }}>Registra el inicio de un nuevo turno</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280', padding: '4px 8px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>✕</button>
                </div>

                {error && (
                    <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', border: '1px solid #fca5a5' }}>❌ {error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Empleado *</label>
                            <select value={form.empleadoId} onChange={e => setForm({ ...form, empleadoId: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', background: 'white' }} required>
                                <option value="">Seleccionar empleado</option>
                                {empleados?.filter(e => e.activo !== false).map(e => (
                                    <option key={e.id} value={e.id}>{e.nombre} {e.cargo ? `— ${e.cargo}` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Tipo de Turno</label>
                            <select value={form.tipo} onChange={e => setTipo(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', background: 'white' }}>
                                {Object.entries(TIPOS_TURNO).map(([key, val]) => (
                                    <option key={key} value={key}>{val.icon} {val.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Hora Inicio</label>
                                <input type="time" value={form.horaInicio} onChange={e => setForm({ ...form, horaInicio: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Hora Fin</label>
                                <input type="time" value={form.horaFin} onChange={e => setForm({ ...form, horaFin: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#1d4ed8' }}>
                            <span style={{ fontSize: '16px' }}>🕐</span>
                            <span>
                                <strong>Horario asignado:</strong> {form.fecha ? new Date(form.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'} · {form.horaInicio} a {form.horaFin}
                            </span>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Base de Caja ($)</label>
                            <input type="text" inputMode="numeric" value={formatCurrencyInput(form.baseCaja)} onChange={e => setForm({ ...form, baseCaja: e.target.value.replace(/[^0-9]/g, '') })} placeholder="$ 0"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Observaciones</label>
                            <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas adicionales..."
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '60px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 18px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} disabled={loading}>Cancelar</button>
                        <Button variant="primary" type="submit" disabled={loading}>{loading ? '⏳ Creando...' : '✅ Crear Turno'}</Button>
                    </div>
                </form>

                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}