import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user, token) => {
      if (token) localStorage.setItem('depms_token', token);
      set({ user, isAuthenticated: !!user });
    },

      logout: () => {
      localStorage.removeItem('depms_token');
      set({ user: null, isAuthenticated: false });
    },

      // Convenience helpers
      isAdmin: () => useAuthStore.getState().user?.role === 'admin',
      isLeader: () => useAuthStore.getState().user?.role === 'team_leader',
      isEmployee: () => useAuthStore.getState().user?.role === 'employee',
    }),
    { name: 'depms-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);
