/**
 * Store de autenticacion con hidratacion segura
 * Evita que la app quede en blanco al hacer Ctrl+R
 */
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
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      async login(credentials) {
        set({ loading: true, error: null });
        try {
          const result = await authService.login(credentials.username, credentials.password);
          const userData = result.user;
          if (!userData.id && !userData.userId && !userData.user_id && result.raw?.data?.id) {
            userData.id = result.raw.data.id;
          }
          set({ usuario: userData, isAuthenticated: true, loading: false });
          return result.user;
        } catch (err) {
          set({ loading: false, error: err.message || "Error al iniciar sesion", isAuthenticated: false });
          throw err;
        }
      },

      logout() {
        authService.logout();
        set({ usuario: null, isAuthenticated: false, error: null, loading: false });
      },

      setUsuario(user) {
        if (user) {
          set({ usuario: user, isAuthenticated: true });
        } else {
          set({ usuario: null, isAuthenticated: false });
        }
      },

      clearError() { set({ error: null }); },
      getUsuario() { return get().usuario; },
      getToken() { return authService.getToken(); },
      getUserId() {
        const user = get().usuario;
        return user?.id || user?.userId || user?.user_id || user?.ID || null;
      },
      isLoggedIn() { return get().isAuthenticated && !!get().usuario; },
    }),
    {
      name: 'gymcore-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => {
        return (state) => {
          state?.setHasHydrated(true);
        };
      },
    }
  )
);

export default useAuthStore;
