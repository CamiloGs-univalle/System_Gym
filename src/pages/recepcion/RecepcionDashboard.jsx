// src/pages/recepcion/RecepcionDashboard.jsx
import { useState } from "react";
import useAuthStore from "../../store/authStore";
import { VentasProvider } from "../../store/ventasStore";
import ClientesPanel from "./ClientesPanel";
import POSPanel from "./POSPanel";
import ProductosPanel from "./ProductosPanel";
import CierrePanel from "./Cierrepanel";
import "../../styles/recepcionCSS/index.css";

const NAV = [
  { id: "general", label: "General" },
  { id: "clientes", label: "Clientes" },
  { id: "productos", label: "Productos" },
  { id: "cierre", label: "Cierre" }
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
    <VentasProvider>
      <div className="recepcion-fullscreen">
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
          <div className="recepcion-dashboard-content">
            {activeView === "general" && <POSPanel />}
            {activeView === "clientes" && <ClientesPanel />}
            {activeView === "productos" && <ProductosPanel />}
            {activeView === "cierre" && <CierrePanel />}
          </div>
        </main>
      </div>
    </VentasProvider>
  );
}