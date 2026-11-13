import { useState, useMemo, useEffect } from "react";
import Button from "../../components/ui/Button";
import clientesService from "../../services/clientesService";
import { planesService } from "../../services/gimnasio/planesService";
import { formatCurrencyInput } from "../../utils/formatters";
import "../../styles/recepcionCSS/clientes.css";
import "./clientes-panel.css";
import FotoCliente from "../../components/clientes/FotoCliente";
import CapturaFoto from "../../components/clientes/CapturaFoto";
import RegistroHuella from "../../components/clientes/RegistroHuella";
import RenovarPlan from "../../components/clientes/RenovarPlan";
import { Users, UserPlus, Search, X, Eye, Pencil, Trash2, RotateCcw, Camera, Fingerprint, CheckCircle2, AlertTriangle, XCircle, UserX, CalendarPlus } from "lucide-react";

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
  const [clienteFoto, setClienteFoto] = useState(null);
  const [clienteHuella, setClienteHuella] = useState(null);
  const [clienteRenovar, setClienteRenovar] = useState(null);

  // Al cambiar la foto se actualiza la lista sin recargar todo
  const fotoActualizada = (id, version) => {
    setClientesList((lista) => lista.map((c) => (c.id === id ? { ...c, fotoVersion: version } : c)));
    setClienteSeleccionado((c) => (c && c.id === id ? { ...c, fotoVersion: version } : c));
  };

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

      <div className="cp-head">
        <p>{clientesList.length} registrados · foto, huella y estado del plan de cada persona</p>
        <button className="sg-btn sg-btn-primary sg-btn-lg" onClick={abrirNuevoCliente}><UserPlus /> Nuevo cliente</button>
      </div>

      <div className="cp-stats">
        <button className={`cp-stat ${filtroEstado === "todos" ? "on" : ""}`} onClick={() => setFiltroEstado("todos")}>
          <Users /><span><b>{clientesList.length}</b>Total</span>
        </button>
        <button className={`cp-stat ok ${filtroEstado === "activos" ? "on" : ""}`} onClick={() => setFiltroEstado("activos")}>
          <CheckCircle2 /><span><b>{totalActivos}</b>Activos</span>
        </button>
        <div className="cp-stat warn"><AlertTriangle /><span><b>{totalPorVencer}</b>Por vencer</span></div>
        <div className="cp-stat bad"><XCircle /><span><b>{totalVencidos}</b>Vencidos</span></div>
        <button className={`cp-stat muted ${filtroEstado === "inactivos" ? "on" : ""}`} onClick={() => setFiltroEstado("inactivos")}>
          <UserX /><span><b>{totalInactivos}</b>Inactivos</span>
        </button>
      </div>

      <div className="cp-filters">
        <div className="cp-search">
          <Search />
          <input type="text" placeholder="Buscar por nombre, cédula o teléfono" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <button onClick={() => setSearchTerm('')} aria-label="Limpiar"><X /></button>}
        </div>
        <select className="sg-select cp-select" value={filtroMembresia} onChange={e => setFiltroMembresia(e.target.value)}>
          <option value="todas">Todos los planes</option>
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="annual">Anual</option>
          <option value="daily">Diario</option>
        </select>
      </div>

      <div className="sg-card cp-table-card">
        <table className="sg-table">
          <thead>
            <tr>
              <th onClick={() => cambiarOrden('nombre')} style={{ cursor: "pointer" }}>Cliente {orden.campo === 'nombre' && (orden.direccion === 'asc' ? '↑' : '↓')}</th>
              <th>Contacto</th>
              <th>Plan</th>
              <th>Vence</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.length === 0 && (
              <tr><td colSpan={6}><div className="sg-empty"><Search /><span>No se encontraron clientes</span></div></td></tr>
            )}
            {filteredClientes.map(cliente => {
              const mem = cliente.membresia;
              const estado = !cliente.activo ? 'INACTIVO' : (mem?.estado || 'NINGUNA');
              const badge = { ACTIVA: ["sg-badge-success", "Activo"], POR_VENCER: ["sg-badge-warning", "Por vencer"], VENCIDA: ["sg-badge-danger", "Vencido"], INACTIVO: ["sg-badge-muted", "Inactivo"] }[estado] || ["sg-badge-muted", "Sin plan"];

              return (
                <tr key={cliente.id} className={`cp-row ${!cliente.activo ? "is-off" : ""}`} onClick={() => verDetalle(cliente)}>
                  <td>
                    <div className="cp-person">
                      <FotoCliente id={cliente.id} nombre={cliente.nombre} version={cliente.fotoVersion} size={46} />
                      <div>
                        <div className="cp-name">{cliente.nombre}</div>
                        <div className="cp-sub">C.C. {cliente.cedula}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cp-sub cp-strong">{cliente.telefono || '—'}</div>
                    {cliente.email && <div className="cp-sub">{cliente.email}</div>}
                  </td>
                  <td>
                    {mem ? (
                      <>
                        <span className="sg-badge sg-badge-info sg-badge-plain">{MEMBRESIA_LABELS[mem.tipo] || mem.tipo}</span>
                        <div className="cp-sub" style={{ marginTop: 4 }}>{mem.diasRestantes} días restantes</div>
                      </>
                    ) : <span className="cp-sub">Sin plan</span>}
                  </td>
                  <td><span className="cp-sub cp-strong">{mem?.fechaVencimiento ? formatDate(mem.fechaVencimiento) : '—'}</span></td>
                  <td><span className={`sg-badge ${badge[0]}`}>{badge[1]}</span></td>
                  <td>
                    <div className="cp-actions" onClick={e => e.stopPropagation()}>
                      {cliente.activo && <button className="cp-act" title="Renovar plan" onClick={() => setClienteRenovar(cliente)}><CalendarPlus /></button>}
                      <button className="cp-act" title="Foto" onClick={() => setClienteFoto(cliente)}><Camera /></button>
                      <button className="cp-act" title="Huella" onClick={() => setClienteHuella(cliente)}><Fingerprint /></button>
                      <button className="cp-act" title="Ver detalle" onClick={() => verDetalle(cliente)}><Eye /></button>
                      <button className="cp-act" title="Editar" onClick={() => abrirEdicion(cliente)}><Pencil /></button>
                      {cliente.activo ? (
                        <button className="cp-act danger" title="Desactivar" onClick={() => setClienteAEliminar(cliente)}><Trash2 /></button>
                      ) : (
                        <button className="cp-act ok" title="Reactivar" onClick={() => reactivarCliente(cliente)}><RotateCcw /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {clienteFoto && (
        <CapturaFoto
          cliente={clienteFoto}
          onCerrar={() => setClienteFoto(null)}
          onGuardada={(v) => { fotoActualizada(clienteFoto.id, v); mostrarNotif('exito', v ? 'Foto guardada' : 'Foto eliminada'); }}
        />
      )}
      {clienteRenovar && (
        <RenovarPlan
          cliente={clienteRenovar}
          onCerrar={() => setClienteRenovar(null)}
          onListo={() => { mostrarNotif('exito', 'Plan renovado y cobrado'); cerrarModal(); cargarClientes(); }}
        />
      )}
      {clienteHuella && (
        <RegistroHuella cliente={clienteHuella} onCerrar={() => setClienteHuella(null)} />
      )}

      {vistaDetalle && clienteSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-card modal-detalle" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={cerrarModal}>✕</button>
            <div className="detalle-header">
              <div className="cp-detail-photo">
                <FotoCliente id={clienteSeleccionado.id} nombre={clienteSeleccionado.nombre} version={clienteSeleccionado.fotoVersion} size={104} radius={30} />
                <button className="cp-photo-btn" title="Tomar o cambiar foto" onClick={() => setClienteFoto(clienteSeleccionado)}><Camera /></button>
              </div>
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
              {clienteSeleccionado.activo && <button className="sg-btn sg-btn-primary" onClick={() => setClienteRenovar(clienteSeleccionado)}><CalendarPlus /> Renovar plan</button>}
              <button className="sg-btn sg-btn-soft" onClick={() => setClienteHuella(clienteSeleccionado)}><Fingerprint /> Huella</button>
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
