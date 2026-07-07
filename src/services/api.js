// src/services/api.js
// Cliente HTTP central. Todos los servicios (clientesService, ventasService, etc.)
// deben importar esta instancia en lugar de usar fetch/axios directamente.

import axios from 'axios';

// ============================================================
// CONFIGURACIÓN DE LA URL BASE
// ============================================================

// ✅ Opción 1: Usar variable de entorno con fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ✅ Opción 2: Forzar URL fija (descomentar para pruebas)
// const API_URL = 'http://localhost:8080/api';

// ✅ Opción 3: Usar variable de entorno sin fallback (requiere .env)
// const API_URL = import.meta.env.VITE_API_URL;

// ============================================================
// LOG PARA DEPURACIÓN
// ============================================================

console.log('🚀 ========================================');
console.log('🚀 API URL configurada:', API_URL);
console.log('🚀 Variable de entorno VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🚀 ========================================');

// ============================================================
// CREACIÓN DEL CLIENTE HTTP
// ============================================================

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ============================================================
// INTERCEPTOR DE REQUEST (Adjunta el JWT)
// ============================================================

api.interceptors.request.use((config) => {
  // Log para depuración
  console.log('📤 Request:', config.method.toUpperCase(), config.baseURL + config.url);
  
  const token = localStorage.getItem('gymcore_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Token adjuntado');
  } else {
    console.log('⚠️ No hay token disponible');
  }
  return config;
});

// ============================================================
// INTERCEPTOR DE RESPONSE (Maneja errores y 401)
// ============================================================

api.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Data:', error.response.data);
      console.error('❌ URL:', error.config?.url);
    }
    
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

// ============================================================
// NORMALIZACIÓN DE ERRORES
// ============================================================

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
    originalError: error,
  };
}

// ============================================================
// EXPORTACIÓN
// ============================================================

export default api;