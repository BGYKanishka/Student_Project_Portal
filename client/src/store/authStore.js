import { create } from 'zustand';
import api, { setCsrfToken } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialized: false,

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken);
      set({ user: res.data.user, loading: false, initialized: true });
    } catch {
      set({ user: null, loading: false, initialized: true });
    }
  },

  // RP-initiated (Asgardeo) logout requires a full browser navigation, not
  // an XHR call — the browser needs to follow the redirect chain through
  // the IdP so it can clear its own hosted-login session too.
  logout: () => {
    set({ user: null });
    window.location.href = `${API_BASE}/auth/logout`;
  },

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

export default useAuthStore;
