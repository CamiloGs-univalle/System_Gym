// src/App.jsx (versión completa con Router)
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Login from "./pages/Login";
import RecepcionDashboard from "./pages/recepcion/RecepcionDashboard";
import useAuthStore from "./store/authStore";
import authService from "./services/authService";

function AppContent() {
  const usuario = useAuthStore((state) => state.usuario);
  const setUsuario = useAuthStore((state) => state.setUsuario);

  // Restaurar sesión
  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getStoredUser();
    
    if (token && user && !usuario) {
      console.log("🔄 RESTAURANDO SESIÓN");
      setUsuario(user);
    }
  }, []);

  if (!usuario) {
    return <Login />;
  }

  const role = usuario.role?.toUpperCase() || "";

  // Roles de administrador
  if (["ADMIN", "SUPER_ADMIN", "ADMINISTRADOR"].includes(role)) {
    return <AdminDashboard />;
  }

  // Roles de recepcionista
  if (["RECEPTIONIST", "RECEPCION", "RECEPCIONISTA", "RECEPTION"].includes(role)) {
    return <RecepcionDashboard />;
  }

  console.warn("⚠️ Rol no reconocido:", usuario.role);
  return <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/recepcion/*" element={<RecepcionDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;