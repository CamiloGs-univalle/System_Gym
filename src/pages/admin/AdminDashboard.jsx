// ============================================
// ADMIN DASHBOARD - Sistema completo
// CON CONEXIÓN AL BACKEND
// ============================================
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import KpiCard from "../../components/admin/KpiCard";
import ActivityFeed from "../../components/admin/ActivityFeed";
import QuickActions from "../../components/admin/QuickActions";
import ClientesPanel from "../clients/ClientesPanel";
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
import AppShell from "../../components/layout/AppShell";
import IngresoClientes from "../acceso/IngresoClientes";
import FotoCliente from "../../components/clientes/FotoCliente";
import accesoService from "../../services/accesoService";
import "./admin-home.css";
import {
    LayoutDashboard, Users, ScanLine, ClipboardList, CreditCard, Wallet, UserCog, Banknote,
    Package, PackagePlus, LineChart, Clock3, FileBarChart, Settings, UserPlus, TrendingUp,
    AlertTriangle, CircleDollarSign, Fingerprint, ArrowRight,
} from "lucide-react";

// Utilidades
// Fecha de hoy calculada en cada uso (la app puede quedar abierta pasada la medianoche)
const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const calcularDiasRestantes = (fechaVencimiento) => {
    if (!fechaVencimiento) return -999;
    return calculateDaysBetween(hoyISO(), fechaVencimiento);
};

// Tabs del sistema
const SECCIONES = [
    { titulo: "General", items: [
        { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
        { id: "acceso", label: "Ingresos", icon: ScanLine },
        { id: "usuarios", label: "Clientes", icon: Users },
    ] },
    { titulo: "Ventas", items: [
        { id: "planes", label: "Planes", icon: ClipboardList },
        { id: "pagos", label: "Pagos", icon: CreditCard },
        { id: "cartera", label: "Cartera", icon: Wallet },
        { id: "productos", label: "Inventario", icon: Package },
        { id: "ingreso", label: "Entrada de mercancía", icon: PackagePlus },
    ] },
    { titulo: "Equipo", items: [
        { id: "empleados", label: "Empleados", icon: UserCog },
        { id: "nomina", label: "Nómina", icon: Banknote },
        { id: "turnos", label: "Turnos", icon: Clock3 },
    ] },
    { titulo: "Negocio", items: [
        { id: "finanzas", label: "Finanzas", icon: LineChart },
        { id: "reportes", label: "Reportes", icon: FileBarChart },
        { id: "configuracion", label: "Configuración", icon: Settings },
    ] },
];

const TITULOS = Object.fromEntries(SECCIONES.flatMap((s) => s.items.map((i) => [i.id, i.label])));


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
                const mesActual = hoyISO().slice(0, 7);
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

    // Ingresos reales de hoy (huella / cédula)
    useEffect(() => {
        let vivo = true;
        const cargar = () => accesoService.delDia().then((r) => vivo && setLastActivity(r));
        cargar();
        const t = setInterval(cargar, 60000);
        return () => { vivo = false; clearInterval(t); };
    }, []);

    // Stats para KPIs
    const { clientes, empleados, turnos, ventasMes, egresosMes, productos } = datosDashboard;

    const clientesActivos = useMemo(() =>
        clientes?.filter(c => c.activo && calcularDiasRestantes(c.membresia?.fechaVencimiento) >= 0).length || 0,
        [clientes]);

    const clientesVencidos = useMemo(() =>
        clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
            return c.membresia?.fechaVencimiento && dias < 0 && c.activo;
        }).length || 0,
        [clientes]);

    const clientesPorVencer = useMemo(() => {
        return clientes?.filter(c => {
            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
            return dias >= 0 && dias <= 3 && c.activo;
        }).length || 0;
    }, [clientes]);

    const ingresoMes = useMemo(() => {
        const mesActual = hoyISO().slice(0, 7);
        const totalVentasMes = ventasMes
            ?.filter(v => (v.transactionDate || v.fecha || v.createdAt || "").startsWith(mesActual))
            ?.reduce((a, v) => a + (v.totalAmount || v.total || v.monto || 0), 0) || 0;
        return totalVentasMes;
    }, [ventasMes]);

    const ingresoHoy = useMemo(() => {
        return ventasMes
            ?.filter(v => (v.transactionDate || v.fecha || v.createdAt || "").startsWith(hoyISO()))
            ?.reduce((a, v) => a + (v.totalAmount || v.total || v.monto || 0), 0) || 0;
    }, [ventasMes]);

    const egresoMes = useMemo(() => {
        const mesActual = hoyISO().slice(0, 7);
        return egresosMes
            ?.filter(e => (e.fecha || e.date || e.createdAt || "").startsWith(mesActual))
            ?.reduce((a, e) => a + (e.monto || e.total || e.amount || 0), 0) || 0;
    }, [egresosMes]);

    const turnoAbierto = turnos?.find(t => t.fecha === hoyISO() && !t.cerrado);
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
                return dias >= 0 && dias <= 5 && c.activo;
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
                    <div className="ah">
                        <section className="ah-hero">
                            <div>
                                <span className="ah-eyebrow">Resumen de hoy</span>
                                <h2>{COP(ingresoHoy)} <small>en ventas y membresías</small></h2>
                                <p>
                                    {clientesActivos} clientes con plan vigente · {clientesPorVencer} por vencer en 3 días ·{" "}
                                    {new Set(lastActivity.filter((l) => l.granted).map((l) => l.clientId)).size} personas han entrado hoy
                                </p>
                            </div>
                            <div className="ah-hero-actions">
                                <button className="sg-btn sg-btn-lg ah-btn-lime" onClick={() => setTabActiva("acceso")}>
                                    <Fingerprint /> Registrar ingreso
                                </button>
                                <button className="sg-btn sg-btn-lg ah-btn-glass" onClick={() => setTabActiva("usuarios")}>
                                    <UserPlus /> Nuevo cliente
                                </button>
                            </div>
                        </section>

                        <section className="ah-stats">
                            <Stat icon={Users} tono="violet" valor={clientesActivos} label="Clientes activos" nota={`${clientes?.length || 0} registrados`} onClick={() => setTabActiva("usuarios")} />
                            <Stat icon={AlertTriangle} tono="amber" valor={clientesPorVencer} label="Por vencer" nota="En los próximos 3 días" onClick={() => setTabActiva("usuarios")} />
                            <Stat icon={CircleDollarSign} tono="red" valor={clientesVencidos} label="Vencidos" nota="Para llamar y renovar" onClick={() => setTabActiva("usuarios")} />
                            <Stat icon={TrendingUp} tono="green" valor={COP(ingresoMes)} label="Ventas del mes" nota={`Egresos del mes ${COP(egresoMes)}`} onClick={() => setTabActiva("finanzas")} />
                            <Stat icon={UserCog} tono="cyan" valor={totalEmpleados} label="Empleados activos" nota={`${empleados?.filter(e => e.activo && e.cargo === "Entrenador").length || 0} entrenadores`} onClick={() => setTabActiva("empleados")} />
                            <Stat icon={Package} tono="pink" valor={productos?.length || 0} label="Productos" nota={`${productos?.filter(p => (p.stock ?? 0) <= (p.minimumStock ?? 0)).length || 0} con stock bajo`} onClick={() => setTabActiva("productos")} />
                        </section>

                        <section className="ah-grid">
                            <div className="sg-card">
                                <div className="ah-card-head">
                                    <div>
                                        <h3 className="sg-card-title">Ingresos de hoy</h3>
                                        <p className="sg-card-sub">Quién ha entrado al gimnasio</p>
                                    </div>
                                    <button className="sg-btn sg-btn-soft sg-btn-sm" onClick={() => setTabActiva("acceso")}>Ver todo <ArrowRight /></button>
                                </div>
                                {lastActivity.length === 0 ? (
                                    <div className="sg-empty"><ScanLine /><span>Aún no hay ingresos registrados hoy.</span></div>
                                ) : (
                                    <div className="ah-feed">
                                        {lastActivity.slice(0, 7).map((l) => (
                                            <div key={l.id} className="ah-feed-item">
                                                <FotoCliente id={l.clientId} nombre={l.clientName || "?"} size={38} />
                                                <div className="ah-feed-text">
                                                    <strong>{l.clientName || "No identificado"}</strong>
                                                    <span>{l.granted ? "Entró" : "Ingreso negado"} · {l.method === "FINGERPRINT" ? "huella" : l.method === "DNI" ? "cédula" : "manual"}</span>
                                                </div>
                                                <span className={`sg-badge ${l.granted ? "sg-badge-success" : "sg-badge-danger"}`}>
                                                    {new Date(l.accessedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sg-card">
                                <div className="ah-card-head">
                                    <div>
                                        <h3 className="sg-card-title">Próximos a vencer</h3>
                                        <p className="sg-card-sub">Llámelos antes de que se les venza el plan</p>
                                    </div>
                                    <span className="sg-badge sg-badge-warning sg-badge-plain">{clientesPorVencerLista.length}</span>
                                </div>
                                {clientesPorVencerLista.length === 0 ? (
                                    <div className="sg-empty"><Users /><span>Nadie vence en los próximos 5 días.</span></div>
                                ) : (
                                    <div className="ah-feed">
                                        {clientesPorVencerLista.slice(0, 6).map(c => {
                                            const dias = calcularDiasRestantes(c.membresia?.fechaVencimiento);
                                            return (
                                                <div key={c.id} className="ah-feed-item">
                                                    <FotoCliente id={c.id} nombre={c.nombre} version={c.fotoVersion} size={38} />
                                                    <div className="ah-feed-text">
                                                        <strong>{c.nombre}</strong>
                                                        <span>{c.telefono || "Sin teléfono"}</span>
                                                    </div>
                                                    <span className={`sg-badge ${dias <= 1 ? "sg-badge-danger" : "sg-badge-warning"}`}>
                                                        {dias === 0 ? "Vence hoy" : dias === 1 ? "Mañana" : `${dias} días`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {clientesPorVencerLista.length > 6 && (
                                    <button className="sg-btn sg-btn-ghost sg-btn-sm" style={{ marginTop: 12 }} onClick={() => setTabActiva("usuarios")}>
                                        Ver los {clientesPorVencerLista.length}
                                    </button>
                                )}
                            </div>

                            <div className="sg-card">
                                <div className="ah-card-head">
                                    <div>
                                        <h3 className="sg-card-title">Accesos rápidos</h3>
                                        <p className="sg-card-sub">Lo que más se usa</p>
                                    </div>
                                </div>
                                <div className="ah-quick">
                                    {[
                                        { icon: UserPlus, label: "Nuevo cliente", id: "usuarios" },
                                        { icon: Banknote, label: "Pagar nómina", id: "nomina" },
                                        { icon: Clock3, label: "Turnos", id: "turnos" },
                                        { icon: Package, label: "Inventario", id: "productos" },
                                        { icon: LineChart, label: "Finanzas", id: "finanzas" },
                                        { icon: FileBarChart, label: "Reportes", id: "reportes" },
                                    ].map((q) => (
                                        <button key={q.id + q.label} className="ah-quick-btn" onClick={() => setTabActiva(q.id)}>
                                            <q.icon />
                                            <span>{q.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className={`ah-turno ${turnoAbierto ? "ok" : ""}`}>
                                    <Clock3 />
                                    <span>{turnoAbierto ? "Hay un turno de caja abierto hoy" : "No hay turno de caja abierto hoy"}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case "acceso":
                return <IngresoClientes />;
            case "usuarios":
                return <ClientesPanel />;
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
        <>
            <AppShell
                secciones={SECCIONES}
                activo={tabActiva}
                onCambiar={setTabActiva}
                titulo={tabActiva === "dashboard" ? `Hola, ${(usuario?.fullName || usuario?.username || "").split(" ")[0]}` : TITULOS[tabActiva]}
                onSalir={() => setConfirmLogout(true)}
            >
                <div className="sg-legacy">{renderContent()}</div>
            </AppShell>

            <LogoutConfirmModal
                open={confirmLogout}
                onConfirm={() => { setConfirmLogout(false); handleLogout(); }}
                onCancel={() => setConfirmLogout(false)}
            />
        </>
    );
}

function Stat({ icon: Icon, tono, valor, label, nota, onClick }) {
    return (
        <button className={`sg-stat clickable ah-stat ah-${tono}`} onClick={onClick}>
            <div className="sg-stat-icon"><Icon /></div>
            <div className="sg-stat-value">{valor}</div>
            <div className="sg-stat-label">{label}</div>
            <div className="sg-stat-note">{nota}</div>
        </button>
    );
}
