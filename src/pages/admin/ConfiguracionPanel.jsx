// ============================================================
// Configuración del sistema
// ------------------------------------------------------------
// - Todo se edita directamente; al haber cambios aparece una barra para
//   guardar o descartar (antes había que pulsar "Editar" en la parte de
//   arriba y era fácil no verlo).
// - "Planes y precios" administra los planes reales (los que usan la caja,
//   clientes y renovaciones): agregar, cambiar, activar/desactivar y borrar.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Building2, Tags, Clock3, CalendarClock, Bell, DatabaseBackup, Smartphone,
  Plus, Trash2, Save, Undo2, CheckCircle2, Info,
} from "lucide-react";
import { guardarSincronizado } from "../../services/storageSync";
import { planesService } from "../../services/gimnasio/planesService";
import { CONFIG_DEFAULT, leerConfiguracion } from "../../utils/configuracion";
import RespaldosCard from "../../components/system/RespaldosCard";
import PanelWebCard from "../../components/system/PanelWebCard";
import "./configuracion.css";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SECCIONES = [
  { id: "general", label: "Datos del gimnasio", icon: Building2, guarda: true },
  { id: "planes", label: "Planes y precios", icon: Tags, guarda: true },
  { id: "horario", label: "Horario", icon: Clock3, guarda: true },
  { id: "turnos", label: "Horario de turnos", icon: CalendarClock, guarda: true },
  { id: "avisos", label: "Avisos", icon: Bell, guarda: true },
  { id: "respaldos", label: "Respaldos", icon: DatabaseBackup },
  { id: "panel", label: "Panel web (celular)", icon: Smartphone },
];

const TURNOS = [
  { key: "turnoCompleto", label: "Turno completo" },
  { key: "medioTurno", label: "Medio turno" },
  { key: "turnoTarde", label: "Turno tarde" },
];

const TIPOS_PLAN = [
  { id: "MEMBRESIA", label: "Membresía (da acceso al gimnasio)" },
  { id: "SERVICIO", label: "Servicio (entrenador, nutrición…)" },
];

const copia = (v) => JSON.parse(JSON.stringify(v));
const soloNumero = (v) => Number(String(v).replace(/\D/g, "")) || 0;
const pesos = (v) => (v ? Number(v).toLocaleString("es-CO") : "");

function Campo({ label, ayuda, children, ancho }) {
  return (
    <label className={`cfg-campo ${ancho ? "ancho" : ""}`}>
      <span className="cfg-label">{label}</span>
      {children}
      {ayuda && <small className="cfg-ayuda">{ayuda}</small>}
    </label>
  );
}

export default function ConfiguracionPanel() {
  const [seccion, setSeccion] = useState("general");
  const [guardado, setGuardado] = useState(() => leerConfiguracion());
  const [form, setForm] = useState(() => leerConfiguracion());
  const [planesGuardados, setPlanesGuardados] = useState(() => planesService.listar());
  const [planes, setPlanes] = useState(() => copia(planesService.listar()));
  const [mensaje, setMensaje] = useState(null);
  const [errores, setErrores] = useState([]);

  const cambiosConfig = JSON.stringify(form) !== JSON.stringify(guardado);
  const cambiosPlanes = JSON.stringify(planes) !== JSON.stringify(planesGuardados);
  const hayCambios = cambiosConfig || cambiosPlanes;

  // Avisa si intenta salir de la app con cambios sin guardar
  useEffect(() => {
    const antes = (e) => { if (hayCambios) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [hayCambios]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setGrupo = (grupo, campo, valor) => setForm((f) => ({ ...f, [grupo]: { ...f[grupo], [campo]: valor } }));
  const setTurno = (key, campo, valor) =>
    setForm((f) => ({ ...f, turnos: { ...f.turnos, [key]: { ...f.turnos[key], [campo]: valor } } }));

  // ---------------- Planes ----------------
  const setPlan = (id, campo, valor) =>
    setPlanes((lista) => lista.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));

  const agregarPlan = () => {
    const id = Math.max(0, ...planes.map((p) => Number(p.id) || 0)) + 1;
    setPlanes((lista) => [...lista, {
      id, nombre: "", tipo: "MEMBRESIA", categoria: "MUSCULACION", precio: 0, duracion: 30,
      unidadDuracion: "DIAS", renovacion: "MANUAL", accesosIncluidos: [], serviciosIncluidos: [],
      horarioPermitido: null, sedePrincipal: "PRINCIPAL", comisionEntrenador: 0, iva: "EXENTO",
      estado: "ACTIVO", creadoEn: new Date().toISOString(), _nuevo: true,
    }]);
    setSeccion("planes");
  };

  const borrarPlan = (p) => {
    const nombre = p.nombre || "este plan";
    if (!window.confirm(`¿Borrar ${nombre}? Los clientes que ya lo pagaron conservan su plan; solo deja de ofrecerse.`)) return;
    setPlanes((lista) => lista.filter((x) => x.id !== p.id));
  };

  // ---------------- Validación y guardado ----------------
  const validar = () => {
    const e = [];
    if (!form.nombreGimnasio.trim()) e.push("Escriba el nombre del gimnasio (aparece en desprendibles y reportes).");
    planes.forEach((p, i) => {
      const n = p.nombre?.trim() || `Plan ${i + 1}`;
      if (!p.nombre?.trim()) e.push(`El plan ${i + 1} no tiene nombre.`);
      if (!(Number(p.precio) > 0)) e.push(`${n}: el precio debe ser mayor a cero.`);
      if (!(Number(p.duracion) > 0)) e.push(`${n}: la duración debe ser de al menos 1.`);
    });
    const nombres = planes.map((p) => p.nombre?.trim().toLowerCase()).filter(Boolean);
    if (new Set(nombres).size !== nombres.length) e.push("Hay dos planes con el mismo nombre.");
    TURNOS.forEach(({ key, label }) => {
      const t = form.turnos[key];
      if (!t.horaInicio || !t.horaFin) e.push(`${label}: indique hora de inicio y fin.`);
    });
    if (!form.horarioApertura || !form.horarioCierre) e.push("Indique la hora de apertura y de cierre.");
    return e;
  };

  const guardar = () => {
    const e = validar();
    setErrores(e);
    if (e.length) {
      setMensaje({ tipo: "error", texto: "Revise los datos marcados antes de guardar." });
      return;
    }
    const cfg = { ...form, actualizadoEn: new Date().toISOString() };
    guardarSincronizado("gym_configuracion", cfg);
    const limpios = planes.map(({ _nuevo, ...p }) => ({
      ...p,
      nombre: p.nombre.trim(),
      precio: Number(p.precio) || 0,
      duracion: Number(p.duracion) || 1,
      actualizadoEn: new Date().toISOString(),
    }));
    planesService.guardarTodos(limpios);
    setGuardado(cfg);
    setForm(cfg);
    setPlanesGuardados(limpios);
    setPlanes(copia(limpios));
    setMensaje({ tipo: "ok", texto: "Cambios guardados." });
    setTimeout(() => setMensaje(null), 4000);
  };

  const descartar = () => {
    setForm(copia(guardado));
    setPlanes(copia(planesGuardados));
    setErrores([]);
    setMensaje(null);
  };

  const ultimaModificacion = useMemo(() => (guardado.actualizadoEn
    ? new Date(guardado.actualizadoEn).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
    : null), [guardado.actualizadoEn]);

  // ---------------- Secciones ----------------
  const vistaGeneral = () => (
    <>
      <p className="cfg-intro">Estos datos aparecen en los desprendibles de pago, los reportes y el panel web.</p>
      <div className="cfg-grid">
        <Campo label="Nombre del gimnasio *">
          <input className="sg-input" value={form.nombreGimnasio} onChange={(e) => set("nombreGimnasio", e.target.value)} placeholder="Ej: Gimnasio Titán" />
        </Campo>
        <Campo label="NIT">
          <input className="sg-input" value={form.nit} onChange={(e) => set("nit", e.target.value)} placeholder="900.123.456-7" />
        </Campo>
        <Campo label="Dirección" ancho>
          <input className="sg-input" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle, número, ciudad" />
        </Campo>
        <Campo label="Teléfono">
          <input className="sg-input" inputMode="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
        </Campo>
        <Campo label="Correo">
          <input className="sg-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Campo>
      </div>
    </>
  );

  const vistaPlanes = () => (
    <>
      <div className="cfg-head-acciones">
        <p className="cfg-intro">
          Son los planes que se cobran en la caja y al registrar o renovar clientes. Desactivar un plan lo oculta
          sin borrarlo; los clientes que ya lo tienen no se afectan.
        </p>
        <button className="sg-btn sg-btn-primary" onClick={agregarPlan}><Plus /> Agregar plan</button>
      </div>

      {planes.length === 0 ? (
        <div className="cfg-vacio">No hay planes. Agregue el primero.</div>
      ) : (
        <div className="cfg-planes">
          <div className="cfg-plan cfg-plan-titulos" aria-hidden="true">
            <span>Nombre</span><span>Tipo</span><span>Duración (días)</span><span>Precio</span><span>Estado</span><span />
          </div>
          {planes.map((p) => {
            const activo = p.estado !== "INACTIVO";
            return (
              <div key={p.id} className={`cfg-plan ${activo ? "" : "inactivo"} ${p._nuevo ? "nuevo" : ""}`}>
                <input className="sg-input" aria-label="Nombre del plan" value={p.nombre}
                  onChange={(e) => setPlan(p.id, "nombre", e.target.value)} placeholder="Ej: Mensual" autoFocus={p._nuevo} />
                <select className="sg-select" aria-label="Tipo" value={p.tipo || "MEMBRESIA"} onChange={(e) => setPlan(p.id, "tipo", e.target.value)}>
                  {TIPOS_PLAN.map((t) => <option key={t.id} value={t.id}>{t.id === "MEMBRESIA" ? "Membresía" : "Servicio"}</option>)}
                </select>
                <input className="sg-input" aria-label="Duración en días" inputMode="numeric" value={p.duracion || ""}
                  onChange={(e) => setPlan(p.id, "duracion", soloNumero(e.target.value))} />
                <div className="cfg-precio">
                  <span>$</span>
                  <input className="sg-input" aria-label="Precio" inputMode="numeric" value={pesos(p.precio)}
                    onChange={(e) => setPlan(p.id, "precio", soloNumero(e.target.value))} placeholder="0" />
                </div>
                <button className={`cfg-switch ${activo ? "on" : ""}`} role="switch" aria-checked={activo}
                  onClick={() => setPlan(p.id, "estado", activo ? "INACTIVO" : "ACTIVO")}>
                  <span /> {activo ? "Activo" : "Inactivo"}
                </button>
                <button className="cfg-borrar" onClick={() => borrarPlan(p)} aria-label={`Borrar ${p.nombre || "plan"}`} title="Borrar plan">
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="cfg-nota"><Info /> En la caja solo aparecen los planes de tipo <b>Membresía</b> que estén <b>activos</b>.</p>
    </>
  );

  const vistaHorario = () => (
    <>
      <p className="cfg-intro">Horario de atención del gimnasio (informativo).</p>
      <div className="cfg-grid">
        <Campo label="Abre a las">
          <input className="sg-input" type="time" value={form.horarioApertura} onChange={(e) => set("horarioApertura", e.target.value)} />
        </Campo>
        <Campo label="Cierra a las">
          <input className="sg-input" type="time" value={form.horarioCierre} onChange={(e) => set("horarioCierre", e.target.value)} />
        </Campo>
      </div>
      <span className="cfg-label">Días que abre</span>
      <div className="cfg-dias">
        {DIAS_SEMANA.map((dia) => {
          const on = form.diasLaborales.includes(dia);
          return (
            <button key={dia} className={`cfg-dia ${on ? "on" : ""}`} aria-pressed={on}
              onClick={() => set("diasLaborales", on ? form.diasLaborales.filter((d) => d !== dia) : [...form.diasLaborales, dia])}>
              {dia.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </>
  );

  const vistaTurnos = () => (
    <>
      <p className="cfg-intro">
        Horas por defecto de cada tipo de turno de caja. Se usan al abrir un turno y en el calendario de turnos.
      </p>
      <div className="cfg-turnos">
        {TURNOS.map(({ key, label }) => (
          <div key={key} className="cfg-turno">
            <strong>{label}</strong>
            <div className="cfg-grid dos">
              <Campo label="Inicio">
                <input className="sg-input" type="time" value={form.turnos[key].horaInicio} onChange={(e) => setTurno(key, "horaInicio", e.target.value)} />
              </Campo>
              <Campo label="Fin">
                <input className="sg-input" type="time" value={form.turnos[key].horaFin} onChange={(e) => setTurno(key, "horaFin", e.target.value)} />
              </Campo>
            </div>
          </div>
        ))}
      </div>
      <p className="cfg-nota"><Info /> Los tres tipos de turno son fijos del sistema; aquí se ajustan sus horas.</p>
    </>
  );

  const vistaAvisos = () => (
    <div className="cfg-grid">
      <Campo label="Plan por vencer" ayuda="Desde cuántos días antes del vencimiento el cliente aparece como «por vencer» en Clientes y en la Caja.">
        <div className="cfg-numero">
          <input className="sg-input" inputMode="numeric" value={form.notificaciones.diasAnticipacion}
            onChange={(e) => setGrupo("notificaciones", "diasAnticipacion", soloNumero(e.target.value))} />
          <span>días</span>
        </div>
      </Campo>
      <Campo label="Poco inventario" ayuda="En la Caja, un producto se marca en naranja cuando quedan estas unidades o menos.">
        <div className="cfg-numero">
          <input className="sg-input" inputMode="numeric" value={form.notificaciones.stockMinimoGlobal}
            onChange={(e) => setGrupo("notificaciones", "stockMinimoGlobal", soloNumero(e.target.value))} />
          <span>unidades</span>
        </div>
      </Campo>
    </div>
  );

  const vistas = {
    general: vistaGeneral, planes: vistaPlanes, horario: vistaHorario, turnos: vistaTurnos,
    avisos: vistaAvisos, respaldos: () => <RespaldosCard />, panel: () => <PanelWebCard />,
  };
  const actual = SECCIONES.find((s) => s.id === seccion);

  return (
    <div className="cfg">
      <nav className="cfg-nav" aria-label="Secciones de configuración">
        {SECCIONES.map((s) => (
          <button key={s.id} className={`cfg-nav-item ${seccion === s.id ? "on" : ""}`} onClick={() => setSeccion(s.id)}>
            <s.icon /> <span>{s.label}</span>
            {s.id === "planes" && cambiosPlanes && <i className="cfg-punto" title="Cambios sin guardar" />}
            {s.guarda && s.id !== "planes" && cambiosConfig && seccionCambiada(s.id, form, guardado) && <i className="cfg-punto" title="Cambios sin guardar" />}
          </button>
        ))}
        {ultimaModificacion && <p className="cfg-modificado">Guardado el {ultimaModificacion}</p>}
      </nav>

      <section className="cfg-contenido">
        <header className="cfg-titulo">
          <actual.icon />
          <h2>{actual.label}</h2>
        </header>

        {errores.length > 0 && (
          <ul className="cfg-errores" role="alert">
            {errores.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        {vistas[seccion]()}
      </section>

      {(hayCambios || mensaje) && (
        <div className={`cfg-barra ${mensaje?.tipo === "ok" && !hayCambios ? "ok" : ""}`} role="status">
          {hayCambios ? (
            <>
              <span>{mensaje?.tipo === "error" ? mensaje.texto : "Tiene cambios sin guardar"}</span>
              <button className="sg-btn sg-btn-ghost" onClick={descartar}><Undo2 /> Descartar</button>
              <button className="sg-btn sg-btn-primary" onClick={guardar}><Save /> Guardar cambios</button>
            </>
          ) : (
            <span><CheckCircle2 /> {mensaje.texto}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Qué sección tiene cambios (para marcarla con un punto en el menú) */
function seccionCambiada(id, a, b) {
  const campos = {
    general: ["nombreGimnasio", "nit", "direccion", "telefono", "email"],
    horario: ["horarioApertura", "horarioCierre", "diasLaborales"],
    turnos: ["turnos"],
    avisos: ["notificaciones"],
  }[id] || [];
  return campos.some((c) => JSON.stringify(a[c]) !== JSON.stringify(b[c]));
}

export { CONFIG_DEFAULT };
