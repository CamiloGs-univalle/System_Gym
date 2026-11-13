// ============================================================
// Panel web de System Gym (solo lectura)
// ============================================================
"use strict";

const $ = (sel) => document.querySelector(sel);
const estado = { datos: null, recibidoEn: null, tab: "resumen", sub: {}, empleadoNomina: "" };

// ---------- Utilidades ----------
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pesos = (v) => {
  const n = Math.round(Number(v) || 0);
  return `${n < 0 ? "-" : ""}$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
};
const hora = (iso) => (iso && iso.length > 11 ? iso.slice(11, 16) : "");
const fechaHora = (iso) => `${fecha(iso)} ${hora(iso)}`.trim();

const METODO = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
const TIPO_VENTA = { PRODUCT_SALE: "Productos", MEMBERSHIP_PAYMENT: "Membresía", DAILY_TRAINING: "Día" };
const TIPO_TURNO = { FULL_SHIFT: "Completo", HALF_SHIFT: "Medio", HOURLY_SHIFT: "Por horas" };
const PLAN = { DAILY: "Día", MONTHLY: "Mensual", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual" };

function hace(isoUtc) {
  if (!isoUtc) return "nunca";
  const min = Math.round((Date.now() - new Date(isoUtc).getTime()) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

async function api(url, opciones = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: opciones.body ? { "Content-Type": "application/json" } : {},
    ...opciones,
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(cuerpo.mensaje || "Error de conexión");
    error.status = res.status;
    throw error;
  }
  return cuerpo;
}

// ---------- Sesión ----------
function mostrarLogin() {
  $("#vista-panel").hidden = true;
  $("#vista-login").hidden = false;
  $("#cargando").hidden = true;
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const boton = form.querySelector("button");
  const error = $("#login-error");
  error.hidden = true;
  boton.disabled = true;
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ usuario: form.usuario.value, clave: form.clave.value }),
    });
    form.clave.value = "";
    await iniciarPanel();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  } finally {
    boton.disabled = false;
  }
});

$("#btn-salir").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" }).catch(() => {});
  estado.datos = null;
  mostrarLogin();
});

$("#btn-recargar").addEventListener("click", () => cargar(true));

document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
  estado.tab = b.dataset.tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
  render();
  window.scrollTo({ top: 0 });
}));

// Clics dentro del contenido (sub-pestañas, filtros)
$("#contenido").addEventListener("click", (e) => {
  const seg = e.target.closest("[data-sub]");
  if (seg) {
    estado.sub[estado.tab] = seg.dataset.sub;
    render();
  }
});
$("#contenido").addEventListener("change", (e) => {
  if (e.target.id === "filtro-empleado") {
    estado.empleadoNomina = e.target.value;
    render();
  }
});

async function iniciarPanel() {
  $("#vista-login").hidden = true;
  $("#vista-panel").hidden = false;
  await cargar(false);
}

async function cargar(manual) {
  const boton = $("#btn-recargar");
  boton.classList.add("girando");
  try {
    const r = await api("/api/datos");
    estado.datos = r.datos;
    estado.recibidoEn = r.recibidoEn;
    render();
  } catch (err) {
    if (err.status === 401) return mostrarLogin();
    if (manual) alert(err.message);
  } finally {
    boton.classList.remove("girando");
    $("#cargando").hidden = true;
  }
}

// ---------- Vistas ----------
function render() {
  const d = estado.datos;
  $("#gym-nombre").textContent = d?.gimnasio?.nombre || "Mi gimnasio";
  $("#sync-estado").textContent = estado.recibidoEn
    ? `Actualizado ${hace(estado.recibidoEn)}` : "Sin datos todavía";

  const aviso = $("#aviso");
  const minutos = estado.recibidoEn ? (Date.now() - new Date(estado.recibidoEn).getTime()) / 60000 : Infinity;
  if (!d) {
    aviso.textContent = "El gimnasio aún no ha enviado información. Configure el panel en System Gym → Configuración → Panel web.";
    aviso.hidden = false;
  } else if (minutos > 30) {
    aviso.textContent = `Los datos son de ${fechaHora(d.generadoEn)}. El PC del gimnasio puede estar apagado o sin internet.`;
    aviso.hidden = false;
  } else {
    aviso.hidden = true;
  }

  const c = $("#contenido");
  if (!d) {
    c.innerHTML = `<div class="card"><p class="vacio">No hay datos para mostrar.</p></div>`;
    return;
  }
  const vistas = { resumen: vResumen, caja: vCaja, clientes: vClientes, nomina: vNomina, mas: vMas };
  c.innerHTML = vistas[estado.tab](d);
  pintarBarras(d);
}

function segmentos(opciones, actual) {
  return `<div class="segmentos">${opciones.map(([id, label]) =>
    `<button class="segmento ${id === actual ? "active" : ""}" data-sub="${id}">${esc(label)}</button>`).join("")}</div>`;
}

function kpi(label, valor, nota = "", clase = "") {
  return `<div class="kpi ${clase}"><div class="label">${esc(label)}</div><div class="valor">${esc(valor)}</div>${nota ? `<div class="nota">${esc(nota)}</div>` : ""}</div>`;
}

function vResumen(d) {
  const h = d.hoy || {};
  const m = d.mes || {};
  const abiertos = (d.turnos || []).filter((t) => t.abierto);
  const metodos = Object.entries(h.porMetodo || {})
    .map(([k, v]) => `<div class="fila"><span>${esc(METODO[k] || k)}</span><span>${pesos(v)}</span></div>`).join("");

  return `
    <div class="kpis">
      ${kpi("Ingresos de hoy", pesos(h.total), `${h.numVentas || 0} cobros · ${fecha(h.fecha)}`, "destacado")}
      ${kpi("Membresías hoy", pesos(h.membresias))}
      ${kpi("Productos hoy", pesos(h.ventasProductos))}
      ${kpi("Ingresos al gym", String(h.ingresosClientes ?? 0), h.ingresosNegados ? `${h.ingresosNegados} negados` : "personas hoy")}
      ${kpi("Gastos hoy", pesos(h.gastos))}
    </div>

    <div class="card">
      <div class="card-head"><h2>Este mes</h2><span class="card-sub">${fecha(m.desde)} – ${fecha(m.hasta)}</span></div>
      <div class="barras" id="barras"></div>
      <div class="barras-eje"><span>${fecha(m.desde).split(" ").slice(0, 2).join(" ")}</span><span>Hoy</span></div>
      <div class="filas">
        <div class="fila"><span>Membresías</span><span>${pesos(m.membresias)}</span></div>
        <div class="fila"><span>Productos</span><span>${pesos(m.ventasProductos)}</span></div>
        <div class="fila"><span>Gastos (incluye nómina ${pesos(m.gastosNomina)})</span><span class="neg">${pesos(-(m.gastos || 0))}</span></div>
        <div class="fila total"><span>Resultado del mes</span><span class="${m.utilidad >= 0 ? "pos" : "neg"}">${pesos(m.utilidad)}</span></div>
      </div>
    </div>

    <div class="dos-col">
      <div class="card">
        <div class="card-head"><h2>Hoy por medio de pago</h2></div>
        <div class="filas">${metodos || `<p class="vacio">Sin cobros hoy.</p>`}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Turnos abiertos</h2></div>
        <div class="lista">${abiertos.length ? abiertos.map(itemTurno).join("") : `<p class="vacio">No hay turnos abiertos.</p>`}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Por vencer</h2><span class="card-sub">${(d.clientes?.porVencer || []).length} clientes</span></div>
      <div class="lista">${listaClientes((d.clientes?.porVencer || []).slice(0, 5), true)}</div>
    </div>`;
}

function pintarBarras(d) {
  const cont = document.getElementById("barras");
  if (!cont) return;
  const dias = d.mes?.porDia || [];
  const max = Math.max(1, ...dias.map((x) => x.ingresos));
  const hoy = d.hoy?.fecha;
  cont.innerHTML = "";
  for (const x of dias) {
    const b = document.createElement("div");
    b.className = `barra${x.fecha === hoy ? " hoy" : ""}`;
    b.style.height = `${Math.max(2, (x.ingresos / max) * 100)}%`;
    b.title = `${fecha(x.fecha)}: ${pesos(x.ingresos)}`;
    cont.appendChild(b);
  }
}

function itemTurno(t) {
  let badge;
  if (t.abierto) badge = `<span class="badge info">Abierto</span>`;
  else if (!t.diferencia) badge = `<span class="badge ok">Cuadró</span>`;
  else if (t.diferencia < 0) badge = `<span class="badge bad">Faltó ${pesos(-t.diferencia)}</span>`;
  else badge = `<span class="badge warn">Sobró ${pesos(t.diferencia)}</span>`;
  const total = (t.ventasProductos || 0) + (t.membresias || 0);
  return `<div class="item">
    <div class="item-main">
      <div class="item-title">${esc(t.recepcionista)} · ${esc(TIPO_TURNO[t.tipo] || "Turno")}</div>
      <div class="item-sub">${fechaHora(t.abiertoEn)}${t.cerradoEn ? ` → ${hora(t.cerradoEn)}` : ""} · base ${pesos(t.base)}</div>
      ${t.notas ? `<div class="item-sub">${esc(t.notas)}</div>` : ""}
    </div>
    <div class="item-end"><div class="monto">${pesos(total)}</div>${badge}</div>
  </div>`;
}

function vCaja(d) {
  const sub = estado.sub.caja || "turnos";
  let cuerpo;
  if (sub === "turnos") {
    const turnos = d.turnos || [];
    const faltantes = turnos.filter((t) => !t.abierto && t.diferencia < 0).reduce((s, t) => s + t.diferencia, 0);
    cuerpo = `
      <div class="card">
        <div class="card-head"><h2>Turnos recientes</h2><span class="card-sub">Faltantes: <b class="neg">${pesos(faltantes)}</b></span></div>
        <div class="lista">${turnos.length ? turnos.map(itemTurno).join("") : `<p class="vacio">Sin turnos.</p>`}</div>
      </div>`;
  } else {
    const ventas = d.ventas || [];
    cuerpo = `
      <div class="card">
        <div class="card-head"><h2>Cobros del mes</h2><span class="card-sub">Últimos ${ventas.length}</span></div>
        <div class="lista">${ventas.length ? ventas.map((v) => `
          <div class="item">
            <div class="item-main">
              <div class="item-title">${esc(TIPO_VENTA[v.tipo] || v.tipo)}${v.cliente ? ` · ${esc(v.cliente)}` : ""}</div>
              <div class="item-sub">${fechaHora(v.fecha)} · ${esc(METODO[v.metodo] || v.metodo)} · ${esc(v.cajero)}</div>
            </div>
            <div class="item-end"><div class="monto">${pesos(v.total)}</div></div>
          </div>`).join("") : `<p class="vacio">Sin cobros este mes.</p>`}</div>
      </div>`;
  }
  return segmentos([["turnos", "Turnos"], ["ventas", "Cobros"]], sub) + cuerpo;
}

function listaClientes(lista, porVencer) {
  if (!lista.length) return `<p class="vacio">${porVencer ? "Nadie por vencer en los próximos días." : "Sin vencidos recientes."}</p>`;
  return lista.map((c) => {
    const tel = String(c.telefono || "").replace(/\D/g, "");
    const badge = porVencer
      ? `<span class="badge ${c.dias <= 1 ? "bad" : "warn"}">${c.dias === 1 ? "Último día" : `${c.dias} días`}</span>`
      : `<span class="badge bad">Vencido</span>`;
    return `<div class="item">
      <div class="item-main">
        <div class="item-title">${esc(c.nombre)}</div>
        <div class="item-sub">${esc(PLAN[c.plan] || "Plan")} · vence ${fecha(c.vence)}
          ${tel ? ` · <a class="tel" href="https://wa.me/57${esc(tel)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div>
      </div>
      <div class="item-end">${badge}</div>
    </div>`;
  }).join("");
}

function vClientes(d) {
  const cl = d.clientes || {};
  const sub = estado.sub.clientes || "porVencer";
  return `
    <div class="kpis">
      ${kpi("Clientes activos", String(cl.total ?? 0))}
      ${kpi("Con plan vigente", String(cl.conPlanVigente ?? 0))}
      ${kpi("Por vencer (5 días)", String((cl.porVencer || []).length))}
      ${kpi("Vencidos (30 días)", String((cl.vencidosRecientes || []).length))}
    </div>
    ${segmentos([["porVencer", "Por vencer"], ["vencidos", "Vencidos"]], sub)}
    <div class="card"><div class="lista">
      ${sub === "porVencer" ? listaClientes(cl.porVencer || [], true) : listaClientes(cl.vencidosRecientes || [], false)}
    </div></div>`;
}

function vNomina(d) {
  const empleados = d.empleados || [];
  const nombres = Object.fromEntries(empleados.map((e) => [String(e.id), e.nombre]));
  let pagos = [...(d.nomina?.pagos || [])]
    .sort((a, b) => String(b.fechaPago || "").localeCompare(String(a.fechaPago || "")) || (b.id - a.id));
  const filtro = estado.empleadoNomina;
  if (filtro) pagos = pagos.filter((p) => String(p.empleadoId) === filtro);

  const mesActual = (d.hoy?.fecha || "").slice(0, 7);
  const pagadoMes = (d.nomina?.pagos || []).filter((p) => String(p.fechaPago || "").startsWith(mesActual))
    .reduce((s, p) => s + (Number(p.netoPagar) || 0), 0);

  const opciones = [`<option value="">Todos los empleados</option>`]
    .concat(empleados.map((e) => `<option value="${esc(e.id)}" ${String(e.id) === filtro ? "selected" : ""}>${esc(e.nombre)}${e.activo ? "" : " (inactivo)"}</option>`))
    .join("");

  return `
    <div class="kpis">
      ${kpi("Pagado este mes", pesos(pagadoMes), "neto a empleados", "destacado")}
      ${kpi("Empleados activos", String(empleados.filter((e) => e.activo).length))}
      ${kpi("Pagos registrados", String((d.nomina?.pagos || []).length))}
    </div>
    <div class="card">
      <div class="card-head"><h2>Desprendibles de pago</h2></div>
      <select id="filtro-empleado" aria-label="Filtrar por empleado">${opciones}</select>
      <div class="lista">
        ${pagos.length ? pagos.map((p) => `
          <div class="item">
            <div class="item-main">
              <div class="item-title">${esc(p.empleadoNombre || nombres[String(p.empleadoId)] || "Empleado")}</div>
              <div class="item-sub">${esc(p.periodoEtiqueta || "Pago")} · pagado ${fecha(p.fechaPago)}${p.desdeCaja ? " · desde caja" : ""}</div>
              <div class="acciones">
                <a class="btn btn-ghost btn-sm" href="/api/desprendible/${encodeURIComponent(p.id)}?ver=1" target="_blank" rel="noopener">Ver</a>
                <a class="btn btn-primary btn-sm" href="/api/desprendible/${encodeURIComponent(p.id)}" download>Descargar PDF</a>
              </div>
            </div>
            <div class="item-end"><div class="monto">${pesos(p.netoPagar)}</div></div>
          </div>`).join("") : `<p class="vacio">No hay pagos de nómina registrados.</p>`}
      </div>
    </div>`;
}

function vMas(d) {
  const sub = estado.sub.mas || "inventario";
  let cuerpo;
  if (sub === "inventario") {
    const inv = d.inventario || {};
    const bajos = inv.bajoStock || [];
    cuerpo = `
      <div class="kpis">
        ${kpi("Productos activos", String(inv.productos ?? 0))}
        ${kpi("Inventario (costo)", pesos(inv.valorCosto))}
      </div>
      <div class="card">
        <div class="card-head"><h2>Por reponer</h2><span class="card-sub">${bajos.length} productos</span></div>
        <div class="lista">${bajos.length ? bajos.map((p) => `
          <div class="item">
            <div class="item-main"><div class="item-title">${esc(p.nombre)}</div><div class="item-sub">Código ${esc(p.codigo)} · mínimo ${esc(p.minimo)}</div></div>
            <div class="item-end"><span class="badge ${p.stock <= 0 ? "bad" : "warn"}">${p.stock <= 0 ? "Agotado" : `Quedan ${esc(p.stock)}`}</span></div>
          </div>`).join("") : `<p class="vacio">Todo el inventario está sobre el mínimo.</p>`}</div>
      </div>`;
  } else if (sub === "gastos") {
    const gastos = d.gastos || [];
    const total = gastos.reduce((s, g) => s + (Number(g.valor) || 0), 0);
    cuerpo = `
      <div class="card">
        <div class="card-head"><h2>Gastos del mes</h2><span class="card-sub">Total <b>${pesos(total)}</b></span></div>
        <div class="lista">${gastos.length ? gastos.map((g) => `
          <div class="item">
            <div class="item-main"><div class="item-title">${esc(g.concepto)}</div><div class="item-sub">${fecha(g.fecha)} · ${esc(g.categoria)}${g.metodo === "CASH" ? " · de caja" : ""}</div></div>
            <div class="item-end"><div class="monto neg">${pesos(g.valor)}</div></div>
          </div>`).join("") : `<p class="vacio">Sin gastos este mes.</p>`}</div>
      </div>`;
  } else {
    const empleados = d.empleados || [];
    cuerpo = `
      <div class="card">
        <div class="card-head"><h2>Empleados</h2></div>
        <div class="lista">${empleados.length ? empleados.map((e) => `
          <div class="item">
            <div class="item-main"><div class="item-title">${esc(e.nombre)}</div><div class="item-sub">${esc(e.cargo || "—")} · ${e.frecuencia === "BIWEEKLY" ? "Quincenal" : "Mensual"}${e.fechaIngreso ? ` · desde ${fecha(e.fechaIngreso)}` : ""}</div></div>
            <div class="item-end"><div class="monto">${pesos(e.salario)}</div>${e.activo ? "" : `<span class="badge bad">Inactivo</span>`}</div>
          </div>`).join("") : `<p class="vacio">Sin empleados.</p>`}</div>
      </div>`;
  }
  return segmentos([["inventario", "Inventario"], ["gastos", "Gastos"], ["empleados", "Empleados"]], sub) + cuerpo;
}

// ---------- Arranque ----------
(async () => {
  try {
    const s = await api("/api/sesion");
    if (s.autenticado) await iniciarPanel();
    else mostrarLogin();
  } catch {
    mostrarLogin();
  }
  // Se actualiza solo cada 2 minutos mientras esté abierto
  setInterval(() => { if (!document.hidden && !$("#vista-panel").hidden) cargar(false); }, 120000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !$("#vista-panel").hidden) cargar(false);
  });
})();
