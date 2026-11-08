import { useState, useMemo, useEffect } from "react";
import Button from "../../components/ui/Button";
import clientesService from "../../services/clientesService";
import { planesService } from "../../services/gimnasio/planesService";
import { formatCurrencyInput } from "../../utils/formatters";
import "../../styles/recepcionCSS/clientes.css";

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const MEMBRESIA_LABELS = {
  MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual', DAILY: 'Diario'
};

const ESTADO_COLORS = {
  ACTIVA: '#10b981', POR_VENCER: '#f59e0b', VENCIDA: '#ef4444',
  NINGUNA: '#9ca3af', MORA: '#dc2626'
};

export default function ClientesPanel() {
  const [clientesList, setClientesList] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroMembresia, setFiltroMembresia] = useState("todas");
  const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });
  const [planesDisponibles, setPlanesDisponibles] = useState([]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', cedula: '', telefono: '', email: '', membresia: 'mensual', planId: '', metodoPago: 'CASH', entrenador: '', notas: '' });
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (tipo, texto) => {
    setNotif({ tipo, texto });
    setTimeout(() => setNotif(null), 3000);
  };

  useEffect(() => {
    cargarClientes();
    setPlanesDisponibles(planesService.filtrar({ tipo: 'MEMBRESIA', estado: 'ACTIVO' }));
  }, []);

  const cargarClientes = async () => {
    setCargandoLista(true);
    try {
      const clientes = await clientesService.listar({ incluirInactivos: true });
      setClientesList(clientes);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setCargandoLista(false);
    }
  };

  const getInitials = (nombre) => nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const getAvatarColor = (nombre) => {
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  const filteredClientes = useMemo(() => {
    let result = clientesList.filter(c => {
      const q = searchTerm.toLowerCase();
      const coincideBusqueda = c.nombre.toLowerCase().includes(q) || c.cedula.includes(q) || c.telefono.includes(q);
      if (!coincideBusqueda) return false;
      if (filtroEstado === 'activos' && !c.activo) return false;
      if (filtroEstado === 'inactivos' && c.activo) return false;
      if (filtroMembresia !== 'todas' && c.membresia?.tipo?.toLowerCase() !== filtroMembresia) return false;
      return true;
    });
    result.sort((a, b) => {
      const campoA = a[orden.campo] || '';
      const campoB = b[orden.campo] || '';
      return orden.direccion === 'asc' ? campoA.toString().localeCompare(campoB.toString()) : campoB.toString().localeCompare(campoA.toString());
    });
    return result;
  }, [clientesList, searchTerm, filtroEstado, filtroMembresia, orden]);

  const totalActivos = clientesList.filter(c => c.activo).length;
  const totalInactivos = clientesList.filter(c => !c.activo).length;
  const totalPorVencer = clientesList.filter(c => c.membresia?.estado === 'POR_VENCER').length;
  const totalVencidos = clientesList.filter(c => c.membresia?.estado === 'VENCIDA').length;

  const abrirNuevoCliente = () => {
    setEditandoId(null);
    setForm({ nombre: '', cedula: '', telefono: '', email: '', membresia: 'mensual', planId: '', metodoPago: 'CASH', entrenador: '', notas: '' });
    setModalAbierto(true);
  };

  const abrirEdicion = (cliente) => {
    setEditandoId(cliente.id);
    setForm({
      nombre: cliente.nombre, cedula: cliente.cedula, telefono: cliente.telefono,
      email: cliente.email || '', membresia: cliente.membresia?.tipo?.toLowerCase() || 'mensual',
      planId: cliente._raw?.planId || cliente._raw?.membershipPlanId || '',
      entrenador: cliente.entrenador || '', notas: cliente.notas || ''
    });
    setModalAbierto(true);
  };

  const verDetalle = (cliente) => { setClienteSeleccionado(cliente); setVistaDetalle(true); };
  const cerrarModal = () => { setModalAbierto(false); setEditandoId(null); setVistaDetalle(false); setClienteSeleccionado(null); };

  const handleFormChange = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const guardarCliente = async () => {
    if (!form.nombre.trim()) { mostrarNotif('error', 'El nombre es obligatorio'); return; }
    if (!form.cedula.trim()) { mostrarNotif('error', 'La cedula es obligatoria'); return; }
    setCargando(true);
    try {
      const planSeleccionado = form.planId ? planesDisponibles.find(p => p.id === parseInt(form.planId)) : null;
      const data = {
        nombre: form.nombre.trim(), cedula: form.cedula.replace(/\D/g, ''),
        telefono: form.telefono.replace(/\D/g, ''), email: form.email.trim(),
        membresia: form.membresia, entrenador: form.entrenador.trim(),
        notas: form.notas.trim(),
        precioMensual: planSeleccionado ? String(planSeleccionado.precio) : '0',
        metodoPago: form.metodoPago || 'CASH',
        planId: form.planId ? parseInt(form.planId) : null,
        planNombre: planSeleccionado?.nombre || ''
      };
      if (editandoId) {
        await clientesService.actualizar(editandoId, data);
        mostrarNotif('exito', 'Cliente actualizado');
      } else {
        await clientesService.crear(data);
        mostrarNotif('exito', 'Cliente creado');
      }
      await cargarClientes();
      cerrarModal();
    } catch (error) {
      mostrarNotif('error', error.message || 'Error al guardar');
    } finally { setCargando(false); }
  };

  const desactivarCliente = async () => {
    if (!clienteAEliminar) return;
    try {
      await clientesService.desactivar(clienteAEliminar.id);
      mostrarNotif('exito', `${clienteAEliminar.nombre} desactivado`);
      setClienteAEliminar(null);
      await cargarClientes();
    } catch (error) {
      mostrarNotif('error', error.message || 'Error al desactivar');
    }
  };

  const reactivarCliente = async (cliente) => {
    try {
      await clientesService.actualizar(cliente.id, { nombre: cliente.nombre, cedula: cliente.cedula, telefono: cliente.telefono, activo: true });
      mostrarNotif('exito', `${cliente.nombre} reactivado`);
      await cargarClientes();
    } catch (error) {
      mostrarNotif('error', error.message || 'Error al reactivar');
    }
  };

  const cambiarOrden = (campo) => setOrden(prev => ({ campo, direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc' }));

  if (cargandoLista) {
    return (
      <div className="clientes-modern-panel">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 40 }}>⏳</span>
          <p style={{ color: '#666' }}>Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clientes-modern-panel">
      {notif && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 8, background: notif.tipo === 'exito' ? '#10b981' : '#ef4444', color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {notif.tipo === 'exito' ? '✓ ' : '✕ '}{notif.texto}
        </div>
      )}

      <div className="clientes-modern-header">
        <div className="header-title-section">
          <div className="header-icon-wrapper"><span className="header-icon">👥</span></div>
          <div><h2>Gestion de Clientes</h2><p className="header-subtitle">{clientesList.length} clientes registrados</p></div>
        </div>
        <Button variant="success" onClick={abrirNuevoCliente} className="btn-nuevo-cliente"><span>➕</span> Nuevo Cliente</Button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-number">{clientesList.length}</span><span className="stat-label">Total</span></div></div>
        <div className="stat-card stat-activos"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-number">{totalActivos}</span><span className="stat-label">Activos</span></div></div>
        <div className="stat-card stat-por-vencer"><div className="stat-icon">⚠️</div><div className="stat-info"><span className="stat-number">{totalPorVencer}</span><span className="stat-label">Por Vencer</span></div></div>
        <div className="stat-card stat-inactivos"><div className="stat-icon">🔴</div><div className="stat-info"><span className="stat-number">{totalVencidos + totalInactivos}</span><span className="stat-label">Vencidos / Inactivos</span></div></div>
      </div>

      <div className="clientes-modern-filters">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar por nombre, cedula o telefono..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-modern-input" />
          {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>}
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="activos">✅ Activos</option>
            <option value="inactivos">🔴 Inactivos</option>
          </select>
          <select className="filter-select" value={filtroMembresia} onChange={e => setFiltroMembresia(e.target.value)}>
            <option value="todas">Todas las membresias</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="annual">Anual</option>
            <option value="daily">Diario</option>
          </select>
        </div>
      </div>

      <div className="clientes-modern-table-wrapper">
        <table className="clientes-modern-table">
          <thead>
            <tr>
              <th onClick={() => cambiarOrden('nombre')} className="sortable">Cliente {orden.campo === 'nombre' && (orden.direccion === 'asc' ? '↑' : '↓')}</th>
              <th>Contacto</th>
              <th>Membresia</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.length === 0 && (
              <tr><td colSpan={6} className="empty-state"><div className="empty-state-content"><span className="empty-icon">🔍</span><p>No se encontraron clientes</p></div></td></tr>
            )}
            {filteredClientes.map(cliente => {
              const mem = cliente.membresia;
              const estado = !cliente.activo ? 'INACTIVO' : (mem?.estado || 'NINGUNA');
              const colorEstado = ESTADO_COLORS[estado] || '#9ca3af';
              const avatarColor = getAvatarColor(cliente.nombre);

              return (
                <tr key={cliente.id} className="client-row" onClick={() => verDetalle(cliente)}>
                  <td>
                    <div className="cliente-info">
                      <div className="cliente-avatar" style={{ backgroundColor: avatarColor }}>{getInitials(cliente.nombre)}</div>
                      <div><div className="cliente-nombre">{cliente.nombre}</div><div className="cliente-cedula">Ced: {cliente.cedula}</div></div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="contact-item"><span className="contact-icon">📱</span><span>{cliente.telefono || '—'}</span></div>
                      {cliente.email && <div className="contact-item"><span className="contact-icon">✉️</span><span className="contact-email">{cliente.email}</span></div>}
                    </div>
                  </td>
                  <td>
                    <div className="membresia-info">
                      {mem ? (
                        <>
                          <span className="membresia-badge">{MEMBRESIA_LABELS[mem.tipo] || mem.tipo}</span>
                          <span className="dias-restantes" style={{ color: colorEstado }}>{mem.diasRestantes} dias</span>
                        </>
                      ) : <span className="membresia-badge" style={{ background: '#f3f4f6' }}>Sin membresia</span>}
                    </div>
                  </td>
                  <td><span className="fecha-info">{mem?.fechaVencimiento ? formatDate(mem.fechaVencimiento) : '—'}</span></td>
                  <td>
                    <span className="estado-badge-modern" style={{ backgroundColor: colorEstado }}>
                      <span className="estado-dot" />
                      {estado === 'ACTIVA' ? 'Activa' : estado === 'POR_VENCER' ? 'Por vencer' : estado === 'VENCIDA' ? 'Vencida' : 'Sin memb.'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-modern" onClick={e => e.stopPropagation()}>
                      <button className="action-btn action-view" title="Ver detalles" onClick={() => verDetalle(cliente)}>👁️</button>
                      <button className="action-btn action-edit" title="Editar" onClick={() => abrirEdicion(cliente)}>✏️</button>
                      {cliente.activo ? (
                        <button className="action-btn action-delete" title="Desactivar" onClick={() => setClienteAEliminar(cliente)}>🗑️</button>
                      ) : (
                        <button className="action-btn action-toggle" title="Reactivar" onClick={() => reactivarCliente(cliente)}>🔄</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {vistaDetalle && clienteSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-card modal-detalle" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={cerrarModal}>✕</button>
            <div className="detalle-header">
              <div className="detalle-avatar-large" style={{ backgroundColor: getAvatarColor(clienteSeleccionado.nombre) }}>{getInitials(clienteSeleccionado.nombre)}</div>
              <div className="detalle-header-info">
                <h3>{clienteSeleccionado.nombre}</h3>
                <p className="detalle-sub">Ced: {clienteSeleccionado.cedula}</p>
                <span className="estado-badge-modern" style={{ backgroundColor: clienteSeleccionado.activo ? '#10b981' : '#ef4444' }}>
                  {clienteSeleccionado.activo ? '✅ Activo' : '🔴 Inactivo'}
                </span>
              </div>
            </div>
            <div className="detalle-grid">
              <div className="detalle-item"><label>Telefono</label><span>{clienteSeleccionado.telefono || '—'}</span></div>
              <div className="detalle-item"><label>Email</label><span>{clienteSeleccionado.email || '—'}</span></div>
              <div className="detalle-item"><label>Entrenador</label><span>{clienteSeleccionado.entrenador}</span></div>
              <div className="detalle-item"><label>Registro</label><span>{formatDate(clienteSeleccionado.fechaRegistro)}</span></div>
              {clienteSeleccionado.membresia ? (
                <>
                  <div className="detalle-item"><label>Membresia</label><span className="membresia-badge">{MEMBRESIA_LABELS[clienteSeleccionado.membresia.tipo] || clienteSeleccionado.membresia.tipo}</span></div>
                  <div className="detalle-item"><label>Vencimiento</label><span style={{ color: ESTADO_COLORS[clienteSeleccionado.membresia.estado] }}>{formatDate(clienteSeleccionado.membresia.fechaVencimiento)}</span></div>
                  <div className="detalle-item"><label>Dias restantes</label><span style={{ fontWeight: 700, color: ESTADO_COLORS[clienteSeleccionado.membresia.estado] }}>{clienteSeleccionado.membresia.diasRestantes} dias</span></div>
                  <div className="detalle-item"><label>Monto pagado</label><span>${(clienteSeleccionado.membresia.montoPagado || 0).toLocaleString('es-CO')}</span></div>
                </>
              ) : (
                <div className="detalle-item" style={{ gridColumn: 'span 2' }}><label>Membresia</label><span style={{ color: '#9ca3af' }}>Sin membresia activa</span></div>
              )}
            </div>
            {clienteSeleccionado.notas && <div className="detalle-notas"><label>Notas</label><p>{clienteSeleccionado.notas}</p></div>}
            <div className="detalle-acciones">
              <Button variant="primary" onClick={() => { cerrarModal(); abrirEdicion(clienteSeleccionado); }}>✏️ Editar</Button>
              {clienteSeleccionado.activo ? (
                <Button variant="danger" onClick={() => { cerrarModal(); setClienteAEliminar(clienteSeleccionado); }}>🗑️ Desactivar</Button>
              ) : (
                <Button variant="success" onClick={() => { cerrarModal(); reactivarCliente(clienteSeleccionado); }}>🔄 Reactivar</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-card modal-form" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={cerrarModal}>✕</button>
            <div className="modal-header-form">
              <div className="modal-header-icon">{editandoId ? '✏️' : '➕'}</div>
              <div><h3 className="modal-titulo">{editandoId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3><p className="modal-subtitulo">{editandoId ? 'Actualizar informacion' : 'Ingresa los datos del cliente'}</p></div>
            </div>
            <div className="modal-form-grid">
              <div className="modal-campo modal-campo-full">
                <label><span className="campo-label">Nombre completo</span><span className="campo-obligatorio">*</span></label>
                <input type="text" value={form.nombre} onChange={e => handleFormChange('nombre', e.target.value)} placeholder="Ej: Juan Perez" className="campo-input" disabled={cargando} />
              </div>
              <div className="modal-campo">
                <label><span className="campo-label">Cedula</span><span className="campo-obligatorio">*</span></label>
                <input type="text" value={form.cedula} onChange={e => handleFormChange('cedula', e.target.value.replace(/\D/g, ''))} placeholder="Ej: 1234567890" className="campo-input" disabled={cargando} maxLength={15} />
              </div>
              <div className="modal-campo">
                <label><span className="campo-label">Telefono</span></label>
                <input type="text" value={form.telefono} onChange={e => handleFormChange('telefono', e.target.value.replace(/\D/g, ''))} placeholder="Ej: 3001234567" className="campo-input" disabled={cargando} />
              </div>
              <div className="modal-campo modal-campo-full">
                <label><span className="campo-label">Email</span></label>
                <input type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} placeholder="Ej: juan@email.com" className="campo-input" disabled={cargando} />
              </div>
              <div className="modal-campo modal-campo-full">
                <label><span className="campo-label">Plan de Membresia</span></label>
                <select value={form.planId} onChange={e => {
                  const planId = e.target.value;
                  const plan = planId ? planesDisponibles.find(p => p.id === parseInt(planId)) : null;
                  setForm({
                    ...form,
                    planId,
                    membresia: plan?.nombre?.toLowerCase()?.includes('diario') ? 'daily' :
                               plan?.nombre?.toLowerCase()?.includes('trimestral') ? 'quarterly' :
                               plan?.nombre?.toLowerCase()?.includes('semestral') ? 'semestral' :
                               plan?.nombre?.toLowerCase()?.includes('anual') ? 'annual' : 'monthly'
                  });
                }} className="campo-input" disabled={cargando}>
                  <option value="">Sin plan asignado</option>
                  {planesDisponibles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - ${(p.precio || 0).toLocaleString('es-CO')} ({p.duracion} {p.unidadDuracion === 'DIAS' ? 'dias' : p.unidadDuracion === 'MESES' ? 'meses' : 'sesiones'})
                    </option>
                  ))}
                </select>
              </div>
              {!editandoId && form.planId && (
                <div className="modal-campo modal-campo-full">
                  <label><span className="campo-label">Medio de pago</span></label>
                  <select value={form.metodoPago} onChange={e => handleFormChange('metodoPago', e.target.value)} className="campo-input" disabled={cargando}>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </div>
              )}
              <div className="modal-campo">
                <label><span className="campo-label">Entrenador</span></label>
                <input type="text" value={form.entrenador} onChange={e => handleFormChange('entrenador', e.target.value)} placeholder="Ej: Carlos" className="campo-input" disabled={cargando} />
              </div>
              <div className="modal-campo modal-campo-full">
                <label><span className="campo-label">Notas / Observaciones</span></label>
                <textarea value={form.notas} onChange={e => handleFormChange('notas', e.target.value)} placeholder="Lesiones, alergias, restricciones..." rows={3} className="campo-input campo-textarea" disabled={cargando} />
              </div>
            </div>
            <div className="modal-acciones">
              <button className="btn-cancelar" onClick={cerrarModal} disabled={cargando}>Cancelar</button>
              <Button variant="primary" onClick={guardarCliente} className="btn-guardar" disabled={cargando}>
                {cargando ? '⏳ Guardando...' : (editandoId ? '💾 Guardar cambios' : '✅ Crear cliente')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {clienteAEliminar && (
        <div className="modal-overlay" onClick={() => setClienteAEliminar(null)}>
          <div className="modal-card modal-confirm" onClick={e => e.stopPropagation()}>
            <h3 className="modal-titulo">⚠️ Desactivar cliente?</h3>
            <p className="modal-confirm-texto"><strong>{clienteAEliminar.nombre}</strong> pasara a estado <strong>Inactivo</strong>. No se borra su historial.</p>
            <div className="modal-acciones">
              <Button variant="danger" onClick={desactivarCliente}>Si, desactivar</Button>
              <button className="modal-cancelar" onClick={() => setClienteAEliminar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
