import { create } from "zustand";

const useAuthStore = create((set) => ({

  usuario: null,

  login: (usuario) =>
    set({ usuario }),

  logout: () =>
    set({ usuario: null })

}));

export default useAuthStore;