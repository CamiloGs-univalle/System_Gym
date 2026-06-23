import { useState, useMemo } from "react";
import { clientes as clientesIniciales } from "../../mock/clientes";
import Button from "../../components/ui/Button";

const CLIENTE_VACIO = {
    nombre: "",
    cedula: "",
    telefono: "",
    email: "",
    fechaRegistro: "",
    entrenador: "",
    notas: "",
    diasRestantes: "",
    precioMensual: "80000",
    precioDia: "5000",
    membresia: "mensual",
    ultimoPago: "",
    proximoPago: ""
};

// Colores para avatares
const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
];

export default function ClientesPanel() {
    const [clientesList, setClientesList] = useState(clientesIniciales);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [filtroMembresia, setFiltroMembresia] = useState("todas");
    const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });

    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(CLIENTE_VACIO);
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [vistaDetalle, setVistaDetalle] = useState(false);

    // Calcular estado del cliente
    const calcularEstado = (cliente) => {
        if (cliente.estadoManual) return cliente.estadoManual;
        return cliente.mensualidad?.activa && cliente.mensualidad?.diasRestantes > 0
            ? "activo"
            : "inactivo";
    };

    const calcularDiasRestantes = (cliente) => {
        return cliente.mensualidad?.diasRestantes || 0;
    };

    // Obtener iniciales para avatar
    const getInitials = (nombre) => {
        return nombre
            .split(' ')
            .map(word => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    // Obtener color de avatar basado en nombre
    const getAvatarColor = (nombre) => {
        let hash = 0;
        for (let i = 0; i < nombre.length; i++) {
            hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    };

    // Filtrar y ordenar clientes
    const filteredClientes = useMemo(() => {
        let result = clientesList.filter((cliente) => {
            const estado = calcularEstado(cliente);
            const coincideBusqueda =
                cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cliente.cedula.includes(searchTerm) ||
                cliente.telefono.includes(searchTerm);

            if (!coincideBusqueda) return false;
            if (filtroEstado !== "todos" && estado !== filtroEstado) return false;
            if (filtroMembresia !== "todas" && cliente.membresia !== filtroMembresia) return false;
            return true;
        });

        result.sort((a, b) => {
            const campoA = a[orden.campo] || '';
            const campoB = b[orden.campo] || '';
            const comparacion = campoA.toString().localeCompare(campoB.toString());
            return orden.direccion === 'asc' ? comparacion : -comparacion;
        });

        return result;
    }, [clientesList, searchTerm, filtroEstado, filtroMembresia, orden]);

    const totalActivos = clientesList.filter((c) => calcularEstado(c) === "activo").length;
    const totalInactivos = clientesList.length - totalActivos;
    const totalPorVencer = clientesList.filter((c) => {
        const dias = calcularDiasRestantes(c);
        return dias > 0 && dias <= 5;
    }).length;

    const getEstadoColor = (estado, diasRestantes) => {
        if (estado === "inactivo") return "#ef4444";
        if (diasRestantes <= 3) return "#f59e0b";
        return "#10b981";
    };

    const cambiarOrden = (campo) => {
        setOrden(prev => ({
            campo,
            direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
        }));
    };

    // CRUD Operations
    const abrirNuevoCliente = () => {
        setEditandoId(null);
        setForm({ ...CLIENTE_VACIO, fechaRegistro: new Date().toISOString().split('T')[0] });
        setModalAbierto(true);
    };

    const abrirEdicion = (cliente) => {
        setEditandoId(cliente.id);
        setForm({
            nombre: cliente.nombre,
            cedula: cliente.cedula,
            telefono: cliente.telefono,
            email: cliente.email || "",
            fechaRegistro: cliente.fechaRegistro || "",
            entrenador: cliente.entrenador,
            notas: cliente.notas || "",
            diasRestantes: String(cliente.mensualidad?.diasRestantes || 0),
            precioMensual: String(cliente.mensualidad?.precioMensual || 0),
            precioDia: String(cliente.mensualidad?.precioDia || 0),
            membresia: cliente.membresia || "mensual",
            ultimoPago: cliente.ultimoPago || "",
            proximoPago: cliente.proximoPago || ""
        });
        setModalAbierto(true);
    };

    const verDetalle = (cliente) => {
        setClienteSeleccionado(cliente);
        setVistaDetalle(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setEditandoId(null);
        setForm(CLIENTE_VACIO);
        setVistaDetalle(false);
        setClienteSeleccionado(null);
    };

    const handleFormChange = (campo, valor) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    };

    const guardarCliente = () => {
        if (!form.nombre.trim() || !form.cedula.trim()) {
            alert("Nombre y cédula son obligatorios");
            return;
        }

        const dias = parseInt(form.diasRestantes, 10) || 0;

        if (editandoId) {
            setClientesList((prev) =>
                prev.map((c) =>
                    c.id === editandoId
                        ? {
                            ...c,
                            nombre: form.nombre,
                            cedula: form.cedula,
                            telefono: form.telefono,
                            email: form.email,
                            fechaRegistro: form.fechaRegistro,
                            entrenador: form.entrenador || "No asignado",
                            notas: form.notas,
                            membresia: form.membresia,
                            ultimoPago: form.ultimoPago,
                            proximoPago: form.proximoPago,
                            mensualidad: {
                                ...c.mensualidad,
                                activa: dias > 0,
                                diasRestantes: dias,
                                precioMensual: parseInt(form.precioMensual, 10) || 0,
                                precioDia: parseInt(form.precioDia, 10) || 0
                            }
                        }
                        : c
                )
            );
        } else {
            const nuevoCliente = {
                id: Date.now(),
                nombre: form.nombre,
                cedula: form.cedula,
                telefono: form.telefono,
                email: form.email,
                fechaRegistro: form.fechaRegistro || new Date().toISOString().split('T')[0],
                entrenador: form.entrenador || "No asignado",
                notas: form.notas,
                membresia: form.membresia || "mensual",
                ultimoPago: form.ultimoPago,
                proximoPago: form.proximoPago,
                estadoManual: null,
                mensualidad: {
                    activa: dias > 0,
                    diasRestantes: dias,
                    precioMensual: parseInt(form.precioMensual, 10) || 0,
                    precioDia: parseInt(form.precioDia, 10) || 0
                }
            };
            setClientesList((prev) => [...prev, nuevoCliente]);
        }

        cerrarModal();
    };

    const alternarEstadoManual = (clienteId) => {
        setClientesList((prev) =>
            prev.map((c) => {
                if (c.id !== clienteId) return c;
                const estadoActual = calcularEstado(c);
                const nuevoForzado = estadoActual === "activo" ? "inactivo" : "activo";
                return { ...c, estadoManual: nuevoForzado };
            })
        );
    };

    const quitarForzado = (clienteId) => {
        setClientesList((prev) =>
            prev.map((c) => (c.id === clienteId ? { ...c, estadoManual: null } : c))
        );
    };

    const pedirEliminar = (cliente) => setClienteAEliminar(cliente);

    const confirmarEliminar = () => {
        if (!clienteAEliminar) return;
        setClientesList((prev) =>
            prev.map((c) =>
                c.id === clienteAEliminar.id ? { ...c, estadoManual: "inactivo" } : c
            )
        );
        setClienteAEliminar(null);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="clientes-modern-panel">
            {/* Header */}
            <div className="clientes-modern-header">
                <div className="header-title-section">
                    <div className="header-icon-wrapper">
                        <span className="header-icon">👥</span>
                    </div>
                    <div>
                        <h2>Gestión de Clientes</h2>
                        <p className="header-subtitle">{clientesList.length} clientes registrados</p>
                    </div>
                </div>
                <Button variant="success" onClick={abrirNuevoCliente} className="btn-nuevo-cliente">
                    <span>➕</span> Nuevo Cliente
                </Button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card stat-total">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <span className="stat-number">{clientesList.length}</span>
                        <span className="stat-label">Total Clientes</span>
                    </div>
                </div>
                <div className="stat-card stat-activos">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-number">{totalActivos}</span>
                        <span className="stat-label">Activos</span>
                    </div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar" style={{ width: `${(totalActivos / clientesList.length) * 100}%` }} />
                    </div>
                </div>
                <div className="stat-card stat-por-vencer">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                        <span className="stat-number">{totalPorVencer}</span>
                        <span className="stat-label">Por Vencer (≤ 5 días)</span>
                    </div>
                </div>
                <div className="stat-card stat-inactivos">
                    <div className="stat-icon">🔴</div>
                    <div className="stat-info">
                        <span className="stat-number">{totalInactivos}</span>
                        <span className="stat-label">Inactivos</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="clientes-modern-filters">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-modern-input"
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>
                    )}
                </div>
                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="activo">✅ Activos</option>
                        <option value="inactivo">🔴 Inactivos</option>
                    </select>
                    <select
                        className="filter-select"
                        value={filtroMembresia}
                        onChange={(e) => setFiltroMembresia(e.target.value)}
                    >
                        <option value="todas">Todas las membresías</option>
                        <option value="mensual">Mensual</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="anual">Anual</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="clientes-modern-table-wrapper">
                <table className="clientes-modern-table">
                    <thead>
                        <tr>
                            <th onClick={() => cambiarOrden('nombre')} className="sortable">
                                Cliente {orden.campo === 'nombre' && (orden.direccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Contacto</th>
                            <th onClick={() => cambiarOrden('fechaRegistro')} className="sortable">
                                Registro {orden.campo === 'fechaRegistro' && (orden.direccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Membresía</th>
                            <th onClick={() => cambiarOrden('entrenador')} className="sortable">
                                Entrenador {orden.campo === 'entrenador' && (orden.direccion === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClientes.length === 0 && (
                            <tr>
                                <td colSpan={7} className="empty-state">
                                    <div className="empty-state-content">
                                        <span className="empty-icon">🔍</span>
                                        <p>No se encontraron clientes</p>
                                        <span className="empty-sub">Prueba ajustando los filtros</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filteredClientes.map((cliente) => {
                            const estado = calcularEstado(cliente);
                            const diasRestantes = calcularDiasRestantes(cliente);
                            const avatarColor = getAvatarColor(cliente.nombre);
                            const initials = getInitials(cliente.nombre);

                            return (
                                <tr key={cliente.id} className="client-row" onClick={() => verDetalle(cliente)}>
                                    <td>
                                        <div className="cliente-info">
                                            <div className="cliente-avatar" style={{ backgroundColor: avatarColor }}>
                                                {initials}
                                            </div>
                                            <div>
                                                <div className="cliente-nombre">{cliente.nombre}</div>
                                                <div className="cliente-cedula">Céd: {cliente.cedula}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="contact-info">
                                            <div className="contact-item">
                                                <span className="contact-icon">📱</span>
                                                <span>{cliente.telefono}</span>
                                            </div>
                                            {cliente.email && (
                                                <div className="contact-item">
                                                    <span className="contact-icon">✉️</span>
                                                    <span className="contact-email">{cliente.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="fecha-info">
                                            <div>{formatDate(cliente.fechaRegistro)}</div>
                                            {cliente.ultimoPago && (
                                                <div className="ultimo-pago">
                                                    Último pago: {formatDate(cliente.ultimoPago)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="membresia-info">
                                            <span className={`membresia-badge ${cliente.membresia || 'mensual'}`}>
                                                {cliente.membresia === 'mensual' && '📅 Mensual'}
                                                {cliente.membresia === 'trimestral' && '📆 Trimestral'}
                                                {cliente.membresia === 'anual' && '🗓️ Anual'}
                                                {!cliente.membresia && '📅 Mensual'}
                                            </span>
                                            <div className="dias-restantes">
                                                <span className="dias-numero">{diasRestantes}</span>
                                                <span className="dias-label">días</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="entrenador-info">
                                            <span className="entrenador-nombre">{cliente.entrenador}</span>
                                            {cliente.notas && (
                                                <span className="nota-indicador" title={cliente.notas}>📝</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="estado-container">
                                            <span
                                                className="estado-badge-modern"
                                                style={{
                                                    backgroundColor: getEstadoColor(estado, diasRestantes),
                                                    opacity: estado === 'inactivo' ? 0.7 : 1
                                                }}
                                            >
                                                <span className="estado-dot" />
                                                {estado === "activo" ? "Activo" : "Inactivo"}
                                            </span>
                                            {cliente.estadoManual && (
                                                <span className="manual-badge" title="Estado forzado manualmente">📌</span>
                                            )}
                                            {diasRestantes > 0 && diasRestantes <= 3 && estado === 'activo' && (
                                                <span className="alerta-badge">¡Pronto vence!</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="acciones-modern" onClick={(e) => e.stopPropagation()}>
                                            <button className="action-btn action-view" title="Ver detalles" onClick={() => verDetalle(cliente)}>👁️</button>
                                            <button className="action-btn action-edit" title="Editar cliente" onClick={() => abrirEdicion(cliente)}>✏️</button>
                                            <button className="action-btn action-toggle" title={cliente.estadoManual ? "Quitar estado forzado" : estado === "activo" ? "Desactivar" : "Activar"} onClick={() => cliente.estadoManual ? quitarForzado(cliente.id) : alternarEstadoManual(cliente.id)}>
                                                {cliente.estadoManual ? '↩️' : '🔄'}
                                            </button>
                                            <button className="action-btn action-delete" title="Desactivar cliente" onClick={() => pedirEliminar(cliente)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal Detalle */}
            {vistaDetalle && clienteSeleccionado && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-card modal-detalle" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={cerrarModal}>✕</button>
                        <div className="detalle-header">
                            <div className="detalle-avatar-large" style={{ backgroundColor: getAvatarColor(clienteSeleccionado.nombre) }}>
                                {getInitials(clienteSeleccionado.nombre)}
                            </div>
                            <div className="detalle-header-info">
                                <h3>{clienteSeleccionado.nombre}</h3>
                                <p className="detalle-sub">{clienteSeleccionado.cedula}</p>
                                <div className="detalle-estado">
                                    <span className="estado-badge-modern" style={{ backgroundColor: getEstadoColor(calcularEstado(clienteSeleccionado), calcularDiasRestantes(clienteSeleccionado)) }}>
                                        {calcularEstado(clienteSeleccionado) === "activo" ? "✅ Activo" : "🔴 Inactivo"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="detalle-grid">
                            <div className="detalle-item"><label>Teléfono</label><span>{clienteSeleccionado.telefono || '—'}</span></div>
                            <div className="detalle-item"><label>Email</label><span>{clienteSeleccionado.email || '—'}</span></div>
                            <div className="detalle-item"><label>Entrenador</label><span>{clienteSeleccionado.entrenador}</span></div>
                            <div className="detalle-item"><label>Membresía</label><span className={`membresia-badge ${clienteSeleccionado.membresia || 'mensual'}`}>{clienteSeleccionado.membresia || 'Mensual'}</span></div>
                            <div className="detalle-item"><label>Días Restantes</label><span className="dias-destacado">{calcularDiasRestantes(clienteSeleccionado)} días</span></div>
                            <div className="detalle-item"><label>Fecha Registro</label><span>{formatDate(clienteSeleccionado.fechaRegistro)}</span></div>
                            <div className="detalle-item"><label>Último Pago</label><span>{formatDate(clienteSeleccionado.ultimoPago)}</span></div>
                            <div className="detalle-item"><label>Próximo Pago</label><span>{formatDate(clienteSeleccionado.proximoPago)}</span></div>
                        </div>
                        {clienteSeleccionado.notas && (
                            <div className="detalle-notas">
                                <label>Notas / Observaciones</label>
                                <p>{clienteSeleccionado.notas}</p>
                            </div>
                        )}
                        <div className="detalle-acciones">
                            <Button variant="primary" onClick={() => { cerrarModal(); abrirEdicion(clienteSeleccionado); }}>✏️ Editar Cliente</Button>
                            <Button variant="danger" onClick={() => { cerrarModal(); pedirEliminar(clienteSeleccionado); }}>🗑️ Desactivar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar - VERSIÓN MEJORADA CON DISEÑO DE TARJETA */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-card modal-form" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={cerrarModal}>✕</button>
                        
                        <div className="modal-header-form">
                            <div className="modal-header-icon">
                                {editandoId ? '✏️' : '➕'}
                            </div>
                            <div>
                                <h3 className="modal-titulo">
                                    {editandoId ? "Editar Cliente" : "Nuevo Cliente"}
                                </h3>
                                <p className="modal-subtitulo">
                                    {editandoId ? "Actualiza la información del cliente" : "Ingresa los datos del nuevo cliente"}
                                </p>
                            </div>
                        </div>

                        <div className="modal-form-grid">
                            {/* Fila 1: Nombre completo */}
                            <div className="modal-campo modal-campo-full">
                                <label>
                                    <span className="campo-label">Nombre completo</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) => handleFormChange("nombre", e.target.value)}
                                    placeholder="Ej: Ana Beltrán"
                                    className="campo-input"
                                />
                            </div>

                            {/* Fila 2: Cédula y Teléfono */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Cédula</span>
                                    <span className="campo-obligatorio">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.cedula}
                                    onChange={(e) => handleFormChange("cedula", e.target.value)}
                                    placeholder="Ej: 1166665555"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Teléfono</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.telefono}
                                    onChange={(e) => handleFormChange("telefono", e.target.value)}
                                    placeholder="Ej: 3014455667"
                                    className="campo-input"
                                />
                            </div>

                            {/* Fila 3: Email */}
                            <div className="modal-campo modal-campo-full">
                                <label>
                                    <span className="campo-label">Email</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => handleFormChange("email", e.target.value)}
                                    placeholder="Ej: ana@email.com"
                                    className="campo-input"
                                />
                            </div>

                            {/* Fila 4: Entrenador y Membresía */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Entrenador</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.entrenador}
                                    onChange={(e) => handleFormChange("entrenador", e.target.value)}
                                    placeholder="Ej: Laura Martínez"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Membresía</span>
                                </label>
                                <select
                                    value={form.membresia}
                                    onChange={(e) => handleFormChange("membresia", e.target.value)}
                                    className="campo-input"
                                >
                                    <option value="mensual">📅 Mensual</option>
                                    <option value="trimestral">📆 Trimestral</option>
                                    <option value="anual">🗓️ Anual</option>
                                </select>
                            </div>

                            {/* Fila 5: Días restantes y Precios */}
                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Días restantes</span>
                                </label>
                                <input
                                    type="number"
                                    value={form.diasRestantes}
                                    onChange={(e) => handleFormChange("diasRestantes", e.target.value)}
                                    placeholder="0"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Precio mensual</span>
                                </label>
                                <input
                                    type="number"
                                    value={form.precioMensual}
                                    onChange={(e) => handleFormChange("precioMensual", e.target.value)}
                                    placeholder="80000"
                                    className="campo-input"
                                />
                            </div>

                            <div className="modal-campo">
                                <label>
                                    <span className="campo-label">Precio por día</span>
                                </label>
                                <input
                                    type="number"
                                    value={form.precioDia}
                                    onChange={(e) => handleFormChange("precioDia", e.target.value)}
                                    placeholder="5000"
                                    className="campo-input"
                                />
                            </div>

                            {/* Fila 6: Fechas */}
                            <div className="modal-campo modal-campo-full fechas-section">
                                <label className="fechas-label">Fechas importantes</label>
                                <div className="fechas-grid">
                                    <div className="fecha-item">
                                        <span>Fecha Registro</span>
                                        <input
                                            type="date"
                                            value={form.fechaRegistro}
                                            onChange={(e) => handleFormChange("fechaRegistro", e.target.value)}
                                            className="campo-input"
                                        />
                                    </div>
                                    <div className="fecha-item">
                                        <span>Último Pago</span>
                                        <input
                                            type="date"
                                            value={form.ultimoPago}
                                            onChange={(e) => handleFormChange("ultimoPago", e.target.value)}
                                            className="campo-input"
                                        />
                                    </div>
                                    <div className="fecha-item">
                                        <span>Próximo Pago</span>
                                        <input
                                            type="date"
                                            value={form.proximoPago}
                                            onChange={(e) => handleFormChange("proximoPago", e.target.value)}
                                            className="campo-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fila 7: Notas */}
                            <div className="modal-campo modal-campo-full">
                                <label>
                                    <span className="campo-label">Notas / Observaciones</span>
                                </label>
                                <textarea
                                    value={form.notas}
                                    onChange={(e) => handleFormChange("notas", e.target.value)}
                                    placeholder="Ej: Alergias, lesiones, restricciones físicas..."
                                    rows={3}
                                    className="campo-input campo-textarea"
                                />
                            </div>
                        </div>

                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={cerrarModal}>
                                Cancelar
                            </button>
                            <Button variant="primary" onClick={guardarCliente} className="btn-guardar">
                                {editandoId ? "💾 Guardar cambios" : "✅ Crear cliente"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmación de eliminar */}
            {clienteAEliminar && (
                <div className="modal-overlay" onClick={() => setClienteAEliminar(null)}>
                    <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-titulo">⚠️ ¿Desactivar cliente?</h3>
                        <p className="modal-confirm-texto">
                            <strong>{clienteAEliminar.nombre}</strong> pasará a estado <strong>Inactivo</strong>.
                            No se borra su historial — puedes reactivarlo después con el botón 🔄.
                        </p>
                        <div className="modal-acciones">
                            <Button variant="danger" onClick={confirmarEliminar}>
                                Sí, desactivar
                            </Button>
                            <button className="modal-cancelar" onClick={() => setClienteAEliminar(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}