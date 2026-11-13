// ============================================================
// Pantalla de ingreso (quiosco) para la entrada del gimnasio.
// Pantalla completa, oscura y grande: la persona pone la huella (o
// digita la cédula) y ve su foto, su plan, su racha, su semana y si pasa.
// Las estadísticas (racha, visitas) las calcula el servidor a partir de
// los ingresos registrados, así son iguales en cualquier equipo.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Fingerprint, Delete, CheckCircle2, XCircle, AlertTriangle, Maximize,
  Flame, Trophy, CalendarCheck, Clock3, Users, PartyPopper,
} from "lucide-react";
import FotoCliente from "../../components/clientes/FotoCliente";
import useIngreso from "./useIngreso";
import accesoService from "../../services/accesoService";
import { obtenerNivelLlama } from "../../services/gimnasio/streakService";
import { datosEmpresa } from "../../utils/empresa";
import { leerConfiguracion } from "../../utils/configuracion";
import "./acceso.css";

const VOLVER_MS = { ok: 9000, warn: 11000, bad: 11000 };
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const HITOS_VISITAS = [10, 25, 50, 75, 100, 150, 200, 250, 300, 365, 500, 750, 1000];
const HITOS_RACHA = [3, 7, 14, 30, 60];
const FRASES = [
  "La constancia le gana a la motivación.",
  "Un entrenamiento a la vez.",
  "Hoy es un buen día para superar el de ayer.",
  "Lo difícil es venir. Ya está aquí.",
  "Hidrátese y caliente antes de empezar.",
  "Pequeños avances, todos los días.",
];

function saludo(h) {
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function horaBonita(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function fechaCorta(iso, conAnio = false) {
  if (!iso) return "—";
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", ...(conAnio ? { year: "numeric" } : {}) });
}

function haceCuanto(iso) {
  if (!iso) return "Primera visita";
  const d = new Date(iso);
  const hoy = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((b - a) / 86400000);
  if (dias <= 0) return `Hoy, ${d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}`;
  if (dias === 1) return "Ayer";
  if (dias < 30) return `Hace ${dias} días`;
  return fechaCorta(iso, true);
}

/** Mensaje de celebración si esta visita cumple un hito (solo la primera del día). */
function hitoDe(resultado) {
  const s = resultado?.stats;
  if (!resultado?.granted || !s || resultado.alreadyToday) return null;
  if (s.totalDays === 1) return "¡Primer día! Bienvenido a la familia.";
  if (HITOS_RACHA.includes(s.currentStreak)) {
    return `¡${s.currentStreak} días seguidos! Nivel ${obtenerNivelLlama(s.currentStreak).nombre}.`;
  }
  if (HITOS_VISITAS.includes(s.totalDays)) return `¡Visita número ${s.totalDays}! Gracias por entrenar con nosotros.`;
  if (s.currentStreak > 1 && s.currentStreak === s.bestStreak) return "¡Está en su mejor racha!";
  return null;
}

export default function Quiosco() {
  const [cedula, setCedula] = useState("");
  const [ahora, setAhora] = useState(new Date());
  const [entrenandoHoy, setEntrenandoHoy] = useState(null);
  const [frase, setFrase] = useState(0);
  const temporizador = useRef(null);
  const gimnasio = datosEmpresa().nombre;
  const config = useMemo(() => leerConfiguracion(), []);

  const contarHoy = async () => {
    const logs = await accesoService.delDia();
    setEntrenandoHoy(new Set(logs.filter((l) => l.granted && l.clientId).map((l) => l.clientId)).size);
  };

  const { lector, resultado, setResultado, procesando, error, porCedula } = useIngreso({
    onResultado: (r) => {
      const tonoR = r?.granted ? (r?.client?.status === "POR_VENCER" ? "warn" : "ok") : "bad";
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setResultado(null), VOLVER_MS[tonoR]);
      contarHoy();
    },
  });

  useEffect(() => {
    contarHoy();
    const reloj = setInterval(() => setAhora(new Date()), 1000);
    const conteo = setInterval(contarHoy, 60 * 1000);
    const frases = setInterval(() => setFrase((f) => (f + 1) % FRASES.length), 9000);
    return () => { clearInterval(reloj); clearInterval(conteo); clearInterval(frases); clearTimeout(temporizador.current); };
  }, []);

  // Teclado físico: números, borrar y Enter
  useEffect(() => {
    const onKey = (e) => {
      if (resultado) { if (e.key === "Enter" || e.key === "Escape") setResultado(null); return; }
      if (/^\d$/.test(e.key)) setCedula((c) => (c + e.key).slice(0, 12));
      else if (e.key === "Backspace") setCedula((c) => c.slice(0, -1));
      else if (e.key === "Escape") setCedula("");
      else if (e.key === "Enter") enviar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const enviar = async () => {
    if (!cedula || procesando) return;
    const c = cedula;
    setCedula("");
    await porCedula(c);
  };

  const tecla = (k) => {
    if (k === "borrar") setCedula((c) => c.slice(0, -1));
    else if (k === "ok") enviar();
    else setCedula((c) => (c + k).slice(0, 12));
  };

  const conHuella = lector && !lector.simulado && lector.conectado;
  const c = resultado?.client;
  const s = resultado?.stats;
  const tono = resultado ? (resultado.granted ? (c?.status === "POR_VENCER" ? "warn" : "ok") : "bad") : "";
  const dias = c && (c.status === "ACTIVO" || c.status === "POR_VENCER") ? c.daysLeft : 0;
  const totalPlan = resultado?.planTotalDays || 30;
  const progreso = Math.max(0, Math.min(1, dias / totalPlan));
  const nivel = obtenerNivelLlama(s?.currentStreak || 0);
  const hito = hitoDe(resultado);
  const semanaHoy = (ahora.getDay() + 6) % 7; // 0 = lunes
  const diasSemana = s?.week?.filter(Boolean).length || 0;
  const veredicto = resultado && (
    <div className="kq-verdict">
      {resultado.granted ? (c?.status === "POR_VENCER" ? <AlertTriangle /> : <CheckCircle2 />) : <XCircle />}
      <span>{resultado.granted ? (c?.status === "POR_VENCER" ? "Acceso permitido · plan por vencer" : "Acceso permitido") : "Acceso negado"}</span>
    </div>
  );

  return (
    <div className={`kq ${tono ? `kq-${tono}` : ""}`}>
      <div className="kq-bg" aria-hidden="true" />

      <header className="kq-top">
        <div className="kq-brand">
          <div className="sg-logo kq-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
              <path d="M7 12v8M11 9v14M21 9v14M25 12v8M11 16h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span>{gimnasio}</span>
        </div>
        <div className="kq-clock">
          <strong>{ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</strong>
          <span>{capital(ahora.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }))}</span>
        </div>
        <button className="kq-full" onClick={() => window.systemGym?.quiosco?.pantallaCompleta?.() || document.documentElement.requestFullscreen?.()} title="Pantalla completa">
          <Maximize />
        </button>
      </header>

      {!resultado ? (
        <main className="kq-idle">
          <div className="kq-hello">
            <h1>{saludo(ahora.getHours())} <span className="kq-wave" aria-hidden="true">👋</span></h1>
            <p>{conHuella ? "Ponga su dedo en el lector para ingresar" : "Digite su número de cédula para ingresar"}</p>
          </div>

          <div className="kq-input-area">
            {conHuella && (
              <div className="kq-finger">
                <div className="kq-finger-ring"><Fingerprint /></div>
                <span>Lector listo</span>
              </div>
            )}
            <div className="kq-pad-wrap">
              <div className={`kq-display ${cedula ? "has" : ""} ${error ? "err" : ""}`}>
                {cedula ? cedula.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : conHuella ? "o digite su cédula" : "Cédula"}
              </div>
              {error && !cedula && <p className="kq-error" role="alert">{error}</p>}
              <div className="kq-pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "ok"].map((k) => (
                  <button
                    key={k}
                    className={`kq-key ${k === "ok" ? "kq-key-ok" : ""} ${k === "borrar" ? "kq-key-del" : ""}`}
                    onClick={() => tecla(k)}
                    disabled={k === "ok" && (!cedula || procesando)}
                    aria-label={k === "borrar" ? "Borrar" : k === "ok" ? "Ingresar" : k}
                  >
                    {k === "borrar" ? <Delete /> : k === "ok" ? (procesando ? "…" : "Ingresar") : k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className="kq-strip">
            <div className="kq-strip-item">
              <Users />
              <span>
                {entrenandoHoy == null ? "—" : <b>{entrenandoHoy}</b>}{" "}
                {entrenandoHoy === 1 ? "persona ha entrenado hoy" : "personas han entrenado hoy"}
              </span>
            </div>
            <div className="kq-strip-item">
              <Clock3 />
              <span>Horario <b>{horaBonita(config.horarioApertura)} – {horaBonita(config.horarioCierre)}</b></span>
            </div>
            <div className="kq-strip-item kq-quote" key={frase}>
              <span>{FRASES[frase]}</span>
            </div>
          </footer>
        </main>
      ) : (
        <main className="kq-result" onClick={() => setResultado(null)}>
          {!c && veredicto}

          {c ? (
            <div className="kq-panel">
              {/* Encabezado: foto, saludo y mensaje */}
              <section className="kq-head">
                <div className="kq-photo">
                  <FotoCliente id={c.id} nombre={c.fullName} version={c.photoUpdatedAt} size={170} radius={46} />
                </div>
                <div className="kq-who">
                  {veredicto}
                  <h2>{resultado.granted ? `¡Hola, ${c.fullName.split(" ")[0]}!` : c.fullName}</h2>
                  <p className="kq-msg">{resultado.message}</p>
                  {resultado.alreadyToday && resultado.lastVisit && (
                    <p className="kq-note">Ya había registrado su ingreso hoy a las {new Date(resultado.lastVisit).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}.</p>
                  )}
                  <div className="kq-chips">
                    {resultado.memberSince && <span>Miembro desde {fechaCorta(resultado.memberSince, true)}</span>}
                    <span>Última visita: {resultado.alreadyToday ? "hoy" : haceCuanto(resultado.lastVisit)}</span>
                  </div>
                </div>
              </section>

              {hito && (
                <div className="kq-hito">
                  <PartyPopper />
                  <span>{hito}</span>
                </div>
              )}

              {/* Tarjetas: plan, racha y semana */}
              <section className="kq-tiles">
                <article className="kq-tile kq-tile-plan">
                  <header><CalendarCheck /> Plan</header>
                  <div className="kq-plan">
                    <div className="kq-ring" style={{ "--p": progreso }}>
                      <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" className="kq-ring-bg" />
                        <circle cx="60" cy="60" r="52" className="kq-ring-fg" />
                      </svg>
                      <div className="kq-ring-text">
                        <strong>{dias}</strong>
                        <span>{dias === 1 ? "día" : "días"}</span>
                      </div>
                    </div>
                    <div className="kq-plan-txt">
                      <strong>{c.membershipName || "Sin plan"}</strong>
                      <span>
                        {c.status === "VENCIDO" ? "Venció el " : c.expirationDate ? "Vence el " : ""}
                        {c.expirationDate ? fechaCorta(c.expirationDate) : "Adquiéralo en recepción"}
                      </span>
                    </div>
                  </div>
                </article>

                {s && (
                  <article className="kq-tile kq-tile-racha" style={{ "--llama": nivel.color }}>
                    <header><Flame /> Racha</header>
                    <div className="kq-big">
                      <Flame className={`kq-flame ${s.currentStreak >= 3 ? "on" : ""}`} />
                      <strong>{s.currentStreak}</strong>
                      <span>{s.currentStreak === 1 ? "día" : "días"}</span>
                    </div>
                    <p className="kq-sub">
                      {s.currentStreak >= 3 ? <>Nivel <b>{nivel.nombre}</b></> : resultado.granted ? "¡Vuelva mañana para sumar!" : "Renueve para no perderla"}
                    </p>
                    <p className="kq-sub kq-dim"><Trophy /> Mejor racha: {s.bestStreak} {s.bestStreak === 1 ? "día" : "días"}</p>
                  </article>
                )}

                {s && (
                  <article className="kq-tile kq-tile-semana">
                    <header><Users /> Esta semana</header>
                    <div className="kq-week">
                      {DIAS_SEMANA.map((d, i) => (
                        <div key={i} className={`kq-day ${s.week?.[i] ? "on" : ""} ${i === semanaHoy ? "hoy" : ""}`}>
                          <span>{d}</span>
                          <i>{s.week?.[i] ? "✓" : ""}</i>
                        </div>
                      ))}
                    </div>
                    <div className="kq-counts">
                      <div><strong>{diasSemana}</strong><span>esta semana</span></div>
                      <div><strong>{s.daysThisMonth}</strong><span>este mes</span></div>
                      <div><strong>{s.totalDays}</strong><span>en total</span></div>
                    </div>
                  </article>
                )}
              </section>
            </div>
          ) : (
            <div className="kq-panel kq-card-solo">
              <p className="kq-msg">{resultado.message}</p>
            </div>
          )}

          <div className="kq-foot">
            <p className="kq-tap">Toque la pantalla para continuar</p>
            <div className="kq-timer" key={resultado.accessedAt || resultado.message}
              style={{ animationDuration: `${VOLVER_MS[tono] || 9000}ms` }} />
          </div>
        </main>
      )}
    </div>
  );
}
