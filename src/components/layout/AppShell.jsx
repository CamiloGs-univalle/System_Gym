// ============================================================
// Marco de la aplicación: menú lateral + barra superior.
// Lo usan Administración y Recepción.
//   secciones: [{ titulo, items: [{ id, label, icon: ComponenteLucide, badge? }] }]
// ============================================================
import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, LogOut, Menu } from "lucide-react";
import useAuthStore from "../../store/authStore";
import "./appshell.css";

const ROL = {
  ADMIN: "Administrador",
  SUPER_ADMIN: "Administrador",
  RECEPTIONIST: "Recepción",
  TRAINER: "Entrenador",
};

function iniciales(nombre = "") {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "SG";
}

function leerPreferencia() {
  try { return localStorage.getItem("sg_menu_compacto") === "1"; } catch { return false; }
}

export default function AppShell({
  secciones,
  activo,
  onCambiar,
  titulo,
  subtitulo,
  acciones,
  onSalir,
  children,
}) {
  const usuario = useAuthStore((s) => s.usuario);
  const [compacto, setCompacto] = useState(leerPreferencia);
  const [abiertoMovil, setAbiertoMovil] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("sg_menu_compacto", compacto ? "1" : "0"); } catch { /* noop */ }
  }, [compacto]);

  const nombre = usuario?.fullName || usuario?.nombre || usuario?.username || "Usuario";
  const rol = ROL[(usuario?.role || "").toUpperCase()] || usuario?.role || "";

  const elegir = (id) => {
    onCambiar(id);
    setAbiertoMovil(false);
  };

  return (
    <div className={`sg-shell ${compacto ? "is-compact" : ""} ${abiertoMovil ? "is-mobile-open" : ""}`}>
      <aside className="sg-side">
        <div className="sg-brand">
          <div className="sg-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
              <path d="M7 12v8M11 9v14M21 9v14M25 12v8M11 16h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sg-brand-text">
            <strong>System Gym</strong>
            <span>Gestión de gimnasio</span>
          </div>
        </div>

        <nav className="sg-nav">
          {secciones.map((sec) => (
            <div className="sg-nav-group" key={sec.titulo}>
              <div className="sg-nav-title">{sec.titulo}</div>
              {sec.items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    className={`sg-nav-item ${activo === it.id ? "active" : ""}`}
                    onClick={() => elegir(it.id)}
                    title={compacto ? it.label : undefined}
                  >
                    {Icon && <Icon />}
                    <span className="sg-nav-label">{it.label}</span>
                    {it.badge ? <span className="sg-nav-badge">{it.badge}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sg-side-foot">
          <div className="sg-me">
            <div className="sg-me-avatar">{iniciales(nombre)}</div>
            <div className="sg-me-text">
              <strong>{nombre}</strong>
              <span>{rol}</span>
            </div>
          </div>
          <button className="sg-nav-item sg-logout" onClick={onSalir} title="Cerrar sesión">
            <LogOut />
            <span className="sg-nav-label">Cerrar sesión</span>
          </button>
          <button className="sg-collapse" onClick={() => setCompacto(!compacto)} title={compacto ? "Expandir menú" : "Compactar menú"}>
            {compacto ? <ChevronsRight /> : <ChevronsLeft />}
          </button>
        </div>
      </aside>

      <div className="sg-backdrop" onClick={() => setAbiertoMovil(false)} />

      <div className="sg-main">
        <header className="sg-top">
          <button className="sg-burger" onClick={() => setAbiertoMovil(true)} aria-label="Abrir menú">
            <Menu />
          </button>
          <div className="sg-top-title">
            <h1>{titulo}</h1>
            <p>
              {subtitulo || (() => {
                const t = ahora.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
                return t.charAt(0).toUpperCase() + t.slice(1);
              })()}
              {" · "}
              {ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="sg-top-actions">{acciones}</div>
        </header>
        <main className="sg-content">{children}</main>
      </div>
    </div>
  );
}
