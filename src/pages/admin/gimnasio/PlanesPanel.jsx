// ============================================================
// PLANES PANEL - Gestión de planes de membresía y servicios
// ============================================================
import { useState, useEffect } from "react";
import { planesService } from "../../../services/gimnasio/planesService";
import { promocionesService } from "../../../services/gimnasio/promocionesService";
import { COP } from "../../../utils/formatters";

const CATEGORIAS = [
  { value: "MUSCULACION", label: "Musculación" },
  { value: "CARDIO", label: "Cardio" },
  { value: "FULL", label: "Full (Musculación + Cardio + Clases)" },
  { value: "PREMIUM", label: "Premium (Todo incluido)" },
  { value: "ENTRENAMIENTO_PERSONAL", label: "Entrenamiento Personal" },
  { value: "NUTRICION", label: "Nutrición" },
  { value: "OTRO", label: "Otro" },
];

const TIPOS = [
  { value: "MEMBRESIA", label: "Membresía" },
  { value: "SERVICIO", label: "Servicio" },
  { value: "PRODUCTO", label: "Producto" },
  { value: "PACK", label: "Pack" },
];

export default function PlanesPanel() {
  const [planes, setPlanes] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [filtro, setFiltro] = useState({ tipo: "", categoria: "", busqueda: "" });
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalPromo, setModalPromo] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  useEffect(() => {
    setPlanes(planesService.listar());
    setPromociones(promocionesService.listar());
  }, []);

  const planesFiltrados = planes.filter(p => {
    if (filtro.tipo && p.tipo !== filtro.tipo) return false;
    if (filtro.categoria && p.categoria !== filtro.categoria) return false;
    if (filtro.busqueda && !p.nombre.toLowerCase().includes(filtro.busqueda.toLowerCase())) return false;
    return true;
  });

  const handleCrear = (datos) => {
    const nuevo = planesService.crear(datos);
    setPlanes(planesService.listar());
    setModalCrear(false);
  };

  const handleEditar = (id, datos) => {
    planesService.actualizar(id, datos);
    setPlanes(planesService.listar());
    setModalEditar(null);
  };

  const handleEliminar = (id) => {
    if (!window.confirm("¿Desactivar este plan?")) return;
    planesService.eliminar(id);
    setPlanes(planesService.listar());
  };

  const handleCrearPromo = (datos) => {
    promocionesService.crear(datos);
    setPromociones(promocionesService.listar());
    setModalPromo(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📋 Planes y Servicios</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            {planes.filter(p => p.estado === 'ACTIVO').length} planes activos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setModalPromo(true)} style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            🏷️ Promociones
          </button>
          <button onClick={() => setModalCrear(true)} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            + Nuevo Plan
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar plan..."
          value={filtro.busqueda}
          onChange={e => setFiltro({ ...filtro, busqueda: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1, minWidth: '200px' }}
        />
        <select value={filtro.tipo} onChange={e => setFiltro({ ...filtro, tipo: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtro.categoria} onChange={e => setFiltro({ ...filtro, categoria: e.target.value })}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Lista de Planes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {planesFiltrados.map(plan => (
          <div key={plan.id} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px',
            transition: 'box-shadow 0.2s', cursor: 'pointer', position: 'relative'
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {plan.estado === 'INACTIVO' && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                Inactivo
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.nombre}</h3>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>
                  {TIPOS.find(t => t.value === plan.tipo)?.label || plan.tipo}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>
                  {CATEGORIAS.find(c => c.value === plan.categoria)?.label || plan.categoria}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#059669' }}>{COP(plan.precio)}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {plan.duracion} {plan.unidadDuracion === 'DIAS' ? 'días' : plan.unidadDuracion === 'MESES' ? 'meses' : 'sesiones'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(plan.accesosIncluidos || []).map(a => (
                <span key={a} style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '8px' }}>
                  {a.replace(/_/g, ' ')}
                </span>
              ))}
              {(plan.serviciosIncluidos || []).map(s => (
                <span key={s} style={{ fontSize: '0.7rem', background: '#f5f3ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '8px' }}>
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalEditar(plan)} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => handleEliminar(plan.id)} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}>
                Desactivar
              </button>
            </div>
          </div>
        ))}
      </div>

      {planesFiltrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          <p>No se encontraron planes con los filtros seleccionados</p>
        </div>
      )}

      {/* Modal Crear */}
      {modalCrear && <ModalPlan titulo="Nuevo Plan" onGuardar={handleCrear} onCancelar={() => setModalCrear(false)} />}

      {/* Modal Editar */}
      {modalEditar && <ModalPlan titulo="Editar Plan" plan={modalEditar} onGuardar={(d) => handleEditar(modalEditar.id, d)} onCancelar={() => setModalEditar(null)} />}

      {/* Modal Promociones */}
      {modalPromo && <ModalPromociones promociones={promociones} onCrear={handleCrearPromo} onCerrar={() => setModalPromo(false)} />}
    </div>
  );
}

function ModalPlan({ titulo, plan, onGuardar, onCancelar }) {
  const [form, setForm] = useState(plan || {
    nombre: '', tipo: 'MEMBRESIA', categoria: 'MUSCULACION', precio: '',
    duracion: 30, unidadDuracion: 'DIAS', renovacion: 'MANUAL',
    accesosIncluidos: [], serviciosIncluidos: [], comisionEntrenador: 0
  });

  const toggleAcceso = (acceso) => {
    const acc = form.accesosIncluidos || [];
    setForm({ ...form, accesosIncluidos: acc.includes(acceso) ? acc.filter(a => a !== acceso) : [...acc, acceso] });
  };

  const toggleServicio = (serv) => {
    const srv = form.serviciosIncluidos || [];
    setForm({ ...form, serviciosIncluidos: srv.includes(serv) ? srv.filter(s => s !== serv) : [...srv, serv] });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
      onClick={onCancelar}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>{titulo}</h3>

        <label style={labelStyle}>Nombre *</label>
        <input style={inputStyle} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select style={inputStyle} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Precio (COP) *</label>
            <input style={inputStyle} type="number" value={form.precio} onChange={e => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={labelStyle}>Duración</label>
            <input style={inputStyle} type="number" value={form.duracion} onChange={e => setForm({ ...form, duracion: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={labelStyle}>Unidad</label>
            <select style={inputStyle} value={form.unidadDuracion} onChange={e => setForm({ ...form, unidadDuracion: e.target.value })}>
              <option value="DIAS">Días</option>
              <option value="MESES">Meses</option>
              <option value="SESIONES">Sesiones</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Accesos Incluidos</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {['MUSCULACION', 'CARDIO', 'CLASES_GRUPALES', 'SAUNA', 'SPA', 'ZONA_VIP'].map(a => (
            <button key={a} type="button" onClick={() => toggleAcceso(a)}
              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '12px', border: '1px solid', cursor: 'pointer',
                background: (form.accesosIncluidos || []).includes(a) ? '#dcfce7' : '#f9fafb',
                borderColor: (form.accesosIncluidos || []).includes(a) ? '#16a34a' : '#d1d5db',
                color: (form.accesosIncluidos || []).includes(a) ? '#166534' : '#374151'
              }}>
              {a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Servicios Incluidos</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {['TOWEL', 'LOCKER', 'PARQUEADERO', 'INVITADOS', 'PERSONAL_TRAINING', 'NUTRICION'].map(s => (
            <button key={s} type="button" onClick={() => toggleServicio(s)}
              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '12px', border: '1px solid', cursor: 'pointer',
                background: (form.serviciosIncluidos || []).includes(s) ? '#ede9fe' : '#f9fafb',
                borderColor: (form.serviciosIncluidos || []).includes(s) ? '#7c3aed' : '#d1d5db',
                color: (form.serviciosIncluidos || []).includes(s) ? '#5b21b6' : '#374151'
              }}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onCancelar} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onGuardar(form)} disabled={!form.nombre || !form.precio}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!form.nombre || !form.precio) ? 0.5 : 1 }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPromociones({ promociones, onCrear, onCerrar }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'PORCENTAJE', porcentaje: 10, aplicable: 'PLANES', vigenciaInicio: '', vigenciaFin: '' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
      onClick={onCerrar}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>🏷️ Promociones y Descuentos</h3>

        <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>Nueva Promoción</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input style={inputStyle} placeholder="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} />
            <input style={inputStyle} placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            <select style={inputStyle} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="PORCENTAJE">% Descuento</option>
              <option value="VALOR_FIJO">Valor Fijo</option>
              <option value="2X1">2x1</option>
              <option value="PRIMER_MES">Primer Mes</option>
            </select>
            <input style={inputStyle} type="number" placeholder="Porcentaje/Valor" value={form.porcentaje} onChange={e => setForm({ ...form, porcentaje: parseFloat(e.target.value) || 0 })} />
          </div>
          <button onClick={() => { if (form.codigo && form.nombre) onCrear(form); }}
            style={{ marginTop: '8px', padding: '6px 12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Crear Promoción
          </button>
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          {promociones.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f9fafb', borderRadius: '6px' }}>
              <div>
                <strong>{p.codigo}</strong> - {p.nombre}
                <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#6b7280' }}>
                  {p.tipo === 'PORCENTAJE' ? `${p.porcentaje}%` : p.tipo}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: p.estado === 'ACTIVA' ? '#16a34a' : '#6b7280' }}>{p.estado}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onCerrar} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '4px', marginTop: '8px' };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' };
