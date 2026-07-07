// src/pages/recepcion/RecepcionDashboard.jsx (versión sin reload)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // Efecto para redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated || !usuario) {
      console.log("🔒 No autenticado, redirigiendo al login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, usuario, navigate]);

  const handleLogout = () => {
    if (!window.confirm("¿Deseas cerrar sesión?")) return;

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

  return (
    <VentasProvider>
      <div className="recepcion-fullscreen">
        <header className="recepcion-topbar">
          <div className="recepcion-topbar-left">
            <span className="recepcion-logo">💪</span>
            <div className="recepcion-topbar-textos">
              <span className="recepcion-fecha">📅 {fechaHoy()}</span>
              <span className="recepcion-usuario-nombre">
                {usuario?.fullName || usuario?.nombre || usuario?.username || "Recepcionista"}
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
            <button 
              className="recepcion-logout" 
              onClick={handleLogout} 
              title="Cerrar sesión"
            >
              🚪 Salir
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