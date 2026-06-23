// src/store/ventasStore.jsx
import { useState, useCallback, createContext, useContext } from "react";
import { ventasDelDia } from "../mock/ventas";

const VentasContext = createContext(null);

export function VentasProvider({ children }) {
  const [ventas, setVentas] = useState(ventasDelDia);
  const [jornada, setJornada] = useState({
    inicio: "07:00",
    recepcionista: "Ana López",
    saldoInicial: 0,
    cerrada: false,
    cierreData: null,
  });

  const registrarVenta = useCallback((datosVenta) => {
    const ahora = new Date();
    const hora = ahora.toTimeString().slice(0, 5);
    const horaNum = ahora.getHours();

    const tipoReal = (() => {
      const hasMens = datosVenta.carrito.some(
        (i) => i.tipo === "mensualidad" && i.id?.startsWith("mensualidad-")
      );
      const hasDia = datosVenta.carrito.some(
        (i) => i.tipo === "mensualidad" && i.nombre?.includes("día")
      );
      if (hasMens && !hasDia) return "mensualidad";
      if (hasDia) return "dia";
      return "producto";
    })();

    const nuevaVenta = {
      id: Date.now(),
      hora,
      horaNum,
      tipo: tipoReal,
      descripcion: datosVenta.carrito.map((i) => i.nombre).join(", "),
      cliente: datosVenta.cliente?.nombre || null,
      items: datosVenta.carrito.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio: i.precio,
      })),
      total: datosVenta.total,
      pagoRecibido: datosVenta.pagoRecibido,
      cambio: datosVenta.cambio,
      metodoPago: "efectivo",
    };

    setVentas((prev) => [...prev, nuevaVenta]);
  }, []);

  const cerrarJornada = useCallback((datosCierre) => {
    setJornada((prev) => ({
      ...prev,
      cerrada: true,
      cierreData: {
        ...datosCierre,
        hora: new Date().toTimeString().slice(0, 5),
        fecha: new Date().toLocaleDateString("es-CO"),
      },
    }));
  }, []);

  const resetJornada = useCallback(() => {
    setVentas([]);
    setJornada({
      inicio: new Date().toTimeString().slice(0, 5),
      recepcionista: jornada.recepcionista,
      saldoInicial: 0,
      cerrada: false,
      cierreData: null,
    });
  }, [jornada.recepcionista]);

  return (
    <VentasContext.Provider
      value={{ ventas, jornada, registrarVenta, cerrarJornada, resetJornada }}
    >
      {children}
    </VentasContext.Provider>
  );
}

export function useVentasStore() {
  const ctx = useContext(VentasContext);
  if (!ctx) {
    throw new Error("useVentasStore debe usarse dentro de <VentasProvider>");
  }
  return ctx;
}