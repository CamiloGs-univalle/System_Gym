// ============================================
// ADMIN DASHBOARD - Sistema completo
// CON CONEXIÓN AL BACKEND
// ============================================
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import KpiCard from "../../components/admin/KpiCard";
import ActivityFeed from "../../components/admin/ActivityFeed";
import QuickActions from "../../components/admin/QuickActions";
import UsuariosPanel from "./UsuariosPanel";
import ProductosPanel from "../products/productos";
import IngresoPanel from "../ingreso/IngresoPanel";
import "../../styles/ingresoCSS/ingreso.css";
import FinanzasPanel from "./FinanzasPanel";
import TurnosPanel from "./turnos/TurnosPanel";
import EmpleadosPanel from "./EmpleadosPanel";
import ReportesPanel from "./ReportesPanel";
import ConfiguracionPanel from "./ConfiguracionPanel";
import PlanesPanel from "./gimnasio/PlanesPanel";
import PagosPanel from "./gimnasio/PagosPanel";
import CarteraPanel from "./gimnasio/CarteraPanel";
import NominaPanel from "./nomina/NominaPanel";
import LogoutConfirmModal from "../../components/common/LogoutConfirmModal";
import { COP, formatDate, calculateDaysBetween } from "../../utils/formatters";
import useAuthStore from "../../store/authStore";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import { turnoService } from "../../services/turnoService";
import { ventasService } from "../../services/ventasService";
import { productosService } from "../../services/productosService";
import { ingresoService } from "../../services/ingresoService";
import "../../styles/adminCSS/index.css";

// Utilidades
const hoy = new Date().toISOString().split("T")[0];

const calcularDiasRestantes = (fechaVencimiento) => {
    if (!fechaVencimiento) return -999;
    return calculateDaysBetween(new Date().toISOString().split("T")[0], fechaVencimiento);
};

// Tabs del sistema
const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "usuarios", label: "Clientes", icon: "👥" },
    { id: "planes", label: "Planes", icon: "📋" },
    { id: "pagos", label: "Pagos", icon: "💰" },
    { id: "cartera", label: "Cartera", icon: "📈" },
    { id: "empleados", label: "Empleados", icon: "👷" },
    { id: "nomina", label: "Nomina", icon: "📝" },
    { id: "productos", label: "Inventario", icon: "📦" },
    { id: "ingreso", label: "Ingreso Producto", icon: "📥" },
    { id: "finanzas", label: "Finanzas", icon: "💵" },
    { id: "turnos", label: "Turnos", icon: "🕐" },
    { id: "reportes", label: "Reportes", icon: "📋" },
    { id: "configuracion", label: "Configuracion", icon: "⚙️" },
];

export default function AdminDashboard() {
    const [tabActiva, setTabActiva] = useState("dashboard");
    const [lastActivity, setLastActivity] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [datosDashboard, setDatosDashboard] = useState({
        clientes: [],
        empleados: [],
        turnos: [],
        ventasMes: [],
        egresosMes: [],
        productos: []
    });
    const navigate = useNavigate();

    // Verificar autenticación
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const usuario = useAuthStore((state) => state.usuario);

    // Efecto para redirigir si no está autenticado
    useEffect(() => {
        if (!isAuthenticated || !usuario) {
            console.log("🔒 AdminDashboard - No autenticado, redirigiendo al login");
            navigate("/login", { replace: true });
        }
    }, [isAuthenticated, usuario, navigate]);

    // Cargar datos del dashboard
    useEffect(() => {
        const cargarDatos = async () => {
            if (!isAuthenticated) return;
            
            try {
                setCargando(true);
                console.log("📊 Cargando datos para el dashboard...");
                
                // Cargar clientes
                let clientesData = [];
                try {
                    clientesData = await clientesService.listar();
                    console.log(`✅ Clientes cargados: ${clientesData.length}`);
                } catch (e) {
                    console.error("Error cargando clientes:", e);
                    clientesData = [];
                }
                
                // Cargar empleados
                let empleadosData = [];
                try {
                    empleadosData = await empleadosService.listar();
                    console.log(`✅ Empleados cargados: ${empleadosData.length}`);
                } catch (e) {
                    console.error("Error cargando empleados:", e);
                    empleadosData = [];
                }
                
                // Cargar turnos
                let turnosData = [];
                try {
                    turnosData = await turnoService.turnosHoy();
                    console.log(`✅ Turnos cargados: ${turnosData.length}`);
                } catch (e) {
                    console.error("Error cargando turnos:", e);
                    turnosData = [];
                }
                
                // Cargar finanzas del mes desde el backend
                const mesActual = hoy.slice(0, 7);
                let ventasMes = [];
                try {
                    const ventasResp = await ventasService.ventasHoy();
                    ventasMes = Array.isArray(ventasResp) ? ventasResp
                        : Array.isArray(ventasResp?.data) ? ventasResp.data
                        : Array.isArray(ventasResp?.data?.data) ? ventasResp.data.data
                        : [];
                } catch (e) {
                    console.error("Error cargando ventas:", e);
                }

                let egresosMes = [];
                try {
                    const egresosResp = await ingresoService.listarEgresos();
                    egresosMes = Array.isArray(egresosResp) ? egresosResp
                        : Array.isArray(egresosResp?.data) ? egresosResp.data
                        : Array.isArray(egresosResp?.data?.data) ? egresosResp.data.data
                        : [];
                } catch (e) {
                    console.error("Error cargando egresos:", e);
                }

                let productos = [];
                try {
                    const productosResp = await productosService.listarProductos();
                    productos = Array.isArray(productosResp) ? productosResp
                        : Array.isArray(productosResp?.data) ? productosResp.data
                        : Array.isArray(productosResp?.data?.data) ? productosResp.data.data
                        : [];
                } catch (e) {
                    console.error("Error cargando productos:", e);
                }

                setDatosDashboard({
                    clientes: clientesData,
                    empleados: empleadosData,
                    turnos: turnosData,
                    ventasMes,
                    egresosMes,
                    productos
                });
                
            } catch (error) {
                console.error("❌ Error cargando datos:", error);
            } finally {
                setCargando(false);
            }
        };
        
        cargarDatos();
    }, [isAuthenticated]);

    // Generar actividad en tiempo real (simulado)
    useEffect(() => {
        const actividades = [
            { icon: "👤", text: "Juan Pérez renovó membresía mensual", timestamp: new Date(Date.now() - 7200000), color: "#10b981" },
            { icon: "💊", text: "Se vendió Proteína Whey 2lb x2", timestamp: new Date(Date.now() - 10800000), color: "#3b82f6" },
            { icon: "⚠️", text: "Mateo López vence en 10 días", timestamp: new Date(), color: "#f59e0b" },
            { icon: "🕐", text: "Turno de Paula Jiménez cerrado correctamente", timestamp: new Date(Date.now() - 18000000), color: "#10b981" },
            { icon: "📦", text: "Stock bajo: Creatina Monohidratada 300g (3 uds)", timestamp: new Date(Date.now() - 86400000), color: "#ef4444" },
        ];
        setLastActivity(actividades);
    }, []);

    // Stats para KPIs
    const { clientes, empleados, turnos, ventasMes, egresosMes, productos } = datosDashboard;

    const clientesActivos = useMemo(() =>
        clientes?.filter(c => c.activo && c.membresia?.estado === "ACTIVA").length || 0,
        [clientes]);

    const clientesVencidos = useMemo(() =>
        clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
            return dias < 0 && c.activo;
        }).length || 0,
        [clientes]);

    const clientesPorVencer = useMemo(() => {
        return clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
            return dias >= 0 && dias <= 3 && c.activo;
        }).length || 0;
    }, [clientes]);

    const ingresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        const totalVentasMes = ventasMes
            ?.filter(v => (v.transactionDate || v.fecha || v.createdAt || "").startsWith(mesActual))
            ?.reduce((a, v) => a + (v.totalAmount || v.total || v.monto || 0), 0) || 0;
        return totalVentasMes;
    }, [ventasMes]);

    const ingresoHoy = useMemo(() => {
        return ventasMes
            ?.filter(v => (v.transactionDate || v.fecha || v.createdAt || "").startsWith(hoy))
            ?.reduce((a, v) => a + (v.totalAmount || v.total || v.monto || 0), 0) || 0;
    }, [ventasMes]);

    const egresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        return egresosMes
            ?.filter(e => (e.fecha || e.date || e.createdAt || "").startsWith(mesActual))
            ?.reduce((a, e) => a + (e.monto || e.total || e.amount || 0), 0) || 0;
    }, [egresosMes]);

    const turnoAbierto = turnos?.find(t => t.fecha === hoy && !t.cerrado);
    const totalEmpleados = empleados?.filter(e => e.activo).length || 0;

    // KPIs del dashboard
    const kpis = [
        {
            icon: "👥",
            value: clientesActivos,
            label: "Clientes Activos",
            subtitle: `${clientes?.length || 0} total`,
            color: "#3b82f6",
            bg: "#eff6ff",
            onClick: () => setTabActiva("usuarios")
        },
        {
            icon: "⚠️",
            value: clientesPorVencer,
            label: "Por Vencer",
            subtitle: "≤ 3 días",
            color: "#f59e0b",
            bg: "#fffbeb",
            onClick: () => setTabActiva("usuarios")
        },
        {
            icon: "❌",
            value: clientesVencidos,
            label: "Vencidos",
            subtitle: "Sin membresía",
            color: "#ef4444",
            bg: "#fef2f2",
            onClick: () => setTabActiva("usuarios")
        },
        {
            icon: "💰",
            value: COP(ingresoHoy),
            label: "Ingresos de Hoy",
            subtitle: `Egresos ${COP(egresoMes)}`,
            color: "#10b981",
            bg: "#ecfdf5",
            onClick: () => setTabActiva("finanzas")
        },
        {
            icon: "📈",
            value: COP(ingresoHoy - egresoMes),
            label: "Utilidad Neta",
            subtitle: `${((ingresoHoy - egresoMes) / (ingresoHoy || 1) * 100).toFixed(1)}% margen`,
            color: "#8b5cf6",
            bg: "#f5f3ff",
            onClick: () => setTabActiva("finanzas")
        },
        {
            icon: "👷",
            value: totalEmpleados,
            label: "Empleados Activos",
            subtitle: `${empleados?.filter(e => e.activo && e.cargo === "Entrenador").length || 0} entrenadores`,
            color: "#06b6d4",
            bg: "#ecfeff",
            onClick: () => setTabActiva("empleados")
        },
        {
            icon: "🕐",
            value: turnoAbierto ? "✅" : "⏸️",
            label: "Turno Hoy",
            subtitle: turnoAbierto ? "Abierto" : "Sin turno activo",
            color: turnoAbierto ? "#10b981" : "#6b7280",
            bg: turnoAbierto ? "#ecfdf5" : "#f3f4f6",
            onClick: () => setTabActiva("turnos")
        },
        {
            icon: "📦",
            value: productos?.length || 0,
            label: "Productos",
            subtitle: "En inventario",
            color: "#f43f5e",
            bg: "#fef2f2",
            onClick: () => setTabActiva("productos")
        },
    ];

    // Acciones rápidas
    const quickActions = [
        { icon: "👤", label: "Nuevo Cliente", onClick: () => setTabActiva("usuarios") },
        { icon: "👷", label: "Nuevo Empleado", onClick: () => setTabActiva("empleados") },
        { icon: "📦", label: "Agregar Producto", onClick: () => setTabActiva("productos") },
        { icon: "🕐", label: "Abrir Turno", onClick: () => setTabActiva("turnos") },
        { icon: "💰", label: "Registrar Ingreso", onClick: () => setTabActiva("finanzas") },
        { icon: "📋", label: "Ver Reportes", onClick: () => setTabActiva("reportes") },
    ];

    // Clientes por vencer para mostrar en el dashboard
    const clientesPorVencerLista = useMemo(() => {
        return clientes
            ?.filter(c => {
                const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
                return dias >= 0 && dias <= 5 && c.activo && c.membresia?.estado === "ACTIVA";
            })
            ?.sort((a, b) =>
                calcularDiasRestantes(a.membresia?.fechaVencimiento) -
                calcularDiasRestantes(b.membresia?.fechaVencimiento)
            ) || [];
    }, [clientes]);

    const logout = useAuthStore((state) => state.logout);
    const [confirmLogout, setConfirmLogout] = useState(false);

    const handleLogout = () => {
        console.log("=================================");
        console.log("ADMIN DASHBOARD - Cerrando sesión");
        console.log("=================================");

        logout();
        navigate("/login", { replace: true });

        console.log("✅ Sesión cerrada y redirigido al login");
    };

    // Si no está autenticado, no renderizar nada
    if (!isAuthenticated || !usuario) {
        return null;
    }

    // Mostrar loading
    if (cargando) {
        return (
            <div className="exec-dashboard">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f3f3',
                        borderTop: '5px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Cargando panel de control...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    // Renderizar contenido según tab
    const renderContent = () => {
        switch (tabActiva) {
            case "dashboard":
                return (
                    <div className="dashboard-content">
                        <div className="kpis-grid">
                            {kpis.map((k, i) => (
                                <KpiCard key={i} {...k} />
                            ))}
                        </div>

                        <div className="dashboard-grid">
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>🕐 Actividad Reciente</h3>
                                    <span className="card-badge">{lastActivity.length} eventos</span>
                                </div>
                                <ActivityFeed activities={lastActivity} />
                            </div>

                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>⚡ Acciones Rápidas</h3>
                                </div>
                                <QuickActions actions={quickActions} />
                            </div>

                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>⚠️ Próximos a Vencer</h3>
                                    <span className="card-badge">{clientesPorVencerLista.length}</span>
                                </div>
                                <div className="expiring-list">
                                    {clientesPorVencerLista.length === 0 ? (
                                        <div className="empty-state">
                                            <span>✅</span>
                                            <p>Sin membresías próximas a vencer</p>
                                        </div>
                                    ) : (
                                        clientesPorVencerLista.slice(0, 5).map(c => {
                                            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
                                            return (
                                                <div key={c.id} className="expiring-item">
                                                    <span className="expiring-name">{c.nombre}</span>
                                                    <span className={`expiring-badge ${dias <= 1 ? "badge-red" : dias <= 3 ? "badge-yellow" : "badge-blue"}`}>
                                                        {dias === 0 ? "🔥 Hoy" : dias === 1 ? "Mañana" : `${dias} días`}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                    {clientesPorVencerLista.length > 5 && (
                                        <button
                                            className="expiring-ver-mas"
                                            onClick={() => setTabActiva("usuarios")}
                                        >
                                            Ver todos ({clientesPorVencerLista.length})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "usuarios":
                return <UsuariosPanel />;
            case "planes":
                return <PlanesPanel />;
            case "pagos":
                return <PagosPanel />;
            case "cartera":
                return <CarteraPanel />;
            case "empleados":
                return <EmpleadosPanel />;
            case "nomina":
                return <NominaPanel />;
            case "productos":
                return <ProductosPanel />;
            case "ingreso":
                return <IngresoPanel />;
            case "finanzas":
                return <FinanzasPanel />;
            case "turnos":
                return <TurnosPanel />;
            case "reportes":
                return <ReportesPanel />;
            case "configuracion":
                return <ConfiguracionPanel />;
            default:
                return null;
        }
    };

    return (
        <div className="exec-dashboard">
            <header className="exec-header">
                <div className="exec-header-left">
                    <h1 className="exec-title">🏢 Panel de Control</h1>
                    <p className="exec-subtitle">
                        Vista ejecutiva • {formatDate(hoy)}
                    </p>
                </div>
                <div className="exec-header-right">
                    <div className="exec-user">
                        <span className="exec-user-avatar">👤</span>
                        <div className="exec-user-info">
                            <span className="exec-user-name">
                                {usuario?.fullName || usuario?.nombre || usuario?.username || "Administrador"}
                            </span>
                            <span className="exec-user-role">
                                {usuario?.role || "Administrador"}
                            </span>
                        </div>
                    </div>
                    <span className="exec-badge">
                        <span className="exec-badge-dot"></span>
                        Sistema en vivo
                    </span>
                    <button
                        onClick={() => setConfirmLogout(true)}
                        className="exec-logout-btn"
                        title="Cerrar sesión"
                    >
                        <span className="exec-logout-icon">🚪</span>
                        <span className="exec-logout-text">Salir</span>
                    </button>
                </div>
            </header>

            <nav className="exec-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`exec-tab ${tabActiva === tab.id ? "active" : ""}`}
                        onClick={() => setTabActiva(tab.id)}
                    >
                        <span className="exec-tab-icon">{tab.icon}</span>
                        <span className="exec-tab-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <main className="exec-content">
                {renderContent()}
            </main>

            <LogoutConfirmModal
                open={confirmLogout}
                onConfirm={() => { setConfirmLogout(false); handleLogout(); }}
                onCancel={() => setConfirmLogout(false)}
            />
        </div>
    );
}