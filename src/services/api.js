// src/services/api.js
// Cliente HTTP central. Todos los servicios (clientesService, ventasService, etc.)
// deben importar esta instancia en lugar de usar fetch/axios directamente.

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Adjunta el JWT (si existe) a cada request saliente.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gymcore_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normaliza errores y maneja expiración de sesión (401).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gymcore_token');
      localStorage.removeItem('gymcore_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error) {
  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'Error de conexión con el servidor';

  return {
    status: error.response?.status ?? null,
    message,
    details: error.response?.data ?? null,
  };
}

export default api;
