// ============================================================================
// LoginPanel.jsx
// ============================================================================
// Componente de inicio de sesión.
//
// Responsabilidades:
// - Capturar usuario y contraseña.
// - Validar campos obligatorios.
// - Invocar el login del store (Zustand).
// - Mostrar errores de autenticación.
// - Mostrar estado de carga.
//
// Flujo:
//
// Usuario escribe credenciales
//          ↓
// handleLogin()
//          ↓
// authStore.login()
//          ↓
// authService.login()
//          ↓
// POST /api/auth/login
//          ↓
// Backend devuelve JWT + usuario
//          ↓
// Zustand guarda sesión
// ============================================================================

import { useState } from "react";
import useAuthStore from "../../store/authStore";

export default function LoginPanel() {

  // ==========================================================================
  // Obtiene la función login del store global
  // ==========================================================================
  const login = useAuthStore((state) => state.login);

  // ==========================================================================
  // Estados locales del formulario
  // ==========================================================================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Mensaje de error para mostrar en pantalla
  const [error, setError] = useState("");

  // Control de carga
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================================================
  // Procesar login
  // ==========================================================================
  const handleLogin = async () => {

    // ------------------------------------------------------------------------
    // Validación básica
    // ------------------------------------------------------------------------
    if (!username.trim() || !password.trim()) {
      setError("Por favor complete todos los campos");
      return;
    }

    setError("");
    setIsLoading(true);

    try {

      // ----------------------------------------------------------------------
      // DEBUG
      // ----------------------------------------------------------------------
      console.log("Intentando iniciar sesión");

      console.log({
        username,
        password,
      });

      // ----------------------------------------------------------------------
      // El store espera un objeto:
      //
      // {
      //   username,
      //   password
      // }
      // ----------------------------------------------------------------------
      await login({
        username,
        password,
      });

      console.log("Login exitoso");

    } catch (err) {

      console.error("Error login:", err);

      setError(
        err?.details?.message ||
        err?.message ||
        "Usuario o contraseña incorrectos"
      );

    } finally {

      setIsLoading(false);

    }
  };

  // ==========================================================================
  // Permitir Enter para iniciar sesión
  // ==========================================================================
  const handleKeyDown = (e) => {

    if (e.key === "Enter") {
      handleLogin();
    }

  };

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <section className="login-panel">

      <div className="login-card">

        <h2>Iniciar Sesión</h2>

        {/* ================================================================ */}
        {/* Usuario */}
        {/* ================================================================ */}
        <div className="form-group">

          <label htmlFor="username">
            Usuario
          </label>

          <input
            id="username"
            type="text"
            placeholder="Ingrese usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />

        </div>

        {/* ================================================================ */}
        {/* Contraseña */}
        {/* ================================================================ */}
        <div className="form-group">

          <label htmlFor="password">
            Contraseña
          </label>

          <input
            id="password"
            type="password"
            placeholder="Ingrese contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />

        </div>

        {/* ================================================================ */}
        {/* Error */}
        {/* ================================================================ */}
        {error && (
          <p
            className="error-message"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* ================================================================ */}
        {/* Botón */}
        {/* ================================================================ */}
        <button
          className="login-button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading
            ? "Cargando..."
            : "INGRESAR"}
        </button>

      </div>

    </section>
  );
}