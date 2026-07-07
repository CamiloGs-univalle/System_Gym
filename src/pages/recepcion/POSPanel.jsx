/**
 * ============================================================
 * PANEL DE PUNTO DE VENTA (POS) - INTEGRADO CON BACKEND
 * ============================================================
 * 
 * Este componente permite realizar ventas de productos y membresías.
 * Se conecta al backend a través de los servicios correspondientes.
 * 
 * FUNCIONALIDADES:
 * - Muestra TODOS los productos al iniciar
 * - Filtra por categoría al seleccionar una
 * - Botón "Todos" para volver a mostrar todos los productos
 * - Busca productos por nombre o código
 * - Busca clientes en el backend
 * - Registra ventas en el backend (descuenta stock automáticamente)
 * - Soporta pago en efectivo o transferencia
 * - Cobra membresías (mensual o por día)
 * 
 * @component
 * @returns {JSX.Element} Panel POS completo
 * ============================================================
 */

// Importaciones de React
import React, { useState, useEffect, useMemo } from 'react';

// Importación de servicios (comunicación con el backend)
import { productosService } from '../../services/productosService';
import { ventasService } from '../../services/ventasService';
import { clientesService } from '../../services/clientesService';

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Formatea un número como moneda COP (Pesos Colombianos)
 * 
 * @param {number|string} valor - Valor a formatear
 * @returns {string} Valor formateado ej: "$ 1.500.000"
 * 
 * @example
 * formatearPrecioCOP(1500000) // "$ 1.500.000"
 * formatearPrecioCOP("0") // "$ 0"
 */
const formatearPrecioCOP = (valor) => {
  if (!valor || valor === "0") return "$ 0";
  const numeroLimpio = valor.toString().replace(/[^0-9]/g, "");
  if (!numeroLimpio) return "$ 0";
  const numero = parseInt(numeroLimpio, 10);
  const formateado = numero.toLocaleString('es-CO');
  return `$ ${formateado}`;
};

/**
 * Limpia un valor de input de moneda y extrae solo números
 * 
 * @param {string} valor - Valor a limpiar
 * @returns {string} Número limpio como string
 * 
 * @example
 * limpiarValorMoneda("$ 1.500.000") // "1500000"
 * limpiarValorMoneda("abc123") // "123"
 */
const limpiarValorMoneda = (valor) => {
  if (!valor) return "0";
  const soloNumeros = valor.toString().replace(/[^0-9]/g, "");
  if (!soloNumeros) return "0";
  return String(parseInt(soloNumeros, 10));
};

/**
 * Extrae los datos de una respuesta de la API,
 * manejando diferentes estructuras de respuesta.
 * 
 * @param {Object} response - Respuesta de la API
 * @returns {Array} Array de datos extraídos
 * 
 * @example
 * // Caso 1: Array directo
 * extraerDatos([{id:1}]) // [{id:1}]
 * 
 * // Caso 2: { data: [...] }
 * extraerDatos({data: [{id:1}]}) // [{id:1}]
 * 
 * // Caso 3: { data: { data: [...] } }
 * extraerDatos({data: {data: [{id:1}]}}) // [{id:1}]
 */
const extraerDatos = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
  if (response?.data?.content && Array.isArray(response.data.content)) return response.data.content;
  return [];
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function POSPanel() {
  // ============================================================
  // 1. ESTADOS PARA LA INTERFAZ DE USUARIO
  // ============================================================

  /**
   * Carrito de compras actual
   * @type {Array} Array de { id, nombre, precio, cantidad, tipo, ... }
   */
  const [carrito, setCarrito] = useState([]);

  /**
   * Monto recibido del cliente (para calcular cambio)
   * @type {string} Valor en string para manejar formato de moneda
   */
  const [pagoRecibido, setPagoRecibido] = useState("0");

  /**
   * ID de la categoría seleccionada (null = mostrar todos)
   * @type {number|null}
   */
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  /**
   * Texto de búsqueda de cliente
   * @type {string}
   */
  const [busqueda, setBusqueda] = useState("");

  /**
   * Cliente seleccionado actualmente
   * @type {Object|null}
   */
  const [cliente, setCliente] = useState(null);

  /**
   * Resultados de la búsqueda de clientes
   * @type {Array}
   */
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  /**
   * Indica si se están mostrando los resultados de búsqueda de clientes
   * @type {boolean}
   */
  const [mostrandoResultados, setMostrandoResultados] = useState(false);

  /**
   * Texto de búsqueda de productos
   * @type {string}
   */
  const [busquedaProducto, setBusquedaProducto] = useState("");

  /**
   * Método de pago seleccionado: 'efectivo' | 'transferencia' | 'tarjeta'
   * @type {string}
   */
  const [metodoPago, setMetodoPago] = useState('efectivo');

  // ============================================================
  // 2. ESTADOS PARA DATOS DEL BACKEND
  // ============================================================

  /**
   * Lista de categorías obtenidas del backend
   * @type {Array}
   */
  const [categoriasBackend, setCategoriasBackend] = useState([]);

  /**
   * Lista de productos obtenidos del backend
   * @type {Array}
   */
  const [productosBackend, setProductosBackend] = useState([]);

  /**
   * Indica si se está cargando datos
   * @type {boolean}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Turno activo obtenido del localStorage
   * @type {Object|null}
   */
  const [turnoActivo, setTurnoActivo] = useState(null);

  // ============================================================
  // 3. EFECTOS (useEffect)
  // ============================================================

  /**
   * Al montar el componente, obtiene el turno activo del localStorage
   * para que el POS pueda operar correctamente.
   */
  useEffect(() => {
    const turno = localStorage.getItem('turno_activo');
    if (turno) {
      try {
        setTurnoActivo(JSON.parse(turno));
      } catch {
        setTurnoActivo(null);
      }
    }
  }, []);

  /**
   * Al montar el componente, carga las categorías y productos desde el backend.
   */
  useEffect(() => {
    cargarDatos();
  }, []);

  /**
   * Carga categorías y productos desde el backend.
   * Formatea los datos al formato que espera el frontend.
   * 
   * @async
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1. Cargar categorías desde el backend
      const categoriasResponse = await productosService.listarCategorias();
      const categoriasData = extraerDatos(categoriasResponse);
      setCategoriasBackend(categoriasData);

      // 2. Cargar productos desde el backend
      const productosResponse = await productosService.listarProductos();
      const productosData = extraerDatos(productosResponse);

      // 3. Formatear productos al formato del frontend
      //    Backend: name, code, salePrice, costPrice, minimumStock
      //    Frontend: nombre, codigo, precio, costo, stockMinimo
      const productosFormateados = productosData.map(p => ({
        id: p.id,
        nombre: p.name || p.nombre || "Sin nombre",
        codigo: p.code || p.codigo || "N/A",
        precio: p.salePrice || p.precio || 0,
        costo: p.costPrice || p.costo || 0,
        stock: p.stock || 0,
        stockMinimo: p.minimumStock || p.stockMinimo || 0,
        categoriaId: p.categoryId || p.category?.id,
        imagen: p.imagen || "📦"
      }));

      setProductosBackend(productosFormateados);

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 4. FILTRADO DE PRODUCTOS
  // ============================================================

  /**
   * Filtra los productos según la búsqueda y la categoría seleccionada.
   * Se recalcula automáticamente cuando cambian los filtros.
   * 
   * Reglas de filtrado:
   * - Sin búsqueda + sin categoría = TODOS los productos
   * - Sin búsqueda + categoría = productos de esa categoría
   * - Con búsqueda + sin categoría = productos que coinciden con la búsqueda
   * - Con búsqueda + categoría = productos de la categoría que coinciden
   */
  const productosFiltrados = useMemo(() => {
    if (productosBackend.length === 0) {
      return [];
    }

    // Mostrar TODOS si no hay búsqueda y no hay categoría seleccionada
    if (!busquedaProducto.trim() && categoriaSeleccionada === null) {
      return productosBackend;
    }

    // Mostrar por categoría si no hay búsqueda pero hay categoría
    if (!busquedaProducto.trim() && categoriaSeleccionada !== null) {
      return productosBackend.filter(p => p.categoriaId === categoriaSeleccionada);
    }

    // Buscar en TODOS si hay búsqueda y no hay categoría
    if (busquedaProducto.trim() && categoriaSeleccionada === null) {
      const busquedaLower = busquedaProducto.toLowerCase();
      return productosBackend.filter(p =>
        p.nombre.toLowerCase().includes(busquedaLower) ||
        p.codigo.toLowerCase().includes(busquedaLower)
      );
    }

    // Buscar en categoría si hay búsqueda y categoría
    const busquedaLower = busquedaProducto.toLowerCase();
    return productosBackend.filter(p =>
      (p.categoriaId === categoriaSeleccionada) &&
      (p.nombre.toLowerCase().includes(busquedaLower) ||
       p.codigo.toLowerCase().includes(busquedaLower))
    );
  }, [productosBackend, busquedaProducto, categoriaSeleccionada]);

  // ============================================================
  // 5. BÚSQUEDA DE CLIENTES (Backend)
  // ============================================================

  /**
   * Busca clientes en el backend por nombre, cédula o teléfono.
   * 
   * @param {string} texto - Texto de búsqueda
   * @async
   */
  const buscarCliente = async (texto) => {
    setBusqueda(texto);
    setMostrandoResultados(true);

    // Si el texto está vacío, limpiar resultados
    if (!texto.trim()) {
      setCliente(null);
      setResultadosBusqueda([]);
      setMostrandoResultados(false);
      return;
    }

    try {
      const encontrados = await clientesService.buscar(texto);
      setResultadosBusqueda(encontrados);

      // Si hay un solo resultado exacto, seleccionarlo automáticamente
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
    } catch (err) {
      console.error('Error buscando cliente:', err);
      setResultadosBusqueda([]);
    }
  };

  /**
   * Selecciona un cliente de los resultados de búsqueda
   * 
   * @param {Object} clienteSeleccionado - Cliente a seleccionar
   */
  const seleccionarCliente = (clienteSeleccionado) => {
    setCliente(clienteSeleccionado);
    setBusqueda(clienteSeleccionado.nombre);
    setMostrandoResultados(false);
    setResultadosBusqueda([]);
  };

  /**
   * Limpia el cliente seleccionado
   */
  const limpiarCliente = () => {
    setCliente(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setMostrandoResultados(false);
  };

  // ============================================================
  // 6. FUNCIONES DEL CARRITO
  // ============================================================

  /**
   * Agrega un producto al carrito.
   * Valida que haya stock disponible.
   * 
   * @param {Object} producto - Producto a agregar
   */
  const agregarAlCarrito = (producto) => {
    // Validar stock
    if (producto.stock <= 0) {
      alert(`⚠️ El producto "${producto.nombre}" no tiene stock disponible.`);
      return;
    }

    // Buscar si el producto ya está en el carrito
    const existente = carrito.find((item) => item.id === producto.id);
    if (existente) {
      // Validar que no exceda el stock
      if (existente.cantidad >= producto.stock) {
        alert(`⚠️ No hay suficiente stock de "${producto.nombre}" (disponible: ${producto.stock})`);
        return;
      }
      // Incrementar cantidad
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      // Agregar nuevo producto al carrito
      setCarrito([...carrito, { ...producto, cantidad: 1, tipo: "producto" }]);
    }
  };

  /**
   * Agrega una membresía al carrito (mensual o por día)
   * 
   * @param {string} modo - 'mes' o 'dia'
   */
  const cobrarMensualidad = (modo) => {
    if (!cliente) {
      alert("Debes seleccionar un cliente primero");
      return;
    }

    // Evitar duplicados del mismo cliente
    const yaExiste = carrito.some(
      (item) => item.tipo === "mensualidad" && item.clienteId === cliente.id
    );
    if (yaExiste) {
      alert(`Ya hay un pago de ${modo === "dia" ? "día" : "mensualidad"} para ${cliente.nombre}`);
      return;
    }

    const esDia = modo === "dia";
    const precio = esDia ? (cliente.mensualidad?.precioDia || 5000) : (cliente.mensualidad?.precioMensual || 80000);

    const nuevoItem = {
      id: `mensualidad-${cliente.id}-${Date.now()}`,
      clienteId: cliente.id,
      nombre: esDia
        ? `Pago x día — ${cliente.nombre}`
        : `Mensualidad — ${cliente.nombre}`,
      precio: precio,
      cantidad: 1,
      tipo: "mensualidad",
      modo: modo
    };

    setCarrito([...carrito, nuevoItem]);

    // Limpiar cliente después de agregar membresía
    setCliente(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setMostrandoResultados(false);
  };

  /**
   * Elimina un item del carrito por su ID
   * 
   * @param {string|number} itemId - ID del item a eliminar
   */
  const eliminarDelCarrito = (itemId) => {
    setCarrito(carrito.filter((item) => item.id !== itemId));
  };

  /**
   * Actualiza la cantidad de un producto en el carrito
   * 
   * @param {string|number} itemId - ID del item
   * @param {number} nuevaCantidad - Nueva cantidad
   */
  const actualizarCantidad = (itemId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(itemId);
      return;
    }

    // Validar stock disponible
    const item = carrito.find(i => i.id === itemId);
    if (item && item.tipo === "producto" && nuevaCantidad > item.stock) {
      alert(`⚠️ No hay suficiente stock (disponible: ${item.stock})`);
      return;
    }

    setCarrito(
      carrito.map((item) => (item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item))
    );
  };

  // ============================================================
  // 7. CÁLCULOS DE TOTALES
  // ============================================================

  /**
   * Calcula el total del carrito sumando precio * cantidad de cada item
   */
  const totalCarrito = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);

  /**
   * Calcula el cambio a devolver al cliente
   * 
   * @returns {number} Cambio a devolver (negativo si falta dinero)
   */
  const calcularCambio = () => {
    const recibido = parseFloat(pagoRecibido);
    if (isNaN(recibido)) return 0;
    return recibido - totalCarrito;
  };

  const cambio = calcularCambio();

  /**
   * Maneja el cambio del input de pago recibido
   * 
   * @param {Event} e - Evento del input
   */
  const handlePagoChange = (e) => {
    const valorInput = e.target.value;
    const soloNumeros = limpiarValorMoneda(valorInput);
    setPagoRecibido(soloNumeros);
  };

  // ============================================================
  // 8. PROCESAR VENTA (Backend)
  // ============================================================

  /**
   * Procesa la venta completa:
   * 1. Valida que haya items en el carrito
   * 2. Valida que el pago sea suficiente
   * 3. Valida que haya un turno activo
   * 4. Registra la venta en el backend
   * 5. Descuenta el stock automáticamente
   * 6. Muestra resumen de la venta
   * 7. Limpia el carrito
   * 
   * @async
   */
  const handleVenta = async () => {
    const mensualidades = carrito.filter(item => item.tipo === "mensualidad");
    const productos = carrito.filter(item => item.tipo === "producto");

    // Validaciones
    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    if (cambio < 0) {
      alert("El pago recibido es insuficiente");
      return;
    }

    if (!turnoActivo) {
      alert("No hay un turno activo. Debes abrir un turno primero.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Mapeo correcto del método de pago para el backend
      const mapMetodoPago = {
        'efectivo': 'CASH',
        'transferencia': 'TRANSFER',
        'tarjeta': 'CARD'
      };
      const paymentMethod = mapMetodoPago[metodoPago] || 'CASH';

      // ✅ Registrar venta en el backend (solo productos)
      if (productos.length > 0) {
        const items = productos.map(item => ({
          productId: item.id,
          quantity: item.cantidad
        }));

        console.log('📦 Items a enviar:', items);
        console.log('💳 Método de pago:', paymentMethod);
        console.log('🆔 Turno ID:', turnoActivo.id);

        const clientId = cliente?.id || null;

        await ventasService.registrarVenta(
          items,
          paymentMethod,
          turnoActivo.id,
          'PRODUCT_SALE',
          clientId
        );
      }

      // ✅ Mostrar resumen de la venta
      let mensaje = `✅ Venta realizada exitosamente\n\n`;
      mensaje += `💰 Total: $${totalCarrito.toLocaleString()}\n`;

      const labelMetodo = metodoPago === 'efectivo' ? '💵 Efectivo' :
                          metodoPago === 'transferencia' ? '📲 Transferencia' : '💳 Tarjeta';
      mensaje += `💳 Método de pago: ${labelMetodo}\n\n`;

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

      if (cliente) {
        mensaje += `\n👤 Cliente: ${cliente.nombre}`;
      }

      alert(mensaje);

      // ✅ Limpiar carrito
      setCarrito([]);
      setPagoRecibido("0");
      setCliente(null);
      setBusqueda("");
      setResultadosBusqueda([]);
      setMostrandoResultados(false);
      setBusquedaProducto("");

      // ✅ Recargar productos para actualizar stock
      await cargarDatos();

    } catch (err) {
      console.error('Error al procesar venta:', err);

      let mensaje = 'Error al procesar la venta: ';
      if (err.details?.message) {
        mensaje += err.details.message;
      } else if (err.message) {
        mensaje += err.message;
      }

      if (err.details?.violations) {
        const violaciones = err.details.violations.map(v => v.message).join(', ');
        mensaje += '\n\nDetalles: ' + violaciones;
      }

      alert(mensaje);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 9. UTILIDADES DE INTERFAZ
  // ============================================================

  /**
   * Determina la clase CSS para los días de membresía del cliente
   */
  const diasClase = !cliente
    ? ""
    : !cliente.mensualidad?.activa
      ? "dias-vencido"
      : (cliente.mensualidad?.diasRestantes || 0) <= 3
        ? "dias-alerta"
        : "dias-ok";

  /**
   * Obtiene el icono de avatar según el género del cliente
   * 
   * @returns {string} Emoji del avatar
   */
  const getAvatarIcon = () => {
    if (!cliente) return "🧍";
    if (cliente.genero === "masculino") return "👨";
    if (cliente.genero === "femenino") return "👩";
    return "🧍";
  };

  // ============================================================
  // 10. RENDERIZADO
  // ============================================================

  const categoriasMostrar = categoriasBackend.length > 0 ? categoriasBackend : [];
  const productosMostrar = productosFiltrados;

  return (
    <div className="pos-wireframe">
      {/* ============================================================
          COLUMNA IZQUIERDA: Productos
          ============================================================ */}
      <section className="pos-panel pos-panel-productos">

        {/* Barra de búsqueda de productos */}
        <input
          type="text"
          className="pos-input-pill pos-buscar-producto"
          placeholder="Buscar Producto por nombre o código..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
        />

        {/* Botones de categorías */}
        <div className="categorias-container">
          {categoriasMostrar.length > 0 ? (
            <>
              {/* Botón "Todos" - muestra todos los productos */}
              <button
                className={`categoria-btn ${categoriaSeleccionada === null ? "active" : ""}`}
                onClick={() => {
                  setCategoriaSeleccionada(null);
                  setBusquedaProducto("");
                }}
              >
                📦 Todos
              </button>
              {/* Botones de cada categoría */}
              {categoriasMostrar.map((cat) => (
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
            </>
          ) : (
            <span style={{ padding: '8px', color: '#6b7280' }}>Cargando categorías...</span>
          )}
        </div>

        {/* Grid de productos */}
        <div className="productos-grid">
          {loading && productosMostrar.length === 0 ? (
            <div className="productos-vacio">
              <span>⏳</span>
              <p>Cargando productos...</p>
            </div>
          ) : productosMostrar.length === 0 ? (
            <div className="productos-vacio">
              <span>🔍</span>
              <p>No se encontraron productos</p>
            </div>
          ) : (
            productosMostrar.map((producto) => (
              <div
                key={producto.id}
                className={`producto-item ${producto.stock <= 0 ? 'producto-sin-stock' : ''}`}
                onClick={() => producto.stock > 0 && agregarAlCarrito(producto)}
                style={producto.stock <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                <div className="producto-imagen">{producto.imagen || "📦"}</div>
                <div className="producto-detalles">
                  <span className="producto-nombre">{producto.nombre}</span>
                  <span className="producto-precio">$ {producto.precio.toLocaleString()}</span>
                  <span className="producto-stock" style={{ color: producto.stock <= 0 ? '#ef4444' : '#6b7280' }}>
                    {producto.stock <= 0 ? '❌ Sin stock' : `Stock: ${producto.stock}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ============================================================
          COLUMNA DERECHA: Cliente + Carrito + Totales
          ============================================================ */}
      <div className="pos-panel-derecho">

        {/* ---- FICHA DE CLIENTE ---- */}
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
                  ? cliente.mensualidad?.activa
                    ? `DÍAS FALTANTES: ${cliente.mensualidad?.diasRestantes || 0}`
                    : "MENSUALIDAD VENCIDA"
                  : "DÍAS FALTANTES: —"}
              </span>
              <span className="cliente-dias-entrenador">
                Entrenador: {cliente ? cliente.entrenador || "—" : "—"}
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

        {/* ---- CARRITO Y TOTALES ---- */}
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
                        <button
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                        >
                          −
                        </button>
                        <span className="item-cantidad">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                        >
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
            {/* Total */}
            <div className="total-pill">
              <span>Total:</span>
              <span className="total-pill-monto">${totalCarrito.toLocaleString()}</span>
            </div>

            {/* Método de pago */}
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

            {/* Pago recibido */}
            <div className="total-pill total-pill-input">
              <span>Recibido:</span>
              <input
                type="text"
                value={formatearPrecioCOP(pagoRecibido)}
                onChange={handlePagoChange}
                placeholder="$ 0"
                className="input-moneda-pos"
                disabled={metodoPago !== 'efectivo'}
              />
            </div>

            {/* Cambio */}
            <div className="total-pill">
              <span>Cambio:</span>
              <span
                className={`total-pill-monto ${cambio < 0 ? "cambio-insuficiente" : "cambio-correcto"}`}
              >
                ${cambio.toLocaleString()}
              </span>
            </div>

            {/* Botón realizar venta */}
            <button
              className="realizar-venta-btn"
              onClick={handleVenta}
              disabled={carrito.length === 0 || cambio < 0 || loading}
            >
              {loading ? 'Procesando...' : 'Realizar Venta'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}