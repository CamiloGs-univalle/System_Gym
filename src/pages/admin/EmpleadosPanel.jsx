// ============================================
// EMPLEADOS PANEL - Gestión de empleados
// ============================================
// 
// Este componente gestiona el CRUD de empleados del gimnasio.
// Los datos se sincronizan con el backend en /api/employees
// ============================================

// ============================================
// IMPORTS
// ============================================

import { useState, useMemo, useEffect } from "react";
// Datos mock de frecuencia de pago (solo para referencia de etiquetas)
import { frecuenciaPago } from "../../mock/empleados";
// Datos mock de clientes (para mostrar relación entrenador-clientes)
import { clientes } from "../../mock/clientes";
// Componentes UI reutilizables
import Button from "../../components/ui/Button";
import DataTable from "../../components/admin/DataTable";
// Utilidades de formato
import {
    COP,
    formatDate,
    formatPhone,
    getInitials,
    getAvatarColor
} from "../../utils/formatters";
// Servicio de empleados
import empleadosService from "../../services/empleadosService";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function EmpleadosPanel() {
    // ============================================
    // ESTADO DEL COMPONENTE
    // ============================================

    const [empleados, setEmpleados] = useState([]);
    const [cargandoLista, setCargandoLista] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [modalTipo, setModalTipo] = useState("empleado");
    const [detalleEmpleado, setDetalleEmpleado] = useState(null);
    const [cargando, setCargando] = useState(false);

    // ============================================
    // ESTADO DEL FORMULARIO
    // ============================================

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
        username: "",
        password: "",
        confirmPassword: "",
    });

    // ============================================
    // EFECTO: CARGAR EMPLEADOS DEL BACKEND
    // ============================================
    useEffect(() => {
        cargarEmpleados();
    }, []);

    const cargarEmpleados = async () => {
        setCargandoLista(true);
        try {
            console.log("📥 Cargando empleados desde el backend...");
            const empleadosData = await empleadosService.listar();
            console.log("✅ Empleados cargados:", empleadosData.length);
            setEmpleados(empleadosData);
        } catch (error) {
            console.error("❌ Error al cargar empleados:", error);
            alert("Error al cargar la lista de empleados");
        } finally {
            setCargandoLista(false);
        }
    };

    // ============================================
    // CONFIGURACIÓN DE COLUMNAS DE LA TABLA
    // ============================================
    const columns = [
        {
            key: "nombre",
            label: "Empleado",
            sortable: true,
            render: (row) => (
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
            )
        },
        {
            key: "cargo",
            label: "Cargo",
            sortable: true,
            render: (row) => (
                <span className={`cargo-badge ${row.cargo === "Entrenador" ? "cargo-trainer" : "cargo-reception"}`}>
                    {row.cargo}
                </span>
            )
        },
        {
            key: "salario",
            label: "Salario",
            sortable: true,
            render: (row) => COP(row.salario)
        },
        {
            key: "frecuenciaPago",
            label: "Frecuencia",
            render: (row) =>
                frecuenciaPago[row.frecuenciaPago]?.label || "—"
        },
        {
            key: "ultimoPago",
            label: "Último Pago",
            render: (row) => formatDate(row.ultimoPago)
        },
        {
            key: "proximoPago",
            label: "Próximo Pago",
            render: (row) => formatDate(row.proximoPago)
        },
        {
            key: "activo",
            label: "Estado",
            render: (row) => (
                <span className={`status-badge ${row.activo ? "status-active" : "status-inactive"}`}>
                    {row.activo ? "✅ Activo" : "❌ Inactivo"}
                </span>
            )
        },
    ];

    // ============================================
    // ACCIONES DE LA TABLA
    // ============================================
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
            icon: (row) => row.activo ? "🔴" : "🟢",
            tooltip: (row) => row.activo ? "Desactivar" : "Activar",
            className: (row) => row.activo ? "action-deactivate" : "action-activate",
            onClick: (row) => toggleEstado(row)
        },
    ];

    // ============================================
    // FUNCIONES DEL COMPONENTE
    // ============================================

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
                username: item.username || "",
                password: "",
                confirmPassword: "",
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
                username: "",
                password: "",
                confirmPassword: "",
            });
        }
        setModalAbierto(true);
    };

    /**
     * Valida los datos del formulario para creación de usuario
     */
    const validarDatosUsuario = () => {
        if (form.cargo === "Recepcionista") {
            if (!form.username.trim()) {
                return {
                    isValid: false,
                    error: "El nombre de usuario es obligatorio para recepcionistas"
                };
            }

            if (form.password.length < 6) {
                return {
                    isValid: false,
                    error: "La contraseña debe tener al menos 6 caracteres"
                };
            }

            if (form.password !== form.confirmPassword) {
                return {
                    isValid: false,
                    error: "Las contraseñas no coinciden"
                };
            }
        }
        return { isValid: true, error: "" };
    };

    /**
     * Guarda o actualiza un empleado en el backend
     */
    // En EmpleadosPanel.jsx, modifica la función guardarEmpleado:

    const guardarEmpleado = async () => {
        if (cargando) return;

        // ============================================
        // VALIDACIONES
        // ============================================

        if (!form.nombre.trim()) {
            alert("❌ El nombre completo es obligatorio");
            return;
        }

        // Validar que la cédula sea numérica (si se proporciona)
        if (form.cedula && !/^\d+$/.test(form.cedula.replace(/\D/g, ''))) {
            alert("❌ La cédula debe contener solo números");
            return;
        }

        // Validar salario
        const salarioNum = parseFloat(form.salario);
        if (isNaN(salarioNum) || salarioNum < 0) {
            alert("❌ El salario debe ser un número válido");
            return;
        }

        // Si es recepcionista, validar datos de usuario
        if (form.cargo === "Recepcionista") {
            if (!form.username.trim()) {
                alert("❌ El nombre de usuario es obligatorio para recepcionistas");
                return;
            }

            if (form.password.length < 6) {
                alert("❌ La contraseña debe tener al menos 6 caracteres");
                return;
            }

            if (form.password !== form.confirmPassword) {
                alert("❌ Las contraseñas no coinciden");
                return;
            }
        }

        // ============================================
        // PREPARAR DATOS
        // ============================================

        const data = {
            nombre: form.nombre.trim(),
            cedula: form.cedula ? form.cedula.replace(/\D/g, '') : '',
            celular: form.celular ? form.celular.replace(/\D/g, '') : '',
            cargo: form.cargo,
            salario: salarioNum,
            frecuenciaPago: form.frecuenciaPago,
            fechaIngreso: form.fechaIngreso || new Date().toISOString().split('T')[0],
            ultimoPago: form.ultimoPago || '',
            proximoPago: form.proximoPago || '',
            activo: form.activo,
            username: form.username || '',
            password: form.password || '',
            confirmPassword: form.confirmPassword || '',
        };

        console.log("📦 Datos preparados:", data);

        setCargando(true);

        try {
            let empleadoGuardado;

            if (editando) {
                console.log(`🔄 Actualizando empleado ${editando.id}...`);
                empleadoGuardado = await empleadosService.actualizar(editando.id, data);
                setEmpleados(empleados.map(e =>
                    e.id === editando.id ? empleadoGuardado : e
                ));
            } else {
                console.log("📝 Creando nuevo empleado...");
                empleadoGuardado = await empleadosService.crear(data);
                setEmpleados([empleadoGuardado, ...empleados]);
            }

            setModalAbierto(false);
            setEditando(null);
            alert("✅ Empleado guardado exitosamente!");

        } catch (error) {
            console.error("❌ Error guardando empleado:", error);
            alert(`❌ ${error.message || "Error al guardar el empleado"}`);
        } finally {
            setCargando(false);
        }
    };

    /**
     * Alterna el estado (activo/inactivo) de un empleado
     */
    const toggleEstado = async (empleado) => {
        if (!window.confirm(`¿${empleado.activo ? "Desactivar" : "Activar"} a ${empleado.nombre}?`)) {
            return;
        }

        setCargando(true);

        try {
            const nuevoEstado = !empleado.activo;
            await empleadosService.cambiarEstado(empleado.id, nuevoEstado);

            setEmpleados(empleados.map(e =>
                e.id === empleado.id ? { ...e, activo: nuevoEstado } : e
            ));
        } catch (error) {
            console.error("❌ Error al cambiar estado:", error);
            alert(`❌ Error al cambiar el estado: ${error.message}`);
        } finally {
            setCargando(false);
        }
    };

    /**
     * Genera un desprendible de pago
     */
    const generarDesprendible = (empleado) => {
        alert(`📄 Desprendible de pago generado para ${empleado.nombre}\n` +
            `💰 Salario: ${COP(empleado.salario)}\n` +
            `📅 Próximo pago: ${formatDate(empleado.proximoPago)}`);
    };

    // ============================================
    // MEMORIZACIÓN DE DATOS
    // ============================================

    const clientesPorEntrenador = useMemo(() => {
        const map = {};
        empleados.forEach(e => {
            if (e.cargo === "Entrenador") {
                map[e.nombre] = clientes.filter(c => c.entrenador === e.nombre);
            }
        });
        return map;
    }, [empleados]);

    const stats = useMemo(() => ({
        total: empleados.length,
        activos: empleados.filter(e => e.activo).length,
        entrenadores: empleados.filter(e => e.activo && e.cargo === "Entrenador").length,
        recepcionistas: empleados.filter(e => e.activo && e.cargo === "Recepcionista").length,
        nominaMensual: empleados.filter(e => e.activo).reduce((sum, e) => sum + e.salario, 0),
    }), [empleados]);

    // ============================================
    // RENDERIZADO
    // ============================================

    if (cargandoLista) {
        return (
            <div className="empleados-container">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '300px',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <span style={{ fontSize: '40px' }}>⏳</span>
                    <p style={{ color: '#666' }}>Cargando empleados...</p>
                </div>
            </div>
        );
    }

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

            {/* Tabla */}
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
                disabled={cargando}
            >
                ➕
            </button>

            {/* ============================================
                MODAL DE EMPLEADO
                ============================================ */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => !cargando && setModalAbierto(false)}>
                    <div className="modal-card modal-empleado" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => !cargando && setModalAbierto(false)}>✕</button>

                        <div className="modal-header-form">
                            <div className="modal-header-icon">👷</div>
                            <div>
                                <h3 className="modal-titulo">
                                    {editando ? "Editar Empleado" : "Nuevo Empleado"}
                                </h3>
                                <p className="modal-subtitulo">
                                    {editando ? "Actualiza la información del empleado" : "Ingresa los datos del nuevo empleado"}
                                </p>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            {/* Campo 1: Nombre completo */}
                            <div className="modal-campo modal-campo-full">
                                <label>
                                    <span className="campo-label">Nombre completo</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: Carlos Méndez"
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 2: Cédula */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Cédula</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="text"
                                    value={form.cedula}
                                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                                    placeholder="Ej: 1020304050"
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 3: Celular */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Celular</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="text"
                                    value={form.celular}
                                    onChange={e => setForm({ ...form, celular: e.target.value })}
                                    placeholder="Ej: 3001234567"
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 4: Cargo */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Cargo</span>
                                </label>
                                <select
                                    className="campo-input"
                                    value={form.cargo}
                                    onChange={e => setForm({ ...form, cargo: e.target.value })}
                                    disabled={cargando}
                                >
                                    <option value="Entrenador">🏋️ Entrenador</option>
                                    <option value="Recepcionista">📋 Recepcionista</option>
                                </select>
                            </div>

                            {/* Campo 5: Salario */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Salario ($)</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="number"
                                    value={form.salario}
                                    onChange={e => setForm({ ...form, salario: e.target.value })}
                                    placeholder="0"
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 6: Frecuencia de pago */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Frecuencia de pago</span>
                                </label>
                                <select
                                    className="campo-input"
                                    value={form.frecuenciaPago}
                                    onChange={e => setForm({ ...form, frecuenciaPago: e.target.value })}
                                    disabled={cargando}
                                >
                                    <option value="QUINCENAL">Quincenal (15 días)</option>
                                    <option value="MENSUAL">Mensual (30 días)</option>
                                </select>
                            </div>

                            {/* Campo 7: Fecha ingreso */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Fecha ingreso</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="date"
                                    value={form.fechaIngreso}
                                    onChange={e => setForm({ ...form, fechaIngreso: e.target.value })}
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 8: Último pago */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Último pago</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="date"
                                    value={form.ultimoPago}
                                    onChange={e => setForm({ ...form, ultimoPago: e.target.value })}
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 9: Próximo pago */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Próximo pago</span>
                                </label>
                                <input
                                    className="campo-input"
                                    type="date"
                                    value={form.proximoPago}
                                    onChange={e => setForm({ ...form, proximoPago: e.target.value })}
                                    disabled={cargando}
                                />
                            </div>

                            {/* Campo 10: Estado */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Estado</span>
                                </label>
                                <select
                                    className="campo-input"
                                    value={form.activo}
                                    onChange={e => setForm({ ...form, activo: e.target.value === "true" })}
                                    disabled={cargando}
                                >
                                    <option value="true">✅ Activo</option>
                                    <option value="false">❌ Inactivo</option>
                                </select>
                            </div>

                            {/* Campos de usuario para recepcionistas */}
                            {form.cargo === "Recepcionista" && (
                                <>
                                    <div className="modal-campo">
                                        <label>
                                            <span className="campo-label">Usuario</span>
                                            <span className="campo-obligatorio">*</span>
                                        </label>
                                        <input
                                            className="campo-input"
                                            type="text"
                                            value={form.username}
                                            onChange={e => setForm({ ...form, username: e.target.value })}
                                            placeholder="usuario.recepcionista"
                                            disabled={cargando}
                                        />
                                        <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                            Usuario para acceder al sistema
                                        </small>
                                    </div>

                                    <div className="modal-campo">
                                        <label>
                                            <span className="campo-label">Contraseña</span>
                                            <span className="campo-obligatorio">*</span>
                                        </label>
                                        <input
                                            className="campo-input"
                                            type="password"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            placeholder="Mínimo 6 caracteres"
                                            disabled={cargando}
                                        />
                                        <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                            La contraseña debe tener al menos 6 caracteres
                                        </small>
                                    </div>

                                    <div className="modal-campo">
                                        <label>
                                            <span className="campo-label">Confirmar Contraseña</span>
                                            <span className="campo-obligatorio">*</span>
                                        </label>
                                        <input
                                            className="campo-input"
                                            type="password"
                                            value={form.confirmPassword}
                                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                            placeholder="Repite la contraseña"
                                            disabled={cargando}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-acciones">
                            <button
                                className="btn-cancelar"
                                onClick={() => !cargando && setModalAbierto(false)}
                                disabled={cargando}
                            >
                                Cancelar
                            </button>
                            <Button
                                variant="primary"
                                onClick={guardarEmpleado}
                                disabled={cargando}
                            >
                                {cargando ? "⏳ Procesando..." : (editando ? "💾 Guardar" : "✅ Crear")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL DE DETALLE
                ============================================ */}
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
                                <p className="detalle-sub">
                                    {detalleEmpleado.cargo} · {detalleEmpleado.cedula}
                                </p>
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