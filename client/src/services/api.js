import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// The CSRF token lives only in memory on this module — it arrives in the
// JSON body of /auth/me and /auth/refresh (never as a cookie, since the
// client and server are on different origins and JS on this page cannot
// read a cookie set by the server's origin anyway). CORS ensures only this
// app's own JS can ever read that response body.
let csrfToken = null;
export const setCsrfToken = (token) => {
  csrfToken = token;
};

api.interceptors.request.use((config) => {
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Holds the in-flight refresh request (if any) so concurrent 401s share
// the same refresh call instead of racing each other. Using a shared
// promise (rather than a boolean flag + queue) avoids the race where two
// requests both see isRefreshing === false and both trigger a refresh.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        if (res.data?.csrfToken) setCsrfToken(res.data.csrfToken);
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
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
