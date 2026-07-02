import AdminDashboard from "./pages/admin/AdminDashboard";
import Login from "./pages/Login";
import RecepcionDashboard from "./pages/recepcion/RecepcionDashboard";
import useAuthStore from "./store/authStore";

function App() {
  const usuario = useAuthStore((state) => state.usuario);

  if (!usuario) {
    return <Login />;
  }

  switch (usuario.role) {

    case "SUPER_ADMIN":
    case "ADMIN":
      return <AdminDashboard />;

    case "RECEPCION":
    case "RECEPCIONISTA":
      return <RecepcionDashboard />;

    default:
      console.log("Rol no reconocido:", usuario);
      return <Login />;
  }
}

export default App;