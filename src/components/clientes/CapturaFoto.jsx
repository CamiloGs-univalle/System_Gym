// ============================================================
// Tomar foto con la cámara o subir una imagen.
// La foto se recorta cuadrada y se reduce a 640 px antes de guardarla.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RefreshCw, X, Check, Trash2 } from "lucide-react";
import accesoService from "../../services/accesoService";
import FotoCliente, { olvidarFoto } from "./FotoCliente";
import "./clientes-ui.css";

const LADO = 640;

function recortarCuadrado(origen, ancho, alto, espejo = false) {
  const lado = Math.min(ancho, alto);
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext("2d");
  if (espejo) {
    ctx.translate(LADO, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(origen, (ancho - lado) / 2, (alto - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export default function CapturaFoto({ cliente, onCerrar, onGuardada }) {
  const [modo, setModo] = useState("camara");
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [camaraLista, setCamaraLista] = useState(false);
  const [camaras, setCamaras] = useState([]);
  const [camaraId, setCamaraId] = useState("");
  const video = useRef(null);
  const stream = useRef(null);
  const archivo = useRef(null);

  const detener = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamaraLista(false);
  };

  useEffect(() => {
    if (modo !== "camara" || foto) {
      detener();
      return undefined;
    }
    let cancelado = false;
    (async () => {
      setError("");
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: camaraId ? { deviceId: { exact: camaraId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelado) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setCamaraLista(true);
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        setCamaras(dispositivos.filter((d) => d.kind === "videoinput"));
      } catch (e) {
        setError(e?.name === "NotAllowedError"
          ? "No se dio permiso para usar la cámara."
          : "No se encontró una cámara. Conecte una cámara web o suba una foto.");
      }
    })();
    return () => { cancelado = true; detener(); };
  }, [modo, foto, camaraId]);

  const tomar = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFoto(recortarCuadrado(v, v.videoWidth, v.videoHeight, true));
  };

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setError("Use una foto JPG, PNG o WEBP.");
      return;
    }
    const img = new Image();
    const u = URL.createObjectURL(f);
    img.onload = () => {
      setFoto(recortarCuadrado(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(u);
      setError("");
    };
    img.onerror = () => setError("No se pudo leer la imagen.");
    img.src = u;
  };

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      const r = await accesoService.guardarFoto(cliente.id, foto);
      olvidarFoto(cliente.id);
      onGuardada?.(r?.photoUpdatedAt || new Date().toISOString());
      onCerrar();
    } catch (e) {
      setError(e?.mensajeUsuario || e?.message || "No se pudo guardar la foto.");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!window.confirm(`¿Quitar la foto de ${cliente.nombre}?`)) return;
    try {
      await accesoService.eliminarFoto(cliente.id);
      olvidarFoto(cliente.id);
      onGuardada?.(null);
      onCerrar();
    } catch (e) {
      setError(e?.mensajeUsuario || "No se pudo quitar la foto.");
    }
  };

  return (
    <div className="sg-overlay" onClick={onCerrar}>
      <div className="sg-modal" style={{ width: "min(620px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="sg-modal-head">
          <div className="sg-row">
            <FotoCliente id={cliente.id} nombre={cliente.nombre} version={cliente.fotoVersion} size={48} />
            <div>
              <h2 className="sg-modal-title">Foto del cliente</h2>
              <p className="sg-card-sub">{cliente.nombre}</p>
            </div>
          </div>
          <button className="sg-btn sg-btn-ghost sg-btn-icon" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>

        <div className="sg-modal-body">
          <div className="sg-tabs" style={{ marginBottom: 16 }}>
            <button className={`sg-tab ${modo === "camara" ? "active" : ""}`} onClick={() => { setModo("camara"); setFoto(null); }}>
              <Camera /> Tomar foto
            </button>
            <button className={`sg-tab ${modo === "subir" ? "active" : ""}`} onClick={() => { setModo("subir"); setFoto(null); }}>
              <ImageUp /> Subir foto
            </button>
          </div>

          <div className="cf-stage">
            {foto ? (
              <img src={foto} alt="Vista previa" className="cf-media" />
            ) : modo === "camara" ? (
              <>
                <video ref={video} className="cf-media cf-mirror" playsInline muted />
                <div className="cf-guide" aria-hidden="true" />
                {!camaraLista && !error && <div className="cf-status"><div className="sg-spinner" /> Encendiendo la cámara…</div>}
              </>
            ) : (
              <button className="cf-drop" onClick={() => archivo.current?.click()}>
                <ImageUp />
                <strong>Elegir una foto del computador</strong>
                <span>JPG, PNG o WEBP. Se recorta cuadrada automáticamente.</span>
              </button>
            )}
            <input ref={archivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={elegirArchivo} />
          </div>

          {modo === "camara" && camaras.length > 1 && !foto && (
            <select className="sg-select" style={{ marginTop: 12 }} value={camaraId} onChange={(e) => setCamaraId(e.target.value)}>
              <option value="">Cámara predeterminada</option>
              {camaras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Cámara ${i + 1}`}</option>)}
            </select>
          )}

          {error && <div className="sg-alert sg-alert-danger" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        <div className="sg-modal-foot">
          {cliente.fotoVersion && !foto && (
            <button className="sg-btn sg-btn-danger" onClick={quitar} style={{ marginRight: "auto" }}><Trash2 /> Quitar foto</button>
          )}
          {foto ? (
            <>
              <button className="sg-btn sg-btn-ghost" onClick={() => setFoto(null)}><RefreshCw /> Repetir</button>
              <button className="sg-btn sg-btn-primary" onClick={guardar} disabled={guardando}>
                <Check /> {guardando ? "Guardando…" : "Usar esta foto"}
              </button>
            </>
          ) : modo === "camara" ? (
            <button className="sg-btn sg-btn-primary sg-btn-lg" onClick={tomar} disabled={!camaraLista}>
              <Camera /> Tomar foto
            </button>
          ) : (
            <button className="sg-btn sg-btn-primary" onClick={() => archivo.current?.click()}><ImageUp /> Elegir archivo</button>
          )}
        </div>
      </div>
    </div>
  );
}
