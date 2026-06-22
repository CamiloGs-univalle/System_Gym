import { useState } from "react";
import { authService } from "../../services/authService";
import useAuthStore from "../../store/authStore";

export default function LoginPanel() {
  const loginStore = useAuthStore((state) => state.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // Validación básica
    if (!username.trim() || !password.trim()) {
      setError("Por favor complete todos los campos");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await authService.login(username, password);

      if (!user) {
        setError("Usuario o contraseña incorrectos");
        return;
      }

      loginStore(user);
    } catch (err) {
      setError("Error al iniciar sesión. Intente nuevamente.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <section className="login-panel">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>

        <div className="form-group">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ingrese usuario"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ingrese contraseña"
            disabled={isLoading}
          />
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "Cargando..." : "INGRESAR"}
        </button>
      </div>
    </section>
  );
}