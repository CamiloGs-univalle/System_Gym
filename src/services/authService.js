// ============================================================================
// src/services/authService.js
// ============================================================================
// Servicio centralizado de autenticación.
//
// Responsabilidades:
// - Iniciar sesión contra el backend.
// - Guardar JWT en localStorage.
// - Guardar información del usuario.
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
      };

    }

    // ------------------------------------------------------------------------
    // Guardar token
    // ------------------------------------------------------------------------

    if (token) {

      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      console.log("TOKEN GUARDADO");
    }

    // ------------------------------------------------------------------------
    // Guardar usuario
    // ------------------------------------------------------------------------

    if (user) {

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );

      console.log("USUARIO GUARDADO");
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
};

export default authService;