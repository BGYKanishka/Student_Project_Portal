import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Holds the in-flight refresh request (if any) so concurrent 401s share
// the same refresh call instead of racing each other. Using a shared
// promise (rather than a boolean flag + queue) avoids the race where two
// requests both see isRefreshing === false and both trigger a refresh.
let refreshPromise = null;

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken');
    refreshPromise = api
      .post('/auth/refresh', { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => {
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data?.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    return res;
  },
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh')) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
