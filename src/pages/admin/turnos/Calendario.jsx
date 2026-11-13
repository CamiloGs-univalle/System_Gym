/**
 * ARCHIVO: src/pages/admin/turnos/Calendario.jsx
 * VERSIÓN: 2.0 - CON DRAG & DROP ✅
 */

import { useState } from "react";
import Button from "../../../components/ui/Button";
import { COP, formatDate, fechaLocalISO } from "../../../utils/formatters";

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Calendario({
    turnos = [],
    empleados = [],
    onCrearTurno,
    onEditarTurno,
    onCerrarTurno,
    onMoverTurno,
    getNombreEmpleado,
    getTipoInfo,
}) {
    const [semanaActual, setSemanaActual] = useState(new Date());
    const [diaDragOver, setDiaDragOver] = useState(null);

    const obtenerSemana = (fecha) => {
        const start = new Date(fecha);
        start.setDate(start.getDate() - start.getDay() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return '--/--/----';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const fechaISOParaDia = (diaIndex) => {
        const { start } = obtenerSemana(semanaActual);
        const fecha = new Date(start);
        fecha.setDate(fecha.getDate() + diaIndex);
        return fechaLocalISO(fecha);
    };

    const cambiarSemana = (direccion) => {
        const nueva = new Date(semanaActual);
        nueva.setDate(nueva.getDate() + (direccion * 7));
        setSemanaActual(nueva);
    };

    const irAHoy = () => setSemanaActual(new Date());

    const getTurnosDelDia = (diaIndex) => {
        const fechaStr = fechaISOParaDia(diaIndex);
        return turnos.filter(t => {
            const tFecha = t.fecha?.split('T')[0] || t.fecha;
            return tFecha === fechaStr;
        });
    };

    // ============================================================
    // DRAG & DROP
    // ============================================================

    const handleDragStart = (e, turno) => {
        if (turno.cerrado) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", String(turno.id));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOverDia = (e, diaIndex) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (diaDragOver !== diaIndex) setDiaDragOver(diaIndex);
    };

    const handleDragLeaveDia = () => setDiaDragOver(null);

    const handleDropEnDia = (e, diaIndex) => {
        e.preventDefault();
        setDiaDragOver(null);
        const turnoIdStr = e.dataTransfer.getData("text/plain");
        if (!turnoIdStr) return;
        const turnoId = Number(turnoIdStr);
        const nuevaFecha = fechaISOParaDia(diaIndex);
        onMoverTurno?.(turnoId, nuevaFecha);
    };

    const { start, end } = obtenerSemana(semanaActual);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => cambiarSemana(-1)} style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>◀</button>
                    <button onClick={irAHoy} style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>📍 Hoy</button>
                    <button onClick={() => cambiarSemana(1)} style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>▶</button>
                </div>
                <span style={{ fontWeight: '500', fontSize: '14px' }}>{formatearFecha(start)} - {formatearFecha(end)}</span>
                <Button variant="primary" size="small" onClick={() => onCrearTurno?.(fechaISOParaDia(0))}>➕ Nuevo Turno</Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                <span>💡</span>
                <span>Arrastra una tarjeta de turno <strong>abierto</strong> a otro día para reprogramarlo.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {DIAS_SEMANA.map((dia, i) => {
                    const fechaDia = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000));
                    const esHoy = new Date().toDateString() === fechaDia.toDateString();
                    return (
                        <div key={i} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: '600', background: esHoy ? '#eff6ff' : '#f9fafb', borderBottom: `2px solid ${esHoy ? '#3b82f6' : '#e5e7eb'}`, fontSize: '13px' }}>
                            {dia}
                            <div style={{ fontSize: '11px', fontWeight: '400', color: esHoy ? '#3b82f6' : '#6b7280' }}>{formatearFecha(fechaDia)}</div>
                        </div>
                    );
                })}

                {DIAS_SEMANA.map((dia, diaIndex) => {
                    const turnosDia = getTurnosDelDia(diaIndex);
                    const fechaDia = new Date(start.getTime() + (diaIndex * 24 * 60 * 60 * 1000));
                    const esHoy = new Date().toDateString() === fechaDia.toDateString();
                    const enDragOver = diaDragOver === diaIndex;

                    return (
                        <div
                            key={diaIndex}
                            onDragOver={(e) => handleDragOverDia(e, diaIndex)}
                            onDragLeave={handleDragLeaveDia}
                            onDrop={(e) => handleDropEnDia(e, diaIndex)}
                            style={{
                                minHeight: '280px',
                                padding: '6px',
                                borderRight: diaIndex < 6 ? '1px solid #f3f4f6' : 'none',
                                background: enDragOver ? '#eff6ff' : (esHoy ? '#f8faff' : 'white'),
                                outline: enDragOver ? '2px dashed #3b82f6' : 'none',
                                outlineOffset: '-2px',
                                transition: 'background 0.15s'
                            }}
                        >
                            <div
                                style={{ padding: '4px', marginBottom: '4px', border: '2px dashed transparent', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontSize: '11px', color: '#9ca3af', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#93c5fd'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                onClick={() => onCrearTurno?.(fechaISOParaDia(diaIndex))}
                            >
                                + Agregar
                            </div>

                            {turnosDia.map((turno, idx) => {
                                const tipoInfo = getTipoInfo(turno.tipo);
                                const nombre = getNombreEmpleado(turno.empleadoId || turno.receptionistId);
                                const estaCerrado = turno.cerrado;

                                return (
                                    <div
                                        key={turno.id || idx}
                                        draggable={!estaCerrado}
                                        onDragStart={(e) => handleDragStart(e, turno)}
                                        title={estaCerrado ? 'Turno cerrado (no se puede mover)' : 'Arrastra para reprogramar'}
                                        style={{
                                            background: estaCerrado ? '#f3f4f6' : tipoInfo.bg,
                                            borderLeft: `3px solid ${estaCerrado ? '#9ca3af' : tipoInfo.color}`,
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            marginBottom: '4px',
                                            cursor: estaCerrado ? 'pointer' : 'grab',
                                            opacity: estaCerrado ? 0.7 : 1,
                                            fontSize: '11px',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => onEditarTurno?.(turno)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    {!estaCerrado && <span style={{ color: '#9ca3af' }}>⠿</span>}
                                                    {tipoInfo.icon}
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre || 'Sin asignar'}</span>
                                                </div>
                                                <div style={{ fontSize: '10px', color: estaCerrado ? '#6b7280' : '#4b5563' }}>
                                                    {turno.horaInicio} - {turno.horaFin}
                                                    {turno.baseCaja > 0 && ` • ${COP(turno.baseCaja)}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginLeft: '4px' }}>
                                                <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '8px', background: estaCerrado ? '#d1fae5' : '#dbeafe', color: estaCerrado ? '#065f46' : '#1e40af' }}>
                                                    {estaCerrado ? '✅' : '🟢'}
                                                </span>
                                                {!estaCerrado && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onCerrarTurno?.(turno); }}
                                                        style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '4px', border: 'none', background: '#059669', color: 'white', cursor: 'pointer' }}
                                                    >
                                                        🔒
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {estaCerrado && turno.montoDeclarado > 0 && (
                                            <div style={{ fontSize: '9px', display: 'flex', gap: '6px', marginTop: '2px', color: '#6b7280' }}>
                                                <span>Decl: {COP(turno.montoDeclarado)}</span>
                                                <span>Vtas: {COP(turno.totalVentas || 0)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {turnosDia.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: '10px', padding: '12px 0' }}>Sin turnos</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ fontWeight: '500' }}>📌 Leyenda:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#dbeafe', borderRadius: '2px', border: '1px solid #3b82f6' }}></span>
                    <span>Abierto (arrastrable)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f3f4f6', borderRadius: '2px', border: '1px solid #9ca3af' }}></span>
                    <span>Cerrado (no se mueve)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f8faff', borderRadius: '2px', border: '1px solid #3b82f6' }}></span>
                    <span>Hoy</span>
                </div>
            </div>
        </div>
    );
}