/**
 * ============================================================
 * ARCHIVO: src/pages/admin/turnos/Historia.jsx
 * DESCRIPCIÓN: Componente de historial de turnos con tabla y filtros
 * PROPS:
 *   - turnos: Lista de turnos a mostrar
 *   - empleados: Lista de empleados
 *   - onEditarTurno: Función para editar turno
 *   - onCerrarTurno: Función para cerrar turno
 *   - onEliminarTurno: Función para eliminar turno
 *   - onDetalleTurno: Función para ver detalle
 *   - getNombreEmpleado: Función para obtener nombre
 *   - getTipoInfo: Función para obtener info del tipo
 *   - getDiferenciaColor: Función para color de diferencia
 * VERSIÓN: 1.1 ✅
 * ============================================================
 */

// ✅ IMPORTACIÓN CORREGIDA - Agregar useState
import React, { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { COP, formatDate } from "../../../utils/formatters";

export default function Historia({
    turnos = [],
    empleados = [],
    onEditarTurno,
    onCerrarTurno,
    onEliminarTurno,
    onDetalleTurno,
    getNombreEmpleado,
    getTipoInfo,
    getDiferenciaColor,
}) {
    // ============================================================
    // 1. ESTADO PARA PAGINACIÓN
    // ============================================================

    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 20;

    // Calcular páginas
    const totalPaginas = Math.ceil(turnos.length / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const turnosPagina = turnos.slice(inicio, fin);

    // ============================================================
    // 2. HANDLERS DE PAGINACIÓN
    // ============================================================

    const irPagina = (pagina) => {
        if (pagina >= 1 && pagina <= totalPaginas) {
            setPaginaActual(pagina);
        }
    };

    // ============================================================
    // 3. RENDER
    // ============================================================

    return (
        <Card title="Historial de Turnos" icon="📋">
            {/* Contador */}
            <div style={{ marginBottom: '10px', fontSize: '13px', color: '#6b7280' }}>
                Mostrando {turnos.length > 0 ? `${inicio + 1} - ${Math.min(fin, turnos.length)}` : '0'} de {turnos.length} turnos
            </div>

            {/* Tabla */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    minWidth: '800px'
                }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>ID</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>Fecha</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>Empleado</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>Tipo</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Base</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Declarado</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Ventas</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>Estado</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {turnosPagina.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                    No hay turnos que coincidan con los filtros
                                </td>
                            </tr>
                        ) : (
                            turnosPagina.map((turno, index) => {
                                const tipoInfo = getTipoInfo(turno.tipo);
                                const nombre = getNombreEmpleado(turno.empleadoId || turno.receptionistId);
                                const diferenciaColor = getDiferenciaColor(turno.diferencia);

                                return (
                                    <tr key={turno.id || index} style={{
                                        borderBottom: '1px solid #e5e7eb',
                                        background: index % 2 === 0 ? 'white' : '#fafafa'
                                    }}>
                                        <td style={{ padding: '8px', fontWeight: '500' }}>#{turno.id}</td>
                                        <td style={{ padding: '8px' }}>{formatDate(turno.fecha)}</td>
                                        <td style={{ padding: '8px' }}>{nombre}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '11px',
                                                background: tipoInfo.bg,
                                                color: tipoInfo.color,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {tipoInfo.icon} {tipoInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{COP(turno.baseCaja || 0)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>
                                            {turno.cerrado ? COP(turno.montoDeclarado) : '-'}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb' }}>
                                            {COP(turno.totalVentas || 0)}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 10px',
                                                borderRadius: '10px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                background: turno.cerrado ? '#dcfce7' : '#fef3c7',
                                                color: turno.cerrado ? '#166534' : '#92400e'
                                            }}>
                                                {turno.cerrado ? "✅ Cerrado" : "🟡 Abierto"}
                                            </span>
                                            {turno.diferencia !== 0 && turno.cerrado && (
                                                <span style={{
                                                    display: 'block',
                                                    fontSize: '10px',
                                                    color: diferenciaColor,
                                                    marginTop: '2px'
                                                }}>
                                                    {turno.diferencia > 0 ? '▲' : '▼'} {COP(Math.abs(turno.diferencia))}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => onDetalleTurno?.(turno)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        padding: '2px 4px',
                                                        borderRadius: '4px'
                                                    }}
                                                    title="Ver detalle"
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => onEditarTurno?.(turno)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        padding: '2px 4px',
                                                        borderRadius: '4px'
                                                    }}
                                                    title="Editar"
                                                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    ✏️
                                                </button>
                                                {!turno.cerrado && (
                                                    <>
                                                        <button
                                                            onClick={() => onCerrarTurno?.(turno)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '16px',
                                                                padding: '2px 4px',
                                                                borderRadius: '4px'
                                                            }}
                                                            title="Cerrar turno"
                                                            onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            🔒
                                                        </button>
                                                        <button
                                                            onClick={() => onEliminarTurno?.(turno)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '16px',
                                                                padding: '2px 4px',
                                                                borderRadius: '4px'
                                                            }}
                                                            title="Eliminar"
                                                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ============================================
                PAGINACIÓN
                ============================================ */}
            {totalPaginas > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e5e7eb',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Página {paginaActual} de {totalPaginas}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => irPagina(paginaActual - 1)}
                            disabled={paginaActual === 1}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                background: paginaActual === 1 ? '#f3f4f6' : 'white',
                                cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                                color: paginaActual === 1 ? '#9ca3af' : '#374151',
                                fontSize: '13px'
                            }}
                        >
                            ◀ Anterior
                        </button>
                        {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                            let pagina;
                            if (totalPaginas <= 5) {
                                pagina = i + 1;
                            } else if (paginaActual <= 3) {
                                pagina = i + 1;
                            } else if (paginaActual >= totalPaginas - 2) {
                                pagina = totalPaginas - 4 + i;
                            } else {
                                pagina = paginaActual - 2 + i;
                            }
                            return (
                                <button
                                    key={pagina}
                                    onClick={() => irPagina(pagina)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid',
                                        borderColor: pagina === paginaActual ? '#3b82f6' : '#ddd',
                                        background: pagina === paginaActual ? '#3b82f6' : 'white',
                                        color: pagina === paginaActual ? 'white' : '#374151',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: pagina === paginaActual ? '600' : '400'
                                    }}
                                >
                                    {pagina}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => irPagina(paginaActual + 1)}
                            disabled={paginaActual === totalPaginas}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                background: paginaActual === totalPaginas ? '#f3f4f6' : 'white',
                                cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                                color: paginaActual === totalPaginas ? '#9ca3af' : '#374151',
                                fontSize: '13px'
                            }}
                        >
                            Siguiente ▶
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}