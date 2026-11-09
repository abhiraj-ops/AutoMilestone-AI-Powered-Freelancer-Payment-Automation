import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach API key if configured (backend gate is optional in dev)
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey) api.interceptors.request.use((config) => {
  config.headers['X-API-Key'] = apiKey;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error && error.response && error.response.status === 429) {
      console.warn('[api] rate limited, please wait');
    }
    // never surface raw internal messages wholesale; components show generic fallback
    return Promise.reject(error);
  }
);

export default api;
