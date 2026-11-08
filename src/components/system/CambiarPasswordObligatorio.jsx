// ============================================================
// Pantalla de cambio de contraseña obligatorio.
// Aparece en el primer inicio de sesión (usuario "admin" de fábrica)
// y cuando el administrador asigna una contraseña nueva a un usuario.
// ============================================================
import { useState } from "react";
import authService from "../../services/authService";

export default function CambiarPasswordObligatorio({ usuario, onListo }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) {
      setError("La contraseña nueva debe tener al menos 8 caracteres, con letras y números.");
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      await authService.cambiarMiPassword(actual, nueva);
      onListo?.();
    } catch (err) {
      setError(err?.mensajeUsuario || err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: 8, fontSize: 14, marginTop: 4,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", padding: 16 }}>
      <form onSubmit={guardar} style={{ background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Cambie su contraseña</h1>
        <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 18 }}>
          Hola {usuario?.fullName || usuario?.username}. Por seguridad, antes de continuar debe
          reemplazar la contraseña asignada por una propia.
        </p>
        <label style={{ fontSize: 13, color: "#374151" }}>Contraseña actual
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} style={campo} autoFocus required />
        </label>
        <div style={{ height: 12 }} />
        <label style={{ fontSize: 13, color: "#374151" }}>Contraseña nueva
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} style={campo} required />
        </label>
        <div style={{ height: 12 }} />
        <label style={{ fontSize: 13, color: "#374151" }}>Repita la contraseña nueva
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} style={campo} required />
        </label>
        {error && <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <button type="submit" disabled={guardando}
          style={{ marginTop: 18, width: "100%", padding: "11px 0", background: "#1e40af", color: "#fff", border: 0, borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
          {guardando ? "Guardando..." : "Guardar y continuar"}
        </button>
        <button type="button" onClick={() => authService.logout?.() || window.location.reload()}
          style={{ marginTop: 10, width: "100%", padding: "9px 0", background: "transparent", color: "#4b5563", border: 0, cursor: "pointer", fontSize: 13 }}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
