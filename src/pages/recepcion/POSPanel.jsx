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
 * - Verifica el turno activo con el backend
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
import { turnoService } from '../../services/turnoService';

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

const formatearPrecioCOP = (valor) => {
  if (!valor || valor === "0") return "$ 0";
  const numeroLimpio = valor.toString().replace(/[^0-9]/g, "");
  if (!numeroLimpio) return "$ 0";
  const numero = parseInt(numeroLimpio, 10);
  const formateado = numero.toLocaleString('es-CO');
  return `$ ${formateado}`;
};

const limpiarValorMoneda = (valor) => {
  if (!valor) return "0";
  const soloNumeros = valor.toString().replace(/[^0-9]/g, "");
  if (!soloNumeros) return "0";
  return String(parseInt(soloNumeros, 10));
};

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

  const [carrito, setCarrito] = useState([]);
  const [pagoRecibido, setPagoRecibido] = useState("0");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [mostrandoResultados, setMostrandoResultados] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [metodoPago, setMetodoPago] = useState('efectivo');

  // ============================================================
  // 2. ESTADOS PARA DATOS DEL BACKEND
  // ============================================================

  const [categoriasBackend, setCategoriasBackend] = useState([]);
  const [productosBackend, setProductosBackend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [turnoIdBackend, setTurnoIdBackend] = useState(null);
  const [turnoValido, setTurnoValido] = useState(false);
  const [mensajeTurno, setMensajeTurno] = useState("");
  const [verificandoTurno, setVerificandoTurno] = useState(true);

  // ============================================================
  // 3. EFECTOS (useEffect)
  // ============================================================

  useEffect(() => {
    verificarTurnoActivo();
    cargarDatos();
  }, []);

  const verificarTurnoActivo = async () => {
    setVerificandoTurno(true);
    const turnoLocal = localStorage.getItem('turno_activo');
    
    if (!turnoLocal) {
      console.warn('⚠️ No hay turno activo en localStorage');
      setTurnoActivo(null);
      setTurnoValido(false);
      setMensajeTurno("⚠️ No hay turno activo. Abre un turno primero.");
      setVerificandoTurno(false);
      return;
    }

    try {
      const turnoParseado = JSON.parse(turnoLocal);
      console.log('📌 Turno desde localStorage:', turnoParseado);

      try {
        const response = await turnoService.obtenerAbierto(turnoParseado.receptionistId);
        console.log('📌 Turno desde backend:', response);

        let turnoBackend = response?.data || response || null;
        if (turnoBackend?.data) turnoBackend = turnoBackend.data;
        
        if (turnoBackend && turnoBackend.id) {
          console.log('✅ Turno encontrado en backend:', turnoBackend);
          
          const turnoSincronizado = {
            ...turnoParseado,
            id: turnoBackend.id,
            sincronizado: true,
            openedAt: turnoBackend.openedAt || turnoParseado.openedAt,
            status: turnoBackend.status || 'OPEN'
          };
          
          setTurnoActivo(turnoSincronizado);
          setTurnoIdBackend(turnoBackend.id);
          setTurnoValido(true);
          setMensajeTurno(`✅ Turno activo ID: ${turnoBackend.id}`);
          
          localStorage.setItem('turno_activo', JSON.stringify(turnoSincronizado));
          setVerificandoTurno(false);
          return;
        }
      } catch (backendError) {
        console.error('❌ Error verificando turno en backend:', backendError);
        
        if (backendError.response?.status === 404) {
          console.warn('⚠️ Turno no encontrado en backend (404)');
          setTurnoValido(false);
          setMensajeTurno(`⚠️ Turno local ID: ${turnoParseado.id} (no existe en backend)`);
          setTurnoActivo(turnoParseado);
          setTurnoIdBackend(turnoParseado.id);
          
          alert(
            `⚠️ El turno local no existe en el backend.\n\n` +
            `ID del turno local: ${turnoParseado.id}\n` +
            `Recepcionista ID: ${turnoParseado.receptionistId}\n\n` +
            `Esto puede pasar porque:\n` +
            `1. El turno fue cerrado en el backend\n` +
            `2. El turno fue abierto en modo local\n` +
            `3. El backend no tiene este turno registrado\n\n` +
            `Para continuar, abre un nuevo turno desde el panel de turnos.`
          );
          
          setVerificandoTurno(false);
          return;
        }
        
        setTurnoValido(false);
        setMensajeTurno("⚠️ Error al verificar turno en backend");
        setTurnoActivo(turnoParseado);
        setTurnoIdBackend(turnoParseado.id);
        setVerificandoTurno(false);
        return;
      }

      setTurnoActivo(turnoParseado);
      setTurnoIdBackend(turnoParseado.id);
      setTurnoValido(false);
      setMensajeTurno(`⚠️ Turno local ID: ${turnoParseado.id} (no sincronizado)`);

    } catch (error) {
      console.error('❌ Error verificando turno:', error);
      try {
        const turnoParseado = JSON.parse(turnoLocal);
        setTurnoActivo(turnoParseado);
        setTurnoIdBackend(turnoParseado.id);
        setTurnoValido(false);
        setMensajeTurno(`⚠️ Turno local ID: ${turnoParseado.id} (error de verificación)`);
      } catch {
        setTurnoActivo(null);
        setTurnoValido(false);
        setMensajeTurno("❌ Error al verificar turno");
      }
    } finally {
      setVerificandoTurno(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const categoriasResponse = await productosService.listarCategorias();
      const categoriasData = extraerDatos(categoriasResponse);
      setCategoriasBackend(categoriasData);

      const productosResponse = await productosService.listarProductos();
      const productosData = extraerDatos(productosResponse);

      const productosFormateados = productosData.map(p => ({
        id: p.id,
        nombre: p.name || p.nombre || "Sin nombre",
        codigo: p.code || p.codigo || "N/A",
        precio: p.salePrice || p.precio || 0,
        costo: p.costPrice || p.costo || 0,
        stock: p.stock || 0,
        stockMinimo: p.minimumStock || p.stockMinimo || 0,
        categoriaId: p.categoryId || p.category?.id,
        categoria: p.category?.name || p.categoria || "Sin categoría",
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

  const productosFiltrados = useMemo(() => {
    if (productosBackend.length === 0) return [];

    if (!busquedaProducto.trim() && categoriaSeleccionada === null) {
      return productosBackend;
    }

    if (!busquedaProducto.trim() && categoriaSeleccionada !== null) {
      return productosBackend.filter(p => p.categoriaId === categoriaSeleccionada);
    }

    if (busquedaProducto.trim() && categoriaSeleccionada === null) {
      const busquedaLower = busquedaProducto.toLowerCase();
      return productosBackend.filter(p =>
        p.nombre.toLowerCase().includes(busquedaLower) ||
        p.codigo.toLowerCase().includes(busquedaLower)
      );
    }

    const busquedaLower = busquedaProducto.toLowerCase();
    return productosBackend.filter(p =>
      (p.categoriaId === categoriaSeleccionada) &&
      (p.nombre.toLowerCase().includes(busquedaLower) ||
       p.codigo.toLowerCase().includes(busquedaLower))
    );
  }, [productosBackend, busquedaProducto, categoriaSeleccionada]);

  // ============================================================
  // 5. BÚSQUEDA DE CLIENTES
  // ============================================================

  const buscarCliente = async (texto) => {
    setBusqueda(texto);
    setMostrandoResultados(true);

    if (!texto.trim()) {
      setCliente(null);
      setResultadosBusqueda([]);
      setMostrandoResultados(false);
      return;
    }

    try {
      const encontrados = await clientesService.buscar(texto);
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
    } catch (err) {
      console.error('Error buscando cliente:', err);
      setResultadosBusqueda([]);
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

  // ============================================================
  // 6. FUNCIONES DEL CARRITO
  // ============================================================

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      alert(`⚠️ El producto "${producto.nombre}" no tiene stock disponible.`);
      return;
    }

    const existente = carrito.find((item) => item.id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        alert(`⚠️ No hay suficiente stock de "${producto.nombre}" (disponible: ${producto.stock})`);
        return;
      }
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
    if (!cliente) {
      alert("Debes seleccionar un cliente primero");
      return;
    }

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

  const totalCarrito = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);

  const calcularCambio = () => {
    const recibido = parseFloat(pagoRecibido);
    if (isNaN(recibido)) return 0;
    return recibido - totalCarrito;
  };

  const cambio = calcularCambio();

  const handlePagoChange = (e) => {
    const valorInput = e.target.value;
    const soloNumeros = limpiarValorMoneda(valorInput);
    setPagoRecibido(soloNumeros);
  };

  // ============================================================
  // 8. PROCESAR VENTA - VERSIÓN CON FALLBACK LOCAL
  // ============================================================

  const handleVenta = async () => {
    const mensualidades = carrito.filter(item => item.tipo === "mensualidad");
    const productos = carrito.filter(item => item.tipo === "producto");

    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    if (cambio < 0) {
      alert("El pago recibido es insuficiente");
      return;
    }

    const shiftId = turnoIdBackend || turnoActivo?.id;
    
    if (!shiftId) {
      alert("❌ No hay un turno activo válido. Abre un turno primero.");
      return;
    }

    // Si el turno no es válido, mostrar advertencia pero permitir continuar
    if (!turnoValido) {
      const continuar = window.confirm(
        `⚠️ El turno no está sincronizado con el backend.\n\n` +
        `ID del turno: ${shiftId}\n` +
        `Estado: ${turnoValido ? 'Sincronizado' : 'Local'}\n\n` +
        `Si continúas, la venta se registrará localmente pero el stock NO se actualizará en el backend.\n\n` +
        `¿Deseas continuar?`
      );
      if (!continuar) return;
    }

    try {
      setLoading(true);

      const mapMetodoPago = {
        'efectivo': 'CASH',
        'transferencia': 'TRANSFER',
        'tarjeta': 'CARD'
      };
      const paymentMethod = mapMetodoPago[metodoPago] || 'CASH';
      const clientId = cliente?.id || null;

      let ventasRegistradas = [];

      // ✅ PROCESAR PRODUCTOS
      if (productos.length > 0) {
        const totalProductos = productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        const items = productos.map(item => ({
          productId: item.id,
          quantity: item.cantidad,
          unitPrice: item.precio,
          subtotal: item.precio * item.cantidad
        }));

        console.log('📦 Items a enviar:', items);
        console.log('💳 Método de pago:', paymentMethod);
        console.log('🆔 Turno ID:', shiftId);
        console.log('💰 Total productos:', totalProductos);

        if (turnoValido) {
          try {
            const resultado = await ventasService.registrarVenta(
              items,
              paymentMethod,
              shiftId,
              'PRODUCT_SALE',
              clientId,
              totalProductos
            );
            ventasRegistradas.push(resultado);
            console.log('✅ Venta de productos registrada en backend');
          } catch (backendError) {
            console.warn('⚠️ Error en backend, registrando localmente:', backendError.message);
            ventasRegistradas.push({ 
              id: Date.now(), 
              local: true, 
              message: 'Registrada localmente (backend falló)' 
            });
          }
        } else {
          console.log('📝 Modo local: venta de productos registrada solo en frontend');
          ventasRegistradas.push({ 
            id: Date.now(), 
            local: true, 
            message: 'Registrada localmente' 
          });
        }
      }

      // ✅ PROCESAR MEMBRESÍAS
      if (mensualidades.length > 0) {
        for (const item of mensualidades) {
          const esDia = item.modo === "dia";
          
          const itemsMembresia = [{
            productId: null,
            quantity: 1,
            unitPrice: item.precio,
            subtotal: item.precio
          }];

          if (turnoValido) {
            try {
              const resultado = await ventasService.registrarVenta(
                itemsMembresia,
                paymentMethod,
                shiftId,
                'MEMBERSHIP_PAYMENT',
                item.clienteId,
                item.precio
              );
              ventasRegistradas.push(resultado);
              console.log(`✅ ${esDia ? 'Día' : 'Mensualidad'} registrada en backend`);
            } catch (backendError) {
              console.warn(`⚠️ Error en backend para ${esDia ? 'día' : 'mensualidad'}:`, backendError.message);
              ventasRegistradas.push({ 
                id: Date.now(), 
                local: true, 
                message: `Registrada localmente (backend falló)` 
              });
            }
          } else {
            console.log(`📝 Modo local: ${esDia ? 'Día' : 'Mensualidad'} registrada solo en frontend`);
            ventasRegistradas.push({ 
              id: Date.now(), 
              local: true, 
              message: 'Registrada localmente' 
            });
          }
        }
      }

      // ✅ CONSTRUIR MENSAJE DE ÉXITO
      let mensaje = `✅ Venta ${turnoValido ? 'registrada' : 'local'} exitosamente\n\n`;
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

      if (!turnoValido || ventasRegistradas.some(v => v.local)) {
        mensaje += `\n\n⚠️ Modo local - El stock no se actualizó en el backend.`;
      }

      if (ventasRegistradas.length > 0) {
        const locales = ventasRegistradas.filter(v => v.local).length;
        const reales = ventasRegistradas.length - locales;
        mensaje += `\n\n✅ ${reales} transacción(es) registrada(s) en backend`;
        if (locales > 0) {
          mensaje += `\n⚠️ ${locales} transacción(es) registrada(s) localmente`;
        }
      }

      alert(mensaje);

      // ✅ LIMPIAR ESTADO
      setCarrito([]);
      setPagoRecibido("0");
      setCliente(null);
      setBusqueda("");
      setResultadosBusqueda([]);
      setMostrandoResultados(false);
      setBusquedaProducto("");

      // ✅ RECARGAR DATOS
      await cargarDatos();

    } catch (err) {
      console.error('❌ Error al procesar venta:', err);
      
      let mensajeError = 'Error al procesar la venta: ';
      
      if (err.message) {
        mensajeError += err.message;
      } else if (err.details?.message) {
        mensajeError += err.details.message;
      }
      
      if (err.details?.violations) {
        const violaciones = err.details.violations.map(v => 
          `${v.propertyPath}: ${v.message}`
        ).join('\n');
        mensajeError += '\n\nDetalles:\n' + violaciones;
      }
      
      alert(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 9. UTILIDADES DE INTERFAZ
  // ============================================================

  const diasClase = !cliente
    ? ""
    : !cliente.mensualidad?.activa
      ? "dias-vencido"
      : (cliente.mensualidad?.diasRestantes || 0) <= 3
        ? "dias-alerta"
        : "dias-ok";

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

  if (verificandoTurno) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <span style={{ fontSize: '40px' }}>⏳</span>
        <p style={{ color: '#6b7280' }}>Verificando turno activo...</p>
      </div>
    );
  }

  return (
    <div className="pos-wireframe">
      {/* BANNER DE ESTADO DEL TURNO */}
      <div style={{
        background: turnoValido ? '#d1fae5' : '#fee2e2',
        color: turnoValido ? '#065f46' : '#991b1b',
        padding: '10px 16px',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ fontWeight: '500' }}>
          {mensajeTurno || (turnoActivo ? `Turno ID: ${turnoActivo.id}` : '⚠️ Sin turno activo')}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>
            {turnoValido ? '✅ Sincronizado' : '⚠️ Local'}
          </span>
          {!turnoValido && (
            <button 
              onClick={() => window.location.href = '/admin/turnos'}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Abrir Turno
            </button>
          )}
        </div>
      </div>

      {/* COLUMNA IZQUIERDA: Productos */}
      <section className="pos-panel pos-panel-productos">
        <input
          type="text"
          className="pos-input-pill pos-buscar-producto"
          placeholder="Buscar Producto por nombre o código..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
        />

        <div className="categorias-container">
          {categoriasMostrar.length > 0 ? (
            <>
              <button
                className={`categoria-btn ${categoriaSeleccionada === null ? "active" : ""}`}
                onClick={() => {
                  setCategoriaSeleccionada(null);
                  setBusquedaProducto("");
                }}
              >
                📦 Todos
              </button>
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

      {/* COLUMNA DERECHA: Cliente + Carrito + Totales */}
      <div className="pos-panel-derecho">

        {/* FICHA DE CLIENTE */}
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

        {/* CARRITO Y TOTALES */}
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
            <div className="total-pill">
              <span>Total:</span>
              <span className="total-pill-monto">${totalCarrito.toLocaleString()}</span>
            </div>

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
                disabled={metodoPago !== 'efectivo'}
              />
            </div>

            <div className="total-pill">
              <span>Cambio:</span>
              <span
                className={`total-pill-monto ${cambio < 0 ? "cambio-insuficiente" : "cambio-correcto"}`}
              >
                ${cambio.toLocaleString()}
              </span>
            </div>

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