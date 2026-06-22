import { useState } from "react";
import useAuthStore from "../../store/authStore";
import ClientesPanel from "./ClientesPanel";
import POSPanel from "./POSPanel";
import ProductosPanel from "./ProductosPanel";
import "../../styles/index.css";

const NAV = [
  { id: "general", label: "General" },
  { id: "clientes", label: "Clientes" },
  { id: "productos", label: "Productos" }
];

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
  const [activeView, setActiveView] = useState("general");
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="recepcion-fullscreen">
      {/* Header tipo wireframe: logo+fecha+nombre a la izquierda, navegación a la derecha */}
      <header className="recepcion-topbar">
        <div className="recepcion-topbar-left">
          <span className="recepcion-logo">💪</span>
          <div className="recepcion-topbar-textos">
            <span className="recepcion-fecha">📅 {fechaHoy()}</span>
            <span className="recepcion-usuario-nombre">
              {usuario?.nombre || "Recepcionista"}
            </span>
          </div>
        </div>

        <nav className="recepcion-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-pill ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="recepcion-logout" onClick={logout} title="Cerrar sesión">
            🚪
          </button>
        </nav>
      </header>

      <main className="recepcion-dashboard">
        {activeView === "general" && <POSPanel />}
        {activeView === "clientes" && <ClientesPanel />}
        {activeView === "productos" && <ProductosPanel />}
      </main>
    </div>
  );
}