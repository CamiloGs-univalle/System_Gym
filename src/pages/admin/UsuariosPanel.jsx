// ============================================
// USUARIOS PANEL - Clientes + Entrenadores
// ============================================
import { useState, useMemo } from "react";
import { clientes as clientesIniciales } from "../../mock/clientes";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const COP = (v) => "$" + Math.round(v || 0).toLocaleString("es-CO");

const calcularDiasRestantes = (fechaVencimiento) => {
    if (!fechaVencimiento) return -999;
    const fin = new Date(fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const estadoMembresia = (cliente) => {
    if (!cliente.mensualidad) return { label: "Sin membresía", color: "gray" };
    const dias = calcularDiasRestantes(cliente.mensualidad.fechaVencimiento);
    if (dias < 0) return { label: "Vencido", color: "red" };
    if (dias === 0) return { label: "Vence hoy", color: "orange" };
    if (dias <= 3) return { label: `${dias}d`, color: "yellow" };
    return { label: `${dias}d`, color: "green" };
};

export default function UsuariosPanel() {
    const [clientes, setClientes] = useState(clientesIniciales);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);

    const [formCliente, setFormCliente] = useState({
        nombre: "",
        cedula: "",
        telefono: "",
        fechaIngreso: "",
        entrenador: "",
        mensualidad: {
            activa: true,
            fechaInicio: "",
            fechaVencimiento: "",
            diasRestantes: 30,
            tipo: "30 días"
        },
        estado: "activo"
    });

    const clientesFiltrados = useMemo(() => {
        return clientes.filter(c => {
            const busca = busqueda.toLowerCase();
            const coincide = c.nombre.toLowerCase().includes(busca) || c.cedula.includes(busca);
            if (!coincide) return false;
            if (filtroEstado === "activos") return c.estado === "activo" && c.mensualidad?.activa;
            if (filtroEstado === "vencidos") {
                const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
                return dias < 0 || c.estado === "inactivo";
            }
            if (filtroEstado === "por_vencer") {
                const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
                return dias >= 0 && dias <= 3 && c.estado === "activo";
            }
            return true;
        });
    }, [clientes, busqueda, filtroEstado]);

    const abrirModal = (item = null) => {
        setEditando(item);
        const hoy = new Date().toISOString().split("T")[0];
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        setFormCliente(item ? {
            nombre: item.nombre,
            cedula: item.cedula,
            telefono: item.telefono || "",
            fechaIngreso: item.fechaIngreso || hoy,
            entrenador: item.entrenador || "",
            mensualidad: {
                activa: item.mensualidad?.activa !== undefined ? item.mensualidad.activa : true,
                fechaInicio: item.mensualidad?.fechaInicio || hoy,
                fechaVencimiento: item.mensualidad?.fechaVencimiento || fechaVencimiento.toISOString().split("T")[0],
                diasRestantes: item.mensualidad?.diasRestantes || 30,
                tipo: item.mensualidad?.tipo || "30 días"
            },
            estado: item.estado || "activo"
        } : {
            nombre: "",
            cedula: "",
            telefono: "",
            fechaIngreso: hoy,
            entrenador: "",
            mensualidad: {
                activa: true,
                fechaInicio: hoy,
                fechaVencimiento: fechaVencimiento.toISOString().split("T")[0],
                diasRestantes: 30,
                tipo: "30 días"
            },
            estado: "activo"
        });
        setModalAbierto(true);
    };

    const guardarCliente = () => {
        if (!formCliente.nombre.trim() || !formCliente.cedula.trim()) {
            alert("Nombre y cédula son obligatorios");
            return;
        }

        if (editando) {
            setClientes(clientes.map(c => c.id === editando.id ? {
                ...c,
                nombre: formCliente.nombre,
                cedula: formCliente.cedula,
                telefono: formCliente.telefono,
                fechaIngreso: formCliente.fechaIngreso,
                entrenador: formCliente.entrenador || "No asignado",
                mensualidad: {
                    ...c.mensualidad,
                    activa: formCliente.mensualidad.activa,
                    fechaInicio: formCliente.mensualidad.fechaInicio,
                    fechaVencimiento: formCliente.mensualidad.fechaVencimiento,
                    diasRestantes: formCliente.mensualidad.diasRestantes,
                    tipo: formCliente.mensualidad.tipo
                },
                estado: formCliente.estado
            } : c));
        } else {
            setClientes([...clientes, {
                id: Date.now(),
                nombre: formCliente.nombre,
                cedula: formCliente.cedula,
                telefono: formCliente.telefono,
                fechaIngreso: formCliente.fechaIngreso,
                entrenador: formCliente.entrenador || "No asignado",
                mensualidad: {
                    activa: formCliente.mensualidad.activa,
                    fechaInicio: formCliente.mensualidad.fechaInicio,
                    fechaVencimiento: formCliente.mensualidad.fechaVencimiento,
                    diasRestantes: formCliente.mensualidad.diasRestantes,
                    tipo: formCliente.mensualidad.tipo
                },
                estado: formCliente.estado
            }]);
        }
        setModalAbierto(false);
    };

    const eliminarCliente = (id) => {
        if (window.confirm("¿Desactivar este cliente?")) {
            setClientes(clientes.map(c => c.id === id ? { ...c, estado: "inactivo", mensualidad: { ...c.mensualidad, activa: false } } : c));
        }
    };

    // Calcular stats
    const totalActivos = clientes.filter(c => c.estado === "activo" && c.mensualidad?.activa).length;
    const totalVencidos = clientes.filter(c => {
        const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
        return dias < 0 && c.estado === "activo";
    }).length;
    const totalPorVencer = clientes.filter(c => {
        const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
        return dias >= 0 && dias <= 3 && c.estado === "activo";
    }).length;

    // Obtener lista única de entrenadores
    const entrenadoresList = useMemo(() => {
        const entrenadoresSet = new Set();
        clientes.forEach(c => {
            if (c.entrenador && c.entrenador !== "No asignado") {
                entrenadoresSet.add(c.entrenador);
            }
        });
        return Array.from(entrenadoresSet);
    }, [clientes]);

    return (
        <div className="usuarios-container">
            <Card
                title="Clientes"
                icon="👥"
                className="usuarios-card"
            >
                <div className="usuarios-toolbar">
                    <div className="toolbar-busqueda">
                        <span className="toolbar-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda("")} className="toolbar-limpiar">✕</button>
                        )}
                    </div>

                    <select
                        value={filtroEstado}
                        onChange={e => setFiltroEstado(e.target.value)}
                        className="toolbar-select"
                    >
                        <option value="todos">📋 Todos</option>
                        <option value="activos">✅ Activos</option>
                        <option value="vencidos">❌ Vencidos</option>
                        <option value="por_vencer">⚠️ Por vencer</option>
                    </select>

                    <Button
                        variant="primary"
                        onClick={() => abrirModal()}
                    >
                        ➕ Nuevo Cliente
                    </Button>
                </div>

                <div className="usuarios-stats">
                    <div className="ustat ustat-green">
                        <span>✅</span>
                        <span>{totalActivos}</span>
                        <span>Activos</span>
                    </div>
                    <div className="ustat ustat-yellow">
                        <span>⚠️</span>
                        <span>{totalPorVencer}</span>
                        <span>Por vencer</span>
                    </div>
                    <div className="ustat ustat-red">
                        <span>❌</span>
                        <span>{totalVencidos}</span>
                        <span>Vencidos</span>
                    </div>
                    <div className="ustat ustat-blue">
                        <span>📋</span>
                        <span>{clientes.length}</span>
                        <span>Total</span>
                    </div>
                </div>

                {/* Tabla de clientes */}
                <div className="tabla-scroll">
                    <table className="usuarios-tabla">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Membresía</th>
                                <th>Vence</th>
                                <th>Estado</th>
                                <th>Entrenador</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="tabla-vacia">No se encontraron clientes</td>
                                </tr>
                            ) : (
                                clientesFiltrados.map(cliente => {
                                    const estado = estadoMembresia(cliente);
                                    return (
                                        <tr key={cliente.id}>
                                            <td>
                                                <div className="cliente-nombre-cell">
                                                    <span className="cliente-avatar">
                                                        {cliente.nombre.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span>{cliente.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="text-mono">{cliente.cedula}</td>
                                            <td className="text-mono">{cliente.telefono || "—"}</td>
                                            <td>
                                                <span className="membresia-badge">
                                                    {cliente.mensualidad?.tipo || "Sin membresía"}
                                                </span>
                                            </td>
                                            <td className="text-small">{cliente.mensualidad?.fechaVencimiento || "—"}</td>
                                            <td>
                                                <span className={`estado-badge badge-${estado.color}`}>
                                                    {estado.label}
                                                </span>
                                            </td>
                                            <td className="text-small">
                                                {cliente.entrenador || "—"}
                                            </td>
                                            <td>
                                                <div className="tabla-acciones">
                                                    <button
                                                        className="btn-tabla-edit"
                                                        onClick={() => abrirModal(cliente)}
                                                        title="Editar"
                                                    >✏️</button>
                                                    <button
                                                        className="btn-tabla-delete"
                                                        onClick={() => eliminarCliente(cliente.id)}
                                                        title="Desactivar"
                                                    >🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                    <div className="modal-card modal-usuarios" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalAbierto(false)}>✕</button>

                        <div className="modal-header-form">
                            <div className="modal-header-icon">👤</div>
                            <div>
                                <h3 className="modal-titulo">
                                    {editando ? "Editar Cliente" : "Nuevo Cliente"}
                                </h3>
                                <p className="modal-subtitulo">Completa los datos del formulario</p>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Nombre completo</span><span className="campo-obligatorio">*</span></label>
                                <input className="campo-input" type="text" value={formCliente.nombre}
                                    onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                                    placeholder="Ej: Juan Pablo Gómez" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Cédula</span><span className="campo-obligatorio">*</span></label>
                                <input className="campo-input" type="text" value={formCliente.cedula}
                                    onChange={e => setFormCliente({ ...formCliente, cedula: e.target.value })}
                                    placeholder="Ej: 1001234567" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Teléfono</span></label>
                                <input className="campo-input" type="text" value={formCliente.telefono}
                                    onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
                                    placeholder="Ej: 3201112233" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha ingreso</span></label>
                                <input className="campo-input" type="date" value={formCliente.fechaIngreso}
                                    onChange={e => setFormCliente({ ...formCliente, fechaIngreso: e.target.value })} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Entrenador asignado</span></label>
                                <select className="campo-input" value={formCliente.entrenador}
                                    onChange={e => setFormCliente({ ...formCliente, entrenador: e.target.value })}>
                                    <option value="">Sin entrenador</option>
                                    {entrenadoresList.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Tipo membresía</span></label>
                                <select className="campo-input" value={formCliente.mensualidad.tipo}
                                    onChange={e => setFormCliente({ 
                                        ...formCliente, 
                                        mensualidad: { 
                                            ...formCliente.mensualidad, 
                                            tipo: e.target.value,
                                            diasRestantes: e.target.value === "30 días" ? 30 : e.target.value === "15 días" ? 15 : e.target.value === "Trimestral" ? 90 : e.target.value === "Semestral" ? 180 : e.target.value === "Anual" ? 365 : 1
                                        } 
                                    })}>
                                    <option value="30 días">30 días</option>
                                    <option value="15 días">15 días</option>
                                    <option value="Trimestral">Trimestral (90 días)</option>
                                    <option value="Semestral">Semestral (180 días)</option>
                                    <option value="Anual">Anual (365 días)</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha inicio</span></label>
                                <input className="campo-input" type="date" value={formCliente.mensualidad.fechaInicio}
                                    onChange={e => {
                                        const nuevaFecha = new Date(e.target.value);
                                        const diasMap = {
                                            "30 días": 30,
                                            "15 días": 15,
                                            "Trimestral": 90,
                                            "Semestral": 180,
                                            "Anual": 365
                                        };
                                        const dias = diasMap[formCliente.mensualidad.tipo] || 30;
                                        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
                                        setFormCliente({
                                            ...formCliente,
                                            mensualidad: {
                                                ...formCliente.mensualidad,
                                                fechaInicio: e.target.value,
                                                fechaVencimiento: nuevaFecha.toISOString().split("T")[0]
                                            }
                                        });
                                    }} />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Estado</span></label>
                                <select className="campo-input" value={formCliente.estado}
                                    onChange={e => setFormCliente({ ...formCliente, estado: e.target.value })}>
                                    <option value="activo">✅ Activo</option>
                                    <option value="inactivo">❌ Inactivo</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Membresía activa</span></label>
                                <select className="campo-input" value={formCliente.mensualidad.activa}
                                    onChange={e => setFormCliente({
                                        ...formCliente,
                                        mensualidad: {
                                            ...formCliente.mensualidad,
                                            activa: e.target.value === "true"
                                        }
                                    })}>
                                    <option value="true">✅ Activa</option>
                                    <option value="false">❌ Inactiva</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
                            <Button variant="primary" onClick={guardarCliente}>
                                {editando ? "💾 Guardar" : "✅ Crear"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}