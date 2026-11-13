// ============================================================
// Registro de huella del cliente.
// La huella es un dato sensible (Ley 1581 de 2012): se pide la
// autorización expresa del cliente antes de registrarla.
// ============================================================
import { useEffect, useState } from "react";
import { Fingerprint, X, Trash2, ShieldCheck, Info } from "lucide-react";
import accesoService from "../../services/accesoService";
import lectorHuella, { DEDOS, nombreDedo } from "../../services/lectorHuella";
import FotoCliente from "./FotoCliente";
import "./clientes-ui.css";

export default function RegistroHuella({ cliente, onCerrar, onCambio }) {
  const [estado, setEstado] = useState(null);
  const [registradas, setRegistradas] = useState([]);
  const [dedo, setDedo] = useState("RIGHT_INDEX");
  const [consentimiento, setConsentimiento] = useState(false);
  const [paso, setPaso] = useState("listo"); // listo | capturando | ok
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    setRegistradas(await accesoService.huellasDe(cliente.id));
  };

  useEffect(() => {
    lectorHuella.estado().then(setEstado);
    cargar();
    return () => { lectorHuella.cancelar(); };
  }, [cliente.id]);

  const capturar = async () => {
    setError("");
    setMensaje("");
    setPaso("capturando");
    try {
      const r = await lectorHuella.capturarRegistro();
      if (!r?.ok) throw new Error(r?.mensaje || "No se pudo leer la huella.");
      await accesoService.registrarHuella(cliente.id, {
        finger: dedo, template: r.template, vendor: r.vendor, consent: consentimiento,
      });
      setPaso("ok");
      setMensaje(`Huella (${nombreDedo(dedo)}) registrada.`);
      await cargar();
      onCambio?.();
    } catch (e) {
      setPaso("listo");
      setError(e?.mensajeUsuario || e?.message || "No se pudo registrar la huella.");
    }
  };

  const eliminar = async (finger) => {
    if (!window.confirm(`¿Eliminar la huella "${nombreDedo(finger)}"?`)) return;
    await accesoService.eliminarHuella(cliente.id, finger);
    await cargar();
    onCambio?.();
  };

  const simulado = estado?.simulado;

  return (
    <div className="sg-overlay" onClick={onCerrar}>
      <div className="sg-modal" style={{ width: "min(640px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="sg-modal-head">
          <div className="sg-row">
            <FotoCliente id={cliente.id} nombre={cliente.nombre} version={cliente.fotoVersion} size={48} />
            <div>
              <h2 className="sg-modal-title">Huella dactilar</h2>
              <p className="sg-card-sub">{cliente.nombre} · Cédula {cliente.cedula}</p>
            </div>
          </div>
          <button className="sg-btn sg-btn-ghost sg-btn-icon" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>

        <div className="sg-modal-body">
          {estado && (
            <div className={`sg-alert ${simulado ? "sg-alert-warning" : estado.conectado ? "sg-alert-success" : "sg-alert-danger"}`} style={{ marginBottom: 16 }}>
              <Info />
              <div>
                {simulado
                  ? <>Modo de prueba: no hay lector conectado. Se guarda una huella de prueba y la entrada funciona con la cédula.</>
                  : estado.conectado ? <>Lector {estado.proveedor} conectado.</>
                  : <>No se detecta el lector {estado.proveedor}. {estado.detalle}</>}
              </div>
            </div>
          )}

          <div className="hu-grid">
            <div className={`hu-scan ${paso}`}>
              <div className="hu-ring">
                <Fingerprint />
              </div>
              <strong>
                {paso === "capturando" ? "Ponga y levante el dedo 3 veces…" : paso === "ok" ? "¡Listo!" : "Listo para leer"}
              </strong>
              <span>{nombreDedo(dedo)}</span>
            </div>

            <div>
              <label className="sg-label">Dedo a registrar</label>
              <div className="hu-fingers">
                {DEDOS.map((d) => (
                  <button
                    key={d.id}
                    className={`hu-finger ${dedo === d.id ? "active" : ""} ${registradas.some((r) => r.finger === d.id) ? "done" : ""}`}
                    onClick={() => { setDedo(d.id); setPaso("listo"); }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <label className="hu-consent">
                <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
                <span>
                  <ShieldCheck />
                  El cliente autoriza que el gimnasio guarde su huella solo para controlar el ingreso,
                  y sabe que puede pedir que se elimine cuando quiera (Ley 1581 de 2012).
                </span>
              </label>
            </div>
          </div>

          {mensaje && <div className="sg-alert sg-alert-success" style={{ marginTop: 14 }}>{mensaje}</div>}
          {error && <div className="sg-alert sg-alert-danger" style={{ marginTop: 14 }}>{error}</div>}

          <div style={{ marginTop: 18 }}>
            <div className="sg-label">Huellas registradas</div>
            {registradas.length === 0 ? (
              <p className="sg-card-sub">Aún no tiene huellas. Se recomienda registrar dos dedos.</p>
            ) : (
              <div className="hu-list">
                {registradas.map((r) => (
                  <div key={r.finger} className="hu-item">
                    <Fingerprint />
                    <div>
                      <strong>{nombreDedo(r.finger)}</strong>
                      <span>{r.vendor === "SIMULADO" ? "Prueba" : r.vendor} · {new Date(r.createdAt).toLocaleDateString("es-CO")}</span>
                    </div>
                    <button className="sg-btn sg-btn-danger sg-btn-sm sg-btn-icon" onClick={() => eliminar(r.finger)} title="Eliminar"><Trash2 /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sg-modal-foot">
          <button className="sg-btn sg-btn-ghost" onClick={onCerrar}>Cerrar</button>
          <button className="sg-btn sg-btn-primary" onClick={capturar} disabled={!consentimiento || paso === "capturando"}>
            <Fingerprint /> {paso === "capturando" ? "Leyendo…" : "Registrar huella"}
          </button>
        </div>
      </div>
    </div>
  );
}
