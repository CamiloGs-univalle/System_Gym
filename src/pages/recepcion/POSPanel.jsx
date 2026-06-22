import { useState } from "react";
import { categorias } from "../../mock/productos";
import { clientes } from "../../mock/clientes";

export default function POSPanel() {
  const [carrito, setCarrito] = useState([]);
  const [pagoRecibido, setPagoRecibido] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categorias[0]?.id);
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState(null);

  const buscarCliente = (texto) => {
    setBusqueda(texto);
    if (!texto.trim()) {
      setCliente(null);
      return;
    }
    const encontrado = clientes.find(
      (c) =>
        c.nombre.toLowerCase().includes(texto.toLowerCase()) || c.cedula.includes(texto)
    );
    setCliente(encontrado || null);
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
    const yaExiste = carrito.some((item) => item.tipo === "mensualidad");
    if (yaExiste) return;

    const esDia = modo === "dia";
    setCarrito([
      ...carrito,
      {
        id: `mensualidad-${cliente.id}`,
        nombre: esDia ? `Pago x día — ${cliente.nombre}` : `Mensualidad — ${cliente.nombre}`,
        precio: esDia ? cliente.mensualidad.precioDia : cliente.mensualidad.precioMensual,
        cantidad: 1,
        tipo: "mensualidad"
      }
    ]);
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

  const calcularCambio = () => {
    const recibido = parseFloat(pagoRecibido);
    if (isNaN(recibido)) return 0;
    return recibido - totalCarrito;
  };

  const handleVenta = () => {
    alert(`Venta realizada por $${totalCarrito.toLocaleString()}`);
    setCarrito([]);
    setPagoRecibido("");
    setCliente(null);
    setBusqueda("");
  };

  const categoriaActual = categorias.find((cat) => cat.id === categoriaSeleccionada);
  const tieneMensualidadEnCarrito = carrito.some((item) => item.tipo === "mensualidad");
  const cambio = calcularCambio();

  const diasClase = !cliente
    ? ""
    : !cliente.mensualidad.activa
    ? "dias-vencido"
    : cliente.mensualidad.diasRestantes <= 3
    ? "dias-alerta"
    : "dias-ok";

  return (
    <div className="pos-wireframe">
      {/* Columna izquierda: buscar producto + categorías + grid */}
      <section className="pos-panel pos-panel-productos">
        <input
          type="text"
          className="pos-input-pill pos-buscar-producto"
          placeholder="Buscar Producto"
        />

        <div className="categorias-container">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              className={`categoria-btn ${categoriaSeleccionada === cat.id ? "active" : ""}`}
              onClick={() => setCategoriaSeleccionada(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        <div className="productos-grid">
          {categoriaActual?.productos.map((producto) => (
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
          ))}
        </div>
      </section>

      {/* Columna derecha */}
      <div className="pos-panel-derecho">
        {/* Ficha de cliente */}
        <section className="pos-panel pos-panel-cliente">
          <div className="cliente-fila-superior">
            <div className="cliente-foto">🧍</div>
            <input
              type="text"
              className="pos-input-pill cliente-nombre-input"
              placeholder="Nombre completo"
              value={busqueda}
              onChange={(e) => buscarCliente(e.target.value)}
            />
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
              value={cliente ? (cliente.estado === "activo" ? "Activo" : "Inactivo") : ""}
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
                disabled={!cliente || tieneMensualidadEnCarrito}
                onClick={() => cobrarMensualidad("mes")}
              >
                Pago
                <br />
                Mensualidad
              </button>
              <button
                className="pos-pill-btn"
                disabled={!cliente || tieneMensualidadEnCarrito}
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

            <div className="total-pill total-pill-input">
              <span>Pago recibido:</span>
              <input
                type="number"
                value={pagoRecibido}
                onChange={(e) => setPagoRecibido(e.target.value)}
                placeholder="$ 0"
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