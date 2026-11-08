import { useRef } from "react";
import { COP } from "../../../utils/formatters";
import { datosEmpresa } from "../../../utils/empresa";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function BoletaPago({ resultado, empleado, onPagar, onCerrar }) {
  const empresa = datosEmpresa();
  const boletaRef = useRef(null);

  if (!resultado) return null;

  const mesLabel = MESES[(resultado.periodo?.mes || 1) - 1] || "";
  const anio = resultado.periodo?.anio || new Date().getFullYear();

  const imprimir = () => {
    const contenido = boletaRef.current?.innerHTML;
    if (!contenido) return;
    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(`<!DOCTYPE html><html><head><title>Boleta de Pago</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial,Helvetica,sans-serif; font-size:12px; color:#1a1a1a; padding:16px; }
        .boleta { max-width:700px; margin:0 auto; }
        .header { text-align:center; border-bottom:3px solid #1e40af; padding-bottom:12px; margin-bottom:12px; }
        .header h1 { font-size:18px; color:#1e40af; margin-bottom:2px; }
        .header h2 { font-size:13px; color:#374151; font-weight:normal; }
        .header p { font-size:11px; color:#6b7280; margin-top:4px; }
        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px; padding:10px; background:#f8fafc; border-radius:6px; margin-bottom:12px; font-size:11px; }
        .info-grid span { color:#6b7280; }
        .info-grid strong { color:#111827; }
        table { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:11px; }
        th { background:#1e40af; color:white; padding:6px 8px; text-align:left; font-size:11px; }
        th:last-child, td:last-child { text-align:right; }
        td { padding:5px 8px; border-bottom:1px solid #e5e7eb; }
        .total-row { font-weight:bold; background:#f0fdf4; }
        .total-deducciones { font-weight:bold; background:#fef2f2; }
        .neto-box { text-align:center; padding:12px; background:#ecfdf5; border:2px solid #059669; border-radius:8px; margin:12px 0; }
        .neto-box .label { font-size:11px; color:#059669; text-transform:uppercase; letter-spacing:1px; }
        .neto-box .monto { font-size:22px; font-weight:bold; color:#059669; }
        .aportes-section { margin-top:10px; }
        .aportes-section h4 { font-size:11px; color:#6b7280; margin-bottom:4px; text-transform:uppercase; border-bottom:1px solid #e5e7eb; padding-bottom:3px; }
        .footer { margin-top:16px; padding-top:12px; border-top:2px solid #e5e7eb; display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:10px; color:#6b7280; }
        .footer .firma { text-align:center; padding-top:30px; border-top:1px solid #9ca3af; }
        @media print { body { padding:0; } .no-print { display:none!important; } }
      </style></head><body>${contenido}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"white", borderRadius:12, width:"750px", maxHeight:"90vh", overflow:"auto", padding:0 }}>
        {/* Barra de acciones */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 20px", borderBottom:"1px solid #e5e7eb", background:"#f8fafc", borderRadius:"12px 12px 0 0" }}>
          <h3 style={{ margin:0, fontSize:"1rem", color:"#1e40af" }}>Boleta de Pago</h3>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { onPagar?.(); onCerrar?.(); }} style={{ padding:"6px 16px", background:"#059669", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:"0.85rem" }}>
              💰 Pagar Nómina
            </button>
            <button onClick={imprimir} style={{ padding:"6px 12px", background:"#3b82f6", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontSize:"0.85rem" }}>
              🖨️ Imprimir
            </button>
            <button onClick={onCerrar} style={{ padding:"6px 12px", background:"#e5e7eb", color:"#374151", border:"none", borderRadius:6, cursor:"pointer", fontSize:"0.85rem" }}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Contenido de la boleta */}
        <div ref={boletaRef} style={{ padding:"20px" }}>
          <div className="boleta">
            {/* Encabezado */}
            <div className="header">
              <h1>{empresa.nombre} - Boleta de Pago</h1>
              <h2>Liquidación de Nómina</h2>
              <p>Periodo: {mesLabel} {anio} | Generado: {new Date().toLocaleDateString("es-CO")}</p>
            </div>

            {/* Datos del empleado */}
            <div className="info-grid">
              <div><span>Empleado: </span><strong>{resultado.empleadoNombre}</strong></div>
              <div><span>Cargo: </span><strong>{empleado?.cargo || "N/A"}</strong></div>
              <div><span>Cédula: </span><strong>{empleado?.cedula || "N/A"}</strong></div>
              <div><span>Salario Base: </span><strong>{COP(resultado.devengados.salarioBase)}/mes</strong></div>
              <div><span>Ingreso: </span><strong>{empleado?.fechaIngreso || "N/A"}</strong></div>
              <div><span>Frecuencia Pago: </span><strong>{empleado?.frecuenciaPago || "MENSUAL"}</strong></div>
            </div>

            {/* DEVENGADOS */}
            <table>
              <thead>
                <tr><th colSpan={2}>DEVENGADOS</th><th>Valor</th></tr>
              </thead>
              <tbody>
                <tr><td colSpan={2}>Salario Base</td><td>{COP(resultado.devengados.salarioBase)}</td></tr>
                {resultado.devengados.horasExtrasDiurnas.cantidad > 0 && (
                  <tr><td colSpan={2}>Horas Extra Diurnas ({resultado.devengados.horasExtrasDiurnas.cantidad}h x {COP(resultado.vho * 1.25)}/h)</td><td>{COP(resultado.devengados.horasExtrasDiurnas.valor)}</td></tr>
                )}
                {resultado.devengados.horasExtrasNocturnas.cantidad > 0 && (
                  <tr><td colSpan={2}>Horas Extra Nocturnas ({resultado.devengados.horasExtrasNocturnas.cantidad}h x {COP(resultado.vho * 1.75)}/h)</td><td>{COP(resultado.devengados.horasExtrasNocturnas.valor)}</td></tr>
                )}
                {resultado.devengados.recargoNocturno.cantidad > 0 && (
                  <tr><td colSpan={2}>Recargo Nocturno ({resultado.devengados.recargoNocturno.cantidad}h)</td><td>{COP(resultado.devengados.recargoNocturno.valor)}</td></tr>
                )}
                {resultado.devengados.dominicales.cantidad > 0 && (
                  <tr><td colSpan={2}>Horas Dominicales ({resultado.devengados.dominicales.cantidad}h)</td><td>{COP(resultado.devengados.dominicales.valor)}</td></tr>
                )}
                {resultado.devengados.festivos.cantidad > 0 && (
                  <tr><td colSpan={2}>Horas Festivos ({resultado.devengados.festivos.cantidad}h)</td><td>{COP(resultado.devengados.festivos.valor)}</td></tr>
                )}
                {resultado.devengados.bonificaciones > 0 && (
                  <tr><td colSpan={2}>Bonificaciones</td><td>{COP(resultado.devengados.bonificaciones)}</td></tr>
                )}
                {resultado.devengados.comisiones > 0 && (
                  <tr><td colSpan={2}>Comisiones</td><td>{COP(resultado.devengados.comisiones)}</td></tr>
                )}
                {resultado.devengados.auxilioTransporte > 0 && (
                  <tr><td colSpan={2}>Auxilio Transporte</td><td>{COP(resultado.devengados.auxilioTransporte)}</td></tr>
                )}
                <tr className="total-row"><td colSpan={2}>TOTAL DEVENGADOS</td><td>{COP(resultado.devengados.total)}</td></tr>
              </tbody>
            </table>

            {/* DEDUCCIONES */}
            <table>
              <thead>
                <tr><th colSpan={2}>DEDUCCIONES (Descuentos al Empleado)</th><th>Valor</th></tr>
              </thead>
              <tbody>
                <tr><td colSpan={2}>Salud (4%)</td><td>{COP(resultado.deducciones.salud)}</td></tr>
                <tr><td colSpan={2}>Pensión (4%)</td><td>{COP(resultado.deducciones.pension)}</td></tr>
                {resultado.deducciones.retencionFuente > 0 && (
                  <tr><td colSpan={2}>Retención en la Fuente</td><td>{COP(resultado.deducciones.retencionFuente)}</td></tr>
                )}
                {resultado.deducciones.voluntarias > 0 && (
                  <tr><td colSpan={2}>Deducciones Voluntarias</td><td>{COP(resultado.deducciones.voluntarias)}</td></tr>
                )}
                <tr className="total-deducciones"><td colSpan={2}>TOTAL DEDUCCIONES</td><td>{COP(resultado.deducciones.total)}</td></tr>
              </tbody>
            </table>

            {/* NETO A PAGAR */}
            <div className="neto-box">
              <div className="label">Neto a Pagar</div>
              <div className="monto">{COP(resultado.netoPagar)}</div>
            </div>

            {/* APORTES EMPLEADOR */}
            <div className="aportes-section">
              <h4>Aportes a la Seguridad Social (Empleador)</h4>
              <table>
                <tbody>
                  <tr><td>Salud Patronal (8.5%)</td><td>{COP(resultado.aportesEmpleador.salud)}</td></tr>
                  <tr><td>Pensión Patronal (12%)</td><td>{COP(resultado.aportesEmpleador.pension)}</td></tr>
                  <tr><td>ARL Riesgo {resultado.aportesEmpleador.arlRiesgo} ({(resultado.aportesEmpleador.arlTarifa * 100).toFixed(3)}%)</td><td>{COP(resultado.aportesEmpleador.arl)}</td></tr>
                  <tr><td>Caja de Compensación (4%)</td><td>{COP(resultado.aportesEmpleador.caja)}</td></tr>
                  <tr><td>SENA (2%)</td><td>{COP(resultado.aportesEmpleador.sena)}</td></tr>
                  <tr><td>ICBF (3%)</td><td>{COP(resultado.aportesEmpleador.icbf)}</td></tr>
                  <tr className="total-row"><td>TOTAL APORTES EMPLEADOR</td><td>{COP(resultado.aportesEmpleador.total)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* PRESTACIONES */}
            <div className="aportes-section">
              <h4>Proyección Prestaciones Sociales (Mensual)</h4>
              <table>
                <tbody>
                  <tr><td>Prima de Servicios</td><td>{COP(resultado.prestaciones.prima)}</td></tr>
                  <tr><td>Cesantías</td><td>{COP(resultado.prestaciones.cesantias)}</td></tr>
                  <tr><td>Intereses Cesantías</td><td>{COP(resultado.prestaciones.interesesCesantias)}</td></tr>
                  <tr><td>Vacaciones</td><td>{COP(resultado.prestaciones.vacaciones)}</td></tr>
                  <tr className="total-row"><td>TOTAL PRESTACIONES</td><td>{COP(resultado.prestaciones.total)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* COSTO TOTAL */}
            <div style={{ marginTop:10, padding:"10px", background:"#fef2f2", borderRadius:8, textAlign:"center", border:"1px solid #fecaca" }}>
              <div style={{ fontSize:"0.8rem", color:"#6b7280", textTransform:"uppercase" }}>Costo Total Empresa (Empleado + Aportes + Prestaciones)</div>
              <div style={{ fontSize:"1.3rem", fontWeight:"bold", color:"#dc2626" }}>{COP(resultado.costoTotalEmpresa)}</div>
            </div>

            {/* FIRMA */}
            <div className="footer">
              <div>
                <p><strong>Empleador:</strong> {empresa.nombre}</p>
                {empresa.nit && <p>NIT: {empresa.nit}</p>}
                {empresa.direccion && <p>Dirección: {empresa.direccion}</p>}
              </div>
              <div className="firma">
                <p>Firma del Empleador</p>
              </div>
              <div>
                <p><strong>Empleado:</strong> {resultado.empleadoNombre}</p>
                <p>C.C. {empleado?.cedula || "________"}</p>
              </div>
              <div className="firma">
                <p>Firma del Empleado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
