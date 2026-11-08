// ============================================================
// INGRESO PRODUCTO - Panel compartido (Recepción y Administrador)
// ============================================================
// Módulos:
//   1. Pedidos  -> cronograma de compras (crear, llegada, confirmar)
//   2. Ingresos -> historial de mercancía recibida (stock + costo)
//   3. Egresos  -> gastos de contabilidad (servicios, inventario, nómina...)
// Todo queda vinculado con el backend y con las finanzas.
// ============================================================
import { useState, useEffect, useMemo } from "react";
import ingresoService from "../../services/ingresoService";
import { productosService } from "../../services/productosService";
import { empleadosService } from "../../services/empleadosService";
import useAuthStore from "../../store/authStore";
import { COP, formatDateShort, formatDateTime, cleanCurrencyInput, formatCurrencyInput } from "../../utils/formatters";

const hoy = new Date().toISOString().split("T")[0];

const ESTADO_PEDIDO = {
  SCHEDULED: { label: "Programado", cls: "ingreso-badge-scheduled", icon: "📅" },
  ARRIVED: { label: "Llegado", cls: "ingreso-badge-arrived", icon: "🚚" },
  CONFIRMED: { label: "Confirmado", cls: "ingreso-badge-confirmed", icon: "✅" },
  CANCELLED: { label: "Cancelado", cls: "ingreso-badge-cancelled", icon: "🚫" },
};

const ESTADO_INGRESO = {
  PENDING: { label: "Pendiente", cls: "ingreso-badge-pending", icon: "⏳" },
  CONFIRMED: { label: "Confirmado", cls: "ingreso-badge-confirmed", icon: "✅" },
};

const formPedidoVacio = {
  description: "", categoryId: "", productId: "", quantity: 1,
  estimatedCost: "", provider: "", scheduledDate: hoy, note: "",
};

const formLlegadaVacio = { quantity: "", unitCost: "", provider: "", note: "" };
const formConfirmarVacio = { actualCost: "" };

const formIngresoVacio = {
  productId: "", categoryId: "", productName: "", quantity: 1,
  unitCost: "", provider: "", movementType: "INTAKE", note: "",
};

const formEgresoVacio = {
  concept: "", category: "Servicios", amount: "", expenseDate: hoy, employeeId: "",
  pagadoDeCaja: false,
};

export default function IngresoPanel() {
  const usuario = useAuthStore((state) => state.usuario);
  const esAdmin = ["ADMIN", "SUPER_ADMIN", "ADMINISTRADOR"].includes((usuario?.role || "").toUpperCase());

  const [seccion, setSeccion] = useState("pedidos");
  const [loading, setLoading] = useState(true);

  // Datos del backend
  const [pedidos, setPedidos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Modales
  const [modalNuevoPedido, setModalNuevoPedido] = useState(false);
  const [modalEditarPedido, setModalEditarPedido] = useState(false);
  const [modalLlegada, setModalLlegada] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [modalNuevoIngreso, setModalNuevoIngreso] = useState(false);
  const [modalCompletar, setModalCompletar] = useState(false);
  const [modalNuevoEgreso, setModalNuevoEgreso] = useState(false);

  const [formPedido, setFormPedido] = useState(formPedidoVacio);
  const [formLlegada, setFormLlegada] = useState(formLlegadaVacio);
  const [formConfirmar, setFormConfirmar] = useState(formConfirmarVacio);
  const [formIngreso, setFormIngreso] = useState(formIngresoVacio);
  const [formEgreso, setFormEgreso] = useState(formEgresoVacio);

  const [objetoAccion, setObjetoAccion] = useState(null); // pedido/ingreso en acción
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (tipo, texto) => {
    setNotif({ tipo, texto });
    setTimeout(() => setNotif(null), 3500);
  };

  const productosFiltradosPedido = useMemo(() => {
    if (!formPedido.categoryId) return productos;
    return productos.filter(p => String(p.categoryId) === String(formPedido.categoryId));
  }, [productos, formPedido.categoryId]);

  const productosFiltradosIngreso = useMemo(() => {
    if (!formIngreso.categoryId) return productos;
    return productos.filter(p => String(p.categoryId) === String(formIngreso.categoryId));
  }, [productos, formIngreso.categoryId]);

  useEffect(() => {
    cargarTodo();
  }, []);

  const safeNormArray = (r) => {
    if (Array.isArray(r)) return r;
    if (r && r.data && Array.isArray(r.data)) return r.data;
    if (r && r.data && r.data && Array.isArray(r.data.data)) return r.data.data;
    if (r && r.data && r.data.content && Array.isArray(r.data.content)) return r.data.content;
    return [];
  };

  const normProductos = (r) => {
    const arr = safeNormArray(r);
    return arr.map(p => ({
      id: p.id,
      nombre: p.name || p.nombre || p.descripcion || "Sin nombre",
      categoryId: p.categoryId || p.category?.id || p.categoriaId || null,
      stock: p.stock || 0,
    })).filter(p => p.nombre && p.nombre !== "Sin nombre");
  };

  const normCategorias = (r) => {
    const arr = safeNormArray(r);
    return arr.map(c => ({ id: c.id || (c.codigo ? `temp-${c.codigo}` : undefined), nombre: c.name || c.nombre || c.descripcion || "Sin categoría" })).filter(c => c.nombre && c.nombre !== "Sin categoría");
  };

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        ingresoService.listarPedidos(),
        ingresoService.listarIngresos(),
        ingresoService.listarEgresos(),
        productosService.listarCategorias(),
        productosService.listarProductos(),
      ]);
      setPedidos(safeNormArray(results[0].status === "fulfilled" ? results[0].value : []));
      setIngresos(safeNormArray(results[1].status === "fulfilled" ? results[1].value : []));
      setEgresos(safeNormArray(results[2].status === "fulfilled" ? results[2].value : []));
      setCategorias(normCategorias(results[3].status === "fulfilled" ? results[3].value : []));
      setProductos(normProductos(results[4].status === "fulfilled" ? results[4].value : []));

      if (esAdmin) {
        try {
          const empleadosR = await empleadosService.listar();
          setEmpleados(empleadosR || []);
        } catch (e) { /* sin acceso */ }
      }
    } catch (error) {
      console.error("❌ Error cargando Ingreso Producto:", error);
    } finally {
      setLoading(false);
    }
  };

  const recargarMovimientos = async () => {
    try {
      const results = await Promise.allSettled([
        ingresoService.listarPedidos(),
        ingresoService.listarIngresos(),
        ingresoService.listarEgresos(),
      ]);
      setPedidos(safeNormArray(results[0].status === "fulfilled" ? results[0].value : []));
      setIngresos(safeNormArray(results[1].status === "fulfilled" ? results[1].value : []));
      setEgresos(safeNormArray(results[2].status === "fulfilled" ? results[2].value : []));
    } catch (e) { console.error(e); }
  };

  // ============================================================
  // RESUMEN
  // ============================================================
  const resumen = useMemo(() => {
    const pedidosPendientes = pedidos.filter(p => p.status === "SCHEDULED").length;
    const pedidosLlegados = pedidos.filter(p => p.status === "ARRIVED").length;
    const ingresosPendientes = ingresos.filter(i => i.status === "PENDING").length;
    const totalEgresosMes = egresos
      .filter(e => (e.expenseDate || "").startsWith(hoy.slice(0, 7)))
      .reduce((a, e) => a + (e.amount || 0), 0);
    return { pedidosPendientes, pedidosLlegados, ingresosPendientes, totalEgresosMes };
  }, [pedidos, ingresos, egresos]);

  // ============================================================
  // PEDIDOS
  // ============================================================
  const nombreProducto = (p) => {
    const prod = productos.find(x => x.id === p.productId);
    if (prod) return prod.nombre;
    const cat = categorias.find(x => x.id === p.categoryId);
    if (cat) return cat.nombre;
    return "—";
  };

  const guardarNuevoPedido = async () => {
    if (!formPedido.description.trim()) { mostrarNotif('error', 'Escribe la descripción del pedido'); return; }
    try {
      await ingresoService.crearPedido({
        description: formPedido.description.trim(),
        categoryId: formPedido.categoryId ? Number(formPedido.categoryId) : null,
        productId: formPedido.productId ? Number(formPedido.productId) : null,
        quantity: Number(formPedido.quantity) || 1,
        estimatedCost: Number(formPedido.estimatedCost || 0),
        provider: formPedido.provider.trim() || null,
        scheduledDate: formPedido.scheduledDate || hoy,
        note: formPedido.note.trim() || null,
      });
      setModalNuevoPedido(false);
      setFormPedido(formPedidoVacio);
      await recargarMovimientos();
      mostrarNotif('exito', 'Pedido programado creado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message || 'Error al crear el pedido');
    }
  };

  const guardarEdicionPedido = async () => {
    try {
      await ingresoService.actualizarPedido(objetoAccion.id, {
        description: formPedido.description.trim(),
        categoryId: formPedido.categoryId ? Number(formPedido.categoryId) : null,
        productId: formPedido.productId ? Number(formPedido.productId) : null,
        quantity: Number(formPedido.quantity) || 1,
        estimatedCost: Number(formPedido.estimatedCost || 0),
        provider: formPedido.provider.trim() || null,
        scheduledDate: formPedido.scheduledDate || hoy,
        note: formPedido.note.trim() || null,
      });
      setModalEditarPedido(false);
      await recargarMovimientos();
      mostrarNotif('exito', 'Pedido actualizado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message || 'Error al actualizar');
    }
  };

  const abrirEditar = (pedido) => {
    setObjetoAccion(pedido);
    setFormPedido({
      description: pedido.description,
      categoryId: pedido.categoryId || "",
      productId: pedido.productId || "",
      quantity: pedido.quantity || 1,
      estimatedCost: pedido.estimatedCost || "",
      provider: pedido.provider || "",
      scheduledDate: pedido.scheduledDate || hoy,
      note: pedido.note || "",
    });
    setModalEditarPedido(true);
  };

  const cancelarPedido = async (pedido) => {
    if (!window.confirm(`¿Cancelar el pedido "${pedido.description}"?`)) return;
    try {
      await ingresoService.cancelarPedido(pedido.id);
      await recargarMovimientos();
      mostrarNotif('exito', 'Pedido cancelado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  const abrirLlegada = (pedido) => {
    setObjetoAccion(pedido);
    setFormLlegada({ ...formLlegadaVacio, quantity: pedido.quantity || "", provider: pedido.provider || "" });
    setModalLlegada(true);
  };

  const registrarLlegada = async () => {
    if (!formLlegada.quantity || Number(formLlegada.quantity) <= 0) {
      mostrarNotif('error', 'Indica la cantidad recibida'); return;
    }
    const costo = formLlegada.unitCost ? Number(formLlegada.unitCost) : 0;
    try {
      const res = await ingresoService.registrarLlegada(objetoAccion.id, {
        quantity: Number(formLlegada.quantity),
        unitCost: costo > 0 ? costo : null,
        provider: formLlegada.provider.trim() || null,
        note: formLlegada.note.trim() || null,
      });
      setModalLlegada(false);
      await recargarMovimientos();
      const msg = res?.message || "Llegada registrada";
      mostrarNotif('exito', msg);
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  const abrirConfirmar = (pedido) => {
    setObjetoAccion(pedido);
    setFormConfirmar({ ...formConfirmarVacio, actualCost: pedido.actualCost ?? "" });
    setModalConfirmar(true);
  };

  const confirmarPedido = async () => {
    const costo = formConfirmar.actualCost ? Number(formConfirmar.actualCost) : 0;
    try {
      await ingresoService.confirmarPedido(objetoAccion.id, { actualCost: costo });
      setModalConfirmar(false);
      await recargarMovimientos();
      mostrarNotif('exito', 'Pedido confirmado: stock actualizado y egreso registrado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  // ============================================================
  // INGRESOS (historial)
  // ============================================================
  const guardarIngreso = async () => {
    const productoId = formIngreso.productId ? Number(formIngreso.productId) : null;
    const nombre = productoId
      ? (productos.find(p => p.id === productoId)?.nombre || formIngreso.productName)
      : formIngreso.productName;
    if (!nombre?.trim()) { mostrarNotif('error', 'Indica el producto o el nombre de la mercancía'); return; }
    if (!formIngreso.quantity || Number(formIngreso.quantity) <= 0) { mostrarNotif('error', 'Indica la cantidad'); return; }

    const costo = formIngreso.unitCost ? Number(formIngreso.unitCost) : 0;
    try {
      await ingresoService.registrarIngreso({
        productId: productoId,
        categoryId: formIngreso.categoryId ? Number(formIngreso.categoryId) : null,
        productName: nombre.trim(),
        quantity: Number(formIngreso.quantity),
        unitCost: costo,
        provider: formIngreso.provider.trim() || null,
        orderId: null,
        movementType: formIngreso.movementType || "INTAKE",
        note: formIngreso.note.trim() || null,
      });
      setModalNuevoIngreso(false);
      setFormIngreso(formIngresoVacio);
      await recargarMovimientos();
      mostrarNotif('exito', costo > 0
        ? 'Ingreso confirmado: stock actualizado y egreso registrado'
        : 'Ingreso registrado. Pendiente de costo (lo completa el administrador)');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  const abrirCompletar = (ingreso) => {
    setObjetoAccion(ingreso);
    setFormIngreso({ ...formIngresoVacio, unitCost: ingreso.unitCost || "" });
    setModalCompletar(true);
  };

  const completarIngreso = async () => {
    const costo = formIngreso.unitCost ? Number(formIngreso.unitCost) : 0;
    if (costo <= 0) { mostrarNotif('error', 'Define un costo mayor a cero para confirmar'); return; }
    try {
      await ingresoService.completarIngreso(objetoAccion.id, { unitCost: costo });
      setModalCompletar(false);
      await recargarMovimientos();
      mostrarNotif('exito', 'Ingreso confirmado: stock actualizado y egreso registrado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  const eliminarIngresoPendiente = async (ingreso) => {
    if (!window.confirm(`¿Eliminar el ingreso pendiente de "${ingreso.productName}"?`)) return;
    try {
      await ingresoService.eliminarIngreso(ingreso.id);
      await recargarMovimientos();
      mostrarNotif('exito', 'Ingreso pendiente eliminado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  // ============================================================
  // EGRESOS
  // ============================================================
  const guardarEgreso = async () => {
    if (!formEgreso.concept.trim() || !formEgreso.amount) { mostrarNotif('error', 'Completa concepto y monto'); return; }
    try {
      await ingresoService.registrarEgreso({
        concept: formEgreso.concept.trim(),
        category: formEgreso.category,
        amount: Number(formEgreso.amount),
        expenseDate: formEgreso.expenseDate || hoy,
        employeeId: formEgreso.employeeId ? Number(formEgreso.employeeId) : null,
        intakeId: null,
        // Si se pagó con el efectivo de la caja, se descuenta del turno abierto
        paymentMethod: formEgreso.pagadoDeCaja ? 'CASH' : null,
      });
      setModalNuevoEgreso(false);
      setFormEgreso(formEgresoVacio);
      await recargarMovimientos();
      mostrarNotif('exito', 'Egreso registrado correctamente');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  const eliminarEgreso = async (egreso) => {
    if (!window.confirm(`¿Eliminar el egreso "${egreso.concept}"?`)) return;
    try {
      await ingresoService.eliminarEgreso(egreso.id);
      await recargarMovimientos();
      mostrarNotif('exito', 'Egreso eliminado');
    } catch (e) {
      mostrarNotif('error', e.response?.data?.message || e.message);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Cargando módulo Ingreso Producto...</div>;
  }

  return (
    <div className="ingreso-panel">
      {notif && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: notif.tipo === 'exito' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${notif.tipo === 'exito' ? '#86efac' : '#fca5a5'}`,
          color: notif.tipo === 'exito' ? '#166534' : '#991b1b',
          fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s',
        }}>
          {notif.tipo === 'exito' ? '✅' : '❌'} {notif.texto}
        </div>
      )}
      <div className="ingreso-tabs">
        {[
          { id: "pedidos", label: "📅 Pedidos" },
          { id: "ingresos", label: "📥 Ingresos" },
          { id: "egresos", label: "📉 Egresos" },
        ].map(t => (
          <button key={t.id} className={`ingreso-tab ${seccion === t.id ? "active" : ""}`}
            onClick={() => setSeccion(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ingreso-resumen">
        <div className="ingreso-resumen-card">
          <span className="icon">📅</span>
          <div><div className="value">{resumen.pedidosPendientes}</div><div className="label">Pedidos programados</div></div>
        </div>
        <div className="ingreso-resumen-card">
          <span className="icon">🚚</span>
          <div><div className="value">{resumen.pedidosLlegados}</div><div className="label">Llegados por confirmar</div></div>
        </div>
        <div className="ingreso-resumen-card">
          <span className="icon">⏳</span>
          <div><div className="value">{resumen.ingresosPendientes}</div><div className="label">Ingresos sin costo</div></div>
        </div>
        <div className="ingreso-resumen-card">
          <span className="icon">📉</span>
          <div><div className="value">{COP(resumen.totalEgresosMes)}</div><div className="label">Egresos del mes</div></div>
        </div>
      </div>

      {/* ==================== PEDIDOS ==================== */}
      {seccion === "pedidos" && (
        <>
          <div className="ingreso-toolbar">
            <h3>📅 Cronograma de pedidos</h3>
            <button className="ingreso-btn ingreso-btn-primary" onClick={() => { setFormPedido(formPedidoVacio); setModalNuevoPedido(true); }}>
              ➕ Nuevo Pedido
            </button>
          </div>
          <div className="ingreso-card">
            {pedidos.length === 0 ? (
              <p className="ingreso-vacio">Aún no hay pedidos programados. Crea el primero con "➕ Nuevo Pedido".</p>
            ) : (
              <table className="ingreso-table">
                <thead>
                  <tr>
                    <th>Pedido</th><th>Cat./Producto</th><th>Cant.</th><th>Costo est.</th>
                    <th>Proveedor</th><th>Fecha prog.</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map(p => {
                    const est = ESTADO_PEDIDO[p.status] || ESTADO_PEDIDO.SCHEDULED;
                    return (
                      <tr key={p.id}>
                        <td><span className="ingreso-nombre">{p.description}</span></td>
                        <td className="ingreso-sub">{nombreProducto(p)}</td>
                        <td>{p.quantity}</td>
                        <td className="ingreso-monto">{p.estimatedCost ? COP(p.estimatedCost) : "—"}</td>
                        <td className="ingreso-sub">{p.provider || "—"}</td>
                        <td className="ingreso-sub">{formatDateShort(p.scheduledDate)}</td>
                        <td><span className={`ingreso-badge ${est.cls}`}>{est.icon} {est.label}</span></td>
                        <td>
                          <div className="ingreso-actions">
                            {p.status === "SCHEDULED" && (
                              <>
                                <button className="ingreso-mini-btn success" onClick={() => abrirLlegada(p)}>🚚 Llegó</button>
                                <button className="ingreso-mini-btn" onClick={() => abrirEditar(p)}>✏️ Editar</button>
                                <button className="ingreso-mini-btn danger" onClick={() => cancelarPedido(p)}>Cancelar</button>
                              </>
                            )}
                            {p.status === "ARRIVED" && (
                              <button className="ingreso-mini-btn success" onClick={() => abrirConfirmar(p)}>✅ Confirmar</button>
                            )}
                            {p.status === "CONFIRMED" && (
                              <span className="ingreso-sub">Costo real: {COP(p.actualCost || 0)}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ==================== INGRESOS ==================== */}
      {seccion === "ingresos" && (
        <>
          <div className="ingreso-toolbar">
            <h3>📥 Historial de ingresos de mercancía</h3>
            <button className="ingreso-btn ingreso-btn-primary" onClick={() => { setFormIngreso(formIngresoVacio); setModalNuevoIngreso(true); }}>
              ➕ Registrar Ingreso
            </button>
          </div>
          <div className="ingreso-card">
            {ingresos.length === 0 ? (
              <p className="ingreso-vacio">Aún no hay ingresos registrados.</p>
            ) : (
              <table className="ingreso-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Mercancía</th><th>Cant.</th><th>Costo unit.</th>
                    <th>Total</th><th>Proveedor</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresos.map(i => {
                    const est = ESTADO_INGRESO[i.status] || ESTADO_INGRESO.PENDING;
                    return (
                      <tr key={i.id}>
                        <td className="ingreso-sub">{formatDateTime(i.recordedAt)}</td>
                        <td><span className="ingreso-nombre">{i.productName || "Sin nombre"}</span></td>
                        <td>{i.quantity}</td>
                        <td className="ingreso-monto">{i.unitCost ? COP(i.unitCost) : "—"}</td>
                        <td className={`ingreso-monto ${i.status === "CONFIRMED" ? "ingreso-monto-red" : ""}`}>{i.totalCost ? COP(i.totalCost) : "—"}</td>
                        <td className="ingreso-sub">{i.provider || "—"}</td>
                        <td><span className={`ingreso-badge ${est.cls}`}>{est.icon} {est.label}</span></td>
                        <td>
                          <div className="ingreso-actions">
                            {i.status === "PENDING" && (
                              <>
                                <button className="ingreso-mini-btn success" onClick={() => abrirCompletar(i)}>💰 Definir costo</button>
                                {esAdmin && <button className="ingreso-mini-btn danger" onClick={() => eliminarIngresoPendiente(i)}>🗑️</button>}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ==================== EGRESOS ==================== */}
      {seccion === "egresos" && (
        <>
          <div className="ingreso-toolbar">
            <h3>📉 Egresos de contabilidad</h3>
            <button className="ingreso-btn ingreso-btn-primary" onClick={() => { setFormEgreso(formEgresoVacio); setModalNuevoEgreso(true); }}>
              ➕ Registrar Egreso
            </button>
          </div>
          <div className="ingreso-card">
            {egresos.length === 0 ? (
              <p className="ingreso-vacio">Aún no hay egresos registrados.</p>
            ) : (
              <table className="ingreso-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Origen</th><th>Monto</th>
                    {esAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {egresos.map(e => (
                    <tr key={e.id}>
                      <td className="ingreso-sub">{formatDateShort(e.expenseDate)}</td>
                      <td><span className="ingreso-nombre">{e.concept}</span></td>
                      <td><span className="ingreso-badge ingreso-badge-scheduled">{e.category}</span></td>
                      <td className="ingreso-sub">{e.intakeId ? "📥 Inventario" : "✍️ Manual"}</td>
                      <td className="ingreso-monto ingreso-monto-red">{COP(e.amount)}</td>
                      {esAdmin && (
                        <td>{!e.intakeId && <button className="ingreso-mini-btn danger" onClick={() => eliminarEgreso(e)}>🗑️</button>}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ==================== MODALES ==================== */}

      {/* Nuevo pedido */}
      {modalNuevoPedido && (
        <ModalIngreso titulo="📅 Nuevo Pedido" sub="Programa una compra de mercancía con fecha estimada"
          onClose={() => setModalNuevoPedido(false)}>
          <FormPedido form={formPedido} setForm={setFormPedido} categorias={categorias} productos={productosFiltradosPedido} />
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalNuevoPedido(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-primary" onClick={guardarNuevoPedido}>✅ Guardar Pedido</button>
          </div>
        </ModalIngreso>
      )}

      {/* Editar pedido */}
      {modalEditarPedido && (
        <ModalIngreso titulo="✏️ Editar Pedido" sub="Modifica un pedido que aún está programado"
          onClose={() => setModalEditarPedido(false)}>
          <FormPedido form={formPedido} setForm={setFormPedido} categorias={categorias} productos={productosFiltradosPedido} />
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalEditarPedido(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-primary" onClick={guardarEdicionPedido}>💾 Guardar Cambios</button>
          </div>
        </ModalIngreso>
      )}

      {/* Llegada */}
      {modalLlegada && (
        <ModalIngreso titulo="🚚 Registrar Llegada" sub={`Pedido: ${objetoAccion?.description || ""}`}
          onClose={() => setModalLlegada(false)}>
          <div className="ingreso-form-grid">
            <div className="ingreso-field">
              <label>Cantidad recibida</label>
              <input className="ingreso-input" type="number" min="1" value={formLlegada.quantity}
                onChange={e => setFormLlegada({ ...formLlegada, quantity: e.target.value })} />
            </div>
            <div className="ingreso-field">
              <label>Costo unitario ($) — opcional</label>
              <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
                value={formLlegada.unitCost ? formatCurrencyInput(formLlegada.unitCost) : ""}
                onChange={e => setFormLlegada({ ...formLlegada, unitCost: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
            <div className="ingreso-field full">
              <label>Proveedor — opcional</label>
              <input className="ingreso-input" type="text" value={formLlegada.provider}
                onChange={e => setFormLlegada({ ...formLlegada, provider: e.target.value })} />
            </div>
            <div className="ingreso-field full">
              <label>Nota</label>
              <input className="ingreso-input" type="text" value={formLlegada.note}
                onChange={e => setFormLlegada({ ...formLlegada, note: e.target.value })} />
            </div>
          </div>
          <div className="ingreso-total-hint">
            💡 Si no pones costo, el pedido queda <b>llegado pendiente</b> y el administrador define el valor después.
          </div>
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalLlegada(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-success" onClick={registrarLlegada}>✅ Registrar Llegada</button>
          </div>
        </ModalIngreso>
      )}

      {/* Confirmar pedido */}
      {modalConfirmar && (
        <ModalIngreso titulo="✅ Confirmar Pedido" sub={`Pedido: ${objetoAccion?.description || ""}`}
          onClose={() => setModalConfirmar(false)}>
          <div className="ingreso-form-grid">
            <div className="ingreso-field full">
              <label>Costo total real ($)</label>
              <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
                value={formConfirmar.actualCost ? formatCurrencyInput(formConfirmar.actualCost) : ""}
                onChange={e => setFormConfirmar({ ...formConfirmar, actualCost: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
          </div>
          <div className="ingreso-total-hint">
            💡 Al confirmar: se suma el stock del producto, se registra el egreso de contabilidad y queda en el historial.
          </div>
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalConfirmar(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-success" onClick={confirmarPedido}>✅ Confirmar Pedido</button>
          </div>
        </ModalIngreso>
      )}

      {/* Nuevo ingreso */}
      {modalNuevoIngreso && (
        <ModalIngreso titulo="📥 Registrar Ingreso" sub="Mercancía que llegó al gimnasio"
          onClose={() => setModalNuevoIngreso(false)}>
          <div className="ingreso-form-grid">
            <div className="ingreso-field full">
              <label>Producto del inventario</label>
              <select className="ingreso-input" value={formIngreso.productId}
                onChange={e => setFormIngreso({ ...formIngreso, productId: e.target.value })}>
                <option value="">— Sin producto (solo gasto) —</option>
                {productosFiltradosIngreso.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            {!formIngreso.productId && (
              <div className="ingreso-field full">
                <label>Nombre de la mercancía</label>
                <input className="ingreso-input" type="text" value={formIngreso.productName}
                  onChange={e => setFormIngreso({ ...formIngreso, productName: e.target.value })} />
              </div>
            )}
            <div className="ingreso-field">
              <label>Categoría</label>
              <select className="ingreso-input" value={formIngreso.categoryId}
                onChange={e => setFormIngreso({ ...formIngreso, categoryId: e.target.value })}>
                <option value="">— Sin categoría —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="ingreso-field">
              <label>Cantidad</label>
              <input className="ingreso-input" type="number" min="1" value={formIngreso.quantity}
                onChange={e => setFormIngreso({ ...formIngreso, quantity: e.target.value })} />
            </div>
            <div className="ingreso-field">
              <label>Costo unitario ($) — opcional</label>
              <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
                value={formIngreso.unitCost ? formatCurrencyInput(formIngreso.unitCost) : ""}
                onChange={e => setFormIngreso({ ...formIngreso, unitCost: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
            <div className="ingreso-field">
              <label>Proveedor — opcional</label>
              <input className="ingreso-input" type="text" value={formIngreso.provider}
                onChange={e => setFormIngreso({ ...formIngreso, provider: e.target.value })} />
            </div>
            <div className="ingreso-field full">
              <label>Nota</label>
              <input className="ingreso-input" type="text" value={formIngreso.note}
                onChange={e => setFormIngreso({ ...formIngreso, note: e.target.value })} />
            </div>
          </div>
          <div className="ingreso-total-hint">
            💡 Con costo confirmado: se suma al stock y se registra el egreso. Sin costo: queda pendiente para el administrador.
          </div>
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalNuevoIngreso(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-primary" onClick={guardarIngreso}>✅ Registrar</button>
          </div>
        </ModalIngreso>
      )}

      {/* Completar ingreso */}
      {modalCompletar && (
        <ModalIngreso titulo="💰 Definir costo del ingreso" sub={objetoAccion?.productName || ""}
          onClose={() => setModalCompletar(false)}>
          <div className="ingreso-form-grid">
            <div className="ingreso-field full">
              <label>Costo unitario ($)</label>
              <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
                value={formIngreso.unitCost ? formatCurrencyInput(formIngreso.unitCost) : ""}
                onChange={e => setFormIngreso({ ...formIngreso, unitCost: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
          </div>
          <div className="ingreso-total-hint">
            💡 Al confirmar el costo se suma al stock y se registra el egreso de contabilidad.
          </div>
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalCompletar(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-success" onClick={completarIngreso}>✅ Confirmar costo</button>
          </div>
        </ModalIngreso>
      )}

      {/* Nuevo egreso */}
      {modalNuevoEgreso && (
        <ModalIngreso titulo="📉 Registrar Egreso" sub="Gasto de contabilidad del negocio"
          onClose={() => setModalNuevoEgreso(false)}>
          <div className="ingreso-form-grid">
            <div className="ingreso-field full">
              <label>Concepto</label>
              <input className="ingreso-input" type="text" value={formEgreso.concept}
                onChange={e => setFormEgreso({ ...formEgreso, concept: e.target.value })} placeholder="Ej: Servicios públicos" />
            </div>
            <div className="ingreso-field">
              <label>Categoría</label>
              <select className="ingreso-input" value={formEgreso.category}
                onChange={e => setFormEgreso({ ...formEgreso, category: e.target.value })}>
                <option value="Servicios">Servicios</option>
                <option value="Inventario">Inventario</option>
                <option value="Nomina">Nómina</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="ingreso-field">
              <label>Monto ($)</label>
              <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
                value={formEgreso.amount ? formatCurrencyInput(formEgreso.amount) : ""}
                onChange={e => setFormEgreso({ ...formEgreso, amount: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
            <div className="ingreso-field">
              <label>Fecha</label>
              <input className="ingreso-input" type="date" value={formEgreso.expenseDate}
                onChange={e => setFormEgreso({ ...formEgreso, expenseDate: e.target.value })} />
            </div>
            <div className="ingreso-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={formEgreso.pagadoDeCaja}
                  onChange={e => setFormEgreso({ ...formEgreso, pagadoDeCaja: e.target.checked })} />
                Se pagó con efectivo de la caja del turno
              </label>
            </div>
            {esAdmin && (
              <div className="ingreso-field">
                <label>Empleado (nómina) — opcional</label>
                <select className="ingreso-input" value={formEgreso.employeeId}
                  onChange={e => setFormEgreso({ ...formEgreso, employeeId: e.target.value })}>
                  <option value="">— Ninguno —</option>
                  {empleados.map(em => <option key={em.id} value={em.id}>{em.nombre || em.fullName}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="ingreso-actions">
            <button className="cancel" onClick={() => setModalNuevoEgreso(false)}>Cancelar</button>
            <button className="ingreso-btn ingreso-btn-primary" onClick={guardarEgreso}>✅ Registrar Egreso</button>
          </div>
        </ModalIngreso>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function ModalIngreso({ titulo, sub, onClose, children }) {
  return (
    <div className="ingreso-modal-overlay" onClick={onClose}>
      <div className="ingreso-modal" onClick={e => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function FormPedido({ form, setForm, categorias, productos }) {
  return (
    <div className="ingreso-form-grid">
      <div className="ingreso-field full">
        <label>Descripción del pedido</label>
        <input className="ingreso-input" type="text" value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Ej: Proteína Whey 2lb x12" />
      </div>
      <div className="ingreso-field">
        <label>Categoría</label>
        <select className="ingreso-input" value={form.categoryId}
          onChange={e => setForm({ ...form, categoryId: e.target.value, productId: '' })}>
          <option value="">— Sin categoría —</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div className="ingreso-field">
        <label>Producto (opcional)</label>
        <select className="ingreso-input" value={form.productId}
          onChange={e => setForm({ ...form, productId: e.target.value })}>
          <option value="">— Sin producto —</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="ingreso-field">
        <label>Cantidad</label>
        <input className="ingreso-input" type="number" min="1" value={form.quantity}
          onChange={e => setForm({ ...form, quantity: e.target.value })} />
      </div>
      <div className="ingreso-field">
        <label>Costo estimado ($)</label>
        <input className="ingreso-input" type="text" inputMode="numeric" placeholder="0"
          value={form.estimatedCost ? formatCurrencyInput(form.estimatedCost) : ""}
          onChange={e => setForm({ ...form, estimatedCost: e.target.value.replace(/[^0-9]/g, '') })} />
      </div>
      <div className="ingreso-field full">
        <label>Proveedor</label>
        <input className="ingreso-input" type="text" value={form.provider}
          onChange={e => setForm({ ...form, provider: e.target.value })} />
      </div>
      <div className="ingreso-field full">
        <label>Fecha programada</label>
        <input className="ingreso-input" type="date" value={form.scheduledDate}
          onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
      </div>
      <div className="ingreso-field full">
        <label>Nota</label>
        <input className="ingreso-input" type="text" value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })} />
      </div>
    </div>
  );
}