// ============================================================
// ARCHIVO: src/services/api.js
// DESCRIPCIÓN: Cliente HTTP central con manejo inteligente de 404

// ============================================================

import axios from 'axios';

// ============================================================
// CONFIGURACIÓN DE LA URL BASE
// ============================================================

// En la app de escritorio, Electron entrega (vía preload) el puerto del backend,
// que se elige libre en cada arranque, y la llave privada de la app.
const appConfig = (typeof window !== 'undefined' && window.systemGym?.getConfig?.()) || {};

const API_URL = appConfig.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const APP_KEY = appConfig.appKey || null;

// ============================================================
// CREACIÓN DEL CLIENTE HTTP
// ============================================================

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(APP_KEY ? { 'X-App-Key': APP_KEY } : {}),
  },
  timeout: 15000,
});

// ============================================================
// INTERCEPTOR DE REQUEST (Adjunta el JWT)
// ============================================================

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gymcore_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// INTERCEPTOR DE RESPONSE - CORREGIDO ✅
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ==========================================================
    // ✅ MANEJO ESPECIAL PARA 404 - NO ES UN ERROR, ES INFORMACIÓN
    // ==========================================================
    // El 404 significa "recurso no encontrado", lo cual es un
    // resultado válido para consultas como "turno abierto"
    // ==========================================================
    
    if (error.response?.status === 404) {
      // El servicio decide si es un error real o no
      return Promise.reject(error);
    }
    
    // ==========================================================
    // ❌ ERRORES REALES (500, 403, 401, 422, etc.)
    // ==========================================================
    
    // No se registra el cuerpo de la respuesta: puede contener datos de clientes
    console.error(`Error ${error.response?.status || 'sin respuesta'} en ${error.config?.url || 'URL desconocida'}: ${error.message}`);
    
    // ==========================================================
    // MANEJO DE AUTENTICACIÓN (401)
    // ==========================================================
    
    if (error.response?.status === 401) {
      // En Electron la app carga por file://, así que NO podemos navegar
      // a "/login" con location.href (no existe esa ruta física).
      // Limpiamos la sesión y recargamos: AppContent detecta que no hay
      // usuario y muestra el Login automáticamente.
      localStorage.removeItem('gymcore_token');
      localStorage.removeItem('gymcore_user');
      localStorage.removeItem('gymcore-auth');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    
    // Cambio de contraseña obligatorio o licencia vencida: se avisa a la interfaz
    const code = error.response?.data?.errorCode || error.response?.data?.code;
    if (typeof window !== 'undefined') {
      if (error.response?.status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
        window.dispatchEvent(new CustomEvent('systemgym:password-change-required'));
      }
      if (error.response?.status === 402) {
        window.dispatchEvent(new CustomEvent('systemgym:license-required', {
          detail: error.response?.data?.message,
        }));
      }
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
    mensajeUsuario: message,
    errorCode: error.response?.data?.errorCode ?? null,
    details: error.response?.data ?? null,
    originalError: error,
  };
}

// ============================================================
// EXPORTACIÓN
// ============================================================

export default api;