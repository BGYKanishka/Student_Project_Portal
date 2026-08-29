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

// Response interceptor to handle 403 Forbidden errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      // Dispatch a custom event to notify the application
      window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: error.response.data }));
    }
    return Promise.reject(error);
  }
);

export default api;
