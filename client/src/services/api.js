import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let tokenProvider = null;

// Allow the React app to inject the Asgardeo getAccessToken function
export const setTokenProvider = (provider) => {
  tokenProvider = provider;
};

// Request interceptor to attach token
api.interceptors.request.use(async (config) => {
  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Expected when user is not signed in — silently skip
    }
  }
  return config;
});

export default api;
