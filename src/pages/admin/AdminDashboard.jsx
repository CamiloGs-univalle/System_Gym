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
import FinanzasPanel from "./FinanzasPanel";
import TurnosPanel from "./TurnosPanel";
import EmpleadosPanel from "./EmpleadosPanel";
import ReportesPanel from "./ReportesPanel";
import ConfiguracionPanel from "./ConfiguracionPanel";
import { COP, formatDate, calculateDaysBetween } from "../../utils/formatters";
import useAuthStore from "../../store/authStore";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import { turnoService } from "../../services/turnoService";
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
    { id: "empleados", label: "Empleados", icon: "👷" },
    { id: "productos", label: "Inventario", icon: "📦" },
    { id: "finanzas", label: "Finanzas", icon: "💰" },
    { id: "turnos", label: "Turnos", icon: "🕐" },
    { id: "reportes", label: "Reportes", icon: "📋" },
    { id: "configuracion", label: "Configuración", icon: "⚙️" },
];

export default function AdminDashboard() {
    const [tabActiva, setTabActiva] = useState("dashboard");
    const [lastActivity, setLastActivity] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [datosDashboard, setDatosDashboard] = useState({
        clientes: [],
        empleados: [],
        turnos: [],
        ingresosMensualidades: [],
        ingresosProductos: [],
        egresos: []
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
                
                // Cargar finanzas - datos mock por ahora
                const ingresosMensualidadesData = [
                    { id: 1, fecha: "2026-07-01", monto: 80000, clienteNombre: "Juan Pérez", tipo: "Mensual", metodoPago: "Efectivo" },
                    { id: 2, fecha: "2026-07-05", monto: 150000, clienteNombre: "María García", tipo: "Trimestral", metodoPago: "Transferencia" }
                ];
                
                const ingresosProductosData = [
                    { id: 1, fecha: "2026-07-02", total: 45000, producto: "Proteína Whey", cantidad: 2 }
                ];
                
                const egresosData = [
                    { id: 1, fecha: "2026-07-03", monto: 120000, concepto: "Pago servicios", categoria: "Servicios" }
                ];
                
                setDatosDashboard({
                    clientes: clientesData,
                    empleados: empleadosData,
                    turnos: turnosData,
                    ingresosMensualidades: ingresosMensualidadesData,
                    ingresosProductos: ingresosProductosData,
                    egresos: egresosData
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
    const { clientes, empleados, turnos, ingresosMensualidades, ingresosProductos, egresos } = datosDashboard;

    const clientesActivos = useMemo(() =>
        clientes?.filter(c => c.estado === "activo" && c.mensualidad?.activa).length || 0,
        [clientes]);

    const clientesVencidos = useMemo(() =>
        clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
            return dias < 0 && c.estado === "activo";
        }).length || 0,
        [clientes]);

    const clientesPorVencer = useMemo(() => {
        return clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
            return dias >= 0 && dias <= 3 && c.estado === "activo";
        }).length || 0;
    }, [clientes]);

    const ingresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        const mem = ingresosMensualidades
            ?.filter(i => i.fecha?.startsWith(mesActual))
            ?.reduce((a, i) => a + (i.monto || 0), 0) || 0;
        const prod = ingresosProductos
            ?.filter(i => i.fecha?.startsWith(mesActual))
            ?.reduce((a, i) => a + (i.total || 0), 0) || 0;
        return mem + prod;
    }, [ingresosMensualidades, ingresosProductos]);

    const egresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        return egresos
            ?.filter(e => e.fecha?.startsWith(mesActual))
            ?.reduce((a, e) => a + (e.monto || 0), 0) || 0;
    }, [egresos]);

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
            value: COP(ingresoMes),
            label: "Ingresos del Mes",
            subtitle: `Egresos ${COP(egresoMes)}`,
            color: "#10b981",
            bg: "#ecfdf5",
            onClick: () => setTabActiva("finanzas")
        },
        {
            icon: "📈",
            value: COP(ingresoMes - egresoMes),
            label: "Utilidad Neta",
            subtitle: `${((ingresoMes - egresoMes) / (ingresoMes || 1) * 100).toFixed(1)}% margen`,
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
            value: "32",
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
                const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
                return dias >= 0 && dias <= 5 && c.estado === "activo" && c.mensualidad?.activa;
            })
            ?.sort((a, b) =>
                calcularDiasRestantes(a.mensualidad?.fechaVencimiento) -
                calcularDiasRestantes(b.mensualidad?.fechaVencimiento)
            ) || [];
    }, [clientes]);

    const logout = useAuthStore((state) => state.logout);

    const handleLogout = () => {
        if (!window.confirm("¿Deseas cerrar sesión?")) return;

        console.log("=================================");
        console.log("ADMIN DASHBOARD - Cerrando sesión");
        console.log("=================================");

        logout();
        navigate("/login", { replace: true });
        window.location.reload();

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
                                            const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
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
            case "empleados":
                return <EmpleadosPanel />;
            case "productos":
                return <ProductosPanel />;
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
                    <span className="exec-badge">
                        <span className="exec-badge-dot"></span>
                        Sistema en vivo
                    </span>
                    <button
                        onClick={handleLogout}
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
        </div>
    );
}