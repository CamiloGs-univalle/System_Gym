// ============================================
// USUARIOS PANEL - Clientes + Entrenadores
// Con conexión al backend
// ============================================
import { useState, useMemo, useEffect } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import useAuthStore from "../../store/authStore";

const COP = (v) => "$" + Math.round(v || 0).toLocaleString("es-CO");

const calcularDiasRestantes = (fechaVencimiento) => {
    if (!fechaVencimiento) return -999;
    const fin = new Date(fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const estadoMembresia = (cliente) => {
    if (!cliente.mensualidad || !cliente.mensualidad.activa) {
        return { label: "Sin membresía", color: "gray" };
    }
    const dias = calcularDiasRestantes(cliente.mensualidad.fechaVencimiento);
    if (dias < 0) return { label: "Vencido", color: "red" };
    if (dias === 0) return { label: "Vence hoy", color: "orange" };
    if (dias <= 3) return { label: `${dias}d`, color: "yellow" };
    return { label: `${dias}d`, color: "green" };
};

export default function UsuariosPanel() {
    const [clientes, setClientes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Obtener usuario actual para saber quién procesa
    const usuario = useAuthStore((state) => state.usuario);

    const [formCliente, setFormCliente] = useState({
        nombre: "",
        cedula: "",
        telefono: "",
        fechaIngreso: "",
        entrenador: "",
        entrenadorId: null,
        membresia: "mensual",
        precioMensual: 80000,
        estado: "activo"
    });

    // ============================================
    // CARGAR DATOS DEL BACKEND
    // ============================================
    const cargarDatos = async () => {
        try {
            setCargando(true);
            setError(null);
            
            console.log("📥 Cargando clientes y empleados...");
            
            // Cargar clientes
            const clientesData = await clientesService.listar();
            console.log(`✅ Clientes cargados: ${clientesData.length}`);
            setClientes(clientesData);
            
            // Cargar empleados para el selector de entrenadores
            try {
                const empleadosData = await empleadosService.listar();
                console.log(`✅ Empleados cargados: ${empleadosData.length}`);
                setEmpleados(empleadosData);
            } catch (e) {
                console.warn("⚠️ No se pudieron cargar empleados:", e);
                setEmpleados([]);
            }
            
        } catch (error) {
            console.error("❌ Error cargando datos:", error);
            setError("Error al cargar los datos. Por favor, recarga la página.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // ============================================
    // FILTRADO DE CLIENTES
    // ============================================
    const clientesFiltrados = useMemo(() => {
        if (!Array.isArray(clientes)) return [];
        
        return clientes.filter(c => {
            // Búsqueda
            const busca = busqueda.toLowerCase();
            const nombreMatch = (c.nombre || "").toLowerCase().includes(busca);
            const cedulaMatch = (c.cedula || "").includes(busca);
            if (!nombreMatch && !cedulaMatch) return false;
            
            // Filtros
            if (filtroEstado === "activos") {
                return c.estado === "activo" && c.mensualidad?.activa;
            }
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

    // ============================================
    // OBTENER LISTA DE ENTRENADORES
    // ============================================
    const entrenadoresList = useMemo(() => {
        if (!Array.isArray(empleados)) return [];
        return empleados
            .filter(e => e.activo && e.cargo === "Entrenador")
            .map(e => ({
                id: e.id,
                nombre: e.nombre
            }));
    }, [empleados]);

    // ============================================
    // ABRIR MODAL
    // ============================================
    const abrirModal = (item = null) => {
        setEditando(item);
        const hoy = new Date().toISOString().split("T")[0];
        
        if (item) {
            // Editar cliente existente
            setFormCliente({
                nombre: item.nombre || "",
                cedula: item.cedula || "",
                telefono: item.telefono || "",
                fechaIngreso: item.fechaIngreso || hoy,
                entrenador: item.entrenador || "",
                entrenadorId: item.entrenadorId || null,
                membresia: item.mensualidad?.tipo || "mensual",
                precioMensual: item.mensualidad?.precioMensual || 80000,
                estado: item.estado || "activo"
            });
        } else {
            // Nuevo cliente
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
            
            setFormCliente({
                nombre: "",
                cedula: "",
                telefono: "",
                fechaIngreso: hoy,
                entrenador: "",
                entrenadorId: null,
                membresia: "mensual",
                precioMensual: 80000,
                estado: "activo"
            });
        }
        setModalAbierto(true);
    };

    // ============================================
    // GUARDAR CLIENTE (CREAR O ACTUALIZAR)
    // ============================================
    const guardarCliente = async () => {
        // Validaciones
        if (!formCliente.nombre.trim()) {
            alert("El nombre es obligatorio");
            return;
        }
        if (!formCliente.cedula.trim()) {
            alert("La cédula es obligatoria");
            return;
        }

        setGuardando(true);
        try {
            // Preparar datos para el backend
            const datosCliente = {
                nombre: formCliente.nombre.trim(),
                cedula: formCliente.cedula.trim(),
                telefono: formCliente.telefono.trim() || null,
                membresia: formCliente.membresia,
                precioMensual: parseFloat(formCliente.precioMensual) || 80000,
                entrenador: formCliente.entrenador || null,
                entrenadorId: formCliente.entrenadorId || null,
                estado: formCliente.estado
            };

            let resultado;

            if (editando) {
                // Actualizar cliente existente
                console.log(`🔄 Actualizando cliente ${editando.id}...`);
                resultado = await clientesService.actualizar(editando.id, datosCliente);
                
                // Actualizar en el estado local
                setClientes(clientes.map(c => 
                    c.id === editando.id ? resultado : c
                ));
                
                alert(`✅ Cliente "${resultado.nombre}" actualizado correctamente`);
            } else {
                // Crear nuevo cliente
                console.log("📝 Creando nuevo cliente...");
                resultado = await clientesService.crear(datosCliente);
                
                // Agregar al estado local
                setClientes([...clientes, resultado]);
                
                alert(`✅ Cliente "${resultado.nombre}" creado correctamente`);
            }

            setModalAbierto(false);
            setEditando(null);
            
            // Recargar datos para refrescar
            await cargarDatos();
            
        } catch (error) {
            console.error("❌ Error guardando cliente:", error);
            alert(error.message || "Error al guardar el cliente");
        } finally {
            setGuardando(false);
        }
    };

    // ============================================
    // ELIMINAR / DESACTIVAR CLIENTE
    // ============================================
    const eliminarCliente = async (id) => {
        if (!window.confirm("¿Desactivar este cliente?")) return;
        
        try {
            await clientesService.desactivar(id);
            
            // Actualizar estado local
            setClientes(clientes.map(c => 
                c.id === id ? { ...c, estado: "inactivo", mensualidad: { ...c.mensualidad, activa: false } } : c
            ));
            
            alert("✅ Cliente desactivado correctamente");
            
            // Recargar datos
            await cargarDatos();
            
        } catch (error) {
            console.error("❌ Error desactivando cliente:", error);
            alert(error.message || "Error al desactivar el cliente");
        }
    };

    // ============================================
    // RENOVAR MEMBRESÍA
    // ============================================
    const renovarMembresia = async (id) => {
        const dias = prompt("¿Cuántos días de membresía? (30, 15, 90, 180, 365)", "30");
        if (!dias) return;
        
        const monto = prompt("Monto a pagar:", "80000");
        if (!monto) return;
        
        try {
            const resultado = await clientesService.renovarMembresia(id, {
                tipo: `${dias} días`,
                monto: parseFloat(monto),
                metodoPago: "CASH",
                shiftId: null,
                processedByUserId: usuario?.id
            });
            
            alert("✅ Membresía renovada correctamente");
            await cargarDatos();
            
        } catch (error) {
            console.error("❌ Error renovando membresía:", error);
            alert(error.message || "Error al renovar la membresía");
        }
    };

    // ============================================
    // RENDER
    // ============================================
    
    // Calcular stats
    const totalActivos = clientes?.filter(c => c.estado === "activo" && c.mensualidad?.activa).length || 0;
    const totalVencidos = clientes?.filter(c => {
        const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
        return dias < 0 && c.estado === "activo";
    }).length || 0;
    const totalPorVencer = clientes?.filter(c => {
        const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
        return dias >= 0 && dias <= 3 && c.estado === "activo";
    }).length || 0;

    // Mostrar loading
    if (cargando) {
        return (
            <div className="usuarios-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <p style={{ color: '#6b7280' }}>Cargando clientes...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

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

                {error && (
                    <div className="error-message" style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: '1px solid #fca5a5'
                    }}>
                        ❌ {error}
                        <button 
                            onClick={cargarDatos}
                            style={{
                                marginLeft: '12px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

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
                        <span>{clientes?.length || 0}</span>
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
                                    <td colSpan="8" className="tabla-vacia">
                                        {busqueda || filtroEstado !== "todos" 
                                            ? "No se encontraron clientes con estos filtros" 
                                            : "No hay clientes registrados. ¡Crea uno nuevo!"}
                                    </td>
                                </tr>
                            ) : (
                                clientesFiltrados.map(cliente => {
                                    const estado = estadoMembresia(cliente);
                                    return (
                                        <tr key={cliente.id}>
                                            <td>
                                                <div className="cliente-nombre-cell">
                                                    <span className="cliente-avatar">
                                                        {(cliente.nombre || "?").charAt(0).toUpperCase()}
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
                                            <td className="text-small">
                                                {cliente.mensualidad?.fechaVencimiento || "—"}
                                            </td>
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
                                                    {cliente.estado === "activo" && (
                                                        <button
                                                            className="btn-tabla-renew"
                                                            onClick={() => renovarMembresia(cliente.id)}
                                                            title="Renovar membresía"
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '1rem'
                                                            }}
                                                        >🔄</button>
                                                    )}
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
                                <input 
                                    className="campo-input" 
                                    type="text" 
                                    value={formCliente.nombre}
                                    onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                                    placeholder="Ej: Juan Pablo Gómez" 
                                    disabled={guardando}
                                />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Cédula</span><span className="campo-obligatorio">*</span></label>
                                <input 
                                    className="campo-input" 
                                    type="text" 
                                    value={formCliente.cedula}
                                    onChange={e => setFormCliente({ ...formCliente, cedula: e.target.value })}
                                    placeholder="Ej: 1001234567" 
                                    disabled={guardando}
                                />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Teléfono</span></label>
                                <input 
                                    className="campo-input" 
                                    type="text" 
                                    value={formCliente.telefono}
                                    onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
                                    placeholder="Ej: 3201112233" 
                                    disabled={guardando}
                                />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha ingreso</span></label>
                                <input 
                                    className="campo-input" 
                                    type="date" 
                                    value={formCliente.fechaIngreso}
                                    onChange={e => setFormCliente({ ...formCliente, fechaIngreso: e.target.value })}
                                    disabled={guardando}
                                />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Entrenador asignado</span></label>
                                <select 
                                    className="campo-input" 
                                    value={formCliente.entrenadorId || ""}
                                    onChange={e => {
                                        const id = e.target.value ? parseInt(e.target.value) : null;
                                        const nombre = id ? entrenadoresList.find(et => et.id === id)?.nombre || "" : "";
                                        setFormCliente({ 
                                            ...formCliente, 
                                            entrenadorId: id,
                                            entrenador: nombre
                                        });
                                    }}
                                    disabled={guardando}
                                >
                                    <option value="">Sin entrenador</option>
                                    {entrenadoresList.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Tipo membresía</span></label>
                                <select 
                                    className="campo-input" 
                                    value={formCliente.membresia}
                                    onChange={e => {
                                        const tipos = {
                                            'mensual': 30,
                                            '15 días': 15,
                                            'trimestral': 90,
                                            'semestral': 180,
                                            'anual': 365
                                        };
                                        const precio = {
                                            'mensual': 80000,
                                            '15 días': 50000,
                                            'trimestral': 210000,
                                            'semestral': 380000,
                                            'anual': 700000
                                        };
                                        setFormCliente({ 
                                            ...formCliente, 
                                            membresia: e.target.value,
                                            precioMensual: precio[e.target.value] || 80000
                                        });
                                    }}
                                    disabled={guardando}
                                >
                                    <option value="mensual">Mensual (30 días)</option>
                                    <option value="15 días">15 días</option>
                                    <option value="trimestral">Trimestral (90 días)</option>
                                    <option value="semestral">Semestral (180 días)</option>
                                    <option value="anual">Anual (365 días)</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Precio</span></label>
                                <input 
                                    className="campo-input" 
                                    type="number" 
                                    value={formCliente.precioMensual}
                                    onChange={e => setFormCliente({ ...formCliente, precioMensual: parseFloat(e.target.value) || 0 })}
                                    disabled={guardando}
                                />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Estado</span></label>
                                <select 
                                    className="campo-input" 
                                    value={formCliente.estado}
                                    onChange={e => setFormCliente({ ...formCliente, estado: e.target.value })}
                                    disabled={guardando}
                                >
                                    <option value="activo">✅ Activo</option>
                                    <option value="inactivo">❌ Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-acciones">
                            <button 
                                className="btn-cancelar" 
                                onClick={() => setModalAbierto(false)}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                            <Button 
                                variant="primary" 
                                onClick={guardarCliente}
                                disabled={guardando}
                            >
                                {guardando ? "⏳ Guardando..." : editando ? "💾 Guardar" : "✅ Crear"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}