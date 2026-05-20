import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rbt_lab_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rbt_lab_token');
      localStorage.removeItem('rbt_lab_user');

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export function getBackendMessage(error) {
  const data = error.response?.data;

  if (!data) return 'Não foi possível conectar com a API.';

  if (Array.isArray(data.details) && data.details.length > 0) {
    return data.details.map((item) => `${item.field}: ${item.message}`).join('\n');
  }

  return data.message || 'Erro inesperado na operação.';
}

export default api;
