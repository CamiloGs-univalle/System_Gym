import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { productosService } from '../../services/productosService';
import ventasService from '../../services/ventasService';
import { useVentasStore } from '../../store/ventasStore';
import { clientesService } from '../../services/clientesService';
import { planesService } from '../../services/gimnasio/planesService';
import { membresiasService } from '../../services/gimnasio/membresiasService';
import { pagosService } from '../../services/gimnasio/pagosService';
import { carteraService } from '../../services/gimnasio/carteraService';
import { streakService } from '../../services/gimnasio/streakService';
import '../../styles/recepcionCSS/pos.css';

const COP = (v) => {
  if (v == null || isNaN(v)) return '$0';
  return '$' + Number(Math.round(v)).toLocaleString('es-CO');
};

function FlameStreak({ clienteId }) {
  const [anim, setAnim] = useState(false);

  const dias = useMemo(() => {
    if (!clienteId) return 0;
    const s = streakService.obtenerStreak(clienteId);
    return s.diasConsecutivos || 0;
  }, [clienteId]);

  useEffect(() => {
    if (dias > 0) { setAnim(true); const t = setTimeout(() => setAnim(false), 800); return () => clearTimeout(t); }
  }, [dias]);

  if (dias === 0) {
    return (
      <div className="streak-container" style={{ background: '#f3f4f6', border: '1px dashed #d1d5db', borderRadius: 10, padding: '6px 10px', margin: '6px 0' }}>
        <span style={{ fontSize: '1.1rem' }}>🪨</span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sin racha</span>
      </div>
    );
  }

  let nombre, color, bg, emoji;
  if (dias >= 60) { nombre = 'Legendario'; color = '#7c3aed'; bg = 'linear-gradient(135deg, #ede9fe, #c4b5fd)'; emoji = '🌋'; }
  else if (dias >= 30) { nombre = 'Inferno'; color = '#dc2626'; bg = 'linear-gradient(135deg, #fee2e2, #fca5a5)'; emoji = '🔥'; }
  else if (dias >= 14) { nombre = 'Fuego'; color = '#ea580c'; bg = 'linear-gradient(135deg, #fff7ed, #fdba74)'; emoji = '🔥'; }
  else if (dias >= 7) { nombre = 'Llamita'; color = '#d97706'; bg = 'linear-gradient(135deg, #fffbeb, #fcd34d)'; emoji = '🔥'; }
  else { nombre = 'Chispa'; color = '#eab308'; bg = 'linear-gradient(135deg, #fefce8, #fde047)'; emoji = '✨'; }

  const pct = Math.min((dias / 30) * 100, 100);

  return (
    <div className={`streak-container ${anim ? 'streak-animating' : ''}`}
      style={{ background: bg, border: `1px solid ${color}`, borderRadius: 10, padding: '6px 10px', margin: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{dias}</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase' }}>{nombre}</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>dias consecutivos</div>
        <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
      </div>
    </div>
  );
}

export default function POSPanel({ turnoActivo, turnoValido, turnoIdBackend, verificandoTurno }) {
  const agregarVenta = useVentasStore(state => state.agregarVenta);
  const [clientesCache, setClientesCache] = useState([]);
  const [productos, setProductos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catSeleccionada, setCatSeleccionada] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const [cliente, setCliente] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [membresia, setMembresia] = useState(null);

  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [notif, setNotif] = useState(null);
  const inputClienteRef = useRef(null);

  const mostrarNotif = (tipo, texto) => {
    setNotif({ tipo, texto });
    setTimeout(() => setNotif(null), 3000);
  };

  const recargarProductos = useCallback(async () => {
    try {
      const prodsResp = await productosService.listarProductos();
      const prodsData = Array.isArray(prodsResp) ? prodsResp : prodsResp?.data || [];
      setProductos(prodsData.map(p => ({
        id: p.id, nombre: p.name || p.nombre || '', codigo: p.code || p.codigo || '',
        precio: p.salePrice || p.precio || 0, stock: p.stock || 0,
        categoriaId: p.categoryId || p.category?.id,
        categoria: p.category?.name || p.categoria || 'General', imagen: p.imagen || ''
      })));
    } catch {}
  }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        const catsResp = await productosService.listarCategorias();
        const catsData = Array.isArray(catsResp) ? catsResp : catsResp?.data || [];
        setCategorias(catsData.map(c => ({ id: c.id, nombre: c.name || c.nombre || 'General' })));
      } catch {}
      try {
        const prodsResp = await productosService.listarProductos();
        const prodsData = Array.isArray(prodsResp) ? prodsResp : prodsResp?.data || [];
        setProductos(prodsData.map(p => ({
          id: p.id, nombre: p.name || p.nombre || '', codigo: p.code || p.codigo || '',
          precio: p.salePrice || p.precio || 0, stock: p.stock || 0,
          categoriaId: p.categoryId || p.category?.id,
          categoria: p.category?.name || p.categoria || 'General', imagen: p.imagen || ''
        })));
      } catch {}
      setPlanes(planesService.listar());
      try {
        const clientesResp = await clientesService.listar();
        setClientesCache(Array.isArray(clientesResp) ? clientesResp : []);
      } catch { setClientesCache([]); }
    };
    cargar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return [];
    const q = busquedaCliente.toLowerCase();
    return clientesCache.filter(c => {
      const nombre = (c.nombre || '').toLowerCase();
      const cedula = (c.cedula || '').toLowerCase();
      const telefono = (c.telefono || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return nombre.includes(q) || cedula.includes(q) || telefono.includes(q) || email.includes(q);
    }).slice(0, 8);
  }, [clientesCache, busquedaCliente]);

  const productosFiltrados = useMemo(() => {
    let f = productos;
    if (catSeleccionada !== 'Todos') f = f.filter(p => p.categoriaId === catSeleccionada);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      f = f.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
    }
    return f;
  }, [productos, catSeleccionada, busqueda]);

  const seleccionarCliente = useCallback((c) => {
    setCliente(c);
    setBusquedaCliente(c.nombre || '');
    setMostrarResultados(false);
    try {
      const mem = membresiasService.obtenerActivaPorCliente(c.id);
      setMembresia(mem);
      streakService.registrarAsistencia(c.id);
    } catch { setMembresia(null); }
  }, []);

  const quitarCliente = useCallback(() => {
    setCliente(null); setMembresia(null); setBusquedaCliente('');
  }, []);

  const agregarAlCarrito = useCallback((item, tipo) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.id === item.id && i.tipo === tipo);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 };
        return copia;
      }
      return [...prev, {
        id: item.id, tipo, nombre: item.nombre,
        precio: item.precio || 0,
        cantidad: 1, clienteId: cliente?.id, clienteNombre: cliente?.nombre, plan: tipo === 'plan' ? item : null
      }];
    });
  }, [cliente]);

  const eliminarDelCarrito = useCallback((idx) => {
    setCarrito(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const cambiarCantidad = useCallback((idx, delta) => {
    setCarrito(prev => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], cantidad: Math.max(0, copia[idx].cantidad + delta) };
      return copia.filter(i => i.cantidad > 0);
    });
  }, []);

  const total = useMemo(() => carrito.reduce((s, i) => s + i.precio * i.cantidad, 0), [carrito]);
  const cambio = useMemo(() => {
    if (metodoPago !== 'efectivo') return null;
    return (parseFloat(montoRecibido) || 0) - total;
  }, [metodoPago, montoRecibido, total]);

  const procesarVenta = useCallback(async () => {
    if (carrito.length === 0 || procesando) return;
    if (metodoPago === 'efectivo' && (cambio == null || cambio < 0)) {
      mostrarNotif('error', 'Monto insuficiente'); return;
    }
    const shiftId = turnoIdBackend || turnoActivo?.id;
    if (!shiftId) { mostrarNotif('error', 'Abre un turno primero'); return; }

    setProcesando(true);
    try {
      const mapMetodo = { 'efectivo': 'CASH', 'transferencia': 'TRANSFER', 'tarjeta': 'CARD' };
      const payMethod = mapMetodo[metodoPago] || 'CASH';
      const productosVenta = carrito.filter(i => i.tipo === 'producto');
      const planesVenta = carrito.filter(i => i.tipo === 'plan');

      if (productosVenta.length > 0 && turnoValido) {
        const items = productosVenta.map(i => ({
          productId: i.id, quantity: i.cantidad, unitPrice: i.precio, subtotal: i.precio * i.cantidad
        }));
        const totalProd = productosVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
        await ventasService.registrarVenta(items, payMethod, shiftId, 'PRODUCT_SALE', cliente?.id, totalProd);
        agregarVenta({
          descripcion: productosVenta.map(i => i.nombre).join(', '),
          total: totalProd,
          metodoPago: payMethod,
          tipo: 'producto',
          cliente: cliente?.nombre || null
        });
      }

      for (const pl of planesVenta) {
        let membresiaCreadaId = membresia?.id || null;

        if (membresia) {
          try {
            membresiasService.renovar(membresia.id, {
              planId: pl.id, planNombre: pl.plan?.nombre || pl.nombre,
              planPrecio: pl.precio, precioAcordado: pl.precio,
              montoPagado: pl.precio, metodoPago: payMethod, responsable: 'Recepcion'
            });
          } catch (e) { console.warn('Error renovando membresia local:', e.message); }
        } else if (pl.clienteId) {
          try {
            const duracionDias = pl.plan?.duracion || 30;
            const fechaInicio = new Date();
            const fechaFin = new Date(fechaInicio.getTime() + duracionDias * 86400000);
            const nuevaMembresia = membresiasService.crear({
              clienteId: pl.clienteId, planId: pl.id, planNombre: pl.plan?.nombre || pl.nombre,
              planPrecio: pl.precio, precioAcordado: pl.precio,
              fechaInicio: fechaInicio.toISOString().split('T')[0],
              fechaVencimiento: fechaFin.toISOString().split('T')[0],
              modeloCobro: '30_DIAS', diasGracia: 5, sedeId: 1
            });
            membresiaCreadaId = nuevaMembresia.id;
          } catch (e) { console.warn('Error creando membresia local:', e.message); }
        }

        if (pl.clienteId) {
          try {
            await clientesService.renovarMembresia(pl.clienteId, {
              tipo: pl.plan?.nombre?.toLowerCase()?.includes('diario') ? 'daily' :
                    pl.plan?.nombre?.toLowerCase()?.includes('trimestral') ? 'quarterly' :
                    pl.plan?.nombre?.toLowerCase()?.includes('semestral') ? 'semestral' :
                    pl.plan?.nombre?.toLowerCase()?.includes('anual') ? 'annual' : 'mensual',
              monto: pl.precio, metodoPago: payMethod,
              efectivoRecibido: metodoPago === 'efectivo' ? (parseFloat(montoRecibido) || pl.precio) : pl.precio,
              shiftId, processedByUserId: ventasService.getUserId()
            });
          } catch (e) {
            // Si el sistema no registró el cobro, no se debe dar por pagada la membresía
            throw new Error('No se pudo registrar la membresía: ' + (e.mensajeUsuario || e.message));
          }
        }

        pagosService.registrarPagoMembresia(membresiaCreadaId, pl.clienteId, pl.clienteNombre, pl.precio, payMethod, { planNombre: pl.plan?.nombre || pl.nombre });
        agregarVenta({
          descripcion: `Membresia: ${pl.plan?.nombre || pl.nombre}`,
          total: pl.precio,
          metodoPago: payMethod,
          tipo: 'mensualidad',
          cliente: pl.clienteNombre || cliente?.nombre || null
        });

        try {
          const fechaVenc = new Date();
          fechaVenc.setDate(fechaVenc.getDate() + (pl.plan?.duracion || 30));
          carteraService.crearDesdeFactura({
            clienteId: pl.clienteId,
            clienteNombre: pl.clienteNombre || cliente?.nombre || '',
            concepto: 'MEMBRESIA',
            fechaVencimiento: fechaVenc.toISOString().split('T')[0],
            valor: pl.precio
          });
        } catch (e) { console.warn('Error creando cartera:', e.message); }
      }

      mostrarNotif('exito', `Venta procesada - ${COP(total)}`);
      setCarrito([]); setMontoRecibido(''); quitarCliente();
      await recargarProductos();
    } catch (e) {
      mostrarNotif('error', e.message || 'Error al procesar');
    } finally { setProcesando(false); }
  }, [carrito, cliente, metodoPago, montoRecibido, total, cambio, procesando, turnoIdBackend, turnoActivo, turnoValido, membresia, quitarCliente, recargarProductos]);

  return (
    <div className="pos-wireframe">
      {notif && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 8, background: notif.tipo === 'exito' ? '#10b981' : '#ef4444', color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {notif.tipo === 'exito' ? '✓ ' : '✕ '}{notif.texto}
        </div>
      )}

      <section className="pos-panel pos-panel-productos">
        <input className="pos-input-pill pos-buscar-producto" type="text" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div className="categorias-container">
          <button className={`categoria-btn ${catSeleccionada === 'Todos' ? 'active' : ''}`} onClick={() => setCatSeleccionada('Todos')}>
            Todos <span className="categoria-btn-count">{productos.length}</span>
          </button>
          {categorias.map(cat => (
            <button key={cat.id} className={`categoria-btn ${catSeleccionada === cat.id ? 'active' : ''}`} onClick={() => setCatSeleccionada(cat.id)}>
              {cat.nombre} <span className="categoria-btn-count">{productos.filter(p => p.categoriaId === cat.id).length}</span>
            </button>
          ))}
        </div>
        <div className="productos-grid">
          {productosFiltrados.length === 0 ? (
            <div className="productos-vacio"><span>📦</span><p>Sin productos</p></div>
          ) : productosFiltrados.map(p => (
            <div key={p.id} className={`producto-item ${p.stock <= 0 ? 'producto-sin-stock' : ''}`}
              onClick={() => p.stock > 0 && agregarAlCarrito(p, 'producto')}
              style={p.stock <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
              <div className="producto-imagen">{p.imagen || '📦'}</div>
              <div className="producto-detalles">
                <span className="producto-nombre">{p.nombre}</span>
                <span className="producto-precio">{COP(p.precio)}</span>
                <span className="producto-stock" style={{ color: p.stock <= 0 ? '#ef4444' : '#6b7280' }}>
                  {p.stock <= 0 ? 'Sin stock' : `Stock: ${p.stock}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pos-panel-derecho">
        <section className="pos-panel pos-panel-cliente">
          <div className="cliente-fila-superior">
            <div className="cliente-foto">{cliente ? (cliente.genero === 'masculino' ? '👨' : '👩') : '🧍'}</div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input ref={inputClienteRef} className="pos-input-pill cliente-nombre-input" placeholder="Buscar cliente por nombre, cedula o telefono"
                value={busquedaCliente}
                onChange={e => { setBusquedaCliente(e.target.value); setMostrarResultados(true); setCliente(null); setMembresia(null); }}
                onFocus={() => { if (busquedaCliente.trim() && clientesFiltrados.length > 0) setMostrarResultados(true); }}
                onBlur={() => setTimeout(() => setMostrarResultados(false), 200)} />
              {cliente && <button className="cliente-quitar-btn" onClick={quitarCliente} title="Quitar">&times;</button>}
              {mostrarResultados && clientesFiltrados.length > 0 && busquedaCliente.trim() && (
                <div className="resultados-busqueda-cliente">
                  {clientesFiltrados.map(c => (
                    <div key={c.id} className="resultado-item-cliente" onMouseDown={() => seleccionarCliente(c)}>
                      <div className="resultado-info">
                        <span className="resultado-nombre">{c.nombre}</span>
                        <span className="resultado-detalle">Ced: {c.cedula}</span>
                      </div>
                      <span className="resultado-telefono">{c.telefono}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {cliente ? (
            <>
              <div className="cliente-fila-datos">
                <input className="pos-input-pill" readOnly value={cliente.cedula || ''} placeholder="Cedula" />
                <input className="pos-input-pill" readOnly value={cliente.telefono || ''} placeholder="Telefono" />
              </div>

              <FlameStreak clienteId={cliente.id} />

              <div style={{ margin: '6px 0' }}>
                {membresia ? (
                  <div className="membresia-badge membresia-activa" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                    <span style={{ fontSize: '1.3rem' }}>{membresia.estado === 'ACTIVA' ? '✅' : '⚠️'}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.85rem' }}>{membresia.planNombre || 'Sin plan'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Vence: {membresia.fechaVencimiento || '—'}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: membresia.estado === 'ACTIVA' ? '#10b981' : '#ef4444' }}>{membresia.estado}</span>
                    </div>
                  </div>
                ) : (
                  <div className="membresia-badge membresia-sin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, borderLeft: '4px solid #d1d5db', background: '#f9fafb' }}>
                    <span style={{ fontSize: '1.3rem' }}>🚫</span>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Sin membresia activa</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Registra un pago para activar</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, margin: '8px 0' }}>
                {planes.filter(p => p.tipo === 'MEMBRESIA' && p.estado === 'ACTIVO').map(plan => (
                  <button key={plan.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 8px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                    onClick={() => agregarAlCarrito(plan, 'plan')}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <span style={{ fontSize: '1.2rem' }}>⭐</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151' }}>{plan.nombre}</span>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>{COP(plan.precio)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>🔍</span>
              Busca un cliente para ver su informacion
            </div>
          )}
        </section>

        <section className="pos-panel pos-panel-carrito">
          <div className="carrito-columna">
            <h3 className="carrito-titulo">Carrito ({carrito.length})</h3>
            <div className="carrito-items" style={{ maxHeight: 200, overflow: 'auto' }}>
              {carrito.length === 0 ? (
                <p className="carrito-vacio">Vacio</p>
              ) : carrito.map((item, idx) => (
                <div key={`${item.tipo}-${item.id}-${idx}`} className="carrito-item-pill">
                  <span className="item-nombre">{item.tipo === 'plan' ? '⭐ ' : ''}{item.nombre}</span>
                  {item.tipo === 'producto' ? (
                    <div className="item-controls">
                      <button onClick={() => cambiarCantidad(idx, -1)} disabled={item.cantidad <= 1}>−</button>
                      <span className="item-cantidad">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(idx, 1)}>+</button>
                    </div>
                  ) : <span className="item-cantidad">1</span>}
                  <span className="item-subtotal">{COP(item.precio * item.cantidad)}</span>
                  <button className="item-eliminar" onClick={() => eliminarDelCarrito(idx)}>✖</button>
                </div>
              ))}
            </div>
          </div>

          <div className="totales-columna">
            <div className="total-pill">
              <span>Total:</span>
              <span className="total-pill-monto">{COP(total)}</span>
            </div>
            <div className="total-pill total-pill-metodo">
              <span>Pago:</span>
              <div className="metodo-pago-toggle">
                {[['efectivo', '💵', 'Efectivo'], ['transferencia', '🏦', 'Transferencia'], ['tarjeta', '💳', 'Tarjeta']].map(([m, icon, label]) => (
                  <button key={m} className={`metodo-toggle-btn ${metodoPago === m ? 'active' : ''}`} onClick={() => setMetodoPago(m)}>
                    <span className="metodo-icon">{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>
            {metodoPago === 'efectivo' && (
              <div className="total-pill total-pill-input">
                <span>Recibido:</span>
                <input className="input-moneda-pos" type="text" placeholder="$ 0"
                  value={montoRecibido ? '$ ' + Number(montoRecibido).toLocaleString('es-CO') : ''}
                  onChange={e => setMontoRecibido(e.target.value.replace(/[^0-9]/g, ''))} />
              </div>
            )}
            {cambio != null && (
              <div className="total-pill">
                <span>Cambio:</span>
                <span className={`total-pill-monto ${cambio >= 0 ? 'cambio-correcto' : 'cambio-insuficiente'}`}>
                  {cambio >= 0 ? COP(cambio) : `Falta ${COP(Math.abs(cambio))}`}
                </span>
              </div>
            )}
            <button className="realizar-venta-btn" onClick={procesarVenta}
              disabled={procesando || carrito.length === 0}
              style={{ opacity: procesando || carrito.length === 0 ? 0.5 : 1 }}>
              {procesando ? 'Procesando...' : 'Realizar Venta'}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .streak-container { display: flex; align-items: center; gap: 6px; }
        .streak-animating span { animation: firePulse 0.8s ease-in-out 2; }
        @keyframes firePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3) rotate(5deg); } }
        .membresia-badge { transition: all 0.2s; }
      `}</style>
    </div>
  );
}
