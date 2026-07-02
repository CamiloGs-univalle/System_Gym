// src/store/authStore.js
// Misma forma pública que la versión mock (usuario, isAuthenticated, login, logout),
// así que ProtectedRoute.jsx, Header.jsx, etc. no requieren cambios.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

export const useAuthStore = create(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      /**
       * @param {{username: string, password: string}} credentials
       */
      async login(credentials) {
        set({ loading: true, error: null });
        try {
          const data = await authService.login(credentials.username, credentials.password);
          set({ usuario: data.user, isAuthenticated: true, loading: false });
          return data.user;
        } catch (err) {
          set({ loading: false, error: err.message, isAuthenticated: false });
          throw err;
        }
      },

      logout() {
        authService.logout();
        set({ usuario: null, isAuthenticated: false });
      },

      // Llamar una vez al iniciar la app (main.jsx o App.jsx) para restaurar
      // la sesión si ya había un token válido guardado.
      hydrate() {
        const user = authService.getStoredUser();
        if (user && authService.isAuthenticated()) {
          set({ usuario: user, isAuthenticated: true });
        }
      },
    }),
    {
      name: 'gymcore-auth',
      // No persistimos el token acá (ya vive en localStorage vía authService);
      // solo persistimos el estado de UI para evitar parpadeos al recargar.
      partialize: (state) => ({ usuario: state.usuario, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
