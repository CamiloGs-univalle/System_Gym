// ============================================
// EMPLEADOS PANEL - Gestión de empleados
// ============================================
import { useState, useMemo } from "react";
import { empleados as empleadosIniciales, frecuenciaPago } from "../../mock/empleados";
import { clientes } from "../../mock/clientes";
import Button from "../../components/ui/Button";
import DataTable from "../../components/admin/DataTable";
import { COP, formatDate, formatPhone, getInitials, getAvatarColor } from "../../utils/formatters";

export default function EmpleadosPanel() {
    const [empleados, setEmpleados] = useState(empleadosIniciales);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [modalTipo, setModalTipo] = useState("empleado");
    const [detalleEmpleado, setDetalleEmpleado] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        cedula: "",
        celular: "",
        cargo: "Entrenador",
        salario: "",
        frecuenciaPago: "QUINCENAL",
        fechaIngreso: new Date().toISOString().split("T")[0],
        ultimoPago: "",
        proximoPago: "",
        activo: true,
    });

    // Columnas de la tabla
    const columns = [
        { key: "nombre", label: "Empleado", sortable: true, render: (row) => (
            <div className="empleado-cell">
                <span 
                    className="empleado-avatar"
                    style={{ background: getAvatarColor(row.nombre) }}
                >
                    {getInitials(row.nombre)}
                </span>
                <div>
                    <span className="empleado-nombre">{row.nombre}</span>
                    <span className="empleado-cedula">{row.cedula}</span>
                </div>
            </div>
        )},
        { key: "cargo", label: "Cargo", sortable: true, render: (row) => (
            <span className={`cargo-badge ${row.cargo === "Entrenador" ? "cargo-trainer" : "cargo-reception"}`}>
                {row.cargo}
            </span>
        )},
        { key: "salario", label: "Salario", sortable: true, render: (row) => COP(row.salario) },
        { key: "frecuenciaPago", label: "Frecuencia", render: (row) => 
            frecuenciaPago[row.frecuenciaPago]?.label || "—"
        },
        { key: "ultimoPago", label: "Último Pago", render: (row) => formatDate(row.ultimoPago) },
        { key: "proximoPago", label: "Próximo Pago", render: (row) => formatDate(row.proximoPago) },
        { key: "activo", label: "Estado", render: (row) => (
            <span className={`status-badge ${row.activo ? "status-active" : "status-inactive"}`}>
                {row.activo ? "✅ Activo" : "❌ Inactivo"}
            </span>
        )},
    ];

    const actions = [
        { 
            icon: "👁️", 
            tooltip: "Ver detalles",
            className: "action-view",
            onClick: (row) => setDetalleEmpleado(row) 
        },
        { 
            icon: "✏️", 
            tooltip: "Editar",
            className: "action-edit",
            onClick: (row) => abrirModal(row) 
        },
        { 
            icon: "📄", 
            tooltip: "Desprendible de pago",
            className: "action-payroll",
            onClick: (row) => generarDesprendible(row) 
        },
        { 
            icon: row.activo ? "🔴" : "🟢", 
            tooltip: row.activo ? "Desactivar" : "Activar",
            className: row.activo ? "action-deactivate" : "action-activate",
            onClick: (row) => toggleEstado(row) 
        },
    ];

    const abrirModal = (item = null) => {
        setEditando(item);
        if (item) {
            setForm({
                nombre: item.nombre,
                cedula: item.cedula,
                celular: item.celular || "",
                cargo: item.cargo,
                salario: String(item.salario),
                frecuenciaPago: item.frecuenciaPago,
                fechaIngreso: item.fechaIngreso,
                ultimoPago: item.ultimoPago || "",
                proximoPago: item.proximoPago || "",
                activo: item.activo,
            });
        } else {
            const hoy = new Date().toISOString().split("T")[0];
            const proximo = new Date();
            proximo.setDate(proximo.getDate() + 15);
            setForm({
                nombre: "",
                cedula: "",
                celular: "",
                cargo: "Entrenador",
                salario: "",
                frecuenciaPago: "QUINCENAL",
                fechaIngreso: hoy,
                ultimoPago: "",
                proximoPago: proximo.toISOString().split("T")[0],
                activo: true,
            });
        }
        setModalAbierto(true);
    };

    const guardarEmpleado = () => {
        if (!form.nombre.trim() || !form.cedula.trim()) {
            alert("Nombre y cédula son obligatorios");
            return;
        }

        const data = {
            ...form,
            salario: parseInt(form.salario) || 0,
        };

        if (editando) {
            setEmpleados(empleados.map(e => e.id === editando.id ? { ...e, ...data } : e));
        } else {
            setEmpleados([...empleados, {
                id: Date.now(),
                ...data,
                fechaIngreso: data.fechaIngreso || new Date().toISOString().split("T")[0],
            }]);
        }
        setModalAbierto(false);
        setEditando(null);
    };

    const toggleEstado = (empleado) => {
        if (window.confirm(`¿${empleado.activo ? "Desactivar" : "Activar"} a ${empleado.nombre}?`)) {
            setEmpleados(empleados.map(e => 
                e.id === empleado.id ? { ...e, activo: !e.activo } : e
            ));
        }
    };

    const generarDesprendible = (empleado) => {
        alert(`📄 Desprendible de pago generado para ${empleado.nombre}\nSalario: ${COP(empleado.salario)}\nPróximo pago: ${formatDate(empleado.proximoPago)}`);
        // Aquí iría la lógica para generar PDF
    };

    const clientesPorEntrenador = useMemo(() => {
        const map = {};
        empleados.forEach(e => {
            if (e.cargo === "Entrenador") {
                map[e.nombre] = clientes.filter(c => c.entrenador === e.nombre);
            }
        });
        return map;
    }, [empleados, clientes]);

    // Calcular estadísticas
    const stats = useMemo(() => ({
        total: empleados.length,
        activos: empleados.filter(e => e.activo).length,
        entrenadores: empleados.filter(e => e.activo && e.cargo === "Entrenador").length,
        recepcionistas: empleados.filter(e => e.activo && e.cargo === "Recepcionista").length,
        nominaMensual: empleados.filter(e => e.activo).reduce((sum, e) => sum + e.salario, 0),
    }), [empleados]);

    return (
        <div className="empleados-container">
            {/* Stats */}
            <div className="empleados-stats">
                <div className="stat-item">
                    <span className="stat-icon">👷</span>
                    <div>
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total Empleados</span>
                    </div>
                </div>
                <div className="stat-item stat-active">
                    <span className="stat-icon">✅</span>
                    <div>
                        <span className="stat-number">{stats.activos}</span>
                        <span className="stat-label">Activos</span>
                    </div>
                </div>
                <div className="stat-item stat-trainer">
                    <span className="stat-icon">🏋️</span>
                    <div>
                        <span className="stat-number">{stats.entrenadores}</span>
                        <span className="stat-label">Entrenadores</span>
                    </div>
                </div>
                <div className="stat-item stat-reception">
                    <span className="stat-icon">📋</span>
                    <div>
                        <span className="stat-number">{stats.recepcionistas}</span>
                        <span className="stat-label">Recepcionistas</span>
                    </div>
                </div>
                <div className="stat-item stat-payroll">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(stats.nominaMensual)}</span>
                        <span className="stat-label">Nómina Mensual</span>
                    </div>
                </div>
            </div>

            {/* Tabla de empleados */}
            <DataTable
                columns={columns}
                data={empleados}
                actions={actions}
                searchPlaceholder="Buscar empleado..."
                emptyMessage="No hay empleados registrados"
                onRowClick={(row) => setDetalleEmpleado(row)}
            />

            {/* Botón flotante */}
            <button 
                className="fab-button"
                onClick={() => abrirModal()}
                title="Nuevo Empleado"
            >
                ➕
            </button>

            {/* Modal de empleado */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-card modal-empleado" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalAbierto(false)}>✕</button>

                        <div className="modal-header-form">
                            <div className="modal-header-icon">👷</div>
                            <div>
                                <h3 className="modal-titulo">
                                    {editando ? "Editar Empleado" : "Nuevo Empleado"}
                                </h3>
                                <p className="modal-subtitulo">
                                    {editando ? "Actualiza la información" : "Ingresa los datos del nuevo empleado"}
                                </p>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Nombre completo</span><span className="campo-obligatorio">*</span></label>
                                <input className="campo-input" type="text" value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: Carlos Méndez" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Cédula</span><span className="campo-obligatorio">*</span></label>
                                <input className="campo-input" type="text" value={form.cedula}
                                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                                    placeholder="Ej: 1020304050" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Celular</span></label>
                                <input className="campo-input" type="text" value={form.celular}
                                    onChange={e => setForm({ ...form, celular: e.target.value })}
                                    placeholder="Ej: 3001234567" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Cargo</span></label>
                                <select className="campo-input" value={form.cargo}
                                    onChange={e => setForm({ ...form, cargo: e.target.value })}>
                                    <option value="Entrenador">🏋️ Entrenador</option>
                                    <option value="Recepcionista">📋 Recepcionista</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Salario ($)</span></label>
                                <input className="campo-input" type="number" value={form.salario}
                                    onChange={e => setForm({ ...form, salario: e.target.value })}
                                    placeholder="0" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Frecuencia de pago</span></label>
                                <select className="campo-input" value={form.frecuenciaPago}
                                    onChange={e => setForm({ ...form, frecuenciaPago: e.target.value })}>
                                    <option value="QUINCENAL">Quincenal (15 días)</option>
                                    <option value="MENSUAL">Mensual (30 días)</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha ingreso</span></label>
                                <input className="campo-input" type="date" value={form.fechaIngreso}
                                    onChange={e => setForm({ ...form, fechaIngreso: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Último pago</span></label>
                                <input className="campo-input" type="date" value={form.ultimoPago}
                                    onChange={e => setForm({ ...form, ultimoPago: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Próximo pago</span></label>
                                <input className="campo-input" type="date" value={form.proximoPago}
                                    onChange={e => setForm({ ...form, proximoPago: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Estado</span></label>
                                <select className="campo-input" value={form.activo}
                                    onChange={e => setForm({ ...form, activo: e.target.value === "true" })}>
                                    <option value="true">✅ Activo</option>
                                    <option value="false">❌ Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <Button variant="primary" onClick={guardarEmpleado}>
                                {editando ? "💾 Guardar" : "✅ Crear"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de detalle */}
            {detalleEmpleado && (
                <div className="modal-overlay" onClick={() => setDetalleEmpleado(null)}>
                    <div className="modal-card modal-detalle" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setDetalleEmpleado(null)}>✕</button>

                        <div className="detalle-header">
                            <div className="detalle-avatar" style={{ background: getAvatarColor(detalleEmpleado.nombre) }}>
                                {getInitials(detalleEmpleado.nombre)}
                            </div>
                            <div className="detalle-info">
                                <h3>{detalleEmpleado.nombre}</h3>
                                <p className="detalle-sub">{detalleEmpleado.cargo} · {detalleEmpleado.cedula}</p>
                                <span className={`detalle-status ${detalleEmpleado.activo ? "status-active" : "status-inactive"}`}>
                                    {detalleEmpleado.activo ? "✅ Activo" : "❌ Inactivo"}
                                </span>
                            </div>
                        </div>

                        <div className="detalle-grid">
                            <div className="detalle-item">
                                <label>Teléfono</label>
                                <span>{formatPhone(detalleEmpleado.celular) || "—"}</span>
                            </div>
                            <div className="detalle-item">
                                <label>Salario</label>
                                <span className="detalle-salario">{COP(detalleEmpleado.salario)}</span>
                            </div>
                            <div className="detalle-item">
                                <label>Frecuencia</label>
                                <span>{frecuenciaPago[detalleEmpleado.frecuenciaPago]?.label}</span>
                            </div>
                            <div className="detalle-item">
                                <label>Fecha ingreso</label>
                                <span>{formatDate(detalleEmpleado.fechaIngreso)}</span>
                            </div>
                            <div className="detalle-item">
                                <label>Último pago</label>
                                <span>{formatDate(detalleEmpleado.ultimoPago)}</span>
                            </div>
                            <div className="detalle-item">
                                <label>Próximo pago</label>
                                <span>{formatDate(detalleEmpleado.proximoPago)}</span>
                            </div>
                        </div>

                        {detalleEmpleado.cargo === "Entrenador" && (
                            <div className="detalle-clientes">
                                <label>Clientes asignados</label>
                                <div className="detalle-clientes-list">
                                    {clientesPorEntrenador[detalleEmpleado.nombre]?.length > 0 ? (
                                        clientesPorEntrenador[detalleEmpleado.nombre].map(c => (
                                            <span key={c.id} className="detalle-cliente-tag">
                                                {c.nombre}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="detalle-cliente-empty">Sin clientes asignados</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="detalle-acciones">
                            <Button variant="primary" onClick={() => {
                                setDetalleEmpleado(null);
                                abrirModal(detalleEmpleado);
                            }}>
                                ✏️ Editar
                            </Button>
                            <Button variant="success" onClick={() => generarDesprendible(detalleEmpleado)}>
                                📄 Desprendible
                            </Button>
                            <Button variant="danger" onClick={() => {
                                setDetalleEmpleado(null);
                                toggleEstado(detalleEmpleado);
                            }}>
                                {detalleEmpleado.activo ? "🔴 Desactivar" : "🟢 Activar"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}