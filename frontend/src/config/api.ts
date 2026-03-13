import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Ensure baseURL ends with a slash to prevent dropping the last path segment (e.g., /v1)
    if (config.baseURL && !config.baseURL.endsWith('/')) {
      config.baseURL += '/';
    }
    // Remove leading slash from URL to make it relative to the baseURL
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 for token refresh, not for login errors
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        const cleanBaseURL = rawBaseURL.endsWith('/') ? rawBaseURL.slice(0, -1) : rawBaseURL;
        const { data } = await axios.post(
          `${cleanBaseURL}/auth/refresh`,
          { refreshToken }
        );

        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.clear();
        // Don't use window.location.href - let React Router handle navigation
        // The app will redirect to login via the auth context
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
