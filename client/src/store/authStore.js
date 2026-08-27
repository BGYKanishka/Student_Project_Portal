import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialized: false,

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, loading: false, initialized: true });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, loading: false, initialized: true });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null });
      window.location.href = '/';
    }
  },

  setUser: (user) => set({ user }),
  clearUser: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },
}));

export default useAuthStore;