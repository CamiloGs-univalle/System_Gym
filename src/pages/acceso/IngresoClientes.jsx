// ============================================================
// Ingreso de clientes en recepción:
//   - Cédula o huella → muestra foto, plan, días restantes y si puede pasar.
//   - Lista de los ingresos de hoy.
//   - Botón para abrir la pantalla de ingreso (quiosco) en otro monitor.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Fingerprint, IdCard, MonitorUp, CheckCircle2, XCircle, AlertTriangle, Search, Users } from "lucide-react";
import accesoService from "../../services/accesoService";
import FotoCliente from "../../components/clientes/FotoCliente";
import useIngreso, { ESTADO } from "./useIngreso";
import "./acceso.css";

const hora = (s) => new Date(s).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const METODO = { FINGERPRINT: "Huella", DNI: "Cédula", MANUAL: "Manual" };

export default function IngresoClientes() {
  const [cedula, setCedula] = useState("");
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState("");
  const input = useRef(null);

  const recargar = async () => setRegistros(await accesoService.delDia());

  const { lector, resultado, procesando, error, porCedula } = useIngreso({
    onResultado: () => recargar(),
  });

  useEffect(() => {
    recargar();
    input.current?.focus();
    const t = setInterval(recargar, 30000);
    return () => clearInterval(t);
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    if (!cedula.trim()) return;
    await porCedula(cedula);
    setCedula("");
    input.current?.focus();
  };

  const abrirQuiosco = async () => {
    if (window.systemGym?.quiosco) {
      const r = await window.systemGym.quiosco.abrir();
      if (r && !r.monitorExterno) {
        alert("No se detectó un segundo monitor: la pantalla de ingreso se abrió en una ventana. Arrástrela al monitor de la entrada.");
      }
    } else {
      window.open(`${window.location.pathname}?modo=quiosco`, "_blank");
    }
  };

  const permitidos = registros.filter((r) => r.granted);
  const unicos = new Set(permitidos.map((r) => r.clientId)).size;
  const negados = registros.length - permitidos.length;
  const lista = useMemo(
    () => registros.filter((r) => !filtro || (r.clientName || "").toLowerCase().includes(filtro.toLowerCase())),
    [registros, filtro]
  );

  const c = resultado?.client;
  const est = c ? ESTADO[c.status] || ESTADO.SIN_PLAN : null;

  return (
    <div className="ing-wrap">
      <div className="ing-left">
        <form className="sg-card ing-entry" onSubmit={enviar}>
          <div className="ing-entry-head">
            <div>
              <h2 className="sg-card-title">Registrar ingreso</h2>
              <p className="sg-card-sub">
                {lector && !lector.simulado && lector.conectado
                  ? "El lector de huella está escuchando. También puede escribir la cédula."
                  : "Escriba la cédula del cliente y presione Enter."}
              </p>
            </div>
            <span className={`sg-chip ${lector && !lector.simulado && lector.conectado ? "ok" : "warn"}`}>
              <span className="dot" />
              <Fingerprint />
              {lector && !lector.simulado && lector.conectado ? `Lector ${lector.proveedor}` : "Sin lector"}
            </span>
          </div>
          <div className="ing-input">
            <IdCard />
            <input
              ref={input}
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Número de cédula"
              inputMode="numeric"
              autoComplete="off"
            />
            <button className="sg-btn sg-btn-primary sg-btn-lg" disabled={procesando || !cedula}>
              {procesando ? "Verificando…" : "Verificar"}
            </button>
          </div>
          {error && <div className="sg-alert sg-alert-danger" style={{ marginTop: 12 }}>{error}</div>}
        </form>

        <div className={`sg-card ing-result ${resultado ? (resultado.granted ? (c?.status === "POR_VENCER" ? "warn" : "ok") : "bad") : "idle"}`}>
          {!resultado ? (
            <div className="ing-idle">
              <div className="ing-idle-icon"><Fingerprint /></div>
              <strong>Esperando ingreso</strong>
              <span>Aquí aparece la foto, el plan y si la persona puede pasar.</span>
            </div>
          ) : (
            <>
              <div className="ing-verdict">
                {resultado.granted
                  ? (c?.status === "POR_VENCER" ? <AlertTriangle /> : <CheckCircle2 />)
                  : <XCircle />}
                <span>{resultado.granted ? "Puede pasar" : "No puede pasar"}</span>
              </div>
              {c ? (
                <div className="ing-person">
                  <FotoCliente id={c.id} nombre={c.fullName} version={c.photoUpdatedAt} size={132} radius={32} />
                  <div className="ing-person-data">
                    <h3>{c.fullName}</h3>
                    <p>Cédula {c.dni}</p>
                    <div className="ing-tags">
                      <span className={`sg-badge ${est.clase === "ok" ? "sg-badge-success" : est.clase === "warn" ? "sg-badge-warning" : "sg-badge-danger"}`}>{est.texto}</span>
                      {c.membershipName && <span className="sg-badge sg-badge-plain sg-badge-info">{c.membershipName}</span>}
                    </div>
                  </div>
                  <div className="ing-days">
                    <strong>{c.status === "VENCIDO" || c.status === "SIN_PLAN" ? 0 : c.daysLeft}</strong>
                    <span>días</span>
                  </div>
                </div>
              ) : null}
              <p className="ing-message">{resultado.message}</p>
              {c && (
                <div className="ing-meta">
                  <span>Vence: <b>{c.expirationDate ? new Date(`${c.expirationDate}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "—"}</b></span>
                  <span>Visitas este mes: <b>{resultado.visitsThisMonth}</b></span>
                  {resultado.lastVisit && <span>Última visita: <b>{new Date(resultado.lastVisit).toLocaleDateString("es-CO")}</b></span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="ing-right">
        <div className="ing-stats">
          <div className="sg-stat"><div className="sg-stat-icon"><Users /></div><div className="sg-stat-value">{unicos}</div><div className="sg-stat-label">Personas hoy</div></div>
          <div className="sg-stat"><div className="sg-stat-icon" style={{ background: "var(--sg-danger-50)", color: "#c42b2b" }}><XCircle /></div><div className="sg-stat-value">{negados}</div><div className="sg-stat-label">Ingresos negados</div></div>
        </div>

        <button className="sg-btn sg-btn-dark sg-btn-lg ing-kiosk" onClick={abrirQuiosco}>
          <MonitorUp /> Abrir pantalla de ingreso
        </button>

        <div className="sg-card ing-log">
          <div className="sg-row" style={{ marginBottom: 10 }}>
            <h3 className="sg-card-title" style={{ margin: 0 }}>Ingresos de hoy</h3>
            <span className="sg-spacer" />
          </div>
          <div className="ing-search">
            <Search />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre" />
          </div>
          <div className="ing-log-list">
            {lista.length === 0 ? (
              <div className="sg-empty"><Fingerprint /><span>Todavía no hay ingresos hoy.</span></div>
            ) : lista.map((r) => (
              <div key={r.id} className="ing-log-item">
                <span className={`ing-dot ${r.granted ? "ok" : "bad"}`} />
                <div className="ing-log-text">
                  <strong>{r.clientName || "No identificado"}</strong>
                  <span>{METODO[r.method] || r.method}{!r.granted ? " · negado" : ""}</span>
                </div>
                <time>{hora(r.accessedAt)}</time>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
