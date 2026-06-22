import useAuthStore from "../../store/authStore";

export default function Header({ onToggleSidebar }) {
  const usuario = useAuthStore(state => state.usuario);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          ☰
        </button>
        <h1>Panel de Recepción</h1>
      </div>

      <div className="header-right">
        <span className="header-date">
          📅 {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
        <div className="header-user">
          <span className="user-avatar-small">👤</span>
          <span className="user-name-small">{usuario?.nombre || "Usuario"}</span>
        </div>
      </div>
    </header>
  );
}