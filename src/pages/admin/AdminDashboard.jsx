// ============================================
// ADMIN DASHBOARD - Sistema completo
// ============================================
import { useState, useMemo, useEffect } from "react";
import KpiCard from "../../components/admin/KpiCard";
import ActivityFeed from "../../components/admin/ActivityFeed";
import QuickActions from "../../components/admin/QuickActions";
import UsuariosPanel from "./UsuariosPanel";
import ProductosAdminPanel from "./ProductosAdminPanel";
import FinanzasPanel from "./FinanzasPanel";
import TurnosPanel from "./TurnosPanel";
import EmpleadosPanel from "./EmpleadosPanel";
import ReportesPanel from "./ReportesPanel";
import ConfiguracionPanel from "./ConfiguracionPanel";
import { clientes } from "../../mock/clientes";
import { empleados, turnos } from "../../mock/empleados";
import { ingresosMensualidades, ingresosProductos, egresos } from "../../mock/finanzas";
import { COP, formatDate, calculateDaysBetween } from "../../utils/formatters";
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
    const clientesActivos = useMemo(() => 
        clientes.filter(c => c.estado === "activo" && c.mensualidad?.activa).length,
    []);

    const clientesVencidos = useMemo(() => 
        clientes.filter(c => {
            const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
            return dias < 0 && c.estado === "activo";
        }).length,
    []);

    const clientesPorVencer = useMemo(() => {
        return clientes.filter(c => {
            const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
            return dias >= 0 && dias <= 3 && c.estado === "activo";
        }).length;
    }, []);

    const ingresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        const mem = ingresosMensualidades
            .filter(i => i.fecha.startsWith(mesActual))
            .reduce((a, i) => a + i.monto, 0);
        const prod = ingresosProductos
            .filter(i => i.fecha.startsWith(mesActual))
            .reduce((a, i) => a + i.total, 0);
        return mem + prod;
    }, []);

    const egresoMes = useMemo(() => {
        const mesActual = hoy.slice(0, 7);
        return egresos
            .filter(e => e.fecha.startsWith(mesActual))
            .reduce((a, e) => a + e.monto, 0);
    }, []);

    const turnoAbierto = turnos.find(t => t.fecha === hoy && !t.cerrado);
    const totalEmpleados = empleados.filter(e => e.activo).length;

    // KPIs del dashboard
    const kpis = [
        { 
            icon: "👥", 
            value: clientesActivos, 
            label: "Clientes Activos", 
            subtitle: `${clientes.length} total`,
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
            subtitle: `${empleados.filter(e => e.activo && e.cargo === "Entrenador").length} entrenadores`,
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
            .filter(c => {
                const dias = calcularDiasRestantes(c.mensualidad?.fechaVencimiento);
                return dias >= 0 && dias <= 5 && c.estado === "activo" && c.mensualidad?.activa;
            })
            .sort((a, b) => 
                calcularDiasRestantes(a.mensualidad?.fechaVencimiento) - 
                calcularDiasRestantes(b.mensualidad?.fechaVencimiento)
            );
    }, []);

    // Renderizar contenido según tab
    const renderContent = () => {
        switch (tabActiva) {
            case "dashboard":
                return (
                    <div className="dashboard-content">
                        {/* KPIs */}
                        <div className="kpis-grid">
                            {kpis.map((k, i) => (
                                <KpiCard key={i} {...k} />
                            ))}
                        </div>

                        {/* Sección inferior */}
                        <div className="dashboard-grid">
                            {/* Actividad Reciente */}
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>🕐 Actividad Reciente</h3>
                                    <span className="card-badge">{lastActivity.length} eventos</span>
                                </div>
                                <ActivityFeed activities={lastActivity} />
                            </div>

                            {/* Acciones Rápidas */}
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>⚡ Acciones Rápidas</h3>
                                </div>
                                <QuickActions actions={quickActions} />
                            </div>

                            {/* Próximos a Vencer */}
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
                return <ProductosAdminPanel />;
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
            {/* Header */}
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
                </div>
            </header>

            {/* Tabs */}
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

            {/* Content */}
            <main className="exec-content">
                {renderContent()}
            </main>
        </div>
    );
}