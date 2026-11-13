// ============================================================
// Desprendible de pago de nómina en PDF (para entregar al empleado).
// Usa el pago registrado en System Gym; si el pago trae "detalle" se listan
// los conceptos, si no (pagos antiguos) se muestran los totales.
// No incluye aportes del empleador ni prestaciones: eso es costo interno.
// ============================================================
import PDFDocument from "pdfkit";

const AZUL = "#1e3a8a";
const GRIS = "#6b7280";
const LINEA = "#e5e7eb";

export function pesos(valor) {
  const n = Math.round(Number(valor) || 0);
  const signo = n < 0 ? "-" : "";
  return `${signo}$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function fechaLarga(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

const VINCULACION = { LABORAL: "Contrato laboral", PRESTACION_SERVICIOS: "Prestación de servicios" };
const FRECUENCIA = { MENSUAL: "Mensual", QUINCENAL: "Quincenal", MONTHLY: "Mensual", BIWEEKLY: "Quincenal" };

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria del gimnasio, no la del servidor */
function hoyLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: process.env.PANEL_TZ || "America/Bogota" });
}

export function nombreArchivo(pago) {
  const limpio = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `desprendible-${limpio(pago.empleadoNombre) || "empleado"}-${limpio(pago.periodoEtiqueta || pago.fechaPago) || pago.id}.pdf`;
}

/**
 * Escribe el PDF en "salida" (stream). gimnasio = { nombre, nit, direccion }.
 */
export function generarDesprendible(salida, { pago, empleado, gimnasio }) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50, info: {
    Title: `Desprendible de pago - ${pago.empleadoNombre || ""}`,
    Author: gimnasio?.nombre || "System Gym",
  } });
  doc.pipe(salida);

  const ancho = doc.page.width - 100;
  const x0 = 50;
  const contratista = (pago.tipoVinculacion || empleado?.vinculacion) === "PRESTACION_SERVICIOS";

  // ---------- Encabezado ----------
  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(17).text(gimnasio?.nombre || "Mi gimnasio", x0, 50);
  doc.fillColor(GRIS).font("Helvetica").fontSize(9);
  const empresa = [gimnasio?.nit ? `NIT ${gimnasio.nit}` : null, gimnasio?.direccion || null].filter(Boolean).join("  ·  ");
  if (empresa) doc.text(empresa);
  doc.moveDown(0.6);
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(13)
    .text(contratista ? "Comprobante de pago de honorarios" : "Desprendible de pago de nómina");
  doc.fillColor(GRIS).font("Helvetica").fontSize(9)
    .text(`Periodo: ${pago.periodoEtiqueta || "—"}${pago.periodoDesde ? `  (${fechaLarga(pago.periodoDesde)} al ${fechaLarga(pago.periodoHasta)})` : ""}`);
  doc.moveTo(x0, doc.y + 8).lineTo(x0 + ancho, doc.y + 8).lineWidth(2).strokeColor(AZUL).stroke();
  doc.y += 18;

  // ---------- Datos del empleado ----------
  const datos = [
    ["Empleado", pago.empleadoNombre || empleado?.nombre || "—"],
    ["Cédula", empleado?.cedula || pago.cedula || "—"],
    ["Cargo", empleado?.cargo || pago.cargo || "—"],
    ["Vinculación", VINCULACION[pago.tipoVinculacion] || VINCULACION[empleado?.vinculacion] || "—"],
    [contratista ? "Honorarios mensuales" : "Salario mensual", pesos(pago.salario || empleado?.salario)],
    ["Frecuencia de pago", FRECUENCIA[pago.frecuenciaPago] || pago.frecuenciaPago || "—"],
    ["Días liquidados", String(pago.diasLiquidados ?? "—")],
    ["Fecha de pago", fechaLarga(pago.fechaPago)],
  ];
  const yDatos = doc.y;
  const colAncho = ancho / 2;
  datos.forEach(([k, v], i) => {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    const x = x0 + col * colAncho;
    const y = yDatos + fila * 30;
    doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(k.toUpperCase(), x, y, { width: colAncho - 10 });
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(v, x, y + 10, { width: colAncho - 10 });
  });
  doc.y = yDatos + Math.ceil(datos.length / 2) * 30 + 10;

  // ---------- Tablas ----------
  const detalle = pago.detalle && Array.isArray(pago.detalle.devengados) ? pago.detalle : null;
  const devengados = detalle ? detalle.devengados : [{ concepto: contratista ? "Honorarios" : "Total devengado", valor: pago.devengados }];
  const deducciones = detalle ? detalle.deducciones : (pago.deducciones ? [{ concepto: "Total deducciones", valor: pago.deducciones }] : []);
  const totalDev = detalle ? detalle.totalDevengados : pago.devengados;
  const totalDed = detalle ? detalle.totalDeducciones : pago.deducciones;

  tabla(doc, x0, ancho, contratista ? "PAGOS" : "DEVENGADOS", devengados, "Total devengado", totalDev, "#ecfdf5");
  if (deducciones.length > 0 || Number(totalDed) > 0) {
    tabla(doc, x0, ancho, "DEDUCCIONES", deducciones, "Total deducciones", totalDed, "#fef2f2");
  }

  // ---------- Neto ----------
  const yNeto = doc.y + 6;
  doc.roundedRect(x0, yNeto, ancho, 54, 8).fillAndStroke("#ecfdf5", "#059669");
  doc.fillColor("#047857").font("Helvetica-Bold").fontSize(9).text("NETO PAGADO", x0, yNeto + 10, { width: ancho, align: "center" });
  doc.fontSize(20).text(pesos(pago.netoPagar), x0, yNeto + 23, { width: ancho, align: "center" });
  doc.y = yNeto + 70;

  if (!detalle) {
    doc.fillColor(GRIS).font("Helvetica-Oblique").fontSize(8)
      .text("Este pago se registró antes de que el sistema guardara el detalle por concepto; se muestran los totales.", x0, doc.y, { width: ancho });
    doc.moveDown(0.5);
  }

  // ---------- Firmas ----------
  const yFirma = Math.max(doc.y + 50, 600);
  const anchoFirma = (ancho - 40) / 2;
  [["Firma del empleador", gimnasio?.nombre || ""], ["Firma del empleado", `C.C. ${empleado?.cedula || pago.cedula || "________"}`]]
    .forEach(([titulo, sub], i) => {
      const x = x0 + i * (anchoFirma + 40);
      doc.moveTo(x, yFirma).lineTo(x + anchoFirma, yFirma).lineWidth(0.8).strokeColor("#9ca3af").stroke();
      doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9).text(titulo, x, yFirma + 6, { width: anchoFirma, align: "center" });
      doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(sub, x, yFirma + 18, { width: anchoFirma, align: "center" });
    });

  doc.fillColor("#9ca3af").font("Helvetica").fontSize(7.5)
    .text(`Generado el ${fechaLarga(hoyLocal())} desde el panel de System Gym. Pago registrado N.º ${pago.id}.`,
      x0, doc.page.height - 70, { width: ancho, align: "center" });

  doc.end();
}

function tabla(doc, x0, ancho, titulo, filas, etiquetaTotal, total, fondoTotal) {
  const alto = 20;
  let y = doc.y;
  doc.rect(x0, y, ancho, alto).fill(AZUL);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9)
    .text(titulo, x0 + 8, y + 6).text("VALOR", x0, y + 6, { width: ancho - 8, align: "right" });
  y += alto;
  doc.font("Helvetica").fontSize(9.5);
  for (const f of filas) {
    doc.fillColor("#111827").text(f.concepto, x0 + 8, y + 5, { width: ancho - 140 });
    doc.text(pesos(f.valor), x0, y + 5, { width: ancho - 8, align: "right" });
    y += alto;
    doc.moveTo(x0, y).lineTo(x0 + ancho, y).lineWidth(0.5).strokeColor(LINEA).stroke();
  }
  doc.rect(x0, y, ancho, alto).fill(fondoTotal);
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5)
    .text(etiquetaTotal, x0 + 8, y + 5).text(pesos(total), x0, y + 5, { width: ancho - 8, align: "right" });
  doc.y = y + alto + 12;
}
