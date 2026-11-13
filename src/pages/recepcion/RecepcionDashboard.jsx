// src/pages/recepcion/RecepcionDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import VentasProvider from "../../store/VentasProvider"; // ✅ IMPORTACIÓN CORREGIDA
import ClientesPanel from "../clients/ClientesPanel";
import POSPanel from "./POSPanel";
import CierrePanel from "./Cierrepanel";
import "../../styles/recepcionCSS/index.css";
import ProductosPanel from "../products/productos";
import IngresoPanel from "../ingreso/IngresoPanel";
import "../../styles/ingresoCSS/ingreso.css";
import LogoutConfirmModal from "../../components/common/LogoutConfirmModal";
import { turnoService, obtenerHorariosConfigurados, validarHorarioTurno, terminaDiaSiguiente } from "../../services/turnoService";
import authService from "../../services/authService";
import ventasService from "../../services/ventasService";
import { TIPOS_TURNO } from "../admin/turnos/TurnosPanel";
import { formatCurrencyInput, fechaLocalISO } from "../../utils/formatters";
import AppShell from "../../components/layout/AppShell";
import IngresoClientes from "../acceso/IngresoClientes";
import { ShoppingCart, ScanLine, Users, Package, PackagePlus, Lock, Clock3, MonitorUp } from "lucide-react";

const SECCIONES = [
  { titulo: "Atención", items: [
    { id: "general", label: "Caja y ventas", icon: ShoppingCart },
    { id: "acceso", label: "Ingresos", icon: ScanLine },
    { id: "clientes", label: "Clientes", icon: Users },
  ] },
  { titulo: "Inventario", items: [
    { id: "productos", label: "Productos", icon: Package },
    { id: "ingreso", label: "Entrada de mercancía", icon: PackagePlus },
  ] },
  { titulo: "Turno", items: [
    { id: "cierre", label: "Cierre de caja", icon: Lock },
  ] },
];
const TITULOS = Object.fromEntries(SECCIONES.flatMap((s) => s.items.map((i) => [i.id, i.label])));


function fechaHoy() {
  const hoy = new Date();
  const texto = hoy.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function RecepcionDashboard() {
    // Se lee en cada render: si el admin cambia los horarios en Configuración, se aplican de inmediato
    const horariosConfig = obtenerHorariosConfigurados();
  const [activeView, setActiveView] = useState("general");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const usuario = useAuthStore((state) => state.usuario);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // ============================================================
  // ESTADO DEL TURNO ACTIVO (subido al header)
  // ============================================================
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [turnoIdBackend, setTurnoIdBackend] = useState(null);
  const [turnoValido, setTurnoValido] = useState(false);
  const [mensajeTurno, setMensajeTurno] = useState("");
  const [verificandoTurno, setVerificandoTurno] = useState(true);

  // Modal de apertura de turno
  const [modalAbrirTurno, setModalAbrirTurno] = useState(false);
  const [formAbrirTurno, setFormAbrirTurno] = useState({
    tipo: "FULL_SHIFT",
    fecha: fechaLocalISO(),
    horaInicio: horariosConfig.FULL_SHIFT.horaInicio,
    horaFin: horariosConfig.FULL_SHIFT.horaFin,
    baseCaja: "",
  });
  const [abriendoTurno, setAbriendoTurno] = useState(false);

  // Al abrir el formulario se toman la fecha de hoy y los horarios actuales de Configuración
  const abrirModalTurno = () => {
    const h = obtenerHorariosConfigurados();
    setFormAbrirTurno((f) => {
      const tipo = f.tipo || "FULL_SHIFT";
      const horario = h[tipo] || h.FULL_SHIFT;
      return { ...f, tipo, fecha: fechaLocalISO(), horaInicio: horario.horaInicio, horaFin: horario.horaFin };
    });
    setModalAbrirTurno(true);
  };

  // Efecto para redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated || !usuario) {
      console.log("🔒 No autenticado, redirigiendo al login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, usuario, navigate]);

  // Efecto para verificar el turno activo del empleado
  useEffect(() => {
    verificarTurnoActivo();
  }, []);

  const verificarTurnoActivo = async () => {
    setVerificandoTurno(true);

    const userId = authService.getUserId() || ventasService.getUserId();

    if (!userId) {
      console.warn('⚠️ No se pudo obtener el userId del empleado');
      setTurnoActivo(null);
      setTurnoValido(false);
      setMensajeTurno("⚠️ No hay turno activo. Abre un turno primero.");
      setVerificandoTurno(false);
      return;
    }

    try {
      const turnoBackend = await turnoService.obtenerAbierto(userId);
      console.log('📌 Turno abierto del empleado:', turnoBackend);

      if (turnoBackend && turnoBackend.id) {
        const turnoSincronizado = {
          ...turnoBackend,
          id: turnoBackend.id,
          sincronizado: true,
          openedAt: turnoBackend.openedAt,
          status: turnoBackend.status || 'OPEN'
        };

        setTurnoActivo(turnoSincronizado);
        setTurnoIdBackend(turnoBackend.id);
        setTurnoValido(true);
        setMensajeTurno(`✅ Turno activo ID: ${turnoBackend.id}`);

        localStorage.setItem('turno_activo', JSON.stringify(turnoSincronizado));
        setVerificandoTurno(false);
        return;
      }

      setTurnoActivo(null);
      setTurnoIdBackend(null);
      setTurnoValido(false);
      setMensajeTurno("⚠️ No hay turno activo. Abre un turno primero.");
      localStorage.removeItem('turno_activo');
      setVerificandoTurno(false);
    } catch (error) {
      console.error('❌ Error verificando turno en backend:', error);

      const turnoLocal = localStorage.getItem('turno_activo');
      if (turnoLocal) {
        try {
          const turnoParseado = JSON.parse(turnoLocal);
          setTurnoActivo(turnoParseado);
          setTurnoIdBackend(turnoParseado.id);
          setTurnoValido(false);
          setMensajeTurno(`⚠️ Turno local ID: ${turnoParseado.id} (backend no disponible)`);
        } catch {
          setTurnoActivo(null);
          setTurnoIdBackend(null);
          setTurnoValido(false);
          setMensajeTurno("⚠️ No hay turno activo. Abre un turno primero.");
        }
      } else {
        setTurnoActivo(null);
        setTurnoIdBackend(null);
        setTurnoValido(false);
        setMensajeTurno("⚠️ No hay turno activo. Abre un turno primero.");
      }
      setVerificandoTurno(false);
    }
  };

  // ============================================================
  // APERTURA DE TURNO DESDE EL HEADER
  // ============================================================

  const setTipoAbrir = (tipo) => {
    const horario = horariosConfig[tipo] || horariosConfig.FULL_SHIFT;
    setFormAbrirTurno(prev => ({ ...prev, tipo, horaInicio: horario.horaInicio, horaFin: horario.horaFin }));
  };

  const abrirTurnoDesdePos = async () => {
    const userId = authService.getUserId() || ventasService.getUserId();
    if (!userId) {
      alert("⚠️ No se pudo identificar al empleado. Inicia sesión nuevamente.");
      return;
    }
    const errorHorario = validarHorarioTurno(formAbrirTurno.horaInicio, formAbrirTurno.horaFin);
    if (errorHorario) {
      alert(`⚠️ ${errorHorario}`);
      return;
    }
    setAbriendoTurno(true);
    try {
      const turnoAbierto = await turnoService.abrir({
        type: formAbrirTurno.tipo,
        cashBase: formAbrirTurno.baseCaja.replace(/[^0-9]/g, "") || "0",
        receptionistId: userId,
        date: formAbrirTurno.fecha,
        scheduledDate: formAbrirTurno.fecha,
        startTime: formAbrirTurno.horaInicio,
        endTime: formAbrirTurno.horaFin,
        observations: "",
      });
      setModalAbrirTurno(false);
      await verificarTurnoActivo();
      alert(`✅ Turno ${turnoAbierto.id} abierto correctamente.`);
    } catch (err) {
      alert(err.mensajeUsuario || err.message || "Error al abrir el turno");
    } finally {
      setAbriendoTurno(false);
    }
  };

  const handleLogout = () => {
    console.log("=================================");
    console.log("RECEPCION DASHBOARD - Cerrando sesión");
    console.log("=================================");

    // 1. Llamar al logout del store
    logout();

    // 2. Redirigir al login
    navigate("/login", { replace: true });

    // 3. NO recargar la página (el efecto se encargará)
    console.log("✅ Sesión cerrada");
  };

  // Si no está autenticado, no renderizar nada (el efecto redirigirá)
  if (!isAuthenticated || !usuario) {
    return null;
  }

  const textoTurno = turnoActivo
    ? `${mensajeTurno}${turnoValido && turnoActivo.tipo ? ` · ${TIPOS_TURNO[turnoActivo.tipo]?.icon || ''} ${TIPOS_TURNO[turnoActivo.tipo]?.label || turnoActivo.tipo} ${turnoActivo.horaInicio}-${turnoActivo.horaFin}` : ''}`
    : mensajeTurno || '⚠️ Sin turno activo';

  const chipClase = !turnoActivo ? "sinturno" : turnoValido ? "sincronizado" : "local";

  return (
    <VentasProvider>
      <AppShell
        secciones={SECCIONES}
        activo={activeView}
        onCambiar={setActiveView}
        titulo={TITULOS[activeView]}
        onSalir={() => setConfirmLogout(true)}
        acciones={
          <>
            <span className={`sg-chip ${turnoValido ? "ok" : "warn"}`} title={textoTurno}>
              <span className="dot" />
              <Clock3 />
              {turnoValido && turnoActivo
                ? `Turno ${TIPOS_TURNO[turnoActivo.tipo]?.label || ""} ${turnoActivo.horaInicio || ""}-${turnoActivo.horaFin || ""}`.trim()
                : "Sin turno abierto"}
            </span>
            {!turnoValido && (
              <button className="sg-btn sg-btn-primary" onClick={abrirModalTurno}>Abrir turno</button>
            )}
            <button
              className="sg-btn sg-btn-ghost"
              onClick={() => (window.systemGym?.quiosco ? window.systemGym.quiosco.abrir() : window.open(`${window.location.pathname}?modo=quiosco`, "_blank"))}
              title="Abrir la pantalla de ingreso en el monitor de la entrada"
            >
              <MonitorUp /> Pantalla de ingreso
            </button>
          </>
        }
      >
        <div className="recepcion-dashboard-content sg-legacy">
          {activeView === "general" && (
            <POSPanel
              turnoActivo={turnoActivo}
              turnoValido={turnoValido}
              turnoIdBackend={turnoIdBackend}
              mensajeTurno={mensajeTurno}
              verificandoTurno={verificandoTurno}
              onAbrirTurno={abrirModalTurno}
            />
          )}
          {activeView === "acceso" && <IngresoClientes />}
          {activeView === "clientes" && <ClientesPanel />}
          {activeView === "productos" && <ProductosPanel />}
          {activeView === "ingreso" && <IngresoPanel />}
          {activeView === "cierre" && <CierrePanel />}
        </div>
      </AppShell>
      <div>
        <LogoutConfirmModal
          open={confirmLogout}
          onConfirm={() => { setConfirmLogout(false); handleLogout(); }}
          onCancel={() => setConfirmLogout(false)}
        />

        {/* MODAL ABRIR TURNO */}
        {modalAbrirTurno && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }} onClick={() => setModalAbrirTurno(false)}>
            <div style={{
              background: 'white', borderRadius: '12px', padding: '24px', width: '420px',
              maxWidth: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>
                🌟 Abrir Turno
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Tipo de Turno</label>
                <select
                  value={formAbrirTurno.tipo}
                  onChange={e => setTipoAbrir(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', background: 'white' }}
                >
                  {Object.entries(TIPOS_TURNO).map(([valor, info]) => (
                    <option key={valor} value={valor}>
                      {info.icon} {info.label} ({horariosConfig[valor]?.horaInicio} - {horariosConfig[valor]?.horaFin})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Fecha</label>
                <input
                  type="date"
                  value={formAbrirTurno.fecha}
                  onChange={e => setFormAbrirTurno({ ...formAbrirTurno, fecha: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Hora Inicio</label>
                  <input
                    type="time"
                    value={formAbrirTurno.horaInicio}
                    onChange={e => setFormAbrirTurno({ ...formAbrirTurno, horaInicio: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Hora Fin</label>
                  <input
                    type="time"
                    value={formAbrirTurno.horaFin}
                    onChange={e => setFormAbrirTurno({ ...formAbrirTurno, horaFin: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Base de Caja ($)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(formAbrirTurno.baseCaja)}
                  onChange={e => setFormAbrirTurno({ ...formAbrirTurno, baseCaja: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="$ 0"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalAbrirTurno(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={abrirTurnoDesdePos}
                  disabled={abriendoTurno}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                >
                  {abriendoTurno ? 'Abriendo...' : 'Abrir Turno'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </VentasProvider>
  );
}