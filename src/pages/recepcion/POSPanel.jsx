// ============================================================
// Caja (punto de venta)
// ------------------------------------------------------------
// - Productos a la izquierda; cliente, planes y cuenta a la derecha.
// - El estado del plan del cliente viene del sistema (backend), no de
//   registros locales, para que coincida con lo que valida el ingreso.
// - Cada cobro queda en el turno abierto. Si una parte del cobro falla,
//   lo que ya se cobró sale de la cuenta para no cobrarlo dos veces.
// ============================================================
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, X, ScanBarcode, Package, ShoppingCart, Banknote, CreditCard, Landmark,
  Minus, Plus, Trash2, UserRound, CalendarCheck, CalendarX, CalendarClock, Phone,
  IdCard, Lock, CheckCircle2, AlertTriangle, Flame,
} from 'lucide-react';
import { productosService } from '../../services/productosService';
import ventasService from '../../services/ventasService';
import { useVentasStore } from '../../store/ventasStore';
import { clientesService, tipoMembresiaDePlan } from '../../services/clientesService';
import { fechaLocalISO } from '../../utils/formatters';
import { diasAvisoVencimiento, stockMinimoGlobal } from '../../utils/configuracion';
import { planesService } from '../../services/gimnasio/planesService';
import accesoService from '../../services/accesoService';
import FotoCliente from '../../components/clientes/FotoCliente';
import './pos-caja.css';

// Llave única por cobro (Idempotency-Key)
const nuevaLlaveCobro = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

const COP = (v) => '$' + Math.round(Number(v) || 0).toLocaleString('es-CO');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
};
const sumarDias = (iso, dias) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return fechaLocalISO(new Date(y, m - 1, d + dias));
};

const METODOS = [
  { id: 'CASH', label: 'Efectivo', icon: Banknote },
  { id: 'TRANSFER', label: 'Transferencia', icon: Landmark },
  { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
];
/** Montos con los que probablemente paga: redondeos hacia arriba del total */
function montosSugeridos(total) {
  if (!total) return [10000, 20000, 50000];
  const pasos = [5000, 10000, 20000, 50000, 100000];
  const montos = [...new Set(pasos.map((p) => Math.ceil(total / p) * p))].filter((m) => m > total);
  return montos.slice(0, 3);
}
const TIPO_PLAN = { DAILY: 'Día', MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' };

/** Estado del plan del cliente según el sistema */
function estadoPlan(cliente) {
  const m = cliente?.membresia;
  if (!m || !m.fechaVencimiento) return { clase: 'sin', titulo: 'Sin plan', detalle: 'Nunca ha tenido un plan registrado', icon: CalendarX };
  const dias = m.diasRestantes || 0;
  if (dias <= 0) return { clase: 'vencido', titulo: 'Plan vencido', detalle: `Venció el ${fechaCorta(m.fechaVencimiento)}`, icon: CalendarX };
  if (dias === 1) return { clase: 'alerta', titulo: 'Último día', detalle: `Vence hoy, ${fechaCorta(m.fechaVencimiento)}`, icon: CalendarClock };
  if (dias <= diasAvisoVencimiento()) return { clase: 'alerta', titulo: `Le quedan ${dias} días`, detalle: `Vence el ${fechaCorta(m.fechaVencimiento)}`, icon: CalendarClock };
  return { clase: 'activo', titulo: `Activo · ${dias} días`, detalle: `Vence el ${fechaCorta(m.fechaVencimiento)}`, icon: CalendarCheck };
}

function Racha({ clienteId }) {
  const [dias, setDias] = useState(0);
  useEffect(() => {
    let vivo = true;
    setDias(0);
    if (clienteId) accesoService.estadisticas(clienteId).then((s) => { if (vivo) setDias(s?.currentStreak || 0); });
    return () => { vivo = false; };
  }, [clienteId]);
  if (!dias) return null;
  return (
    <span className="cj-racha" title="Días seguidos que ha venido al gimnasio">
      <Flame /> {dias} {dias === 1 ? 'día' : 'días'} seguidos
    </span>
  );
}

export default function POSPanel({ turnoActivo, turnoValido, turnoIdBackend, verificandoTurno, onAbrirTurno }) {
  const agregarVenta = useVentasStore((state) => state.agregarVenta);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [catSeleccionada, setCatSeleccionada] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const [clientes, setClientes] = useState([]);
  const clientesCargadosEn = useRef(0);
  const [cliente, setCliente] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [resaltado, setResaltado] = useState(0);

  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('CASH');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const llaveCobro = useRef(null);
  // Si cambia la cuenta o el método de pago es otro cobro: llave nueva
  useEffect(() => { llaveCobro.current = null; }, [carrito, metodoPago]);
  const [aviso, setAviso] = useState(null);
  const [ultimaVenta, setUltimaVenta] = useState(null);

  const inputProductoRef = useRef(null);
  const inputClienteRef = useRef(null);
  const avisoTimer = useRef(null);

  const mostrarAviso = useCallback((tipo, texto) => {
    clearTimeout(avisoTimer.current);
    setAviso({ tipo, texto });
    avisoTimer.current = setTimeout(() => setAviso(null), tipo === 'error' ? 5000 : 3500);
  }, []);

  // ---------------- Carga de datos ----------------
  const cargarProductos = useCallback(async () => {
    try {
      const resp = await productosService.listarProductos();
      const data = Array.isArray(resp) ? resp : resp?.data || [];
      setProductos(data
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id, nombre: p.name || p.nombre || '', codigo: p.code || p.codigo || '',
          precio: p.salePrice || p.precio || 0, stock: p.stock || 0,
          categoriaId: p.categoryId || p.category?.id,
        })));
    } catch { /* se muestra vacío */ }
  }, []);

  const cargarClientes = useCallback(async (forzar = false) => {
    if (!forzar && Date.now() - clientesCargadosEn.current < 30000) return;
    clientesCargadosEn.current = Date.now();
    try {
      const resp = await clientesService.listar();
      setClientes((Array.isArray(resp) ? resp : []).filter((c) => c.activo !== false));
    } catch { /* se conserva la lista anterior */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await productosService.listarCategorias();
        const data = Array.isArray(resp) ? resp : resp?.data || [];
        setCategorias(data.map((c) => ({ id: c.id, nombre: c.name || c.nombre || 'General' })));
      } catch { /* sin categorías */ }
    })();
    cargarProductos();
    cargarClientes(true);
    setPlanes(planesService.filtrar({ tipo: 'MEMBRESIA', estado: 'ACTIVO' }));
    inputProductoRef.current?.focus();
  }, [cargarProductos, cargarClientes]);

  // ---------------- Productos ----------------
  const categoriasConProductos = useMemo(() => categorias
    .map((c) => ({ ...c, total: productos.filter((p) => p.categoriaId === c.id).length }))
    .filter((c) => c.total > 0), [categorias, productos]);

  const productosFiltrados = useMemo(() => {
    let lista = productos;
    if (catSeleccionada !== 'TODOS') lista = lista.filter((p) => p.categoriaId === catSeleccionada);
    const q = busqueda.trim().toLowerCase();
    if (q) lista = lista.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
    // Primero los que hay en existencia
    return [...lista].sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.nombre.localeCompare(b.nombre));
  }, [productos, catSeleccionada, busqueda]);

  const enCarrito = useMemo(() => Object.fromEntries(
    carrito.filter((i) => i.tipo === 'producto').map((i) => [i.id, i.cantidad])), [carrito]);

  const agregarProducto = useCallback((p) => {
    if (p.stock <= 0) { mostrarAviso('error', `${p.nombre} está agotado`); return; }
    const actual = enCarrito[p.id] || 0;
    if (actual >= p.stock) { mostrarAviso('error', `Solo hay ${p.stock} de ${p.nombre}`); return; }
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.tipo === 'producto' && i.id === p.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 };
        return copia;
      }
      return [...prev, { tipo: 'producto', id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, stock: p.stock }];
    });
  }, [enCarrito, mostrarAviso]);

  // Enter en el buscador: código exacto (lector de barras) o único resultado
  const onEnterProducto = (e) => {
    if (e.key === 'Escape') { setBusqueda(''); return; }
    if (e.key !== 'Enter') return;
    const q = busqueda.trim().toLowerCase();
    if (!q) return;
    const exacto = productos.find((p) => p.codigo.toLowerCase() === q);
    const elegido = exacto || (productosFiltrados.length === 1 ? productosFiltrados[0] : null);
    if (elegido) {
      agregarProducto(elegido);
      setBusqueda('');
    }
  };

  // ---------------- Clientes ----------------
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q || cliente) return [];
    const digitos = q.replace(/\D/g, '');
    return clientes.filter((c) => (c.nombre || '').toLowerCase().includes(q)
      || (digitos && ((c.cedula || '').includes(digitos) || (c.telefono || '').includes(digitos))))
      .slice(0, 8);
  }, [clientes, busquedaCliente, cliente]);

  const seleccionarCliente = useCallback((c) => {
    setCliente(c);
    setBusquedaCliente('');
    setMostrarResultados(false);
  }, []);

  const quitarCliente = useCallback(() => {
    setCliente(null);
    setBusquedaCliente('');
    setTimeout(() => inputClienteRef.current?.focus(), 0);
  }, []);

  const onTeclaCliente = (e) => {
    if (!clientesFiltrados.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado((r) => Math.min(r + 1, clientesFiltrados.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado((r) => Math.max(r - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); seleccionarCliente(clientesFiltrados[resaltado] || clientesFiltrados[0]); }
    if (e.key === 'Escape') setMostrarResultados(false);
  };

  const plan = estadoPlan(cliente);
  const planVigente = cliente && (cliente.membresia?.diasRestantes || 0) > 0;

  // ---------------- Planes ----------------
  const agregarPlan = useCallback((p) => {
    if (!cliente) {
      mostrarAviso('error', 'Primero busque y seleccione el cliente');
      inputClienteRef.current?.focus();
      return;
    }
    setCarrito((prev) => {
      // Un solo plan por cliente en cada cobro: si elige otro, se reemplaza
      const sinPlanDelCliente = prev.filter((i) => !(i.tipo === 'plan' && i.clienteId === cliente.id));
      return [...sinPlanDelCliente, {
        tipo: 'plan', id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, plan: p,
        clienteId: cliente.id, clienteNombre: cliente.nombre,
      }];
    });
  }, [cliente, mostrarAviso]);

  const planEnCarrito = cliente ? carrito.find((i) => i.tipo === 'plan' && i.clienteId === cliente.id) : null;

  // ---------------- Cuenta ----------------
  const cambiarCantidad = (idx, delta) => {
    setCarrito((prev) => {
      const copia = [...prev];
      const item = copia[idx];
      const max = item.tipo === 'plan' ? 1 : item.stock;
      const nueva = item.cantidad + delta;
      if (nueva > max) { mostrarAviso('error', `Solo hay ${max} de ${item.nombre}`); return prev; }
      copia[idx] = { ...item, cantidad: nueva };
      return copia.filter((i) => i.cantidad > 0);
    });
  };
  const eliminarItem = (idx) => setCarrito((prev) => prev.filter((_, i) => i !== idx));
  const vaciar = () => { setCarrito([]); setMontoRecibido(''); };

  const total = useMemo(() => carrito.reduce((s, i) => s + i.precio * i.cantidad, 0), [carrito]);
  const recibido = Number(montoRecibido) || 0;
  const cambio = metodoPago === 'CASH' ? recibido - total : null;
  const items = carrito.reduce((s, i) => s + i.cantidad, 0);

  const motivoBloqueo = (() => {
    if (verificandoTurno) return 'Verificando el turno…';
    if (!turnoValido || !(turnoIdBackend || turnoActivo?.id)) return 'Abra un turno de caja para poder cobrar';
    if (carrito.length === 0) return 'Agregue productos o un plan';
    if (metodoPago === 'CASH' && recibido > 0 && recibido < total) return `Faltan ${COP(total - recibido)}`;
    return null;
  })();

  const procesarVenta = useCallback(async () => {
    if (procesando || motivoBloqueo) return;
    const shiftId = turnoIdBackend || turnoActivo?.id;
    const productosVenta = carrito.filter((i) => i.tipo === 'producto');
    const planesVenta = carrito.filter((i) => i.tipo === 'plan');
    // Si no escribió cuánto recibió en efectivo, se asume el valor exacto
    const efectivo = metodoPago === 'CASH' ? (recibido || total) : 0;

    setProcesando(true);
    // La misma llave se reutiliza si se reintenta este carrito: el servidor no cobra dos veces
    if (!llaveCobro.current) llaveCobro.current = nuevaLlaveCobro();
    try {
      const r = await ventasService.cobrar({
        llave: llaveCobro.current,
        shiftId,
        metodoPago,
        efectivoRecibido: efectivo,
        productos: productosVenta.map((i) => ({ productId: i.id, quantity: i.cantidad })),
        planes: planesVenta.map((pl) => ({ clientId: pl.clienteId, membershipType: tipoMembresiaDePlan(pl.plan), amount: pl.precio })),
      });

      if (productosVenta.length > 0) {
        agregarVenta({
          descripcion: productosVenta.map((i) => `${i.cantidad} x ${i.nombre}`).join(', '),
          total: productosVenta.reduce((s, i) => s + i.precio * i.cantidad, 0),
          metodoPago, tipo: 'producto', cliente: cliente?.nombre || null,
        });
      }
      for (const pl of planesVenta) {
        // El plan, sus fechas y el pago quedan en el servidor (clientes y ventas)
        agregarVenta({ descripcion: `Plan ${pl.nombre}`, total: pl.precio, metodoPago, tipo: 'mensualidad', cliente: pl.clienteNombre });
      }

      llaveCobro.current = null;
      const totalCobrado = r?.total ?? total;
      const cambioServidor = r?.change ?? (metodoPago === 'CASH' ? Math.max(0, efectivo - total) : null);
      setUltimaVenta({
        total: totalCobrado, metodoPago, cambio: metodoPago === 'CASH' ? cambioServidor : null,
        resumen: carrito.map((i) => `${i.cantidad > 1 ? `${i.cantidad} x ` : ''}${i.nombre}`).join(', '),
        cliente: cliente?.nombre || null,
      });
      setCarrito([]);
      setMontoRecibido('');
      setCliente(null);
      setBusquedaCliente('');
      mostrarAviso('exito', metodoPago === 'CASH' && cambioServidor > 0
        ? `Venta registrada · Entregue ${COP(cambioServidor)} de cambio`
        : 'Venta registrada');
      inputProductoRef.current?.focus();
    } catch (e) {
      // Nada quedó cobrado (todo es una sola transacción). Si fue un corte de conexión,
      // al reintentar se usa la misma llave y el servidor no cobra dos veces.
      const sinRespuesta = !e?.status && !e?.response;
      mostrarAviso('error', sinRespuesta
        ? 'No hubo respuesta del servidor. Vuelva a presionar Cobrar: no se cobrará dos veces.'
        : (e.mensajeUsuario || e.message || 'No se pudo registrar la venta. No se cobró nada.'));
    } finally {
      setProcesando(false);
      cargarProductos();
      if (planesVenta.length) cargarClientes(true);
    }
  }, [procesando, motivoBloqueo, turnoIdBackend, turnoActivo, carrito, metodoPago, recibido, total, cliente,
    agregarVenta, mostrarAviso, cargarProductos, cargarClientes]);

  // ---------------- Alto disponible ----------------
  // La caja ocupa exactamente el alto visible: nada de la página necesita scroll.
  const raizRef = useRef(null);
  const [alto, setAlto] = useState(null);
  useEffect(() => {
    const medir = () => {
      const el = raizRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + (el.closest('.sg-main')?.scrollTop || 0);
      setAlto(Math.max(520, window.innerHeight - top - 18));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Iniciales del producto solo con palabras (no "A6" por "Agua 600 ml")
  const iniciales = (n = '') => {
    const palabras = n.split(/\s+/).filter((w) => /^[a-záéíóúñ]/i.test(w) && w.length > 2);
    if (palabras.length === 0) return n.slice(0, 2).toUpperCase();
    if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  };

  // ---------------- Vista ----------------
  return (
    <div className="cj" ref={raizRef} style={alto ? { height: alto } : undefined}>
      {aviso && (
        <div className={`cj-aviso ${aviso.tipo}`} role="status">
          {aviso.tipo === 'exito' ? <CheckCircle2 /> : <AlertTriangle />} {aviso.texto}
        </div>
      )}

      {/* ===================== 1. PRODUCTOS ===================== */}
      <section className="cj-col cj-productos">
        <div className="cj-buscar">
          <Search />
          <input ref={inputProductoRef} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={onEnterProducto}
            placeholder="Buscar producto o escanear código" aria-label="Buscar producto" />
          {busqueda ? (
            <button className="cj-icono" onClick={() => setBusqueda('')} aria-label="Limpiar"><X /></button>
          ) : <span className="cj-kbd"><ScanBarcode /> Enter</span>}
        </div>

        <div className="cj-chips" role="tablist">
          <button className={`cj-chip ${catSeleccionada === 'TODOS' ? 'on' : ''}`} onClick={() => setCatSeleccionada('TODOS')}>
            Todos <span>{productos.length}</span>
          </button>
          {categoriasConProductos.map((c) => (
            <button key={c.id} className={`cj-chip ${catSeleccionada === c.id ? 'on' : ''}`} onClick={() => setCatSeleccionada(c.id)}>
              {c.nombre} <span>{c.total}</span>
            </button>
          ))}
        </div>

        <div className="cj-grid">
          {productosFiltrados.length === 0 ? (
            <div className="cj-vacio"><Package /><p>{busqueda ? 'Ningún producto coincide con la búsqueda' : 'No hay productos en esta categoría'}</p></div>
          ) : productosFiltrados.map((p, i) => {
            const cant = enCarrito[p.id] || 0;
            const agotado = p.stock <= 0;
            const quedan = p.stock - cant;
            return (
              <button key={p.id} className={`cj-prod tono-${i % 6} ${agotado ? 'agotado' : ''} ${cant ? 'en-cuenta' : ''}`}
                onClick={() => agregarProducto(p)} disabled={agotado} title={p.codigo ? `Código ${p.codigo}` : p.nombre}>
                <span className="cj-prod-ini" aria-hidden="true">{iniciales(p.nombre) || '•'}</span>
                {cant > 0 && <span className="cj-prod-cant">×{cant}</span>}
                <span className="cj-prod-nombre">{p.nombre}</span>
                <span className="cj-prod-pie">
                  <span className="cj-prod-precio">{COP(p.precio)}</span>
                  <span className={`cj-prod-stock ${agotado ? 'rojo' : quedan <= stockMinimoGlobal() ? 'ambar' : ''}`}>
                    {agotado ? 'Agotado' : `${quedan} disp.`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===================== 2. CLIENTE Y PLANES ===================== */}
      <section className="cj-col cj-medio">
        <div className={`cj-cliente ${cliente ? `con-cliente ${plan.clase}` : ''}`}>
          {!cliente ? (
            <>
              <div className="cj-cliente-vacio">
                <span className="cj-avatar-vacio"><UserRound /></span>
                <div>
                  <strong>¿Para quién es?</strong>
                  <small>Opcional en productos, necesario para planes</small>
                </div>
              </div>
              <div className="cj-buscar cj-buscar-cliente">
                <Search />
                <input ref={inputClienteRef} value={busquedaCliente}
                  onChange={(e) => { setBusquedaCliente(e.target.value); setMostrarResultados(true); setResaltado(0); }}
                  onFocus={() => { cargarClientes(); setMostrarResultados(true); }}
                  onBlur={() => setTimeout(() => setMostrarResultados(false), 150)}
                  onKeyDown={onTeclaCliente}
                  placeholder="Nombre, cédula o teléfono" aria-label="Buscar cliente" />
                {mostrarResultados && busquedaCliente.trim() && (
                  <div className="cj-resultados">
                    {clientesFiltrados.length === 0 ? (
                      <div className="cj-res-vacio">No se encontró ningún cliente activo</div>
                    ) : clientesFiltrados.map((c, i) => {
                      const ep = estadoPlan(c);
                      return (
                        <button key={c.id} className={`cj-res ${i === resaltado ? 'on' : ''}`}
                          onMouseDown={() => seleccionarCliente(c)} onMouseEnter={() => setResaltado(i)}>
                          <FotoCliente id={c.id} nombre={c.nombre} version={c.fotoVersion} size={34} />
                          <span className="cj-res-info">
                            <strong>{c.nombre}</strong>
                            <small>C.C. {c.cedula || '—'}{c.telefono ? ` · ${c.telefono}` : ''}</small>
                          </span>
                          <span className={`cj-badge ${ep.clase}`}>{ep.clase === 'activo' ? 'Activo' : ep.titulo}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="cj-ficha">
                <FotoCliente id={cliente.id} nombre={cliente.nombre} version={cliente.fotoVersion} size={54} />
                <div className="cj-ficha-datos">
                  <strong title={cliente.nombre}>{cliente.nombre}</strong>
                  <span><IdCard /> {cliente.cedula || 'Sin cédula'}</span>
                  {cliente.telefono && <span><Phone /> {cliente.telefono}</span>}
                </div>
                <button className="cj-icono cj-quitar" onClick={quitarCliente} title="Cambiar de cliente" aria-label="Quitar cliente"><X /></button>
              </div>
              <div className="cj-plan">
                <plan.icon />
                <div>
                  <strong>{plan.titulo}</strong>
                  <small>{plan.detalle}{cliente.membresia?.tipo && plan.clase !== 'sin' ? ` · ${TIPO_PLAN[cliente.membresia.tipo] || cliente.membresia.tipo}` : ''}</small>
                </div>
                <Racha clienteId={cliente.id} />
              </div>
            </>
          )}
        </div>

        <div className="cj-planes-box">
          <div className="cj-sub">
            <span>{cliente ? (planVigente ? 'Renovar plan' : 'Activar plan') : 'Planes'}</span>
            {cliente && planVigente && (
              <small>Empieza el {fechaCorta(sumarDias(cliente.membresia.fechaVencimiento, 1))} · no pierde días</small>
            )}
            {!cliente && <small>Elija primero el cliente</small>}
          </div>
          <div className={`cj-planes ${!cliente ? 'deshabilitado' : ''}`}>
            {planes.length === 0 && <p className="cj-res-vacio">No hay planes activos. Créelos en Planes.</p>}
            {planes.map((p) => (
              <button key={p.id} className={`cj-plan-btn ${planEnCarrito?.id === p.id ? 'on' : ''}`} onClick={() => agregarPlan(p)}
                title={!cliente ? 'Seleccione un cliente primero' : `Agregar ${p.nombre}`}>
                <span className="cj-plan-dur">{p.duracion}<small>{p.duracion === 1 ? 'día' : 'días'}</small></span>
                <span className="cj-plan-nombre">{p.nombre}</span>
                <span className="cj-plan-precio">{COP(p.precio)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 3. TICKET ===================== */}
      <section className="cj-col cj-ticket">
        <div className="cj-ticket-head">
          <span><ShoppingCart /> Cuenta</span>
          {items > 0 && <span className="cj-contador">{items} {items === 1 ? 'ítem' : 'ítems'}</span>}
          {carrito.length > 0 && <button className="cj-link" onClick={vaciar}>Vaciar</button>}
        </div>

        <div className="cj-items">
          {carrito.length === 0 ? (
            <div className="cj-items-vacio">
              {ultimaVenta ? (
                <>
                  <CheckCircle2 className="ok" />
                  <strong>Última venta {COP(ultimaVenta.total)}</strong>
                  {ultimaVenta.cambio ? <span>Cambio entregado {COP(ultimaVenta.cambio)}</span> : null}
                  <small>{ultimaVenta.resumen}</small>
                </>
              ) : (
                <>
                  <ShoppingCart className="vacio" />
                  <span>Toque un producto o un plan para empezar</span>
                </>
              )}
            </div>
          ) : carrito.map((it, idx) => (
            <div key={`${it.tipo}-${it.id}-${it.clienteId || ''}`} className={`cj-item ${it.tipo}`}>
              <div className="cj-item-info">
                <strong>{it.nombre}</strong>
                <small>{it.tipo === 'plan' ? `Plan · ${it.clienteNombre}` : `${COP(it.precio)} c/u`}</small>
              </div>
              {it.tipo === 'producto' && (
                <div className="cj-cant">
                  <button onClick={() => cambiarCantidad(idx, -1)} aria-label="Quitar uno"><Minus /></button>
                  <span>{it.cantidad}</span>
                  <button onClick={() => cambiarCantidad(idx, 1)} aria-label="Agregar uno"><Plus /></button>
                </div>
              )}
              <span className="cj-item-total">{COP(it.precio * it.cantidad)}</span>
              <button className="cj-icono" onClick={() => eliminarItem(idx)} aria-label={`Quitar ${it.nombre}`}><Trash2 /></button>
            </div>
          ))}
        </div>

        <div className="cj-corte" aria-hidden="true" />

        <div className="cj-pago">
          <div className="cj-total">
            <span>Total a cobrar</span>
            <strong>{COP(total)}</strong>
          </div>

          <div className="cj-metodos" role="radiogroup" aria-label="Medio de pago">
            {METODOS.map((m) => (
              <button key={m.id} role="radio" aria-checked={metodoPago === m.id}
                className={metodoPago === m.id ? 'on' : ''} onClick={() => setMetodoPago(m.id)}>
                <m.icon /> {m.label}
              </button>
            ))}
          </div>

          {metodoPago === 'CASH' && (
            <div className={`cj-bloque cj-efectivo ${total === 0 ? 'inactivo' : ''}`}>
              <div className="cj-recibido-fila">
                <label className="cj-recibido-caja">
                  <span>Recibe</span>
                  <input className="cj-recibido" inputMode="numeric" disabled={total === 0} aria-label="Efectivo recibido"
                    value={montoRecibido ? `$ ${Number(montoRecibido).toLocaleString('es-CO')}` : ''}
                    onChange={(e) => setMontoRecibido(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') procesarVenta(); }}
                    placeholder={total ? COP(total) : '$ 0'} />
                </label>
                <div className={`cj-cambio ${recibido > 0 && cambio < 0 ? 'falta' : ''} ${recibido > 0 ? '' : 'neutro'}`}>
                  <span>{recibido > 0 && cambio < 0 ? 'Falta' : 'Cambio'}</span>
                  <strong>{recibido > 0 ? COP(Math.abs(cambio)) : '$0'}</strong>
                </div>
              </div>
              <div className="cj-billetes">
                <button disabled={total === 0} className={recibido === total && total > 0 ? 'on' : ''}
                  onClick={() => setMontoRecibido(String(total))}>Exacto</button>
                {montosSugeridos(total).map((b) => (
                  <button key={b} disabled={total === 0} className={recibido === b ? 'on' : ''}
                    onClick={() => setMontoRecibido(String(b))}>{COP(b)}</button>
                ))}
              </div>
            </div>
          )}

          {!turnoValido && !verificandoTurno ? (
            <div className="cj-sin-turno">
              <Lock />
              <span>Abra un turno de caja para poder cobrar</span>
              {onAbrirTurno && <button className="sg-btn sg-btn-primary" onClick={onAbrirTurno}>Abrir turno</button>}
            </div>
          ) : (
            <button className="cj-cobrar" onClick={procesarVenta} disabled={Boolean(motivoBloqueo) || procesando}>
              {procesando ? 'Registrando…' : carrito.length === 0 ? 'Cobrar' : motivoBloqueo || <>Cobrar <b>{COP(total)}</b></>}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
