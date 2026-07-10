/**
 * ============================================================================
 * src/services/authService.js
 * ============================================================================
 * Servicio centralizado de autenticación.
 *
 * Responsabilidades:
 * - Iniciar sesión contra el backend.
 * - Guardar JWT en localStorage.
 * - Guardar información del usuario en localStorage y Zustand.
 * - Recuperar token.
 * - Cerrar sesión.
 * - Verificar autenticación.
 *
 * Backend esperado:
 *
 * POST /api/auth/login
 *
 * Respuesta:
 *
 * {
 *   "success": true,
 *   "message": "Sesión iniciada correctamente",
 *   "data": {
 *      "token": "...",
 *      "username": "admin",
 *      "role": "ADMIN"
 *   }
 * }
 *
 * ============================================================================
 */

import api from "./api";
// IMPORTANTE: Importar el store de Zustand
import useAuthStore from "../store/authStore";

// ============================================================================
// Claves utilizadas en localStorage
// ============================================================================

const TOKEN_KEY = "gymcore_token";
const USER_KEY = "gymcore_user";
const AUTH_STORE_KEY = "gymcore-auth"; // Clave que usa persist

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
    let userId = null;

    // Caso 1:
    // {
    //   token: "...",
    //   user: {...}
    // }

    if (data?.token) {

      token = data.token;
      user = data.user;
      
      // Asegurar que el usuario tenga ID
      if (user) {
        userId = user.id || user.userId || user.user_id || user.ID || null;
        if (!userId) {
          console.warn('⚠️ Usuario sin ID en caso 1:', user);
        }
      }

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

      // Intentar obtener el ID de diferentes lugares
      const idFromData = data.data.id || data.data.userId || data.data.user_id || null;
      
      user = {
        id: idFromData || null,
        username: data.data.username,
        role: data.data.role,
        email: data.data.email || null,
        fullName: data.data.fullName || data.data.username,
      };
      
      userId = user.id;
      
      console.log('✅ Usuario construido desde data.data:', user);

    }

    // Caso 3: Estructura alternativa con 'data' anidado
    else if (data?.data?.user) {
      const userData = data.data.user;
      token = data.data.token || data.token;
      user = {
        id: userData.id || userData.userId || userData.user_id || null,
        username: userData.username || userData.userName,
        role: userData.role,
        email: userData.email || null,
        fullName: userData.fullName || userData.name || userData.username,
      };
      userId = user.id;
    }

    // ------------------------------------------------------------------------
    // Si no se encontró un ID, intentar generarlo desde el username
    // ------------------------------------------------------------------------
    
    if (user && !user.id) {
      console.warn('⚠️ El usuario no tiene ID. Asignando ID desde username hash.');
      // En caso extremo, usar un hash del username como ID
      // Esto es solo para desarrollo, en producción debe venir del backend
      user.id = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000 + 1;
      userId = user.id;
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

    } else {
      console.warn("⚠️ No se recibió token del backend");
    }

    // ------------------------------------------------------------------------
    // Guardar usuario en localStorage
    // ------------------------------------------------------------------------

    if (user) {

      // Guardar en localStorage
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );

      console.log("✅ USUARIO GUARDADO EN LOCALSTORAGE (gymcore_user)");
      console.log("📦 Usuario:", user);

    } else {
      console.warn("⚠️ No se recibió usuario del backend");
    }

    // ------------------------------------------------------------------------
    // Guardar en el store de Zustand
    // ------------------------------------------------------------------------
    
    if (user) {
      // Usamos getState() para acceder al store sin hooks
      const store = useAuthStore.getState();
      
      if (store.setUsuario) {
        // Asegurar que el usuario tenga un ID antes de guardar
        if (!user.id && userId) {
          user.id = userId;
        }
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
    // Verificación final
    // ------------------------------------------------------------------------

    console.log("TOKEN:", localStorage.getItem(TOKEN_KEY));
    console.log("USER:", localStorage.getItem(USER_KEY));
    console.log("USER ID:", userId);

    return {
      token,
      user,
      userId,
      raw: data,
    };
  },

  // ==========================================================================
  // Logout
  // ==========================================================================
  logout() {

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // --- Limpiar Zustand ---
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
  // Obtener ID del usuario almacenado
  // ==========================================================================
  getStoredUserId() {
    const user = this.getStoredUser();
    return user?.id || user?.userId || user?.user_id || user?.ID || null;
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
        // Asegurar que el usuario tenga un ID
        if (!user.id) {
          user.id = user.userId || user.user_id || user.ID || null;
        }
        store.setUsuario(user);
        console.log("✅ SESIÓN RESTAURADA EN ZUSTAND");
        console.log("👤 Usuario restaurado:", user);
        return true;
      }
    }

    console.log("❌ No se pudo restaurar la sesión");
    return false;
  },

  // ==========================================================================
  // Obtener ID del usuario desde cualquier fuente
  // ==========================================================================
  getUserId() {
    // 1. Intentar desde Zustand
    const store = useAuthStore.getState();
    const userFromStore = store.usuario;
    if (userFromStore) {
      const id = userFromStore.id || userFromStore.userId || userFromStore.user_id || userFromStore.ID || null;
      if (id) return id;
    }
    
    // 2. Intentar desde localStorage
    const userFromStorage = this.getStoredUser();
    if (userFromStorage) {
      const id = userFromStorage.id || userFromStorage.userId || userFromStorage.user_id || userFromStorage.ID || null;
      if (id) return id;
    }
    
    // 3. Intentar desde el store persistente
    try {
      const storedAuth = localStorage.getItem('gymcore-auth');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        const userData = parsed?.state?.usuario || parsed?.usuario;
        if (userData) {
          const id = userData.id || userData.userId || userData.user_id || userData.ID || null;
          if (id) return id;
        }
      }
    } catch (e) {
      console.warn('Error leyendo gymcore-auth:', e);
    }
    
    return null;
  }

};

export default authService;