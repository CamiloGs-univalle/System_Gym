// src/store/VentasProvider.jsx
import { createContext, useContext, useRef } from 'react';
import useVentasStore from './ventasStore';

const VentasContext = createContext(null);

export function VentasProvider({ children }) {
  const storeRef = useRef(useVentasStore);
  
  return (
    <VentasContext.Provider value={storeRef.current}>
      {children}
    </VentasContext.Provider>
  );
}

export function useVentas() {
  const store = useContext(VentasContext);
  if (!store) {
    throw new Error('useVentas debe usarse dentro de un VentasProvider');
  }
  return store;
}

export default VentasProvider;