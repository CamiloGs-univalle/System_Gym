// ============================================================================
// src/services/authService.js
// ============================================================================
// Servicio centralizado de autenticación.
//
// Responsabilidades:
// - Iniciar sesión contra el backend.
// - Guardar JWT en localStorage.
// - Guardar información del usuario en localStorage y Zustand.
// - Recuperar token.
// - Cerrar sesión.
// - Verificar autenticación.
//
// Backend esperado:
//
// POST /api/auth/login
//
// Respuesta:
//
// {
//   "success": true,
//   "message": "Sesión iniciada correctamente",
//   "data": {
//      "token": "...",
//      "username": "admin",
//      "role": "ADMIN"
//   }
// }
//
// ============================================================================

import api from "./api";
// IMPORTANTE: Importar el store de Zustand
import useAuthStore from "../store/authStore";

// ============================================================================
// Claves utilizadas en localStorage
// ============================================================================

const TOKEN_KEY = "gymcore_token";
const USER_KEY = "gymcore_user";

// ============================================================================
// Servicio de autenticación
// ============================================================================

export const authService = {

  // ==========================================================================
  // Login
  // ==========================================================================
  async login(username, password) {

    console.log("=================================");
    console.log("LOGIN REQUEST");
    console.log("=================================");

    console.log({
      username,
      password,
    });

    // ------------------------------------------------------------------------
    // Llamada al backend
    // ------------------------------------------------------------------------

    const response = await api.post(
      "/auth/login",
      {
        username,
        password,
      }
    );

    console.log("=================================");
    console.log("LOGIN RESPONSE");
    console.log("=================================");

    console.log(response.data);

    // ------------------------------------------------------------------------
    // Respuesta completa
    // ------------------------------------------------------------------------

    const data = response.data;

    // ------------------------------------------------------------------------
    // Intentamos detectar automáticamente la estructura
    // que devuelve el backend.
    // ------------------------------------------------------------------------

    let token = null;
    let user = null;

    // Caso 1:
    // {
    //   token: "...",
    //   user: {...}
    // }

    if (data?.token) {

      token = data.token;
      user = data.user;

    }

    // Caso 2:
    // {
    //   success: true,
    //   data: {
    //      token: "...",
    //      username: "...",
    //      role: "..."
    //   }
    // }

    else if (data?.data?.token) {

      token = data.data.token;

      user = {
        username: data.data.username,
        role: data.data.role,
        id: data.data.id,
        email: data.data.email,
        fullName: data.data.fullName || data.data.username,
      };

    }

    // ------------------------------------------------------------------------
    // Guardar token en localStorage
    // ------------------------------------------------------------------------

    if (token) {

      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      console.log("✅ TOKEN GUARDADO EN LOCALSTORAGE");
    }

    // ------------------------------------------------------------------------
    // Guardar usuario en localStorage y en Zustand
    // ------------------------------------------------------------------------

    if (user) {

      // Guardar en localStorage
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );

      console.log("✅ USUARIO GUARDADO EN LOCALSTORAGE");
      console.log("📦 Usuario:", user);

      // --- NUEVO: Guardar en el store de Zustand ---
      // Usamos getState() para acceder al store sin hooks
      const store = useAuthStore.getState();
      if (store.setUsuario) {
        store.setUsuario(user);
        console.log("✅ USUARIO GUARDADO EN ZUSTAND STORE");
      } else {
        console.warn("⚠️ setUsuario no está disponible en el store");
      }

      // Verificar que se guardó en Zustand
      const zustandUser = useAuthStore.getState().usuario;
      console.log("🔍 Usuario en Zustand después de guardar:", zustandUser);
    }

    // ------------------------------------------------------------------------
    // Verificación
    // ------------------------------------------------------------------------

    console.log("TOKEN:", localStorage.getItem(TOKEN_KEY));
    console.log("USER:", localStorage.getItem(USER_KEY));

    return {
      token,
      user,
      raw: data,
    };
  },

  // ==========================================================================
  // Logout
  // ==========================================================================
  logout() {

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // --- NUEVO: Limpiar Zustand ---
    const store = useAuthStore.getState();
    if (store.clearUsuario) {
      store.clearUsuario();
      console.log("✅ USUARIO ELIMINADO DE ZUSTAND STORE");
    } else if (store.setUsuario) {
      store.setUsuario(null);
      console.log("✅ USUARIO ELIMINADO DE ZUSTAND STORE");
    }

  },

  // ==========================================================================
  // Obtener token
  // ==========================================================================
  getToken() {

    return localStorage.getItem(
      TOKEN_KEY
    );

  },

  // ==========================================================================
  // Obtener usuario almacenado
  // ==========================================================================
  getStoredUser() {

    const raw = localStorage.getItem(
      USER_KEY
    );

    return raw
      ? JSON.parse(raw)
      : null;
  },

  // ==========================================================================
  // Validar autenticación
  // ==========================================================================
  isAuthenticated() {

    return Boolean(
      this.getToken()
    );

  },

  // ==========================================================================
  // Restaurar sesión desde localStorage al store de Zustand
  // ==========================================================================
  restoreSession() {

    const token = this.getToken();
    const user = this.getStoredUser();

    console.log("=================================");
    console.log("RESTAURANDO SESIÓN");
    console.log("=================================");
    console.log("Token:", token ? "✅ SI" : "❌ NO");
    console.log("Usuario:", user ? "✅ SI" : "❌ NO");

    if (token && user) {
      const store = useAuthStore.getState();
      if (store.setUsuario) {
        store.setUsuario(user);
        console.log("✅ SESIÓN RESTAURADA EN ZUSTAND");
        console.log("👤 Usuario restaurado:", user);
        return true;
      }
    }

    console.log("❌ No se pudo restaurar la sesión");
    return false;
  },

};

export default authService;