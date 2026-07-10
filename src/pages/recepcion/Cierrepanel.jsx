/**
 * ============================================================
 * PANEL DE CIERRE DE CAJA - CONECTADO AL BACKEND
 * ============================================================
 * 
 * Este componente permite:
 * - Ver todas las ventas del día/turno
 * - Ver el resumen de ventas por tipo y método de pago
 * - Realizar el cuadre de caja
 * - Cerrar la jornada y el turno en el backend
 * 
 * @component
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useVentasStore, calcularResumen } from '../../store/ventasStore';
import { ventasService } from '../../services/ventasService';
import { turnoService } from '../../services/turnoService';

// ============================================================
// CONSTANTES Y HELPERS
// ============================================================

const COP = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  return "$" + Math.round(v).toLocaleString("es-CO");
};

const limpiarValorMoneda = (valor) => {
  if (!valor) return "0";
  const soloNumeros = valor.toString().replace(/[^0-9]/g, "");
  if (!soloNumeros) return "0";
  return String(parseInt(soloNumeros, 10));
};

const HORAS_LABELS = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"];

const fechaHoy = () => {
  const d = new Date();
  const s = d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const TagTipo = ({ tipo }) => {
  const map = {
    mensualidad: { label: "Mensualidad", cls: "cierre-tag-mens" },
    dia: { label: "Por día", cls: "cierre-tag-dia" },
    producto: { label: "Producto", cls: "cierre-tag-prod" },
  };
  const t = map[tipo] || map.producto;
  return <span className={`cierre-tag ${t.cls}`}>{t.label}</span>;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CierrePanel() {
  // ----------------------------------------------------------
  // ESTADOS DEL STORE
  // ----------------------------------------------------------
  
  const { 
    ventas, 
    jornada, 
    cerrarJornada, 
    cargarVentas, 
    cargarVentasPorTurno,
    reiniciarJornada,
    setTurnoActivo
  } = useVentasStore();
  
  // ----------------------------------------------------------
  // ESTADOS LOCALES
  // ----------------------------------------------------------
  
  const [loading, setLoading] = useState(true);
  const [turnoActivo, setTurnoActivoLocal] = useState(null);
  const [error, setError] = useState(null);
  
  // Formulario de cuadre
  const [saldoInicial, setSaldoInicial] = useState("");
  const [egresos, setEgresos] = useState("");
  const [efectivoContado, setEfectivo] = useState("");
  const [digital, setDigital] = useState("");
  const [tabActiva, setTabActiva] = useState("transacciones");
  const [confirmando, setConfirmando] = useState(false);

  // ----------------------------------------------------------
  // EFECTOS
  // ----------------------------------------------------------
  
  useEffect(() => {
    cargarDatosCierre();
  }, []);

  /**
   * Carga todos los datos necesarios para el cierre
   */
  const cargarDatosCierre = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Obtener turno activo
      const turno = await obtenerTurnoActivo();
      setTurnoActivoLocal(turno);
      
      if (turno && turno.id) {
        // Guardar turno en el store
        setTurnoActivo(turno);
        
        // 2. Cargar ventas del turno
        await cargarVentasPorTurno(turno.id);
        console.log(`✅ Ventas del turno ${turno.id} cargadas:`, ventas.length);
      } else {
        // Si no hay turno activo, cargar ventas del día
        await cargarVentas();
        console.log('✅ Ventas del día cargadas:', ventas.length);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos para cierre:', error);
      setError('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene el turno activo del recepcionista actual
   */
  const obtenerTurnoActivo = async () => {
    try {
      // Obtener el userId del usuario autenticado
      const userId = ventasService.getUserId();
      if (!userId) {
        console.warn('⚠️ No se encontró userId');
        return null;
      }
      
      console.log('🔍 Buscando turno activo para userId:', userId);
      
      // Obtener turno abierto del backend
      const turno = await turnoService.obtenerAbierto(userId);
      
      if (turno && turno.id) {
        console.log('✅ Turno activo encontrado:', turno);
        return turno;
      }
      
      console.log('ℹ️ No hay turno activo');
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo turno activo:', error);
      return null;
    }
  };

  // ----------------------------------------------------------
  // HANDLERS DE INPUTS
  // ----------------------------------------------------------

  const handleSaldoChange = (e) => {
    const valor = limpiarValorMoneda(e.target.value);
    setSaldoInicial(valor);
  };

  const handleEgresosChange = (e) => {
    const valor = limpiarValorMoneda(e.target.value);
    setEgresos(valor);
  };

  const handleEfectivoChange = (e) => {
    const valor = limpiarValorMoneda(e.target.value);
    setEfectivo(valor);
  };

  const handleDigitalChange = (e) => {
    const valor = limpiarValorMoneda(e.target.value);
    setDigital(valor);
  };

  // ----------------------------------------------------------
  // CÁLCULOS DEL CUADRE
  // ----------------------------------------------------------

  // Resumen de ventas calculado a partir de las ventas del store
  const resumen = useMemo(() => {
    if (!ventas || ventas.length === 0) {
      return {
        totalGeneral: 0,
        totalProductos: 0,
        totalMensualidades: 0,
        totalDias: 0,
        efectivo: 0,
        transferencia: 0,
        tarjeta: 0,
        countProductos: 0,
        countMensualidades: 0,
        countDias: 0,
        countTotal: 0,
        porHora: Array(9).fill(0)
      };
    }
    return calcularResumen(ventas);
  }, [ventas]);

  // Cuadre de caja
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

  // Porcentajes de distribución
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

  // ----------------------------------------------------------
  // ACCIONES DE CIERRE
  // ----------------------------------------------------------

  /**
   * Abre el modal de confirmación de cierre
   */
  const handleCierre = () => {
    if (!haIngresado || estadoCuadre === "faltante") {
      alert('⚠️ Debes ingresar los valores del cuadre y que no haya faltante para poder cerrar.');
      return;
    }
    setConfirmando(true);
  };

  /**
   * Confirma y ejecuta el cierre de la jornada
   */
  const confirmarCierre = async () => {
    try {
      setLoading(true);
      
      // Datos del cierre
      const cierreData = {
        saldoInicial: vSaldoInicial,
        egresos: vEgresos,
        efectivo: vEfectivo,
        digital: vDigital,
        totalEsperado,
        totalFisico,
        diferencia,
        totalVentas: resumen.totalGeneral,
        cantidadVentas: ventas.length,
        turnoId: turnoActivo?.id
      };
      
      console.log('📊 Datos de cierre:', cierreData);
      
      // 1. Cerrar el turno en el backend
      if (turnoActivo && turnoActivo.id) {
        try {
          await turnoService.cerrar(turnoActivo.id, vEfectivo);
          console.log('✅ Turno cerrado en backend');
        } catch (error) {
          if (error.alreadyClosed) {
            console.warn('⚠️ El turno ya estaba cerrado');
          } else {
            throw error;
          }
        }
      }
      
      // 2. Cerrar jornada en el store
      cerrarJornada(cierreData);
      
      // 3. Limpiar localStorage
      localStorage.removeItem('turno_activo');
      localStorage.removeItem('gymcore-ventas');
      
      setConfirmando(false);
      alert('✅ ¡Jornada cerrada exitosamente!');
      
      // 4. Recargar la página para mostrar el estado de cierre
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error al cerrar jornada:', error);
      alert('❌ Error al cerrar la jornada: ' + (error.mensajeUsuario || error.message));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reinicia la jornada (para pruebas)
   */
  const handleReiniciar = () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar la jornada? Se perderán todos los datos locales.')) {
      reiniciarJornada();
      localStorage.removeItem('turno_activo');
      window.location.reload();
    }
  };

  // ----------------------------------------------------------
  // RENDER - Jornada ya cerrada
  // ----------------------------------------------------------

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
        <button 
          onClick={handleReiniciar}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Reiniciar jornada (solo pruebas)
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER - Loading
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <span style={{ fontSize: '40px' }}>⏳</span>
        <p style={{ color: '#6b7280' }}>Cargando datos de cierre...</p>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER - Error
  // ----------------------------------------------------------

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <span style={{ fontSize: '40px' }}>❌</span>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button 
          onClick={cargarDatosCierre}
          style={{
            padding: '10px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER - Vista principal
  // ----------------------------------------------------------

  return (
    <div className="cierre-wrap">

      {/* ── Encabezado ── */}
      <div className="cierre-header">
        <div>
          <h2 className="cierre-main-title">Cierre de caja</h2>
          <span className="cierre-fecha">📅 {fechaHoy()}</span>
          {turnoActivo && (
            <span className="cierre-turno" style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>
              Turno #{turnoActivo.id}
            </span>
          )}
          {!turnoActivo && (
            <span className="cierre-turno" style={{ marginLeft: '12px', fontSize: '14px', color: '#f59e0b' }}>
              ⚠️ Sin turno activo
            </span>
          )}
        </div>
        <div className="cierre-live-badge">
          <span className="cierre-live-dot" />
          En vivo
          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
            {ventas.length} ventas
          </span>
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
            📋 Transacciones
          </button>
          <button
            className={`cierre-tab ${tabActiva === "horas" ? "active" : ""}`}
            onClick={() => setTabActiva("horas")}
          >
            📊 Por hora
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
                    {v.cliente && (
                      <span className="cierre-tx-cliente">👤 {v.cliente}</span>
                    )}
                  </div>
                  <span className="cierre-tx-metodo">
                    {v.metodoPago === "efectivo" ? "💵" : v.metodoPago === "transferencia" ? "📲" : "💳"}
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
          <span className="cierre-card-title">📊 Distribución de ingresos</span>
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
            <span className="cierre-metodo-val">{COP(resumen.transferencia + resumen.tarjeta)}</span>
          </div>
        </div>
      </div>

      {/* ── Cuadre de caja ── */}
      <div className="cierre-card">
        <div className="cierre-card-head">
          <span className="cierre-card-title">🧾 Cuadre de caja</span>
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

          {/* Inputs con formateo de moneda */}
          <div className="cierre-inputs-grid">
            <label className="cierre-field">
              <span>Saldo inicial ($)</span>
              <input
                type="text"
                placeholder="$ 0"
                value={saldoInicial ? COP(saldoInicial) : ""}
                onChange={handleSaldoChange}
              />
            </label>
            <label className="cierre-field">
              <span>Egresos / gastos ($)</span>
              <input
                type="text"
                placeholder="$ 0"
                value={egresos ? COP(egresos) : ""}
                onChange={handleEgresosChange}
              />
            </label>
            <label className="cierre-field">
              <span>Efectivo contado ($)</span>
              <input
                type="text"
                placeholder="$ 0"
                value={efectivoContado ? COP(efectivoContado) : ""}
                onChange={handleEfectivoChange}
              />
            </label>
            <label className="cierre-field">
              <span>Datafono / transferencias ($)</span>
              <input
                type="text"
                placeholder="$ 0"
                value={digital ? COP(digital) : ""}
                onChange={handleDigitalChange}
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
            className={`cierre-btn-final ${haIngresado && estadoCuadre !== "faltante" ? "ready" : "disabled"}`}
            onClick={handleCierre}
            disabled={!haIngresado || estadoCuadre === "faltante"}
          >
            {!haIngresado 
              ? 'Ingresa los valores del cuadre' 
              : estadoCuadre === 'faltante' 
                ? '❌ Faltante - Revisa el conteo'
                : '✅ Registrar cierre de jornada'}
          </button>

          {estadoCuadre === "faltante" && haIngresado && (
            <p className="cierre-aviso-faltante">
              ⚠️ Hay un faltante de {COP(Math.abs(diferencia))}. Revisa el conteo antes de cerrar.
            </p>
          )}
          
          {!turnoActivo && (
            <p className="cierre-aviso-faltante" style={{ color: '#f59e0b' }}>
              ⚠️ No hay turno activo. Las ventas se están registrando sin turno asociado.
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
              <br /><br />
              <strong>Detalles del cuadre:</strong><br />
              • Efectivo contado: {COP(vEfectivo)}<br />
              • Digital contado: {COP(vDigital)}<br />
              • Total físico: {COP(totalFisico)}<br />
              • Total esperado: {COP(totalEsperado)}<br />
              {estadoCuadre === "sobrante" && (
                <>• <span style={{ color: '#f59e0b' }}>Sobrante: {COP(diferencia)}</span></>
              )}
              {estadoCuadre === "ok" && (
                <>• <span style={{ color: '#10b981' }}>✅ Caja cuadrada</span></>
              )}
            </p>
            <div className="modal-acciones">
              <button 
                className="btn btn-success" 
                onClick={confirmarCierre}
                disabled={loading}
              >
                {loading ? 'Cerrando...' : 'Sí, cerrar jornada'}
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