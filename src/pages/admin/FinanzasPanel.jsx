// ============================================
// FINANZAS PANEL - Con conexión al backend
// ============================================
import { useState, useMemo, useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { COP, formatDate } from "../../utils/formatters";
import { clientesService } from "../../services/clientesService";
import { empleadosService } from "../../services/empleadosService";
import useAuthStore from "../../store/authStore";

const hoy = new Date().toISOString().split("T")[0];
const mesActual = hoy.slice(0, 7);

const diasHastaFecha = (fechaStr) => {
    if (!fechaStr) return 0;
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    return Math.ceil((fecha - ahora) / (1000 * 60 * 60 * 24));
};

export default function FinanzasPanel() {
    const [seccion, setSeccion] = useState("resumen");
    const [clientes, setClientes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalEgreso, setModalEgreso] = useState(false);
    const [formEgreso, setFormEgreso] = useState({ 
        concepto: "", 
        monto: "", 
        categoria: "Servicios", 
        fecha: hoy 
    });
    const [egresosList, setEgresosList] = useState([]);

    const usuario = useAuthStore((state) => state.usuario);

    // Cargar datos
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Cargar clientes para obtener info de membresías
            const clientesData = await clientesService.listar();
            setClientes(clientesData);

            // Cargar empleados
            const empleadosData = await empleadosService.listar();
            setEmpleados(empleadosData);

            // Cargar egresos desde localStorage (temporal)
            const egresosGuardados = JSON.parse(localStorage.getItem('egresos') || '[]');
            setEgresosList(egresosGuardados);

        } catch (error) {
            console.error("❌ Error cargando datos financieros:", error);
        } finally {
            setCargando(false);
        }
    };

    // Calcular ingresos del mes desde clientes
    const ingresosMensualidades = useMemo(() => {
        const mes = mesActual;
        const ingresos = clientes
            .filter(c => c.mensualidad?.activa && c.fechaIngreso?.startsWith(mes))
            .map(c => ({
                id: c.id,
                fecha: c.fechaIngreso,
                monto: c.mensualidad?.precioMensual || 80000,
                clienteNombre: c.nombre,
                tipo: c.mensualidad?.tipo || "Mensual",
                metodoPago: "Efectivo"
            }));
        return ingresos;
    }, [clientes]);

    const totalIngresosMem = useMemo(() =>
        ingresosMensualidades.reduce((a, i) => a + i.monto, 0),
        [ingresosMensualidades]);

    // Ingresos por productos (mock)
    const ingresosProductos = useMemo(() => [
        { id: 1, fecha: hoy, total: 45000, producto: "Proteína Whey", cantidad: 2 },
        { id: 2, fecha: hoy, total: 32000, producto: "Creatina", cantidad: 1 }
    ], []);

    const totalIngresosProd = useMemo(() =>
        ingresosProductos.reduce((a, i) => a + i.total, 0),
        [ingresosProductos]);

    const totalIngresos = totalIngresosMem + totalIngresosProd;

    const totalEgresos = useMemo(() =>
        egresosList.filter(e => e.fecha?.startsWith(mesActual)).reduce((a, e) => a + (e.monto || 0), 0),
        [egresosList]);

    const utilidad = totalIngresos - totalEgresos;

    // Cálculo de nómina
    const calcularAhorroDiario = (empleado) => {
        const diasPeriodo = empleado.frecuenciaPago === "QUINCENAL" ? 15 : 30;
        return Math.round((empleado.salario || 0) / diasPeriodo);
    };

    const calcularAcumulado = (empleado) => {
        const ultimoPago = empleado.ultimoPago ? new Date(empleado.ultimoPago) : new Date();
        const hoyDate = new Date();
        const diasTranscurridos = Math.ceil((hoyDate - ultimoPago) / (1000 * 60 * 60 * 24));
        const ahorroDiario = calcularAhorroDiario(empleado);
        return Math.min(ahorroDiario * Math.max(0, diasTranscurridos), empleado.salario || 0);
    };

    const totalNominaProxima = empleados
        .filter(e => e.activo)
        .reduce((a, e) => a + (e.salario || 0), 0);

    const totalAhorradoHoy = empleados
        .filter(e => e.activo)
        .reduce((a, e) => a + calcularAcumulado(e), 0);

    // Guardar egreso
    const guardarEgreso = () => {
        if (!formEgreso.concepto.trim() || !formEgreso.monto) {
            alert("❌ Completa todos los campos");
            return;
        }

        const nuevoEgreso = {
            id: Date.now(),
            concepto: formEgreso.concepto,
            monto: parseInt(formEgreso.monto),
            fecha: formEgreso.fecha,
            categoria: formEgreso.categoria,
            empleadoId: null,
        };

        const nuevosEgresos = [...egresosList, nuevoEgreso];
        setEgresosList(nuevosEgresos);
        localStorage.setItem('egresos', JSON.stringify(nuevosEgresos));
        
        setModalEgreso(false);
        setFormEgreso({ concepto: "", monto: "", categoria: "Servicios", fecha: hoy });
        alert("✅ Egreso registrado correctamente");
    };

    if (cargando) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Cargando datos financieros...</div>;
    }

    return (
        <div className="finanzas-container">
            <div className="finanzas-tabs">
                {[
                    { id: "resumen", label: "📊 Resumen" },
                    { id: "nomina", label: "👷 Nómina" },
                    { id: "movimientos", label: "📋 Movimientos" },
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
                                <span className="fin-card-label">Utilidad neta</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">🏋️</span>
                            <div>
                                <span className="fin-card-valor">{COP(totalIngresosMem)}</span>
                                <span className="fin-card-label">Por membresías</span>
                            </div>
                        </div>
                        <div className="fin-card fin-blue">
                            <span className="fin-card-icon">🛍️</span>
                            <div>
                                <span className="fin-card-valor">{COP(totalIngresosProd)}</span>
                                <span className="fin-card-label">Por productos</span>
                            </div>
                        </div>
                        <div className="fin-card fin-yellow">
                            <span className="fin-card-icon">👷</span>
                            <div>
                                <span className="fin-card-valor">{COP(totalAhorradoHoy)}</span>
                                <span className="fin-card-label">Acumulado nómina</span>
                            </div>
                        </div>
                    </div>

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

                        <Card title="Ventas de productos" icon="🛍️" className="fin-desglose-card">
                            <div className="fin-lista">
                                {ingresosProductos.map(i => (
                                    <div key={i.id} className="fin-item">
                                        <div>
                                            <span className="fin-item-nombre">{i.producto}</span>
                                            <span className="fin-item-sub">x{i.cantidad} · {i.fecha}</span>
                                        </div>
                                        <span className="fin-item-monto green">{COP(i.total)}</span>
                                    </div>
                                ))}
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
                                        const diasRestantes = diasHastaFecha(e.proximoPago);
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
                                                <td className="text-small">{formatDate(e.ultimoPago)}</td>
                                                <td className="text-small">{formatDate(e.proximoPago)}</td>
                                                <td>
                                                    <span className={`estado-badge ${diasRestantes <= 3 ? "badge-red" : diasRestantes <= 7 ? "badge-yellow" : "badge-green"}`}>
                                                        {diasRestantes === 0 ? "¡Hoy!" : `${diasRestantes}d`}
                                                    </span>
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
                        <h3 className="movimientos-titulo">📋 Todos los movimientos del mes</h3>
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
                        {ingresosProductos.map(i => (
                            <div key={`prod-${i.id}`} className="movimiento-item movimiento-ingreso">
                                <span className="mov-icon">🛍️</span>
                                <div className="mov-info">
                                    <span className="mov-concepto">{i.producto} x{i.cantidad}</span>
                                    <span className="mov-sub">{i.fecha}</span>
                                </div>
                                <span className="mov-monto text-green">+{COP(i.total)}</span>
                            </div>
                        ))}
                        {egresosList.filter(e => e.fecha?.startsWith(mesActual)).map(e => (
                            <div key={`eg-${e.id}`} className="movimiento-item movimiento-egreso">
                                <span className="mov-icon">📉</span>
                                <div className="mov-info">
                                    <span className="mov-concepto">{e.concepto}</span>
                                    <span className="mov-sub">{e.fecha} · {e.categoria}</span>
                                </div>
                                <span className="mov-monto text-red">-{COP(e.monto)}</span>
                            </div>
                        ))}
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
                                <input className="campo-input" type="number" value={formEgreso.monto}
                                    onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })}
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