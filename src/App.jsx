import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Login from "./pages/Login";
import RecepcionDashboard from "./pages/recepcion/RecepcionDashboard";
import useAuthStore from "./store/authStore";
import authService from "./services/authService";
import { hidratarAlmacenamiento } from "./services/storageSync";
import CambiarPasswordObligatorio from "./components/system/CambiarPasswordObligatorio";
import EstadoLicencia from "./components/system/EstadoLicencia";

const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN", "ADMINISTRADOR"];
const ROLES_RECEPCION = ["RECEPTIONIST", "RECEPCION", "RECEPCIONISTA", "RECEPTION"];

function Cargando({ texto }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#f9fafb', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: 40, height: 40, border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>{texto}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppContent() {
  const usuario = useAuthStore((state) => state.usuario);
  const setUsuario = useAuthStore((state) => state.setUsuario);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [ready, setReady] = useState(false);
  const [datosListos, setDatosListos] = useState(false);
  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    const token = authService.getToken();
    const user = authService.getStoredUser();
    if (token && user && !usuario) {
      setUsuario(user);
    }
    setReady(true);
  }, [_hasHydrated]);

  // Cambio de contraseña obligatorio (al iniciar sesión o si el backend lo exige)
  useEffect(() => {
    setDebeCambiarPassword(usuario?.mustChangePassword === true);
    const onRequerido = () => setDebeCambiarPassword(true);
    window.addEventListener("systemgym:password-change-required", onRequerido);
    return () => window.removeEventListener("systemgym:password-change-required", onRequerido);
  }, [usuario]);

  // Al tener sesión, se descargan del servidor los datos de los módulos
  // (planes, cartera, pagos, etc.) antes de mostrar los paneles.
  useEffect(() => {
    if (!usuario || debeCambiarPassword) {
      setDatosListos(false);
      return;
    }
    let activo = true;
    hidratarAlmacenamiento().finally(() => {
      if (activo) setDatosListos(true);
    });
    return () => { activo = false; };
  }, [usuario?.id, debeCambiarPassword]);

  if (!_hasHydrated || !ready) {
    return <Cargando texto="Cargando sistema..." />;
  }

  if (!usuario) {
    return <Login />;
  }

  if (debeCambiarPassword) {
    return (
      <CambiarPasswordObligatorio
        usuario={usuario}
        onListo={() => setDebeCambiarPassword(false)}
      />
    );
  }

  if (!datosListos) {
    return <Cargando texto="Sincronizando información..." />;
  }

  const role = usuario.role?.toUpperCase() || "";

  if (ROLES_ADMIN.includes(role)) {
    return (
      <>
        <EstadoLicencia esAdmin />
        <AdminDashboard />
      </>
    );
  }

  if (ROLES_RECEPCION.includes(role)) {
    return (
      <>
        <EstadoLicencia esAdmin={false} />
        <RecepcionDashboard />
      </>
    );
  }

  return <Login />;
}

function App() {
  // Todas las rutas pasan por AppContent, que valida la sesión y el rol.
  // (Antes /admin/* y /recepcion/* mostraban los paneles sin revisar la sesión.)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
