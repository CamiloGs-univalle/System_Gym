// ============================================
// FINANZAS PANEL - Contabilidad real con backend
// - Reporte financiero del mes (ingresos, reserva nómina, egresos, neta)
// - Distribución de los ingresos (nómina, mercancía, gastos, utilidad)
// - Nómina (algoritmo de ahorro diario)
// - Movimientos (egresos reales + ingresos de mercancía)
// ============================================
import { useState, useMemo, useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { COP, formatDate, formatCurrencyInput, fechaLocalISO } from "../../utils/formatters";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import ingresoService from "../../services/ingresoService";
import finanzasService from "../../services/finanzasService";
import { historialNominaService } from "../../services/nomina/nominaEngine";
import useAuthStore from "../../store/authStore";
import VentasAnulables from "../../components/admin/VentasAnulables";


const diasHastaFecha = (fechaStr) => {
    if (!fechaStr) return 0;
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    return Math.ceil((fecha - ahora) / (1000 * 60 * 60 * 24));
};

const extraer = (r, fallback = {}) => {
    if (!r) return fallback;
    if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) return r.data;
    return r;
};

export default function FinanzasPanel() {
    // Se calcula en cada render: si la app queda abierta pasada la medianoche, cambia de día/mes
    const mesActual = fechaLocalISO().slice(0, 7);
    const [seccion, setSeccion] = useState("resumen");
    const [clientes, setClientes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [intakes, setIntakes] = useState([]);
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [modalEgreso, setModalEgreso] = useState(false);
    const [formEgreso, setFormEgreso] = useState({
        concepto: "",
        monto: "",
        categoria: "Servicios",
        fecha: fechaLocalISO(),
    });

    const usuario = useAuthStore((state) => state.usuario);

    // Cargar datos
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [reporteR, egresosR, intakesR] = await Promise.all([
                finanzasService.reporteMes().catch(() => null),
                ingresoService.listarEgresos().catch(() => []),
                ingresoService.listarIngresos().catch(() => []),
            ]);
            setReporte(extraer(reporteR));
            setEgresos(Array.isArray(egresosR) ? egresosR : []);
            setIntakes(Array.isArray(intakesR) ? intakesR : []);

            try {
                const clientesData = await clientesService.listar();
                setClientes(clientesData);
            } catch (e) { /* sin acceso */ }

            try {
                const empleadosData = await empleadosService.listar();
                setEmpleados(empleadosData);
            } catch (e) { /* sin acceso */ }
        } catch (error) {
            console.error("❌ Error cargando datos financieros:", error);
        } finally {
            setCargando(false);
        }
    };

    const cargarMovimientos = async () => {
        try {
            const [egresosR, intakesR] = await Promise.all([
                ingresoService.listarEgresos(),
                ingresoService.listarIngresos(),
            ]);
            setEgresos(Array.isArray(egresosR) ? egresosR : []);
            setIntakes(Array.isArray(intakesR) ? intakesR : []);
        } catch (e) { console.error(e); }
    };

    // ============================================================
    // CÁLCULOS DEL REPORTE
    // ============================================================
    const reporteMes = reporte || {};

    const totalIngresos = reporteMes.grossRevenue ?? 0;
    const ingresosMembresias = reporteMes.totalMembershipRevenue ?? 0;
    const ingresosProductos = reporteMes.totalProductSalesRevenue ?? 0;
    const ingresosDias = reporteMes.totalDailyTrainingRevenue ?? 0;
    const reservaNomina = reporteMes.totalPayrollReserve ?? 0;
    const totalEgresos = reporteMes.totalExpenses ?? 0;
    const utilidad = reporteMes.netProfit ?? 0;
    const liquidoNeto = reporteMes.netLiquidRevenue ?? 0;

    // Distribución de los ingresos (%)
    const distribucion = useMemo(() => {
        const base = totalIngresos > 0 ? totalIngresos : 1;
        const pReserva = (reservaNomina / base) * 100;
        const pEgresos = (totalEgresos / base) * 100;
        const pUtilidad = (utilidad / base) * 100;
        return {
            pReserva: Math.max(0, Math.min(100, pReserva)),
            pEgresos: Math.max(0, Math.min(100, pEgresos)),
            pUtilidad: Math.max(0, Math.min(100, pUtilidad)),
        };
    }, [totalIngresos, reservaNomina, totalEgresos, utilidad]);

    // Ingresos por membresías (desglose desde clientes)
    const ingresosMensualidades = useMemo(() => {
        return clientes
            .filter(c => c.mensualidad?.activa && c.fechaIngreso?.startsWith(mesActual))
            .map(c => ({
                id: c.id,
                fecha: c.fechaIngreso,
                monto: c.mensualidad?.precioMensual || 0,
                clienteNombre: c.nombre,
                tipo: c.mensualidad?.tipo || "Mensual",
            }));
    }, [clientes]);

    // Egresos e ingresos de mercancía del mes
    const egresosMes = useMemo(() =>
        egresos.filter(e => (e.expenseDate || "").startsWith(mesActual)),
        [egresos]);

    const intakesMes = useMemo(() =>
        intakes.filter(i => i.status === "CONFIRMED" && (i.recordedAt || "").startsWith(mesActual)),
        [intakes]);

    // Cálculo de nómina
    const calcularAhorroDiario = (empleado) => {
        if (empleado.dailyAccruedCost && empleado.dailyAccruedCost > 0) {
            return empleado.dailyAccruedCost;
        }
        // El salario registrado es MENSUAL: el costo diario es salario / 30 (también si se paga quincenal)
        return Math.round((empleado.salario || 0) / 30);
    };

    const obtenerInfoPago = (empleado) => {
        const ultimoPago = historialNominaService.ultimoPagoEmpleado(empleado.id);
        const proximaFecha = historialNominaService.proximaFechaPago(empleado.id, empleado);
        return {
            ultimoPago: ultimoPago?.fechaPago || empleado.ultimoPago || null,
            proximoPago: proximaFecha || empleado.proximoPago || null,
            pagosRealizados: historialNominaService.pagosEmpleado(empleado.id).length,
        };
    };

    const calcularAcumulado = (empleado) => {
        const info = obtenerInfoPago(empleado);
        const fechaBase = info.ultimoPago
            ? new Date(info.ultimoPago)
            : (empleado.fechaIngreso ? new Date(empleado.fechaIngreso) : new Date());
        const hoyDate = new Date();
        fechaBase.setHours(0, 0, 0, 0);
        hoyDate.setHours(0, 0, 0, 0);
        const diasTranscurridos = Math.ceil((hoyDate - fechaBase) / (1000 * 60 * 60 * 24));
        const ahorroDiario = calcularAhorroDiario(empleado);
        const diasMaximos = empleado.frecuenciaPago === "QUINCENAL" ? 15 : 30;
        return Math.min(ahorroDiario * Math.max(0, diasTranscurridos), empleado.salario || 0);
    };

    const totalNominaProxima = empleados
        .filter(e => e.activo)
        .reduce((a, e) => a + (e.salario || 0), 0);

    const totalAhorradoHoy = empleados
        .filter(e => e.activo)
        .reduce((a, e) => a + calcularAcumulado(e), 0);

    // Guardar egreso (backend)
    const guardarEgreso = async () => {
        if (!formEgreso.concepto.trim() || !formEgreso.monto) {
            alert("❌ Completa todos los campos");
            return;
        }
        try {
            await ingresoService.registrarEgreso({
                concept: formEgreso.concepto.trim(),
                category: formEgreso.categoria,
                amount: parseInt(formEgreso.monto),
                expenseDate: formEgreso.fecha,
                employeeId: null,
                intakeId: null,
            });
            setModalEgreso(false);
            setFormEgreso({ concepto: "", monto: "", categoria: "Servicios", fecha: fechaLocalISO() });
            await cargarMovimientos();
            alert("✅ Egreso registrado correctamente");
        } catch (e) {
            alert(`❌ Error: ${e.response?.data?.message || e.message}`);
        }
    };

    if (cargando) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Cargando datos financieros...</div>;
    }

    const Barra = ({ label, valor, pct, color }) => (
        <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>{label}</span>
                <span style={{ color: "#475569" }}>{COP(valor)} · <b>{pct.toFixed(1)}%</b></span>
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: "8px", height: "12px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "8px", transition: "width .4s" }} />
            </div>
        </div>
    );

    return (
        <div className="finanzas-container">
            <div className="finanzas-tabs">
                {[
                    { id: "resumen", label: "📊 Resumen" },
                    { id: "nomina", label: "👷 Nómina" },
                    { id: "movimientos", label: "📋 Movimientos" },
                    { id: "ventas", label: "🧾 Ventas y anulaciones" },
                ].map(s => (
                    <button
                        key={s.id}
                        className={`finanzas-tab ${seccion === s.id ? "active" : ""}`}
                        onClick={() => setSeccion(s.id)}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {seccion === "ventas" && <VentasAnulables />}

            {/* RESUMEN */}
            {seccion === "resumen" && (
                <div className="finanzas-resumen">
                    <div className="finanzas-cards">
                        <div className="fin-card fin-green">
                            <span className="fin-card-icon">💰</span>
                            <div>
                                <span className="fin-card-valor">{COP(totalIngresos)}</span>
                                <span className="fin-card-label">Ingresos del mes</span>
                            </div>
                        </div>
                        <div className="fin-card fin-red">
                            <span className="fin-card-icon">📉</span>
                            <div>
                                <span className="fin-card-valor">{COP(totalEgresos)}</span>
                                <span className="fin-card-label">Egresos del mes</span>
                            </div>
                        </div>
                        <div className={`fin-card ${utilidad >= 0 ? "fin-green" : "fin-red"}`}>
                            <span className="fin-card-icon">📈</span>
                            <div>
                                <span className="fin-card-valor">{COP(utilidad)}</span>
                                <span className="fin-card-label">Ganancia neta</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">🏋️</span>
                            <div>
                                <span className="fin-card-valor">{COP(ingresosMembresias)}</span>
                                <span className="fin-card-label">Por membresías</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">🛍️</span>
                            <div>
                                <span className="fin-card-valor">{COP(ingresosProductos)}</span>
                                <span className="fin-card-label">Por productos</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">🎟️</span>
                            <div>
                                <span className="fin-card-valor">{COP(ingresosDias)}</span>
                                <span className="fin-card-label">Por días individuales</span>
                            </div>
                        </div>
                        <div className="fin-card fin-yellow">
                            <span className="fin-card-icon">🏦</span>
                            <div>
                                <span className="fin-card-valor">{COP(reservaNomina)}</span>
                                <span className="fin-card-label">Reserva de nómina</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">💧</span>
                            <div>
                                <span className="fin-card-valor">{COP(liquidoNeto)}</span>
                                <span className="fin-card-label">Ingreso líquido neto</span>
                            </div>
                        </div>
                    </div>

                    {/* DISTRIBUCIÓN DE LOS INGRESOS */}
                    <Card title="Distribución de los ingresos del mes" icon="🧮" className="fin-desglose-card">
                        <Barra label="🏦 Reserva para nómina" valor={reservaNomina} pct={distribucion.pReserva} color="#f59e0b" />
                        <Barra label="📉 Egresos (mercancía y gastos)" valor={totalEgresos} pct={distribucion.pEgresos} color="#ef4444" />
                        <Barra label="📈 Ganancia neta del negocio" valor={utilidad} pct={distribucion.pUtilidad} color="#10b981" />
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "8px 0 0" }}>
                            💡 Con esta distribución sabes cuánto dejar reservado para pagar empleados,
                            cuánto se fue en mercancía/gastos y cuánto queda realmente como ganancia.
                        </p>
                    </Card>

                    <div className="finanzas-row">
                        <Card title="Membresías del mes" icon="🏋️" className="fin-desglose-card">
                            <div className="fin-lista">
                                {ingresosMensualidades.length === 0 ? (
                                    <p className="fin-vacio">Sin ingresos por membresías este mes</p>
                                ) : (
                                    ingresosMensualidades.map(i => (
                                        <div key={i.id} className="fin-item">
                                            <div>
                                                <span className="fin-item-nombre">{i.clienteNombre}</span>
                                                <span className="fin-item-sub">{i.tipo} · {i.fecha}</span>
                                            </div>
                                            <span className="fin-item-monto green">{COP(i.monto)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        <Card title="Ventas de productos (mes)" icon="🛍️" className="fin-desglose-card">
                            <div className="fin-lista">
                                <div className="fin-item">
                                    <div>
                                        <span className="fin-item-nombre">Total ventas de productos</span>
                                        <span className="fin-item-sub">Consolidado del reporte financiero</span>
                                    </div>
                                    <span className="fin-item-monto green">{COP(ingresosProductos)}</span>
                                </div>
                                <div className="fin-item">
                                    <div>
                                        <span className="fin-item-nombre">Ingresos por días individuales</span>
                                        <span className="fin-item-sub">Pases de entrenamiento</span>
                                    </div>
                                    <span className="fin-item-monto green">{COP(ingresosDias)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* NÓMINA */}
            {seccion === "nomina" && (
                <div className="nomina-container">
                    <div className="nomina-cards">
                        <div className="nom-card">
                            <span className="nom-icon">👷</span>
                            <span className="nom-valor">{empleados.filter(e => e.activo).length}</span>
                            <span className="nom-label">Empleados activos</span>
                        </div>
                        <div className="nom-card">
                            <span className="nom-icon">💸</span>
                            <span className="nom-valor">{COP(totalNominaProxima)}</span>
                            <span className="nom-label">Total próxima nómina</span>
                        </div>
                        <div className="nom-card">
                            <span className="nom-icon">🏦</span>
                            <span className="nom-valor">{COP(totalAhorradoHoy)}</span>
                            <span className="nom-label">Acumulado hasta hoy</span>
                        </div>
                        <div className="nom-card">
                            <span className="nom-icon">🪙</span>
                            <span className="nom-valor">{COP(reservaNomina)}</span>
                            <span className="nom-label">Reserva registrada (mes)</span>
                        </div>
                    </div>

                    <Card title="Estado de Nómina" icon="👷" className="nomina-card">
                        <div className="tabla-scroll">
                            <table className="usuarios-tabla">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Cargo</th>
                                        <th>Salario</th>
                                        <th>Frecuencia</th>
                                        <th>Último pago</th>
                                        <th>Próximo pago</th>
                                        <th>Días restantes</th>
                                        <th>Acumulado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empleados.filter(e => e.activo).map(e => {
                                        const info = obtenerInfoPago(e);
                                        const diasRestantes = diasHastaFecha(info.proximoPago);
                                        const acumulado = calcularAcumulado(e);
                                        const porcentaje = Math.min((acumulado / (e.salario || 1)) * 100, 100);
                                        return (
                                            <tr key={e.id}>
                                                <td>
                                                    <div className="cliente-nombre-cell">
                                                        <span className="cliente-avatar avatar-purple">
                                                            {e.nombre?.charAt(0) || "?"}
                                                        </span>
                                                        <span>{e.nombre}</span>
                                                    </div>
                                                </td>
                                                <td><span className="cargo-badge">{e.cargo}</span></td>
                                                <td className="text-green fw-bold">{COP(e.salario)}</td>
                                                <td><span className="membresia-badge">{e.frecuenciaPago === "QUINCENAL" ? "Quincenal" : "Mensual"}</span></td>
                                                <td className="text-small">{info.ultimoPago ? formatDate(info.ultimoPago) : "—"}</td>
                                                <td className="text-small">{info.proximoPago ? formatDate(info.proximoPago) : "—"}</td>
                                                <td>
                                                    {!info.proximoPago ? (
                                                        <span className="estado-badge badge-yellow">Sin pago</span>
                                                    ) : diasRestantes === 0 ? (
                                                        <span className="estado-badge badge-red">¡Hoy!</span>
                                                    ) : diasRestantes < 0 ? (
                                                        <span className="estado-badge badge-red">Vencido</span>
                                                    ) : (
                                                        <span className={`estado-badge ${diasRestantes <= 3 ? "badge-red" : diasRestantes <= 7 ? "badge-yellow" : "badge-green"}`}>
                                                            {diasRestantes}d
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="nomina-progreso">
                                                        <span className="text-green">{COP(acumulado)}</span>
                                                        <div className="progreso-bar-bg">
                                                            <div className="progreso-bar" style={{ width: `${Math.min(porcentaje, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* MOVIMIENTOS */}
            {seccion === "movimientos" && (
                <div className="movimientos-container">
                    <div className="movimientos-toolbar">
                        <h3 className="movimientos-titulo">📋 Movimientos del mes</h3>
                        <Button variant="primary" onClick={() => setModalEgreso(true)}>
                            ➕ Registrar Egreso
                        </Button>
                    </div>

                    <div className="movimientos-lista">
                        {ingresosMensualidades.map(i => (
                            <div key={`mem-${i.id}`} className="movimiento-item movimiento-ingreso">
                                <span className="mov-icon">💰</span>
                                <div className="mov-info">
                                    <span className="mov-concepto">{i.clienteNombre} — Membresía {i.tipo}</span>
                                    <span className="mov-sub">{i.fecha}</span>
                                </div>
                                <span className="mov-monto text-green">+{COP(i.monto)}</span>
                            </div>
                        ))}
                        {intakesMes.map(i => (
                            <div key={`in-${i.id}`} className="movimiento-item movimiento-egreso">
                                <span className="mov-icon">📥</span>
                                <div className="mov-info">
                                    <span className="mov-concepto">Mercancía: {i.productName} x{i.quantity}</span>
                                    <span className="mov-sub">{i.recordedAt?.slice(0, 10)} · Inventario</span>
                                </div>
                                <span className="mov-monto text-red">-{COP(i.totalCost)}</span>
                            </div>
                        ))}
                        {egresosMes.map(e => (
                            <div key={`eg-${e.id}`} className="movimiento-item movimiento-egreso">
                                <span className="mov-icon">📉</span>
                                <div className="mov-info">
                                    <span className="mov-concepto">{e.concept}</span>
                                    <span className="mov-sub">{e.expenseDate} · {e.category}</span>
                                </div>
                                <span className="mov-monto text-red">-{COP(e.amount)}</span>
                            </div>
                        ))}
                        {ingresosMensualidades.length === 0 && intakesMes.length === 0 && egresosMes.length === 0 && (
                            <p className="fin-vacio">Sin movimientos este mes</p>
                        )}
                    </div>
                </div>
            )}

            {/* Modal egreso */}
            {modalEgreso && (
                <div className="modal-overlay" onClick={() => setModalEgreso(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalEgreso(false)}>✕</button>
                        <div className="modal-header-form">
                            <div className="modal-header-icon">📉</div>
                            <div>
                                <h3 className="modal-titulo">Registrar Egreso</h3>
                                <p className="modal-subtitulo">Ingresa los datos del gasto</p>
                            </div>
                        </div>
                        <div className="modal-form-grid">
                            <div className="modal-campo modal-campo-full">
                                <label><span className="campo-label">Concepto</span></label>
                                <input className="campo-input" type="text" value={formEgreso.concepto}
                                    onChange={e => setFormEgreso({ ...formEgreso, concepto: e.target.value })}
                                    placeholder="Ej: Servicios públicos" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Monto ($)</span></label>
                                <input className="campo-input" type="text" inputMode="numeric" value={formatCurrencyInput(formEgreso.monto)}
                                    onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value.replace(/[^0-9]/g, '') })}
                                    placeholder="0" />
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Categoría</span></label>
                                <select className="campo-input" value={formEgreso.categoria}
                                    onChange={e => setFormEgreso({ ...formEgreso, categoria: e.target.value })}>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Inventario">Inventario</option>
                                    <option value="Nomina">Nómina</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="modal-campo">
                                <label><span className="campo-label">Fecha</span></label>
                                <input className="campo-input" type="date" value={formEgreso.fecha}
                                    onChange={e => setFormEgreso({ ...formEgreso, fecha: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-acciones">
                            <button className="btn-cancelar" onClick={() => setModalEgreso(false)}>Cancelar</button>
                            <Button variant="primary" onClick={guardarEgreso}>✅ Registrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}