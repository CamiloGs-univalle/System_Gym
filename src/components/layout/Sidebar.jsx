import useAuthStore from "../../store/authStore";

export default function Sidebar({ isOpen }) {
  const usuario = useAuthStore(state => state.usuario);
  const logout = useAuthStore(state => state.logout);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-brand">
        <span className="brand-icon">💪</span>
        <span className="brand-name">GYM SYSTEM</span>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li className="nav-item active">
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </li>
          <li className="nav-item">
            <span className="nav-icon">👥</span>
            <span className="nav-text">Clientes</span>
          </li>
          <li className="nav-item">
            <span className="nav-icon">📦</span>
            <span className="nav-text">Productos</span>
          </li>
          <li className="nav-item">
            <span className="nav-icon">💳</span>
            <span className="nav-text">Ventas</span>
          </li>
          <li className="nav-item">
            <span className="nav-icon">💰</span>
            <span className="nav-text">Caja</span>
          </li>
          <li className="nav-item">
            <span className="nav-icon">📈</span>
            <span className="nav-text">Reportes</span>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <div className="user-details">
            <span className="user-name">{usuario?.nombre || "Usuario"}</span>
            <span className="user-role">{usuario?.rol || "Sin rol"}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}