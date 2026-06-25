import AdminDashboard from "./pages/admin/AdminDashboard";
import Login from "./pages/Login";
import RecepcionDashboard from "./pages/recepcion/RecepcionDashboard";
import useAuthStore from "./store/authStore";

function App() {
  const usuario = useAuthStore(state => state.usuario);

  if (!usuario) {
    return <Login />;
  }

  switch (usuario.rol) {
    case "superadmin":
    case "admin":
      // Temporalmente mostramos Recepción mientras construimos los otros módulos
      return <AdminDashboard />;
    case "recepcion":
      return <RecepcionDashboard />;
    default:
      return <Login />;
  }
}

export default App;