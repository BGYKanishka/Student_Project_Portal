import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialized: false,
  requireProfile: false,

  syncUser: async () => {
    try {
      const res = await api.post('/auth/sync');
      if (res.data.requireProfile) {
        set({ user: null, requireProfile: true, loading: false, initialized: true });
        return { requireProfile: true };
      }
      set({ user: res.data.user, requireProfile: false, loading: false, initialized: true });
      return { success: true };
    } catch {
      set({ user: null, loading: false, initialized: true });
      return { success: false };
    }
  },

  setLoading: (loading) => set({ loading }),
  setUser: (user) => set({ user, requireProfile: false, loading: false, initialized: true }),
  clearUser: () => {
    set({ user: null, requireProfile: false, initialized: true });
  },
}));

export default useAuthStore;