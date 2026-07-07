// src/store/authStore.js (verificar que logout esté bien)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      usuario: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      async login(credentials) {
        set({ loading: true, error: null });
        try {
          const result = await authService.login(
            credentials.username,
            credentials.password
          );
          set({ 
            usuario: result.user, 
            isAuthenticated: true, 
            loading: false 
          });
          return result.user;
        } catch (err) {
          set({ 
            loading: false, 
            error: err.message || "Error al iniciar sesión",
            isAuthenticated: false 
          });
          throw err;
        }
      },

      // ============================================
      // LOGOUT CORREGIDO
      // ============================================
      logout() {
        console.log("=================================");
        console.log("STORE - logout llamado");
        console.log("=================================");
        
        // 1. Limpiar localStorage
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

      clearError() {
        set({ error: null });
      },

      getUsuario() {
        return get().usuario;
      },

      getToken() {
        return authService.getToken();
      },
    }),
    {
      name: 'gymcore-auth',
      partialize: (state) => ({ 
        usuario: state.usuario, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;