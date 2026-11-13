// ============================================================
// Foto del cliente (o sus iniciales si no tiene foto).
// La foto se descarga una vez por cliente y versión, y se guarda en memoria.
// ============================================================
import { useEffect, useState } from "react";
import accesoService from "../../services/accesoService";

const cache = new Map(); // clave `${id}|${version}` -> objectURL

const PALETAS = [
  ["#6d5ef6", "#22c3ee"],
  ["#f97362", "#f9b14a"],
  ["#10b981", "#84cc16"],
  ["#ec4899", "#8b5cf6"],
  ["#0ea5e9", "#6366f1"],
  ["#f59e0b", "#ef4444"],
];

export function iniciales(nombre = "") {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

/** Invalida la foto en memoria (después de tomar una nueva). */
export function olvidarFoto(id) {
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${id}|`)) {
      URL.revokeObjectURL(cache.get(k));
      cache.delete(k);
    }
  }
}

export default function FotoCliente({ id, nombre = "", version = null, size = 44, radius = null, className = "", style = {} }) {
  const clave = `${id}|${version}`;
  const [url, setUrl] = useState(version ? cache.get(clave) || null : null);

  useEffect(() => {
    let vivo = true;
    if (!id || !version) {
      setUrl(null);
      return undefined;
    }
    if (cache.has(clave)) {
      setUrl(cache.get(clave));
      return undefined;
    }
    accesoService.fotoBlob(id)
      .then((blob) => {
        if (!vivo || !blob || !blob.size) return;
        const u = URL.createObjectURL(blob);
        cache.set(clave, u);
        setUrl(u);
      })
      .catch(() => vivo && setUrl(null));
    return () => { vivo = false; };
  }, [clave, id, version]);

  const [a, b] = PALETAS[(Number(id) || nombre.length) % PALETAS.length];
  const r = radius ?? Math.round(size * 0.32);
  const base = {
    width: size,
    height: size,
    borderRadius: r,
    flex: "none",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    ...style,
  };

  if (url) {
    return <img src={url} alt={nombre} className={className} style={{ ...base, objectFit: "cover" }} />;
  }
  return (
    <div
      className={className}
      aria-label={nombre}
      style={{
        ...base,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        color: "#fff",
        fontWeight: 750,
        fontSize: Math.max(12, Math.round(size * 0.36)),
        letterSpacing: "-0.02em",
      }}
    >
      {iniciales(nombre)}
    </div>
  );
}
