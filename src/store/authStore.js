/**
 * ============================================================
 * STORE DE AUTENTICACIÓN - GESTIÓN DE USUARIO Y SESIÓN
 * ============================================================
 * 
 * Utiliza Zustand con persistencia para mantener la sesión del usuario
 * en el localStorage. El estado se guarda bajo la clave 'gymcore-auth'.
 * 
 * @module authStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

// ============================================================
// CONFIGURACIÓN DEL STORE
// ============================================================

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // --------------------------------------------------------
      // ESTADO INICIAL
      // --------------------------------------------------------
      usuario: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // --------------------------------------------------------
      // ACCIONES PÚBLICAS
      // --------------------------------------------------------

      /**
       * Inicia sesión con las credenciales proporcionadas.
       * 
       * @async
       * @param {Object} credentials - Credenciales de acceso
       * @param {string} credentials.username - Nombre de usuario
       * @param {string} credentials.password - Contraseña
       * @returns {Promise<Object>} Datos del usuario autenticado
       * @throws {Error} Si las credenciales son inválidas
       */
      async login(credentials) {
        // Activar estado de carga y limpiar errores previos
        set({ loading: true, error: null });
        
        try {
          // Llamar al servicio de autenticación
          const result = await authService.login(
            credentials.username,
            credentials.password
          );
          
          // Asegurar que el usuario tenga un ID visible
          const userData = result.user;
          console.log('🔑 Usuario autenticado:', userData);
          
          // Verificar que el ID esté presente
          if (!userData.id && !userData.userId && !userData.user_id) {
            console.warn('⚠️ El usuario no tiene un ID visible en el objeto:', userData);
            // Si no tiene ID, intentar usar el ID de la respuesta raw
            if (result.raw?.data?.id) {
              userData.id = result.raw.data.id;
              console.log('✅ ID recuperado de raw.data:', userData.id);
            }
          }
          
          // Actualizar el estado con el usuario autenticado
          set({ 
            usuario: userData, 
            isAuthenticated: true, 
            loading: false 
          });
          
          console.log('✅ Store actualizado con usuario:', userData);
          
          return result.user;
          
        } catch (err) {
          // Manejar errores de autenticación
          console.error('❌ Error en login:', err);
          set({ 
            loading: false, 
            error: err.message || "Error al iniciar sesión",
            isAuthenticated: false 
          });
          throw err;
        }
      },

      /**
       * Cierra la sesión del usuario actual.
       * Limpia el estado y el localStorage.
       */
      logout() {
        console.log("=================================");
        console.log("📤 STORE - logout llamado");
        console.log("=================================");
        
        // 1. Limpiar localStorage mediante el servicio
        authService.logout();
        
        // 2. Limpiar el estado del store
        set({ 
          usuario: null, 
          isAuthenticated: false,
          error: null,
          loading: false
        });
        
        console.log("✅ Store - Logout completado");
      },

      /**
       * Restaura la sesión desde el localStorage.
       * 
       * @returns {boolean} true si la sesión fue restaurada exitosamente
       */
      hydrate() {
        const session = authService.restoreSession();
        if (session) {
          set({ 
            usuario: session.user, 
            isAuthenticated: true 
          });
          return true;
        }
        return false;
      },

      /**
       * Limpia el error almacenado en el estado.
       */
      clearError() {
        set({ error: null });
      },

      /**
       * Establece el usuario manualmente (usado por authService).
       * 
       * @param {Object|null} user - Datos del usuario o null
       */
      setUsuario(user) {
        console.log('📝 setUsuario llamado con:', user);
        if (user) {
          set({ 
            usuario: user, 
            isAuthenticated: true 
          });
        } else {
          set({ 
            usuario: null, 
            isAuthenticated: false 
          });
        }
      },

      /**
       * Limpia el usuario del store (alias de setUsuario(null)).
       */
      clearUsuario() {
        console.log('📝 clearUsuario llamado');
        set({ 
          usuario: null, 
          isAuthenticated: false 
        });
      },

      // --------------------------------------------------------
      // GETTERS (Métodos de consulta)
      // --------------------------------------------------------

      /**
       * Obtiene el usuario actual del estado.
       * 
       * @returns {Object|null} Usuario actual o null
       */
      getUsuario() {
        return get().usuario;
      },

      /**
       * Obtiene el token de autenticación.
       * 
       * @returns {string|null} Token JWT o null
       */
      getToken() {
        return authService.getToken();
      },

      /**
       * Obtiene el ID del usuario autenticado.
       * Busca en múltiples propiedades por compatibilidad.
       * 
       * @returns {number|null} ID del usuario o null
       */
      getUserId() {
        const user = get().usuario;
        const userId = user?.id || user?.userId || user?.user_id || user?.ID || null;
        console.log('🔍 getUserId() →', userId);
        return userId;
      },

      /**
       * Verifica si el usuario está autenticado.
       * 
       * @returns {boolean} true si está autenticado
       */
      isLoggedIn() {
        return get().isAuthenticated && !!get().usuario;
      }
    }),
    {
      // --------------------------------------------------------
      // CONFIGURACIÓN DE PERSISTENCIA
      // --------------------------------------------------------
      name: 'gymcore-auth', // ← CLAVE PRINCIPAL EN LOCALSTORAGE
      partialize: (state) => ({ 
        usuario: state.usuario, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;