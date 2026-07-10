// ============================================================
// ARCHIVO: src/pages/admin/ReportesPanel.jsx
// DESCRIPCIÓN: Panel de reportes y estadísticas ejecutivas
// FUNCIONALIDADES: Resumen, Financiero, Clientes, Empleados, Inventario, Turnos
// EXPORTACIÓN: PDF, Excel, CSV, Impresión
// VERSIÓN: 4.0 - COMPLETA Y CONECTADA AL BACKEND
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { COP, formatDate } from "../../utils/formatters";
import useAuthStore from "../../store/authStore";

// ============================================================
// SERVICIOS
// ============================================================
import { turnoService } from "../../services/turnoService";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import { productosService } from "../../services/productosService";
import { ventasService } from "../../services/ventasService";

// ============================================================
// LIBRERÍAS PARA EXPORTACIÓN
// ============================================================
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================
// CONSTANTES DE DISEÑO (consistente con el sistema)
// ============================================================
const COLORS = {
    primary: "#3b82f6",
    primaryDark: "#2563eb",
    primaryLight: "#eff6ff",
    success: "#10b981",
    successLight: "#ecfdf5",
    danger: "#ef4444",
    dangerLight: "#fef2f2",
    warning: "#f59e0b",
    warningLight: "#fffbeb",
    purple: "#8b5cf6",
    purpleLight: "#f5f3ff",
    cyan: "#06b6d4",
    cyanLight: "#ecfeff",
    gray: "#6b7280",
    grayLight: "#f3f4f6",
    grayBorder: "#e5e7eb",
    white: "#ffffff",
    ink: "#111827",
};

// ============================================================
// COMPONENTES REUTILIZABLES
// ============================================================

const KpiCard = ({ icon, value, label, color = COLORS.primary, trend }) => {
    return (
        <div
            style={{
                background: COLORS.white,
                borderRadius: "12px",
                padding: "16px 20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                border: `1px solid ${COLORS.grayBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "14px",
            }}
        >
            <div
                style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: color + "15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "22px", fontWeight: "700", color: COLORS.ink }}>{value}</div>
                <div style={{ fontSize: "13px", color: COLORS.gray }}>{label}</div>
            </div>
            {trend && (
                <div
                    style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        background: trend > 0 ? COLORS.successLight : COLORS.dangerLight,
                        color: trend > 0 ? COLORS.success : COLORS.danger,
                    }}
                >
                    {trend > 0 ? "+" : ""}{trend}%
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div
        style={{
            background: COLORS.white,
            borderRadius: "10px",
            padding: "14px 16px",
            border: `1px solid ${COLORS.grayBorder}`,
            textAlign: "center",
        }}
    >
        <div style={{ fontSize: "13px", color: COLORS.gray }}>{title}</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: COLORS.ink }}>{value}</div>
        {subtitle && <div style={{ fontSize: "11px", color: COLORS.gray }}>{subtitle}</div>}
    </div>
);

const ProgressBar = ({ value, max, label, color = COLORS.primary }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span>{label}</span>
                <span style={{ fontWeight: "600" }}>
                    {value} / {max}
                </span>
            </div>
            <div style={{ width: "100%", height: "6px", background: COLORS.grayLight, borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.4s" }} />
            </div>
        </div>
    );
};

const SectionHeader = ({ icon, title, subtitle }) => (
    <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: COLORS.ink, display: "flex", alignItems: "center", gap: "8px" }}>
            {icon} {title}
        </h3>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: "13px", color: COLORS.gray }}>{subtitle}</p>}
    </div>
);

const EmptyState = ({ icon = "📭", text }) => (
    <div style={{ textAlign: "center", color: COLORS.gray, padding: "30px 0" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>{icon}</div>
        <div style={{ fontSize: "14px" }}>{text}</div>
    </div>
);

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ReportesPanel() {
    // ============================================================
    // ESTADO
    // ============================================================

    const [reporteActivo, setReporteActivo] = useState("resumen");
    const [cargando, setCargando] = useState(true);
    const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
    const [error, setError] = useState(null);
    const [generando, setGenerando] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

    const hoy = useMemo(() => new Date(), []);
    const primerDiaMes = useMemo(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1), [hoy]);

    const [fechaInicio, setFechaInicio] = useState(primerDiaMes.toISOString().split("T")[0]);
    const [fechaFin, setFechaFin] = useState(hoy.toISOString().split("T")[0]);

    // Datos del backend
    const [clientes, setClientes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [turnosTodos, setTurnosTodos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [ventasHoy, setVentasHoy] = useState([]);
    const [productosBajoStock, setProductosBajoStock] = useState([]);

    // Datos por período
    const [turnosPeriodo, setTurnosPeriodo] = useState([]);
    const [ventasPeriodo, setVentasPeriodo] = useState([]);
    const [turnosPeriodoAnterior, setTurnosPeriodoAnterior] = useState([]);
    const [ventasPeriodoAnterior, setVentasPeriodoAnterior] = useState([]);

    const { usuario } = useAuthStore();

    // ============================================================
    // TIPOS DE REPORTE
    // ============================================================

    const tiposReporte = [
        { id: "resumen", label: "📊 Resumen", color: COLORS.primary },
        { id: "financiero", label: "💰 Financiero", color: COLORS.success },
        { id: "clientes", label: "👥 Clientes", color: COLORS.purple },
        { id: "empleados", label: "👷 Empleados", color: COLORS.warning },
        { id: "inventario", label: "📦 Inventario", color: COLORS.cyan },
        { id: "turnos", label: "🕐 Turnos", color: COLORS.danger },
    ];

    // ============================================================
    // FUNCIONES DE AYUDA
    // ============================================================

    const toISODate = (d) => d.toISOString().split("T")[0];
    const sumarDias = (fecha, dias) => {
        const d = new Date(fecha + "T00:00:00");
        d.setDate(d.getDate() + dias);
        return toISODate(d);
    };
    const diasEntre = (inicio, fin) => {
        const ms = new Date(fin + "T00:00:00") - new Date(inicio + "T00:00:00");
        return Math.max(1, Math.round(ms / 86400000) + 1);
    };
    const rangoAnterior = (inicio, fin) => {
        const dias = diasEntre(inicio, fin);
        return { inicio: sumarDias(inicio, -dias), fin: sumarDias(inicio, -1) };
    };
    const fechaDeItem = (item) => {
        const raw = item.createdAt || item.openedAt || item.fecha || item.date;
        if (!raw) return null;
        try { return new Date(raw).toISOString().split("T")[0]; } catch { return null; }
    };

    // ============================================================
    // CARGA DE DATOS
    // ============================================================

    const cargarDatosBase = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const [clientesData, empleadosData, turnosData, productosData, ventasData, bajoStockData] = await Promise.all([
                clientesService.listar().catch(() => []),
                empleadosService.listar().catch(() => []),
                turnoService.listarTodos().catch(() => []),
                productosService.listarProductos().catch(() => []),
                ventasService.ventasHoy().catch(() => []),
                productosService.listarProductosBajoStock().catch(() => []),
            ]);

            setClientes(Array.isArray(clientesData) ? clientesData : []);
            setEmpleados(Array.isArray(empleadosData) ? empleadosData : []);
            setTurnosTodos(Array.isArray(turnosData) ? turnosData : []);
            setProductos(Array.isArray(productosData) ? productosData : []);
            setVentasHoy(Array.isArray(ventasData) ? ventasData : []);
            setProductosBajoStock(Array.isArray(bajoStockData) ? bajoStockData : []);
            setUltimaActualizacion(new Date());
        } catch (err) {
            console.error("Error cargando datos:", err);
            setError("Error al cargar los datos. Reintenta.");
        } finally {
            setCargando(false);
        }
    }, []);

    const cargarDatosPeriodo = useCallback(async () => {
        setCargandoPeriodo(true);
        try {
            const ant = rangoAnterior(fechaInicio, fechaFin);

            const [actuales, anteriores] = await Promise.all([
                turnoService.obtenerPorRangoFechas(fechaInicio, fechaFin).catch(() => []),
                turnoService.obtenerPorRangoFechas(ant.inicio, ant.fin).catch(() => []),
            ]);

            const a = Array.isArray(actuales) ? actuales : [];
            const b = Array.isArray(anteriores) ? anteriores : [];

            const cerradosA = a.filter(t => t.cerrado || t.closed);
            const cerradosB = b.filter(t => t.cerrado || t.closed);

            const [ventasA, ventasB] = await Promise.all([
                Promise.all(cerradosA.map(t => ventasService.listarPorTurno(t.id).catch(() => []))),
                Promise.all(cerradosB.map(t => ventasService.listarPorTurno(t.id).catch(() => []))),
            ]);

            setTurnosPeriodo(a);
            setTurnosPeriodoAnterior(b);
            setVentasPeriodo(ventasA.flat().filter(Boolean));
            setVentasPeriodoAnterior(ventasB.flat().filter(Boolean));
        } catch (err) {
            console.error("Error cargando período:", err);
        } finally {
            setCargandoPeriodo(false);
        }
    }, [fechaInicio, fechaFin]);

    useEffect(() => { cargarDatosBase(); }, []);
    useEffect(() => { cargarDatosPeriodo(); }, [fechaInicio, fechaFin]);

    const actualizarTodo = () => { cargarDatosBase(); cargarDatosPeriodo(); };

    const aplicarRango = (tipo) => {
        const hoyStr = toISODate(hoy);
        if (tipo === "hoy") { setFechaInicio(hoyStr); setFechaFin(hoyStr); }
        else if (tipo === "7dias") { setFechaInicio(sumarDias(hoyStr, -6)); setFechaFin(hoyStr); }
        else if (tipo === "mes") { setFechaInicio(toISODate(primerDiaMes)); setFechaFin(hoyStr); }
        else if (tipo === "mesAnterior") {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
            const f = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
            setFechaInicio(toISODate(d));
            setFechaFin(toISODate(f));
        }
    };

    // ============================================================
    // PROCESAMIENTO DE DATOS
    // ============================================================

    const empleadosMap = useMemo(() => {
        const m = {};
        empleados.forEach(e => { m[e.id] = e.name || e.nombre || `#${e.id}`; });
        return m;
    }, [empleados]);

    // Resumen General
    const resumenGeneral = useMemo(() => {
        const c = clientes || [];
        const e = empleados || [];
        const t = turnosTodos || [];
        const v = ventasHoy || [];
        const p = productos || [];

        const ventasHoyTotal = v.reduce((s, i) => s + (i.total || i.monto || 0), 0);
        const turnosHoyCerrados = t.filter(i => (i.cerrado || i.closed) && fechaDeItem(i) === toISODate(hoy));
        const declaradoHoy = turnosHoyCerrados.reduce((s, i) => s + (i.declaredAmount || i.montoDeclarado || 0), 0);
        const activos = c.filter(i => i.active || i.activo || i.estado === "activo");
        const empleadosActivos = e.filter(i => i.active || i.activo);
        const stockTotal = p.reduce((s, i) => s + (i.stock || 0), 0);
        const valorInv = p.reduce((s, i) => s + ((i.stock || 0) * (i.salePrice || i.precio || 0)), 0);

        return {
            ingresosHoy: ventasHoyTotal + declaradoHoy,
            ventasHoy: ventasHoyTotal,
            declaradoHoy,
            totalClientes: c.length,
            clientesActivos: activos.length,
            totalEmpleados: e.length,
            empleadosActivos: empleadosActivos.length,
            totalProductos: p.length,
            totalTurnos: t.length,
            turnosAbiertos: t.filter(i => !(i.cerrado || i.closed)).length,
            stockTotal,
            valorInventario: valorInv,
        };
    }, [clientes, empleados, turnosTodos, ventasHoy, productos, hoy]);

    // Financiero
    const reporteFinanciero = useMemo(() => {
        const ca = turnosPeriodo.filter(t => t.cerrado || t.closed);
        const cb = turnosPeriodoAnterior.filter(t => t.cerrado || t.closed);

        const vA = ventasPeriodo.reduce((s, i) => s + (i.total || i.monto || 0), 0);
        const vB = ventasPeriodoAnterior.reduce((s, i) => s + (i.total || i.monto || 0), 0);
        const dA = ca.reduce((s, i) => s + (i.declaredAmount || i.montoDeclarado || 0), 0);
        const dB = cb.reduce((s, i) => s + (i.declaredAmount || i.montoDeclarado || 0), 0);

        return {
            ingresos: vA + dA,
            ingresosAnterior: vB + dB,
            ventas: vA,
            ventasAnterior: vB,
            declarado: dA,
            declaradoAnterior: dB,
            turnos: ca.length,
            turnosAnterior: cb.length,
            numVentas: ventasPeriodo.length,
            numVentasAnterior: ventasPeriodoAnterior.length,
            promedio: ca.length > 0 ? dA / ca.length : 0,
        };
    }, [turnosPeriodo, turnosPeriodoAnterior, ventasPeriodo, ventasPeriodoAnterior]);

    // Clientes
    const reporteClientes = useMemo(() => {
        const c = clientes || [];
        const activos = c.filter(i => i.active || i.activo || i.estado === "activo");
        const membresias = {};
        c.forEach(i => {
            const t = i.membershipType || i.tipoMembresia || i.plan || "No especificado";
            membresias[t] = (membresias[t] || 0) + 1;
        });
        const ultimos = [...c].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
        const ant = rangoAnterior(fechaInicio, fechaFin);
        const nuevos = c.filter(i => { const f = fechaDeItem(i); return f && f >= fechaInicio && f <= fechaFin; }).length;
        const nuevosAnt = c.filter(i => { const f = fechaDeItem(i); return f && f >= ant.inicio && f <= ant.fin; }).length;

        return {
            total: c.length,
            activos: activos.length,
            inactivos: c.length - activos.length,
            membresias,
            ultimos,
            nuevos,
            nuevosAnterior: nuevosAnt,
            tasaActividad: c.length > 0 ? (activos.length / c.length * 100) : 0,
        };
    }, [clientes, fechaInicio, fechaFin]);

    // Empleados
    const reporteEmpleados = useMemo(() => {
        const e = empleados || [];
        const activos = e.filter(i => i.active || i.activo);
        const porCargo = {};
        e.forEach(i => {
            const c = i.role || i.cargo || i.position || "Sin cargo";
            porCargo[c] = (porCargo[c] || 0) + 1;
        });
        const nomina = e.reduce((s, i) => s + (i.salary || i.salario || 0), 0);
        return {
            total: e.length,
            activos: activos.length,
            inactivos: e.length - activos.length,
            porCargo,
            nomina,
            promedio: activos.length > 0 ? nomina / activos.length : 0,
        };
    }, [empleados]);

    // Inventario
    const reporteInventario = useMemo(() => {
        const p = productos || [];
        let stock = 0, valor = 0, sinStock = 0;
        p.forEach(i => {
            stock += i.stock || 0;
            valor += (i.stock || 0) * (i.salePrice || i.precio || 0);
            if ((i.stock || 0) <= 0) sinStock++;
        });
        const porCategoria = {};
        p.forEach(i => {
            const c = i.category?.name || i.categoryName || i.categoria || "Sin categoría";
            porCategoria[c] = (porCategoria[c] || 0) + 1;
        });
        const criticos = (productosBajoStock.length > 0) ? productosBajoStock :
            p.filter(i => (i.stock || 0) <= (i.minimumStock || i.stockMinimo || 0)).sort((a, b) => (a.stock || 0) - (b.stock || 0));
        return {
            total: p.length,
            stock,
            valor,
            sinStock,
            stockBajo: criticos.length,
            porCategoria,
            criticos: criticos.slice(0, 8),
        };
    }, [productos, productosBajoStock]);

    // Turnos
    const reporteTurnos = useMemo(() => {
        const t = turnosPeriodo || [];
        const cerrados = t.filter(i => i.cerrado || i.closed);
        const declarado = cerrados.reduce((s, i) => s + (i.declaredAmount || i.montoDeclarado || 0), 0);
        const base = t.reduce((s, i) => s + (i.cashBase || i.baseCaja || 0), 0);
        const porTipo = {};
        t.forEach(i => {
            const tipo = i.type || i.tipo || i.shiftType || "No especificado";
            porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        });
        const detalle = [...t].sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0)).slice(0, 10);
        return {
            total: t.length,
            cerrados: cerrados.length,
            abiertos: t.length - cerrados.length,
            declarado,
            base,
            porTipo,
            detalle,
            tasaCierre: t.length > 0 ? (cerrados.length / t.length * 100) : 0,
        };
    }, [turnosPeriodo]);

    // Chart data
    const chartData = useMemo(() => {
        const dias = diasEntre(fechaInicio, fechaFin);
        const limite = Math.min(dias, 60);
        const mapa = {};
        for (let i = 0; i < limite; i++) {
            mapa[sumarDias(fechaInicio, i)] = 0;
        }
        turnosPeriodo.forEach(t => {
            if (t.cerrado || t.closed) {
                const f = fechaDeItem(t);
                if (f && mapa[f] !== undefined) mapa[f] += t.declaredAmount || t.montoDeclarado || 0;
            }
        });
        ventasPeriodo.forEach(v => {
            const f = fechaDeItem(v);
            if (f && mapa[f] !== undefined) mapa[f] += v.total || v.monto || 0;
        });
        return Object.entries(mapa).map(([fecha, valor]) => ({ label: fecha.slice(5), value: valor }));
    }, [turnosPeriodo, ventasPeriodo, fechaInicio, fechaFin]);

    // Top productos
    const topProductos = useMemo(() => {
        const conteo = {};
        ventasPeriodo.forEach(v => {
            const items = v.items || v.saleItems || v.detalles || [];
            (Array.isArray(items) ? items : []).forEach(item => {
                const pid = item.productId || item.product?.id || item.id;
                if (!pid) return;
                const prod = productos.find(p => p.id === pid);
                const nombre = prod?.name || prod?.nombre || item.productName || item.name || `#${pid}`;
                const cantidad = item.quantity || item.cantidad || 1;
                const precio = item.unitPrice || item.price || prod?.salePrice || prod?.precio || 0;
                if (!conteo[pid]) conteo[pid] = { nombre, cantidad: 0, ingresos: 0 };
                conteo[pid].cantidad += cantidad;
                conteo[pid].ingresos += cantidad * precio;
            });
        });
        return Object.values(conteo).sort((a, b) => b.ingresos - a.ingresos).slice(0, 6);
    }, [ventasPeriodo, productos]);

    // ============================================================
    // EXPORTACIONES
    // ============================================================

    const exportarPDF = () => {
        setGenerando(true);
        try {
            const doc = new jsPDF("landscape", "mm", "a4");
            const w = doc.internal.pageSize.getWidth();

            const header = (sub) => {
                doc.setFontSize(18);
                doc.setTextColor(30, 30, 30);
                doc.text("Reporte GymCore", 14, 16);
                doc.setFontSize(10);
                doc.setTextColor(120, 120, 120);
                doc.text(`Generado: ${formatDate(new Date().toISOString())}  ·  ${formatDate(fechaInicio)} a ${formatDate(fechaFin)}`, 14, 22);
                if (sub) { doc.setFontSize(13); doc.setTextColor(33, 33, 33); doc.text(sub, 14, 32); }
            };

            header("Resumen General");
            autoTable(doc, {
                startY: 36,
                head: [["Métrica", "Valor"]],
                body: [
                    ["Ingresos de hoy", COP(resumenGeneral.ingresosHoy)],
                    ["Ventas de hoy", COP(resumenGeneral.ventasHoy)],
                    ["Clientes totales", String(resumenGeneral.totalClientes)],
                    ["Clientes activos", String(resumenGeneral.clientesActivos)],
                    ["Empleados totales", String(resumenGeneral.totalEmpleados)],
                    ["Empleados activos", String(resumenGeneral.empleadosActivos)],
                    ["Productos", String(resumenGeneral.totalProductos)],
                    ["Valor inventario", COP(resumenGeneral.valorInventario)],
                    ["Turnos abiertos", String(resumenGeneral.turnosAbiertos)],
                ],
                theme: "striped",
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
                styles: { fontSize: 9 },
            });

            doc.addPage();
            header("Financiero");
            autoTable(doc, {
                startY: 36,
                head: [["Métrica", "Actual", "Anterior"]],
                body: [
                    ["Ingresos", COP(reporteFinanciero.ingresos), COP(reporteFinanciero.ingresosAnterior)],
                    ["Ventas", COP(reporteFinanciero.ventas), COP(reporteFinanciero.ventasAnterior)],
                    ["Declarado", COP(reporteFinanciero.declarado), COP(reporteFinanciero.declaradoAnterior)],
                    ["Turnos", String(reporteFinanciero.turnos), String(reporteFinanciero.turnosAnterior)],
                    ["Ventas (#)", String(reporteFinanciero.numVentas), String(reporteFinanciero.numVentasAnterior)],
                ],
                theme: "striped",
                headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
                styles: { fontSize: 9 },
            });

            if (topProductos.length > 0) {
                doc.addPage();
                header("Top Productos");
                autoTable(doc, {
                    startY: 36,
                    head: [["Producto", "Unidades", "Ingresos"]],
                    body: topProductos.map(p => [p.nombre, String(p.cantidad), COP(p.ingresos)]),
                    theme: "striped",
                    headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
                    styles: { fontSize: 9 },
                });
            }

            doc.save(`reporte_${new Date().toISOString().split("T")[0]}.pdf`);
            alert("✅ PDF generado");
        } catch (err) {
            console.error(err);
            alert("Error generando PDF: " + err.message);
        } finally { setGenerando(false); }
    };

    const exportarExcel = () => {
        setGenerando(true);
        try {
            const wb = XLSX.utils.book_new();

            const h1 = [["Métrica", "Valor"]];
            h1.push(["Ingresos de hoy", resumenGeneral.ingresosHoy]);
            h1.push(["Ventas de hoy", resumenGeneral.ventasHoy]);
            h1.push(["Clientes totales", resumenGeneral.totalClientes]);
            h1.push(["Clientes activos", resumenGeneral.clientesActivos]);
            h1.push(["Empleados totales", resumenGeneral.totalEmpleados]);
            h1.push(["Productos", resumenGeneral.totalProductos]);
            h1.push(["Valor inventario", resumenGeneral.valorInventario]);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(h1), "Resumen");

            const h2 = [["Métrica", "Actual", "Anterior"]];
            h2.push(["Ingresos", reporteFinanciero.ingresos, reporteFinanciero.ingresosAnterior]);
            h2.push(["Ventas", reporteFinanciero.ventas, reporteFinanciero.ventasAnterior]);
            h2.push(["Declarado", reporteFinanciero.declarado, reporteFinanciero.declaradoAnterior]);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(h2), "Financiero");

            const h3 = clientes.map(c => ({
                Nombre: c.name || c.nombre || `#${c.id}`,
                Estado: (c.active || c.activo || c.estado === "activo") ? "Activo" : "Inactivo",
                Membresía: c.membershipType || c.tipoMembresia || c.plan || "No especificado",
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h3), "Clientes");

            const h4 = empleados.map(e => ({
                Nombre: e.name || e.nombre || `#${e.id}`,
                Cargo: e.role || e.cargo || e.position || "Sin cargo",
                Estado: (e.active || e.activo) ? "Activo" : "Inactivo",
                Salario: e.salary || e.salario || 0,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h4), "Empleados");

            const h5 = productos.map(p => ({
                Producto: p.name || p.nombre || `#${p.id}`,
                Categoría: p.category?.name || p.categoryName || p.categoria || "Sin categoría",
                Stock: p.stock || 0,
                Precio: p.salePrice || p.precio || 0,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h5), "Inventario");

            XLSX.writeFile(wb, `reporte_${new Date().toISOString().split("T")[0]}.xlsx`);
            alert("✅ Excel generado");
        } catch (err) {
            console.error(err);
            alert("Error generando Excel: " + err.message);
        } finally { setGenerando(false); }
    };

    const exportarCSV = () => {
        setGenerando(true);
        try {
            const headers = ["Métrica", "Valor"];
            const rows = [
                ["Ingresos de hoy", resumenGeneral.ingresosHoy],
                ["Clientes totales", resumenGeneral.totalClientes],
                ["Clientes activos", resumenGeneral.clientesActivos],
                ["Empleados totales", resumenGeneral.totalEmpleados],
                ["Productos", resumenGeneral.totalProductos],
            ];
            let csv = headers.join(",") + "\n";
            rows.forEach(r => csv += r.join(",") + "\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `reporte_${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert("✅ CSV generado");
        } catch (err) {
            console.error(err);
            alert("Error generando CSV: " + err.message);
        } finally { setGenerando(false); }
    };

    const imprimir = () => window.print();

    // ============================================================
    // RENDER DE SECCIONES
    // ============================================================

    const renderResumen = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="💰" value={COP(resumenGeneral.ingresosHoy)} label="Ingresos de hoy" color={COLORS.primary} />
                <KpiCard icon="👥" value={resumenGeneral.totalClientes} label={`${resumenGeneral.clientesActivos} activos`} color={COLORS.purple} />
                <KpiCard icon="📦" value={resumenGeneral.totalProductos} label={`${resumenGeneral.stockTotal} unidades`} color={COLORS.cyan} />
                <KpiCard icon="🕐" value={resumenGeneral.turnosAbiertos} label="Turnos abiertos" color={COLORS.danger} />
            </div>

            <Card style={{ padding: "16px", marginBottom: "16px" }}>
                <SectionHeader icon="📈" title="Ingresos por día" subtitle={`${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`} />
                {cargandoPeriodo ? <EmptyState icon="⏳" text="Cargando..." /> :
                    chartData.some(d => d.value > 0) ? (
                        <div style={{ height: "120px" }}>
                            <svg viewBox="0 0 100 120" style={{ width: "100%", height: "100%" }}>
                                {chartData.map((d, i) => {
                                    const max = Math.max(...chartData.map(x => x.value), 1);
                                    const h = (d.value / max) * 100;
                                    const x = i * (100 / chartData.length);
                                    const w = Math.max(2, 80 / chartData.length);
                                    return <rect key={i} x={x} y={120 - 16 - h} width={w} height={Math.max(h, 1)} fill={COLORS.primary} rx={2} />;
                                })}
                                <line x1="0" y1={104} x2="100" y2={104} stroke={COLORS.grayBorder} strokeWidth={0.5} />
                            </svg>
                        </div>
                    ) : <EmptyState icon="📭" text="Sin ingresos en este período" />}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="👥" title="Clientes" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Total</span><span style={{ fontWeight: "bold" }}>{resumenGeneral.totalClientes}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Activos</span><span style={{ fontWeight: "bold", color: COLORS.success }}>{resumenGeneral.clientesActivos}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Inactivos</span><span style={{ fontWeight: "bold", color: COLORS.danger }}>{resumenGeneral.totalClientes - resumenGeneral.clientesActivos}</span>
                    </div>
                    <ProgressBar value={resumenGeneral.clientesActivos} max={resumenGeneral.totalClientes} label="Actividad" color={COLORS.success} />
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="👷" title="Empleados" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Total</span><span style={{ fontWeight: "bold" }}>{resumenGeneral.totalEmpleados}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Activos</span><span style={{ fontWeight: "bold", color: COLORS.success }}>{resumenGeneral.empleadosActivos}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Inactivos</span><span style={{ fontWeight: "bold", color: COLORS.danger }}>{resumenGeneral.totalEmpleados - resumenGeneral.empleadosActivos}</span>
                    </div>
                    <ProgressBar value={resumenGeneral.empleadosActivos} max={resumenGeneral.totalEmpleados} label="Actividad" color={COLORS.warning} />
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📦" title="Inventario" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Productos</span><span style={{ fontWeight: "bold" }}>{resumenGeneral.totalProductos}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Valor</span><span style={{ fontWeight: "bold", color: COLORS.primary }}>{COP(resumenGeneral.valorInventario)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Unidades</span><span style={{ fontWeight: "bold" }}>{resumenGeneral.stockTotal}</span>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderFinanciero = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="💰" value={COP(reporteFinanciero.ingresos)} label="Ingresos del período" color={COLORS.success} />
                <KpiCard icon="📦" value={COP(reporteFinanciero.ventas)} label="Ventas" color={COLORS.primary} />
                <KpiCard icon="🕐" value={COP(reporteFinanciero.declarado)} label="Turnos declarados" color={COLORS.purple} />
                <KpiCard icon="📊" value={reporteFinanciero.turnos} label="Turnos cerrados" color={COLORS.warning} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📈" title="Comparativa" subtitle="Actual vs período anterior" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Ingresos</span>
                        <span><strong>{COP(reporteFinanciero.ingresos)}</strong> <span style={{ color: reporteFinanciero.ingresos >= reporteFinanciero.ingresosAnterior ? COLORS.success : COLORS.danger }}>
                            {reporteFinanciero.ingresos >= reporteFinanciero.ingresosAnterior ? "▲" : "▼"}
                        </span></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Ventas</span>
                        <span><strong>{COP(reporteFinanciero.ventas)}</strong> <span style={{ color: reporteFinanciero.ventas >= reporteFinanciero.ventasAnterior ? COLORS.success : COLORS.danger }}>
                            {reporteFinanciero.ventas >= reporteFinanciero.ventasAnterior ? "▲" : "▼"}
                        </span></span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Declarado</span>
                        <span><strong>{COP(reporteFinanciero.declarado)}</strong> <span style={{ color: reporteFinanciero.declarado >= reporteFinanciero.declaradoAnterior ? COLORS.success : COLORS.danger }}>
                            {reporteFinanciero.declarado >= reporteFinanciero.declaradoAnterior ? "▲" : "▼"}
                        </span></span>
                    </div>
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="🏆" title="Top Productos" />
                    {topProductos.length > 0 ? topProductos.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                            <span>{i + 1}. {p.nombre}</span>
                            <span style={{ fontWeight: "600" }}>{p.cantidad}u · {COP(p.ingresos)}</span>
                        </div>
                    )) : <EmptyState icon="📭" text="Sin ventas de productos" />}
                </Card>
            </div>

            <Card style={{ padding: "16px" }}>
                <SectionHeader icon="📅" title="Resumen del período" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                    <StatCard title="Inicio" value={formatDate(fechaInicio)} />
                    <StatCard title="Fin" value={formatDate(fechaFin)} />
                    <StatCard title="Promedio por turno" value={COP(reporteFinanciero.promedio)} color={COLORS.primary} />
                    <StatCard title="Ventas totales" value={reporteFinanciero.numVentas} color={COLORS.success} />
                </div>
            </Card>
        </div>
    );

    const renderClientes = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="👥" value={reporteClientes.total} label="Total" color={COLORS.primary} />
                <KpiCard icon="✅" value={reporteClientes.activos} label="Activos" color={COLORS.success} />
                <KpiCard icon="🆕" value={reporteClientes.nuevos} label={`Nuevos (${reporteClientes.nuevosAnterior} ant)`} color={COLORS.purple} />
                <KpiCard icon="📊" value={`${reporteClientes.tasaActividad.toFixed(1)}%`} label="Actividad" color={COLORS.warning} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📋" title="Membresías" />
                    {Object.entries(reporteClientes.membresias).map(([t, c]) => (
                        <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <span>{t}</span><span style={{ fontWeight: "bold" }}>{c}</span>
                        </div>
                    ))}
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="🆕" title="Últimos clientes" />
                    {reporteClientes.ultimos.map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                            <span>{c.name || c.nombre || `#${c.id}`}</span>
                            <span style={{ fontSize: "12px", color: COLORS.gray }}>{formatDate(c.createdAt || c.fechaIngreso)}</span>
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );

    const renderEmpleados = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="👷" value={reporteEmpleados.total} label="Total" color={COLORS.primary} />
                <KpiCard icon="✅" value={reporteEmpleados.activos} label="Activos" color={COLORS.success} />
                <KpiCard icon="💰" value={COP(reporteEmpleados.nomina)} label="Nómina" color={COLORS.warning} />
                <KpiCard icon="📊" value={COP(reporteEmpleados.promedio)} label="Promedio" color={COLORS.purple} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📋" title="Por cargo" />
                    {Object.entries(reporteEmpleados.porCargo).map(([c, v]) => (
                        <div key={c} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <span>{c}</span><span style={{ fontWeight: "bold" }}>{v}</span>
                        </div>
                    ))}
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="💰" title="Nómina" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: "16px" }}>
                        <span>Total</span><span style={{ fontWeight: "bold", color: COLORS.success }}>{COP(reporteEmpleados.nomina)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                        <span>Promedio</span><span style={{ fontWeight: "bold" }}>{COP(reporteEmpleados.promedio)}</span>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderInventario = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="📦" value={reporteInventario.total} label="Productos" color={COLORS.primary} />
                <KpiCard icon="📊" value={reporteInventario.stock} label="Unidades" color={COLORS.success} />
                <KpiCard icon="⚠️" value={reporteInventario.stockBajo} label="Stock crítico" color={COLORS.danger} />
                <KpiCard icon="💰" value={COP(reporteInventario.valor)} label="Valor" color={COLORS.purple} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📋" title="Por categoría" />
                    {Object.entries(reporteInventario.porCategoria).map(([c, v]) => (
                        <div key={c} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <span>{c}</span><span style={{ fontWeight: "bold" }}>{v}</span>
                        </div>
                    ))}
                </Card>

                <Card style={{ padding: "16px", border: reporteInventario.criticos.length ? `1px solid ${COLORS.danger}` : undefined }}>
                    <SectionHeader icon="⚠️" title="Stock crítico" />
                    {reporteInventario.criticos.length > 0 ? reporteInventario.criticos.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}>
                            <span>{p.name || p.nombre || `#${p.id}`}</span>
                            <span style={{ fontWeight: "bold", color: COLORS.danger }}>Stock: {p.stock || 0}</span>
                        </div>
                    )) : <EmptyState icon="✅" text="Todo en orden" />}
                </Card>
            </div>
        </div>
    );

    const renderTurnos = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <KpiCard icon="🕐" value={reporteTurnos.total} label="Total turnos" color={COLORS.primary} />
                <KpiCard icon="✅" value={reporteTurnos.cerrados} label="Cerrados" color={COLORS.success} />
                <KpiCard icon="🟡" value={reporteTurnos.abiertos} label="Abiertos" color={COLORS.warning} />
                <KpiCard icon="📊" value={`${reporteTurnos.tasaCierre.toFixed(1)}%`} label="Tasa de cierre" color={COLORS.purple} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="📋" title="Tipos de turno" />
                    {Object.entries(reporteTurnos.porTipo).map(([t, c]) => (
                        <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <span>{t.replace("_", " ")}</span><span style={{ fontWeight: "bold" }}>{c}</span>
                        </div>
                    ))}
                </Card>

                <Card style={{ padding: "16px" }}>
                    <SectionHeader icon="💰" title="Resumen" />
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Declarado</span><span style={{ fontWeight: "bold", color: COLORS.success }}>{COP(reporteTurnos.declarado)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span>Base</span><span style={{ fontWeight: "bold" }}>{COP(reporteTurnos.base)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Diferencia</span>
                        <span style={{ fontWeight: "bold", color: reporteTurnos.declarado - reporteTurnos.base >= 0 ? COLORS.success : COLORS.danger }}>
                            {reporteTurnos.declarado - reporteTurnos.base > 0 ? "+" : ""}{COP(reporteTurnos.declarado - reporteTurnos.base)}
                        </span>
                    </div>
                    <ProgressBar value={reporteTurnos.cerrados} max={reporteTurnos.total} label="Cierre" color={COLORS.success} />
                </Card>
            </div>

            <Card style={{ padding: "16px" }}>
                <SectionHeader icon="🧾" title="Últimos turnos" />
                {reporteTurnos.detalle.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead><tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ padding: "6px 8px" }}>Fecha</th><th style={{ padding: "6px 8px" }}>Empleado</th>
                                <th style={{ padding: "6px 8px" }}>Tipo</th><th style={{ padding: "6px 8px" }}>Declarado</th>
                                <th style={{ padding: "6px 8px" }}>Estado</th>
                            </tr></thead>
                            <tbody>
                                {reporteTurnos.detalle.map((t, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                        <td style={{ padding: "6px 8px" }}>{formatDate(t.openedAt || t.createdAt || t.fecha)}</td>
                                        <td style={{ padding: "6px 8px" }}>{empleadosMap[t.employeeId || t.receptionistId] || `#${t.employeeId || ""}`}</td>
                                        <td style={{ padding: "6px 8px" }}>{t.type || t.tipo || "-"}</td>
                                        <td style={{ padding: "6px 8px" }}>{COP(t.declaredAmount || t.montoDeclarado || 0)}</td>
                                        <td style={{ padding: "6px 8px" }}>
                                            <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600",
                                                background: (t.cerrado || t.closed) ? COLORS.successLight : COLORS.warningLight,
                                                color: (t.cerrado || t.closed) ? COLORS.success : COLORS.warning }}>
                                                {t.cerrado || t.closed ? "Cerrado" : "Abierto"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <EmptyState text="No hay turnos en este período" />}
            </Card>
        </div>
    );

    // ============================================================
    // RENDER PRINCIPAL
    // ============================================================

    if (cargando) {
        return (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid #f3f4f6", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
                <p style={{ color: "#6b7280" }}>Cargando reportes...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                <p style={{ color: "#ef4444" }}>{error}</p>
                <Button onClick={actualizarTodo} style={{ marginTop: "16px" }}>Reintentar</Button>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "2px solid #e5e7eb" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "22px", color: "#111827" }}>📊 Reportes Ejecutivos</h2>
                    <p style={{ color: "#6b7280", fontSize: "13px", margin: "2px 0 0" }}>
                        Actualizado: {ultimaActualizacion.toLocaleTimeString("es-CO")}
                        <button onClick={actualizarTodo} style={{ border: "none", background: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600", marginLeft: "8px" }}>
                            ↻ Actualizar
                        </button>
                    </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {[["hoy", "Hoy"], ["7dias", "7 días"], ["mes", "Este mes"], ["mesAnterior", "Mes ant."]].map(([id, label]) => (
                        <button key={id} onClick={() => aplicarRango(id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", color: "#6b7280" }}>
                            {label}
                        </button>
                    ))}
                    <input type="date" value={fechaInicio} max={fechaFin} onChange={e => setFechaInicio(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                    <input type="date" value={fechaFin} min={fechaInicio} max={new Date().toISOString().split("T")[0]} onChange={e => setFechaFin(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                    <Button variant="primary" onClick={exportarPDF} disabled={generando} style={{ fontSize: "12px", padding: "6px 12px" }}>📄 PDF</Button>
                    <Button variant="success" onClick={exportarExcel} disabled={generando} style={{ fontSize: "12px", padding: "6px 12px" }}>📊 Excel</Button>
                    <Button variant="secondary" onClick={exportarCSV} disabled={generando} style={{ fontSize: "12px", padding: "6px 12px" }}>📋 CSV</Button>
                    <Button variant="secondary" onClick={imprimir} style={{ fontSize: "12px", padding: "6px 12px" }}>🖨️</Button>
                </div>
            </div>

            {/* Body */}
            <div style={{ display: "flex", gap: "16px", flex: 1, overflow: "hidden" }}>
                {/* Sidebar */}
                <aside style={{ width: "160px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {tiposReporte.map(rep => {
                        const active = reporteActivo === rep.id;
                        return (
                            <button key={rep.id} onClick={() => setReporteActivo(rep.id)} style={{
                                display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px",
                                border: "none", background: active ? rep.color : "transparent", color: active ? "white" : "#6b7280",
                                cursor: "pointer", fontSize: "13px", fontWeight: active ? "600" : "500", transition: "all 0.15s"
                            }}>
                                <span>{rep.label}</span>
                            </button>
                        );
                    })}
                    {cargandoPeriodo && <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px 12px" }}>⏳ Cargando...</div>}
                </aside>

                {/* Content */}
                <main style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                    {reporteActivo === "resumen" && renderResumen()}
                    {reporteActivo === "financiero" && renderFinanciero()}
                    {reporteActivo === "clientes" && renderClientes()}
                    {reporteActivo === "empleados" && renderEmpleados()}
                    {reporteActivo === "inventario" && renderInventario()}
                    {reporteActivo === "turnos" && renderTurnos()}
                </main>
            </div>
        </div>
    );
}