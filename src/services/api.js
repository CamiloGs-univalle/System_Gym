// ============================================================
// ARCHIVO: src/services/api.js
// DESCRIPCIÓN: Cliente HTTP central con manejo inteligente de 404
// VERSIÓN: 2.0 - CORREGIDA (404 no se muestra como error)
// ============================================================

import axios from 'axios';

// ============================================================
// CONFIGURACIÓN DE LA URL BASE
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ============================================================
// LOG PARA DEPURACIÓN
// ============================================================

console.log('🚀 ========================================');
console.log('🚀 API URL configurada:', API_URL);
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
  console.log('📤 Request:', config.method.toUpperCase(), config.url);
  
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
// INTERCEPTOR DE RESPONSE - CORREGIDO ✅
// ============================================================

api.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // ==========================================================
    // ✅ MANEJO ESPECIAL PARA 404 - NO ES UN ERROR, ES INFORMACIÓN
    // ==========================================================
    // El 404 significa "recurso no encontrado", lo cual es un
    // resultado válido para consultas como "turno abierto"
    // ==========================================================
    
    if (error.response?.status === 404) {
      // ✅ Log informativo, NO de error
      console.log(`ℹ️ 404 - Recurso no encontrado: ${error.config?.url}`);
      if (error.response?.data?.message) {
        console.log(`   Mensaje: ${error.response.data.message}`);
      }
      
      // ✅ Retornamos el error para que el servicio lo maneje
      // El servicio decide si es error real o no
      return Promise.reject(error);
    }
    
    // ==========================================================
    // ❌ ERRORES REALES (500, 403, 401, 422, etc.)
    // ==========================================================
    
    console.error(`❌ Error ${error.response?.status || 'sin status'} en ${error.config?.url || 'URL desconocida'}:`);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    
    // ==========================================================
    // MANEJO DE AUTENTICACIÓN (401)
    // ==========================================================
    
    if (error.response?.status === 401) {
      console.warn('⚠️ Sesión expirada, redirigiendo a login...');
      localStorage.removeItem('gymcore_token');
      localStorage.removeItem('gymcore_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // ==========================================================
    // MANEJO DE ERRORES DE VALIDACIÓN (422)
    // ==========================================================
    
    if (error.response?.status === 422) {
      console.warn('⚠️ Error de validación:', error.response.data);
    }
    
    // ==========================================================
    // MANEJO DE ERRORES DE CONEXIÓN
    // ==========================================================
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('⏱️ Tiempo de espera agotado');
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Error de red. Verifica tu conexión.');
    }
    
    // ==========================================================
    // NORMALIZACIÓN DEL ERROR
    // ==========================================================
    
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