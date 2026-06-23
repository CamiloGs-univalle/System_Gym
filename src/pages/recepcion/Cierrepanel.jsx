// src/components/pages/recepcion

import { useState, useMemo } from "react";
import { calcularResumen } from "../../mock/ventas";
import { useVentasStore } from "../../store/ventasStore"; // ← Ruta correcta
// ── Helpers ───────────────────────────────────────────────────────────────────
const COP = (v) =>
    "$" + Math.round(v).toLocaleString("es-CO");

const HORAS_LABELS = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"];

function fechaHoy() {
    const d = new Date();
    const s = d.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function TagTipo({ tipo }) {
    const map = {
        mensualidad: { label: "mensualidad", cls: "cierre-tag-mens" },
        dia: { label: "por día", cls: "cierre-tag-dia" },
        producto: { label: "producto", cls: "cierre-tag-prod" },
    };
    const t = map[tipo] || map.producto;
    return <span className={`cierre-tag ${t.cls}`}>{t.label}</span>;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CierrePanel() {
    const { ventas, jornada, cerrarJornada } = useVentasStore();

    // Formulario de cuadre
    const [saldoInicial, setSaldoInicial] = useState("");
    const [egresos, setEgresos] = useState("");
    const [efectivoContado, setEfectivo] = useState("");
    const [digital, setDigital] = useState("");
    const [tabActiva, setTabActiva] = useState("transacciones"); // "transacciones" | "horas"
    const [confirmando, setConfirmando] = useState(false);

    // Resumen calculado en tiempo real
    const resumen = useMemo(() => calcularResumen(ventas), [ventas]);

    // Cuadre
    const vSaldoInicial = parseFloat(saldoInicial) || 0;
    const vEgresos = parseFloat(egresos) || 0;
    const vEfectivo = parseFloat(efectivoContado) || 0;
    const vDigital = parseFloat(digital) || 0;
    const totalEsperado = vSaldoInicial + resumen.totalGeneral - vEgresos;
    const totalFisico = vEfectivo + vDigital;
    const diferencia = totalFisico - totalEsperado;
    const haCuadrado = Math.abs(diferencia) <= 500;
    const haIngresado = vEfectivo > 0 || vDigital > 0;

    const estadoCuadre = !haIngresado
        ? null
        : haCuadrado
            ? "ok"
            : diferencia < 0
                ? "faltante"
                : "sobrante";

    const pctMens = resumen.totalGeneral
        ? Math.round((resumen.totalMensualidades / resumen.totalGeneral) * 100)
        : 0;
    const pctDia = resumen.totalGeneral
        ? Math.round((resumen.totalDias / resumen.totalGeneral) * 100)
        : 0;
    const pctProd = resumen.totalGeneral
        ? Math.round((resumen.totalProductos / resumen.totalGeneral) * 100)
        : 0;

    const maxHora = Math.max(...resumen.porHora, 1);

    const handleCierre = () => {
        if (!haIngresado || estadoCuadre === "faltante") return;
        setConfirmando(true);
    };

    const confirmarCierre = () => {
        cerrarJornada({
            saldoInicial: vSaldoInicial,
            egresos: vEgresos,
            efectivo: vEfectivo,
            digital: vDigital,
            totalEsperado,
            totalFisico,
            diferencia,
            totalVentas: resumen.totalGeneral,
            cantidadVentas: ventas.length,
        });
        setConfirmando(false);
    };

    // ── Si la jornada ya está cerrada ─────────────────────────────────────────
    if (jornada.cerrada && jornada.cierreData) {
        const cd = jornada.cierreData;
        return (
            <div className="cierre-closed-wrap">
                <div className="cierre-closed-icon">✅</div>
                <h2 className="cierre-closed-title">Jornada cerrada</h2>
                <p className="cierre-closed-sub">{cd.fecha} · Cerrada a las {cd.hora}</p>
                <div className="cierre-closed-grid">
                    <div className="cierre-closed-item">
                        <span className="cierre-closed-label">Total vendido</span>
                        <span className="cierre-closed-val">{COP(cd.totalVentas)}</span>
                    </div>
                    <div className="cierre-closed-item">
                        <span className="cierre-closed-label">Efectivo contado</span>
                        <span className="cierre-closed-val">{COP(cd.efectivo)}</span>
                    </div>
                    <div className="cierre-closed-item">
                        <span className="cierre-closed-label">Digital / datafono</span>
                        <span className="cierre-closed-val">{COP(cd.digital)}</span>
                    </div>
                    <div className="cierre-closed-item">
                        <span className="cierre-closed-label">Diferencia</span>
                        <span
                            className="cierre-closed-val"
                            style={{ color: Math.abs(cd.diferencia) <= 500 ? "var(--success)" : "var(--danger)" }}
                        >
                            {cd.diferencia >= 0 ? "+" : ""}
                            {COP(cd.diferencia)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ── Vista principal ────────────────────────────────────────────────────────
    return (
        <div className="cierre-wrap">

            {/* ── Encabezado ── */}
            <div className="cierre-header">
                <div>
                    <h2 className="cierre-main-title">Cierre de caja</h2>
                    <span className="cierre-fecha">📅 {fechaHoy()}</span>
                </div>
                <div className="cierre-live-badge">
                    <span className="cierre-live-dot" />
                    En vivo
                </div>
            </div>

            {/* ── Métricas principales ── */}
            <div className="cierre-metrics">
                <div className="cierre-metric cierre-metric-total">
                    <span className="cierre-metric-label">Total recaudado</span>
                    <span className="cierre-metric-val">{COP(resumen.totalGeneral)}</span>
                    <span className="cierre-metric-sub">{ventas.length} transacciones</span>
                </div>
                <div className="cierre-metric">
                    <span className="cierre-metric-label">Mensualidades</span>
                    <span className="cierre-metric-val">{COP(resumen.totalMensualidades)}</span>
                    <span className="cierre-metric-sub">{resumen.countMensualidades} pagos</span>
                </div>
                <div className="cierre-metric">
                    <span className="cierre-metric-label">Días sueltos</span>
                    <span className="cierre-metric-val">{COP(resumen.totalDias)}</span>
                    <span className="cierre-metric-sub">{resumen.countDias} pagos</span>
                </div>
                <div className="cierre-metric">
                    <span className="cierre-metric-label">Productos</span>
                    <span className="cierre-metric-val">{COP(resumen.totalProductos)}</span>
                    <span className="cierre-metric-sub">{resumen.countProductos} ventas</span>
                </div>
            </div>

            {/* ── Tabla de transacciones / Gráfico por hora ── */}
            <div className="cierre-card">
                <div className="cierre-card-tabs">
                    <button
                        className={`cierre-tab ${tabActiva === "transacciones" ? "active" : ""}`}
                        onClick={() => setTabActiva("transacciones")}
                    >
                        Transacciones
                    </button>
                    <button
                        className={`cierre-tab ${tabActiva === "horas" ? "active" : ""}`}
                        onClick={() => setTabActiva("horas")}
                    >
                        Por hora
                    </button>
                    <span className="cierre-card-count">{ventas.length} registros</span>
                </div>

                {tabActiva === "transacciones" && (
                    <div className="cierre-transacciones">
                        {ventas.length === 0 ? (
                            <p className="cierre-empty">No hay ventas registradas aún</p>
                        ) : (
                            [...ventas].reverse().map((v) => (
                                <div key={v.id} className="cierre-tx-row">
                                    <span className="cierre-tx-hora">{v.hora}</span>
                                    <div className="cierre-tx-desc">
                                        <TagTipo tipo={v.tipo} />
                                        <span className="cierre-tx-nombre">{v.descripcion}</span>
                                    </div>
                                    <span className="cierre-tx-metodo">
                                        {v.metodoPago === "efectivo" ? "💵" : "📲"}
                                    </span>
                                    <span className="cierre-tx-monto">{COP(v.total)}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tabActiva === "horas" && (
                    <div className="cierre-horas-wrap">
                        <div className="cierre-horas-bars">
                            {resumen.porHora.map((val, i) => (
                                <div key={i} className="cierre-hora-col">
                                    <span className="cierre-hora-val">
                                        {val > 0 ? (val >= 1000 ? `$${Math.round(val / 1000)}k` : COP(val)) : ""}
                                    </span>
                                    <div className="cierre-hora-bar-wrap">
                                        <div
                                            className="cierre-hora-bar"
                                            style={{ height: `${Math.round((val / maxHora) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="cierre-hora-label">{HORAS_LABELS[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Distribución de ingresos ── */}
            <div className="cierre-card cierre-distribucion">
                <div className="cierre-card-head">
                    <span className="cierre-card-title">Distribución de ingresos</span>
                </div>
                <div className="cierre-dist-grid">
                    <div className="cierre-dist-item">
                        <div className="cierre-dist-top">
                            <span className="cierre-dist-label">Mensualidades</span>
                            <span className="cierre-dist-pct">{pctMens}%</span>
                        </div>
                        <div className="cierre-dist-bar-bg">
                            <div className="cierre-dist-bar cierre-dist-bar-mens" style={{ width: `${pctMens}%` }} />
                        </div>
                        <span className="cierre-dist-monto">{COP(resumen.totalMensualidades)}</span>
                    </div>
                    <div className="cierre-dist-item">
                        <div className="cierre-dist-top">
                            <span className="cierre-dist-label">Días sueltos</span>
                            <span className="cierre-dist-pct">{pctDia}%</span>
                        </div>
                        <div className="cierre-dist-bar-bg">
                            <div className="cierre-dist-bar cierre-dist-bar-dia" style={{ width: `${pctDia}%` }} />
                        </div>
                        <span className="cierre-dist-monto">{COP(resumen.totalDias)}</span>
                    </div>
                    <div className="cierre-dist-item">
                        <div className="cierre-dist-top">
                            <span className="cierre-dist-label">Productos</span>
                            <span className="cierre-dist-pct">{pctProd}%</span>
                        </div>
                        <div className="cierre-dist-bar-bg">
                            <div className="cierre-dist-bar cierre-dist-bar-prod" style={{ width: `${pctProd}%` }} />
                        </div>
                        <span className="cierre-dist-monto">{COP(resumen.totalProductos)}</span>
                    </div>
                </div>
                <div className="cierre-metodos">
                    <div className="cierre-metodo-item">
                        <span className="cierre-metodo-icon">💵</span>
                        <span className="cierre-metodo-label">Efectivo</span>
                        <span className="cierre-metodo-val">{COP(resumen.efectivo)}</span>
                    </div>
                    <div className="cierre-metodo-sep" />
                    <div className="cierre-metodo-item">
                        <span className="cierre-metodo-icon">📲</span>
                        <span className="cierre-metodo-label">Digital / datafono</span>
                        <span className="cierre-metodo-val">{COP(resumen.transferencia)}</span>
                    </div>
                </div>
            </div>

            {/* ── Cuadre de caja ── */}
            <div className="cierre-card">
                <div className="cierre-card-head">
                    <span className="cierre-card-title">Cuadre de caja</span>
                </div>

                <div className="cierre-cuadre-body">
                    {/* Resumen esperado */}
                    <div className="cierre-esperado">
                        <div className="cierre-esperado-row">
                            <span>Saldo inicial</span>
                            <span>{COP(vSaldoInicial)}</span>
                        </div>
                        <div className="cierre-esperado-row">
                            <span>+ Ingresos del día</span>
                            <span>{COP(resumen.totalGeneral)}</span>
                        </div>
                        <div className="cierre-esperado-row">
                            <span>− Egresos / gastos</span>
                            <span>{COP(vEgresos)}</span>
                        </div>
                        <div className="cierre-esperado-row cierre-esperado-total">
                            <span>Total esperado en caja</span>
                            <span>{COP(totalEsperado)}</span>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="cierre-inputs-grid">
                        <label className="cierre-field">
                            <span>Saldo inicial ($)</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(e.target.value)}
                            />
                        </label>
                        <label className="cierre-field">
                            <span>Egresos / gastos ($)</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={egresos}
                                onChange={(e) => setEgresos(e.target.value)}
                            />
                        </label>
                        <label className="cierre-field">
                            <span>Efectivo contado ($)</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={efectivoContado}
                                onChange={(e) => setEfectivo(e.target.value)}
                            />
                        </label>
                        <label className="cierre-field">
                            <span>Datafono / transferencias ($)</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={digital}
                                onChange={(e) => setDigital(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* Resultado del cuadre */}
                    {estadoCuadre && (
                        <div className={`cierre-resultado cierre-resultado-${estadoCuadre}`}>
                            <div className="cierre-resultado-left">
                                <span className="cierre-resultado-icon">
                                    {estadoCuadre === "ok" ? "✅" : estadoCuadre === "faltante" ? "🔴" : "🟡"}
                                </span>
                                <span className="cierre-resultado-texto">
                                    {estadoCuadre === "ok"
                                        ? "Caja cuadrada perfectamente"
                                        : estadoCuadre === "faltante"
                                            ? "Faltante en caja"
                                            : "Sobrante en caja"}
                                </span>
                            </div>
                            <span className="cierre-resultado-diff">
                                {diferencia > 0 ? "+" : ""}
                                {COP(diferencia)}
                            </span>
                        </div>
                    )}

                    {/* Botón de cierre */}
                    <button
                        className={`cierre-btn-final ${haIngresado && estadoCuadre !== "faltante" ? "ready" : "disabled"
                            }`}
                        onClick={handleCierre}
                        disabled={!haIngresado || estadoCuadre === "faltante"}
                    >
                        Registrar cierre de jornada
                    </button>

                    {estadoCuadre === "faltante" && haIngresado && (
                        <p className="cierre-aviso-faltante">
                            ⚠️ Hay un faltante de {COP(Math.abs(diferencia))}. Revisa el conteo antes de cerrar.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Modal de confirmación ── */}
            {confirmando && (
                <div className="modal-overlay" onClick={() => setConfirmando(false)}>
                    <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-titulo">¿Confirmar cierre de jornada?</h3>
                        <p className="modal-confirm-texto">
                            Se registrará el cierre de la jornada con un total de{" "}
                            <strong>{COP(resumen.totalGeneral)}</strong> en ventas.
                            {estadoCuadre === "sobrante" && (
                                <> Hay un sobrante de <strong>{COP(diferencia)}</strong>.</>
                            )}
                            {estadoCuadre === "ok" && <> La caja cuadra correctamente.</>}
                        </p>
                        <div className="modal-acciones">
                            <button className="btn btn-success" onClick={confirmarCierre}>
                                Sí, cerrar jornada
                            </button>
                            <button className="modal-cancelar" onClick={() => setConfirmando(false)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}