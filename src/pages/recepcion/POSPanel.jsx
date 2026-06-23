import { useState, useMemo } from "react";
import { categorias as categoriasIniciales } from "../../mock/productos";
import { clientes } from "../../mock/clientes";

// Función para formatear números como moneda COP
const formatearPrecioCOP = (valor) => {
  if (!valor || valor === "0") return "$ 0";
  const numeroLimpio = valor.toString().replace(/[^0-9]/g, "");
  if (!numeroLimpio) return "$ 0";
  const numero = parseInt(numeroLimpio, 10);
  const formateado = numero.toLocaleString('es-CO');
  return `$ ${formateado}`;
};

// Función para limpiar el valor del input y extraer solo el número
const limpiarValorMoneda = (valor) => {
  if (!valor) return "0";
  const soloNumeros = valor.toString().replace(/[^0-9]/g, "");
  if (!soloNumeros) return "0";
  return String(parseInt(soloNumeros, 10));
};

export default function POSPanel() {
  const [carrito, setCarrito] = useState([]);
  const [pagoRecibido, setPagoRecibido] = useState("0");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categoriasIniciales[0]?.id);
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [mostrandoResultados, setMostrandoResultados] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  
  // Estado para método de pago
  const [metodoPago, setMetodoPago] = useState('efectivo');

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) {
      const categoria = categoriasIniciales.find((cat) => cat.id === categoriaSeleccionada);
      return categoria?.productos || [];
    }

    const busquedaLower = busquedaProducto.toLowerCase();
    const resultados = [];

    categoriasIniciales.forEach((categoria) => {
      const productosEncontrados = categoria.productos.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(busquedaLower) ||
          producto.codigo.toLowerCase().includes(busquedaLower)
      );
      if (productosEncontrados.length > 0) {
        resultados.push(...productosEncontrados);
      }
    });

    return resultados;
  }, [busquedaProducto, categoriaSeleccionada]);

  // Función mejorada para buscar cliente
  const buscarCliente = (texto) => {
    setBusqueda(texto);
    setMostrandoResultados(true);
    
    if (!texto.trim()) {
      setCliente(null);
      setResultadosBusqueda([]);
      setMostrandoResultados(false);
      return;
    }

    const encontrados = clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(texto.toLowerCase()) ||
        c.cedula.includes(texto) ||
        c.telefono.includes(texto)
    );
    
    setResultadosBusqueda(encontrados);
    
    if (encontrados.length === 1) {
      const exacto = encontrados[0];
      if (exacto.nombre.toLowerCase() === texto.toLowerCase() || exacto.cedula === texto) {
        setCliente(exacto);
        setMostrandoResultados(false);
        setBusqueda(exacto.nombre);
        return;
      }
    }
    
    if (encontrados.length === 0) {
      setCliente(null);
    }
  };

  const seleccionarCliente = (clienteSeleccionado) => {
    setCliente(clienteSeleccionado);
    setBusqueda(clienteSeleccionado.nombre);
    setMostrandoResultados(false);
    setResultadosBusqueda([]);
  };

  const limpiarCliente = () => {
    setCliente(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setMostrandoResultados(false);
  };

  const agregarAlCarrito = (producto) => {
    const existente = carrito.find((item) => item.id === producto.id);
    if (existente) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1, tipo: "producto" }]);
    }
  };

  const cobrarMensualidad = (modo) => {
    if (!cliente) return;
    
    const yaExiste = carrito.some(
      (item) => item.tipo === "mensualidad" && item.clienteId === cliente.id
    );
    if (yaExiste) {
      alert(`Ya hay un pago de ${modo === "dia" ? "día" : "mensualidad"} para ${cliente.nombre}`);
      return;
    }

    const esDia = modo === "dia";
    const nuevoItem = {
      id: `mensualidad-${cliente.id}-${Date.now()}`,
      clienteId: cliente.id,
      nombre: esDia 
        ? `Pago x día — ${cliente.nombre}` 
        : `Mensualidad — ${cliente.nombre}`,
      precio: esDia ? cliente.mensualidad.precioDia : cliente.mensualidad.precioMensual,
      cantidad: 1,
      tipo: "mensualidad",
      modo: modo
    };
    
    setCarrito([...carrito, nuevoItem]);
    
    setCliente(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setMostrandoResultados(false);
  };

  const eliminarDelCarrito = (itemId) => {
    setCarrito(carrito.filter((item) => item.id !== itemId));
  };

  const actualizarCantidad = (itemId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(itemId);
      return;
    }
    setCarrito(
      carrito.map((item) => (item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item))
    );
  };

  const totalCarrito = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);

  const handlePagoChange = (e) => {
    const valorInput = e.target.value;
    const soloNumeros = limpiarValorMoneda(valorInput);
    setPagoRecibido(soloNumeros);
  };

  const calcularCambio = () => {
    const recibido = parseFloat(pagoRecibido);
    if (isNaN(recibido)) return 0;
    return recibido - totalCarrito;
  };

  const handleVenta = () => {
    const mensualidades = carrito.filter(item => item.tipo === "mensualidad");
    const productos = carrito.filter(item => item.tipo === "producto");
    
    let mensaje = `✅ Venta realizada exitosamente\n\n`;
    mensaje += `💰 Total: $${totalCarrito.toLocaleString()}\n`;
    mensaje += `💳 Método de pago: ${metodoPago === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}\n\n`;
    
    if (productos.length > 0) {
      mensaje += `📦 Productos (${productos.length}):\n`;
      productos.forEach(item => {
        mensaje += `  • ${item.nombre} x${item.cantidad} = $${(item.precio * item.cantidad).toLocaleString()}\n`;
      });
    }
    
    if (mensualidades.length > 0) {
      mensaje += `\n💳 Pagos de membresía (${mensualidades.length}):\n`;
      mensualidades.forEach(item => {
        mensaje += `  • ${item.nombre}: $${item.precio.toLocaleString()}\n`;
      });
    }
    
    alert(mensaje);
    
    setCarrito([]);
    setPagoRecibido("0");
    setCliente(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setMostrandoResultados(false);
    setBusquedaProducto("");
  };

  const cambio = calcularCambio();

  const diasClase = !cliente
    ? ""
    : !cliente.mensualidad.activa
    ? "dias-vencido"
    : cliente.mensualidad.diasRestantes <= 3
    ? "dias-alerta"
    : "dias-ok";

  const getAvatarIcon = () => {
    if (!cliente) return "🧍";
    if (cliente.genero === "masculino") return "👨";
    if (cliente.genero === "femenino") return "👩";
    return "🧍";
  };

  return (
    <div className="pos-wireframe">
      {/* Columna izquierda: buscar producto + categorías + grid */}
      <section className="pos-panel pos-panel-productos">
        <input
          type="text"
          className="pos-input-pill pos-buscar-producto"
          placeholder="Buscar Producto por nombre o código..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
        />

        <div className="categorias-container">
          {categoriasIniciales.map((cat) => (
            <button
              key={cat.id}
              className={`categoria-btn ${categoriaSeleccionada === cat.id ? "active" : ""}`}
              onClick={() => {
                setCategoriaSeleccionada(cat.id);
                setBusquedaProducto("");
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        <div className="productos-grid">
          {productosFiltrados.length === 0 ? (
            <div className="productos-vacio">
              <span>🔍</span>
              <p>No se encontraron productos</p>
            </div>
          ) : (
            productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                className="producto-item"
                onClick={() => agregarAlCarrito(producto)}
              >
                <div className="producto-imagen">{producto.imagen || "📦"}</div>
                <div className="producto-detalles">
                  <span className="producto-nombre">{producto.nombre}</span>
                  <span className="producto-precio">$ {producto.precio.toLocaleString()}</span>
                  <span className="producto-stock">Stock: {producto.stock}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Columna derecha */}
      <div className="pos-panel-derecho">
        {/* Ficha de cliente */}
        <section className="pos-panel pos-panel-cliente">
          <div className="cliente-fila-superior">
            <div className="cliente-foto">{getAvatarIcon()}</div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="pos-input-pill cliente-nombre-input"
                placeholder="Buscar cliente por nombre, cédula o teléfono"
                value={busqueda}
                onChange={(e) => buscarCliente(e.target.value)}
                onFocus={() => {
                  if (busqueda.trim() && resultadosBusqueda.length > 0) {
                    setMostrandoResultados(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (!cliente) {
                      setMostrandoResultados(false);
                    }
                  }, 200);
                }}
              />
              {cliente && (
                <button 
                  className="cliente-quitar-btn"
                  onClick={limpiarCliente}
                  title="Quitar cliente"
                >
                  ✕
                </button>
              )}
              {mostrandoResultados && resultadosBusqueda.length > 0 && busqueda.trim() && (
                <div className="resultados-busqueda-cliente">
                  {resultadosBusqueda.map((c) => (
                    <div
                      key={c.id}
                      className="resultado-item-cliente"
                      onClick={() => seleccionarCliente(c)}
                    >
                      <div className="resultado-info">
                        <span className="resultado-nombre">{c.nombre}</span>
                        <span className="resultado-detalle">Céd: {c.cedula}</span>
                      </div>
                      <span className="resultado-telefono">📱 {c.telefono}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cliente-fila-datos">
            <input
              type="text"
              className="pos-input-pill"
              placeholder="Cédula"
              value={cliente?.cedula || ""}
              readOnly
            />
            <input
              type="text"
              className="pos-input-pill"
              placeholder="Teléfono"
              value={cliente?.telefono || ""}
              readOnly
            />
            <input
              type="text"
              className="pos-input-pill"
              placeholder="Estado"
              value={cliente ? (cliente.estado === "activo" ? "✅ Activo" : "🔴 Inactivo") : ""}
              readOnly
            />
          </div>

          <div className="cliente-fila-inferior">
            <div className={`cliente-dias-banda ${diasClase}`}>
              <span className="cliente-dias-titulo">
                {cliente
                  ? cliente.mensualidad.activa
                    ? `DÍAS FALTANTES: ${cliente.mensualidad.diasRestantes}`
                    : "MENSUALIDAD VENCIDA"
                  : "DÍAS FALTANTES: —"}
              </span>
              <span className="cliente-dias-entrenador">
                Entrenador: {cliente ? cliente.entrenador : "—"}
              </span>
            </div>

            <div className="cliente-pago-botones">
              <button
                className="pos-pill-btn"
                disabled={!cliente}
                onClick={() => cobrarMensualidad("mes")}
              >
                Pago
                <br />
                Mensualidad
              </button>
              <button
                className="pos-pill-btn"
                disabled={!cliente}
                onClick={() => cobrarMensualidad("dia")}
              >
                Pago
                <br />X Día
              </button>
            </div>
          </div>
        </section>

        {/* Carrito + totales */}
        <section className="pos-panel pos-panel-carrito">
          <div className="carrito-columna">
            <h3 className="carrito-titulo">Carrito de Venta</h3>
            <div className="carrito-items">
              {carrito.length === 0 ? (
                <p className="carrito-vacio">No hay productos en el carrito</p>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="carrito-item-pill">
                    <span className="item-nombre">
                      {item.tipo === "mensualidad" && "⭐ "}
                      {item.nombre}
                    </span>
                    {item.tipo === "producto" ? (
                      <div className="item-controls">
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>
                          −
                        </button>
                        <span className="item-cantidad">{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="item-cantidad">1</span>
                    )}
                    <span className="item-subtotal">
                      ${(item.precio * item.cantidad).toLocaleString()}
                    </span>
                    <button className="item-eliminar" onClick={() => eliminarDelCarrito(item.id)}>
                      ✖
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="totales-columna">
            <div className="total-pill">
              <span>Total:</span>
              <span className="total-pill-monto">${totalCarrito.toLocaleString()}</span>
            </div>

            {/* Método de pago - Versión más limpia */}
            <div className="total-pill total-pill-metodo">
              <span>Pago:</span>
              <div className="metodo-pago-toggle">
                <button
                  className={`metodo-toggle-btn ${metodoPago === 'efectivo' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('efectivo')}
                >
                  <span className="metodo-icon">💵</span> Efectivo
                </button>
                <button
                  className={`metodo-toggle-btn ${metodoPago === 'transferencia' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('transferencia')}
                >
                  <span className="metodo-icon">📲</span> Transferencia
                </button>
              </div>
            </div>

            <div className="total-pill total-pill-input">
              <span>Recibido:</span>
              <input
                type="text"
                value={formatearPrecioCOP(pagoRecibido)}
                onChange={handlePagoChange}
                placeholder="$ 0"
                className="input-moneda-pos"
              />
            </div>

            <div className="total-pill">
              <span>Cambio:</span>
              <span
                className={`total-pill-monto ${
                  cambio < 0 ? "cambio-insuficiente" : "cambio-correcto"
                }`}
              >
                ${cambio.toLocaleString()}
              </span>
            </div>

            <button
              className="realizar-venta-btn"
              onClick={handleVenta}
              disabled={carrito.length === 0 || cambio < 0}
            >
              Realizar Venta
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}