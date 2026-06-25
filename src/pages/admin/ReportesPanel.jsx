// ============================================
// REPORTES PANEL - Generación de reportes
// ============================================
import { useState, useMemo } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { clientes } from "../../mock/clientes";
import { empleados, turnos } from "../../mock/empleados";
import { ingresosMensualidades, ingresosProductos, egresos } from "../../mock/finanzas";
import { COP, formatDate, formatDateShort } from "../../utils/formatters";

export default function ReportesPanel() {
    const [reporteActivo, setReporteActivo] = useState("resumen");
    const [fechaInicio, setFechaInicio] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
    );
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split("T")[0]);
    const [generando, setGenerando] = useState(false);

    const tiposReporte = [
        { id: "resumen", label: "📊 Resumen General", icon: "📊" },
        { id: "financiero", label: "💰 Financiero", icon: "💰" },
        { id: "clientes", label: "👥 Clientes", icon: "👥" },
        { id: "empleados", label: "👷 Empleados", icon: "👷" },
        { id: "inventario", label: "📦 Inventario", icon: "📦" },
        { id: "turnos", label: "🕐 Turnos", icon: "🕐" },
    ];

    // ===== DATOS PARA REPORTES =====
    
    // Resumen general
    const resumenGeneral = useMemo(() => {
        const mem = ingresosMensualidades.reduce((a, i) => a + i.monto, 0);
        const prod = ingresosProductos.reduce((a, i) => a + i.total, 0);
        const egresosTotal = egresos.reduce((a, e) => a + e.monto, 0);
        
        return {
            totalIngresos: mem + prod,
            totalEgresos: egresosTotal,
            utilidad: (mem + prod) - egresosTotal,
            totalClientes: clientes.length,
            clientesActivos: clientes.filter(c => c.estado === "activo").length,
            totalEmpleados: empleados.filter(e => e.activo).length,
            totalProductos: 32, // Mock
            totalTurnos: turnos.length,
            turnosCerrados: turnos.filter(t => t.cerrado).length,
        };
    }, []);

    // Reporte financiero
    const reporteFinanciero = useMemo(() => {
        const mesActual = new Date().toISOString().split("T")[0].slice(0, 7);
        
        const ingresosMensual = ingresosMensualidades
            .filter(i => i.fecha.startsWith(mesActual))
            .reduce((a, i) => a + i.monto, 0);
        
        const ingresosProductosMes = ingresosProductos
            .filter(i => i.fecha.startsWith(mesActual))
            .reduce((a, i) => a + i.total, 0);
        
        const egresosMes = egresos
            .filter(e => e.fecha.startsWith(mesActual))
            .reduce((a, e) => a + e.monto, 0);
        
        const nominaMes = egresos
            .filter(e => e.fecha.startsWith(mesActual) && e.categoria === "Nomina")
            .reduce((a, e) => a + e.monto, 0);
        
        return {
            ingresosMensual: ingresosMensual + ingresosProductosMes,
            ingresosMembresias: ingresosMensual,
            ingresosProductos: ingresosProductosMes,
            egresos: egresosMes,
            nomina: nominaMes,
            utilidad: (ingresosMensual + ingresosProductosMes) - egresosMes,
            margen: ((ingresosMensual + ingresosProductosMes) - egresosMes) / (ingresosMensual + ingresosProductosMes || 1) * 100,
        };
    }, []);

    // Reporte de clientes
    const reporteClientes = useMemo(() => {
        const activos = clientes.filter(c => c.estado === "activo");
        const inactivos = clientes.filter(c => c.estado === "inactivo");
        const conEntrenador = clientes.filter(c => c.entrenador && c.entrenador !== "No asignado");
        
        const membresias = {
            "30 días": clientes.filter(c => c.mensualidad?.tipo === "30 días").length,
            "15 días": clientes.filter(c => c.mensualidad?.tipo === "15 días").length,
            "Trimestral": clientes.filter(c => c.mensualidad?.tipo === "Trimestral").length,
            "Semestral": clientes.filter(c => c.mensualidad?.tipo === "Semestral").length,
            "Anual": clientes.filter(c => c.mensualidad?.tipo === "Anual").length,
        };
        
        const clientesPorEntrenador = {};
        empleados.filter(e => e.cargo === "Entrenador").forEach(e => {
            clientesPorEntrenador[e.nombre] = clientes.filter(c => c.entrenador === e.nombre).length;
        });
        
        return {
            total: clientes.length,
            activos: activos.length,
            inactivos: inactivos.length,
            conEntrenador: conEntrenador.length,
            sinEntrenador: clientes.length - conEntrenador.length,
            membresias,
            clientesPorEntrenador,
        };
    }, []);

    // Reporte de empleados
    const reporteEmpleados = useMemo(() => {
        const activos = empleados.filter(e => e.activo);
        const inactivos = empleados.filter(e => !e.activo);
        
        const porCargo = {
            Entrenador: empleados.filter(e => e.cargo === "Entrenador").length,
            Recepcionista: empleados.filter(e => e.cargo === "Recepcionista").length,
        };
        
        const nominaTotal = empleados.filter(e => e.activo).reduce((a, e) => a + e.salario, 0);
        const nominaEntrenadores = empleados.filter(e => e.activo && e.cargo === "Entrenador").reduce((a, e) => a + e.salario, 0);
        const nominaRecepcionistas = empleados.filter(e => e.activo && e.cargo === "Recepcionista").reduce((a, e) => a + e.salario, 0);
        
        return {
            total: empleados.length,
            activos: activos.length,
            inactivos: inactivos.length,
            porCargo,
            nominaTotal,
            nominaEntrenadores,
            nominaRecepcionistas,
            promedioSalario: activos.length > 0 ? nominaTotal / activos.length : 0,
        };
    }, []);

    // Reporte de turnos
    const reporteTurnos = useMemo(() => {
        const cerrados = turnos.filter(t => t.cerrado);
        const abiertos = turnos.filter(t => !t.cerrado);
        
        const totalDeclarado = cerrados.reduce((a, t) => a + t.montoDeclarado, 0);
        const totalCalculado = cerrados.reduce((a, t) => a + t.montoCalculado, 0);
        const totalDiferencia = cerrados.reduce((a, t) => a + t.diferencia, 0);
        
        const porTipo = {
            COMPLETO: turnos.filter(t => t.tipo === "COMPLETO").length,
            MEDIO: turnos.filter(t => t.tipo === "MEDIO").length,
            HORAS: turnos.filter(t => t.tipo === "HORAS").length,
        };
        
        return {
            total: turnos.length,
            cerrados: cerrados.length,
            abiertos: abiertos.length,
            totalDeclarado,
            totalCalculado,
            totalDiferencia,
            porTipo,
        };
    }, []);

    // ===== FUNCIONES DE EXPORTACIÓN =====
    const exportarPDF = () => {
        setGenerando(true);
        setTimeout(() => {
            alert("📄 Reporte generado en PDF exitosamente");
            setGenerando(false);
        }, 1500);
    };

    const exportarExcel = () => {
        setGenerando(true);
        setTimeout(() => {
            alert("📊 Reporte exportado a Excel exitosamente");
            setGenerando(false);
        }, 1500);
    };

    const exportarCSV = () => {
        setGenerando(true);
        setTimeout(() => {
            alert("📋 Reporte exportado a CSV exitosamente");
            setGenerando(false);
        }, 1500);
    };

    const imprimir = () => {
        window.print();
    };

    // ===== RENDER DE SECCIONES =====
    const renderResumen = () => (
        <div className="reporte-resumen">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-blue">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(resumenGeneral.totalIngresos)}</span>
                        <span className="stat-label">Ingresos Totales</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-red">
                    <span className="stat-icon">📉</span>
                    <div>
                        <span className="stat-number">{COP(resumenGeneral.totalEgresos)}</span>
                        <span className="stat-label">Egresos Totales</span>
                    </div>
                </div>
                <div className={`reporte-stat-card ${resumenGeneral.utilidad >= 0 ? "stat-green" : "stat-red"}`}>
                    <span className="stat-icon">📈</span>
                    <div>
                        <span className="stat-number">{COP(resumenGeneral.utilidad)}</span>
                        <span className="stat-label">Utilidad Neta</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">📊</span>
                    <div>
                        <span className="stat-number">{((resumenGeneral.utilidad / (resumenGeneral.totalIngresos || 1)) * 100).toFixed(1)}%</span>
                        <span className="stat-label">Margen de Utilidad</span>
                    </div>
                </div>
            </div>

            <div className="reporte-grid">
                <div className="reporte-card">
                    <h4>👥 Clientes</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Total</span>
                            <span className="data-value">{resumenGeneral.totalClientes}</span>
                        </div>
                        <div className="data-item">
                            <span>Activos</span>
                            <span className="data-value text-green">{resumenGeneral.clientesActivos}</span>
                        </div>
                        <div className="data-item">
                            <span>Inactivos</span>
                            <span className="data-value text-red">{resumenGeneral.totalClientes - resumenGeneral.clientesActivos}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>👷 Empleados</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Total</span>
                            <span className="data-value">{resumenGeneral.totalEmpleados}</span>
                        </div>
                        <div className="data-item">
                            <span>Turnos registrados</span>
                            <span className="data-value">{resumenGeneral.totalTurnos}</span>
                        </div>
                        <div className="data-item">
                            <span>Turnos cerrados</span>
                            <span className="data-value text-green">{resumenGeneral.turnosCerrados}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>📦 Inventario</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Productos</span>
                            <span className="data-value">{resumenGeneral.totalProductos}</span>
                        </div>
                        <div className="data-item">
                            <span>Valor estimado</span>
                            <span className="data-value">{COP(12500000)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFinanciero = () => (
        <div className="reporte-financiero">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-green">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(reporteFinanciero.ingresosMensual)}</span>
                        <span className="stat-label">Ingresos del Mes</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-red">
                    <span className="stat-icon">📉</span>
                    <div>
                        <span className="stat-number">{COP(reporteFinanciero.egresos)}</span>
                        <span className="stat-label">Egresos del Mes</span>
                    </div>
                </div>
                <div className={`reporte-stat-card ${reporteFinanciero.utilidad >= 0 ? "stat-green" : "stat-red"}`}>
                    <span className="stat-icon">📈</span>
                    <div>
                        <span className="stat-number">{COP(reporteFinanciero.utilidad)}</span>
                        <span className="stat-label">Utilidad del Mes</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">📊</span>
                    <div>
                        <span className="stat-number">{reporteFinanciero.margen.toFixed(1)}%</span>
                        <span className="stat-label">Margen del Mes</span>
                    </div>
                </div>
            </div>

            <div className="reporte-grid-2">
                <div className="reporte-card">
                    <h4>💰 Desglose de Ingresos</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Membresías</span>
                            <span className="data-value">{COP(reporteFinanciero.ingresosMembresias)}</span>
                        </div>
                        <div className="data-item">
                            <span>Productos</span>
                            <span className="data-value">{COP(reporteFinanciero.ingresosProductos)}</span>
                        </div>
                        <div className="data-item total">
                            <span>Total Ingresos</span>
                            <span className="data-value text-green">{COP(reporteFinanciero.ingresosMensual)}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>📉 Desglose de Egresos</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Nómina</span>
                            <span className="data-value">{COP(reporteFinanciero.nomina)}</span>
                        </div>
                        <div className="data-item">
                            <span>Otros gastos</span>
                            <span className="data-value">{COP(reporteFinanciero.egresos - reporteFinanciero.nomina)}</span>
                        </div>
                        <div className="data-item total">
                            <span>Total Egresos</span>
                            <span className="data-value text-red">{COP(reporteFinanciero.egresos)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderClientes = () => (
        <div className="reporte-clientes">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-blue">
                    <span className="stat-icon">👥</span>
                    <div>
                        <span className="stat-number">{reporteClientes.total}</span>
                        <span className="stat-label">Total Clientes</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-green">
                    <span className="stat-icon">✅</span>
                    <div>
                        <span className="stat-number">{reporteClientes.activos}</span>
                        <span className="stat-label">Activos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-red">
                    <span className="stat-icon">❌</span>
                    <div>
                        <span className="stat-number">{reporteClientes.inactivos}</span>
                        <span className="stat-label">Inactivos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">🏋️</span>
                    <div>
                        <span className="stat-number">{reporteClientes.conEntrenador}</span>
                        <span className="stat-label">Con Entrenador</span>
                    </div>
                </div>
            </div>

            <div className="reporte-grid-2">
                <div className="reporte-card">
                    <h4>📋 Membresías</h4>
                    <div className="reporte-data">
                        {Object.entries(reporteClientes.membresias).map(([tipo, cantidad]) => (
                            <div key={tipo} className="data-item">
                                <span>{tipo}</span>
                                <span className="data-value">{cantidad}</span>
                            </div>
                        ))}
                        <div className="data-item total">
                            <span>Total</span>
                            <span className="data-value">{reporteClientes.total}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>🏋️ Clientes por Entrenador</h4>
                    <div className="reporte-data">
                        {Object.entries(reporteClientes.clientesPorEntrenador).map(([nombre, cantidad]) => (
                            <div key={nombre} className="data-item">
                                <span>{nombre}</span>
                                <span className="data-value">{cantidad}</span>
                            </div>
                        ))}
                        {Object.keys(reporteClientes.clientesPorEntrenador).length === 0 && (
                            <div className="data-item">
                                <span>Sin entrenadores asignados</span>
                            </div>
                        )}
                        <div className="data-item total">
                            <span>Sin entrenador</span>
                            <span className="data-value text-red">{reporteClientes.sinEntrenador}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEmpleados = () => (
        <div className="reporte-empleados">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-blue">
                    <span className="stat-icon">👷</span>
                    <div>
                        <span className="stat-number">{reporteEmpleados.total}</span>
                        <span className="stat-label">Total Empleados</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-green">
                    <span className="stat-icon">✅</span>
                    <div>
                        <span className="stat-number">{reporteEmpleados.activos}</span>
                        <span className="stat-label">Activos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-red">
                    <span className="stat-icon">❌</span>
                    <div>
                        <span className="stat-number">{reporteEmpleados.inactivos}</span>
                        <span className="stat-label">Inactivos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(reporteEmpleados.nominaTotal)}</span>
                        <span className="stat-label">Nómina Mensual</span>
                    </div>
                </div>
            </div>

            <div className="reporte-grid-2">
                <div className="reporte-card">
                    <h4>📋 Distribución por Cargo</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>🏋️ Entrenadores</span>
                            <span className="data-value">{reporteEmpleados.porCargo.Entrenador}</span>
                        </div>
                        <div className="data-item">
                            <span>📋 Recepcionistas</span>
                            <span className="data-value">{reporteEmpleados.porCargo.Recepcionista}</span>
                        </div>
                        <div className="data-item total">
                            <span>Total</span>
                            <span className="data-value">{reporteEmpleados.total}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>💰 Distribución de Nómina</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>🏋️ Entrenadores</span>
                            <span className="data-value">{COP(reporteEmpleados.nominaEntrenadores)}</span>
                        </div>
                        <div className="data-item">
                            <span>📋 Recepcionistas</span>
                            <span className="data-value">{COP(reporteEmpleados.nominaRecepcionistas)}</span>
                        </div>
                        <div className="data-item total">
                            <span>Total</span>
                            <span className="data-value text-green">{COP(reporteEmpleados.nominaTotal)}</span>
                        </div>
                        <div className="data-item">
                            <span>Salario promedio</span>
                            <span className="data-value">{COP(reporteEmpleados.promedioSalario)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInventario = () => (
        <div className="reporte-inventario">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-blue">
                    <span className="stat-icon">📦</span>
                    <div>
                        <span className="stat-number">32</span>
                        <span className="stat-label">Productos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-green">
                    <span className="stat-icon">📊</span>
                    <div>
                        <span className="stat-number">742</span>
                        <span className="stat-label">Unidades en Stock</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-red">
                    <span className="stat-icon">⚠️</span>
                    <div>
                        <span className="stat-number">3</span>
                        <span className="stat-label">Productos con Stock Bajo</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(12500000)}</span>
                        <span className="stat-label">Valor del Inventario</span>
                    </div>
                </div>
            </div>

            <div className="reporte-card">
                <h4>📋 Productos por Categoría</h4>
                <div className="reporte-data">
                    <div className="data-item">
                        <span>Suplementos</span>
                        <span className="data-value">8</span>
                    </div>
                    <div className="data-item">
                        <span>Bebidas</span>
                        <span className="data-value">6</span>
                    </div>
                    <div className="data-item">
                        <span>Snacks Fitness</span>
                        <span className="data-value">4</span>
                    </div>
                    <div className="data-item">
                        <span>Accesorios</span>
                        <span className="data-value">6</span>
                    </div>
                    <div className="data-item">
                        <span>Ropa Deportiva</span>
                        <span className="data-value">4</span>
                    </div>
                    <div className="data-item">
                        <span>Cuidado Personal</span>
                        <span className="data-value">4</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTurnos = () => (
        <div className="reporte-turnos">
            <div className="reporte-stats-grid">
                <div className="reporte-stat-card stat-blue">
                    <span className="stat-icon">🕐</span>
                    <div>
                        <span className="stat-number">{reporteTurnos.total}</span>
                        <span className="stat-label">Total Turnos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-green">
                    <span className="stat-icon">✅</span>
                    <div>
                        <span className="stat-number">{reporteTurnos.cerrados}</span>
                        <span className="stat-label">Cerrados</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-yellow">
                    <span className="stat-icon">🟡</span>
                    <div>
                        <span className="stat-number">{reporteTurnos.abiertos}</span>
                        <span className="stat-label">Abiertos</span>
                    </div>
                </div>
                <div className="reporte-stat-card stat-purple">
                    <span className="stat-icon">💰</span>
                    <div>
                        <span className="stat-number">{COP(reporteTurnos.totalDeclarado)}</span>
                        <span className="stat-label">Total Declarado</span>
                    </div>
                </div>
            </div>

            <div className="reporte-grid-2">
                <div className="reporte-card">
                    <h4>📋 Turnos por Tipo</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Turno Completo</span>
                            <span className="data-value">{reporteTurnos.porTipo.COMPLETO}</span>
                        </div>
                        <div className="data-item">
                            <span>Medio Turno</span>
                            <span className="data-value">{reporteTurnos.porTipo.MEDIO}</span>
                        </div>
                        <div className="data-item">
                            <span>Por Horas</span>
                            <span className="data-value">{reporteTurnos.porTipo.HORAS}</span>
                        </div>
                        <div className="data-item total">
                            <span>Total</span>
                            <span className="data-value">{reporteTurnos.total}</span>
                        </div>
                    </div>
                </div>

                <div className="reporte-card">
                    <h4>💰 Resumen Financiero de Turnos</h4>
                    <div className="reporte-data">
                        <div className="data-item">
                            <span>Total Declarado</span>
                            <span className="data-value text-green">{COP(reporteTurnos.totalDeclarado)}</span>
                        </div>
                        <div className="data-item">
                            <span>Total Calculado</span>
                            <span className="data-value">{COP(reporteTurnos.totalCalculado)}</span>
                        </div>
                        <div className="data-item">
                            <span>Diferencia</span>
                            <span className={`data-value ${reporteTurnos.totalDiferencia >= 0 ? "text-green" : "text-red"}`}>
                                {reporteTurnos.totalDiferencia > 0 ? "+" : ""}{COP(reporteTurnos.totalDiferencia)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContenido = () => {
        switch (reporteActivo) {
            case "resumen": return renderResumen();
            case "financiero": return renderFinanciero();
            case "clientes": return renderClientes();
            case "empleados": return renderEmpleados();
            case "inventario": return renderInventario();
            case "turnos": return renderTurnos();
            default: return null;
        }
    };

    return (
        <div className="reportes-container">
            <div className="reportes-header">
                <h2>📋 Reportes y Estadísticas</h2>
                <div className="reportes-actions">
                    <div className="reportes-fechas">
                        <label>
                            <span>Desde</span>
                            <input 
                                type="date" 
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Hasta</span>
                            <input 
                                type="date" 
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </label>
                    </div>
                    <Button variant="primary" onClick={exportarPDF} disabled={generando}>
                        📄 PDF
                    </Button>
                    <Button variant="success" onClick={exportarExcel} disabled={generando}>
                        📊 Excel
                    </Button>
                    <Button variant="secondary" onClick={imprimir}>
                        🖨️ Imprimir
                    </Button>
                </div>
            </div>

            <div className="reportes-body">
                {/* Sidebar de tipos de reporte */}
                <aside className="reportes-sidebar">
                    {tiposReporte.map(rep => (
                        <button
                            key={rep.id}
                            className={`reporte-sidebar-btn ${reporteActivo === rep.id ? "active" : ""}`}
                            onClick={() => setReporteActivo(rep.id)}
                        >
                            <span className="reporte-sidebar-icon">{rep.icon}</span>
                            <span className="reporte-sidebar-label">{rep.label}</span>
                        </button>
                    ))}
                </aside>

                {/* Contenido del reporte */}
                <main className="reportes-main">
                    <Card className="reportes-card">
                        <div className="reportes-content">
                            {renderContenido()}
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
}