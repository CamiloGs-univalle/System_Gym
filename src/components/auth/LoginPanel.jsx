// src/pages/Login.jsx (o LoginPanel.jsx)
// ============================================================================
// LoginPanel.jsx
// ============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function LoginPanel() {

  // ==========================================================================
  // Obtiene el estado y funciones del store
  // ==========================================================================
  const login = useAuthStore((state) => state.login);
  const usuario = useAuthStore((state) => state.usuario);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const errorStore = useAuthStore((state) => state.error);
  const hydrate = useAuthStore((state) => state.hydrate); // ← CORREGIDO: usar hydrate en lugar de restoreSession
  const clearError = useAuthStore((state) => state.clearError);

  // ==========================================================================
  // Navegación
  // ==========================================================================
  const navigate = useNavigate();

  // ==========================================================================
  // Estados locales del formulario
  // ==========================================================================
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ==========================================================================
  // Efecto: Restaurar sesión al cargar
  // ==========================================================================
  useEffect(() => {
    console.log("=================================");
    console.log("LOGIN PANEL - Inicializando");
    console.log("=================================");
    
    // CORREGIDO: usar hydrate en lugar de restoreSession
    const restored = hydrate();
    console.log("Sesión restaurada:", restored);
    
    // Si ya hay usuario, redirigir
    if (restored && usuario) {
      console.log("Usuario existente, redirigiendo...");
      redirigirPorRol(usuario);
    }
  }, []); // ← Asegurar que solo se ejecute una vez

  // ==========================================================================
  // Efecto: Redirigir cuando el usuario cambia (login exitoso)
  // ==========================================================================
  useEffect(() => {
    if (usuario && isAuthenticated) {
      console.log("Login detectado, redirigiendo...");
      redirigirPorRol(usuario);
    }
  }, [usuario, isAuthenticated]);

  // ==========================================================================
  // Función para redirigir según el rol
  // ==========================================================================
  const redirigirPorRol = (user) => {
    const role = user?.role?.toUpperCase() || "";
    console.log("=================================");
    console.log("REDIRIGIENDO POR ROL");
    console.log("=================================");
    console.log("Usuario:", user.username);
    console.log("Rol:", role);

    if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "ADMINISTRADOR") {
      console.log("✅ Redirigiendo a /admin/dashboard");
      navigate("/admin/dashboard", { replace: true });
    } else if (role === "RECEPTIONIST" || role === "RECEPCION" || role === "RECEPCIONISTA" || role === "RECEPTION") {
      console.log("✅ Redirigiendo a /recepcion/dashboard");
      navigate("/recepcion/dashboard", { replace: true });
    } else {
      console.warn("⚠️ Rol no reconocido:", role);
      setError(`Rol no reconocido: ${role}. Contacta al administrador.`);
    }
  };

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

    // Limpiar errores
    setError("");
    clearError();

    console.log("=================================");
    console.log("LOGIN PANEL - Intentando iniciar sesión");
    console.log("=================================");
    console.log({
      username,
      password,
    });

    try {
      // ----------------------------------------------------------------------
      // Llamar al store con las credenciales
      // ----------------------------------------------------------------------
      const user = await login({
        username,
        password,
      });

      console.log("Login exitoso:", user);
      // La redirección se maneja en el useEffect

    } catch (err) {

      console.error("Error en login:", err);

      // Mostrar error del store o el mensaje del error
      const mensajeError = 
        err?.message ||
        err?.details?.message ||
        "Usuario o contraseña incorrectos";
      
      setError(mensajeError);

    }
  };

  // ==========================================================================
  // Permitir Enter para iniciar sesión
  // ==========================================================================
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
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
            disabled={loading}
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
            disabled={loading}
          />

        </div>

        {/* ================================================================ */}
        {/* Error */}
        {/* ================================================================ */}
        {(error || errorStore) && (
          <p
            className="error-message"
            role="alert"
          >
            ❌ {error || errorStore}
          </p>
        )}

        {/* ================================================================ */}
        {/* Botón */}
        {/* ================================================================ */}
        <button
          className="login-button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading
            ? "⏳ Cargando..."
            : "🚪 INGRESAR"}
        </button>

      </div>

    </section>
  );
}