// ============================================================
// Aviso de licencia de System Gym.
// - Periodo de prueba: muestra los días que quedan.
// - Licencia vencida o inválida: el sistema queda en solo lectura y el
//   administrador puede pegar la licencia nueva aquí mismo.
// ============================================================
import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";

export default function EstadoLicencia({ esAdmin }) {
  const [info, setInfo] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/license");
      setInfo(data?.data || null);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    cargar();
    const onLicencia = () => cargar();
    window.addEventListener("systemgym:license-required", onLicencia);
    return () => window.removeEventListener("systemgym:license-required", onLicencia);
  }, [cargar]);

  if (!info || info.status === "DISABLED") return null;
  const pocoTiempo = info.status === "VALID" && info.daysLeft <= 7;
  if (info.status === "VALID" && !pocoTiempo) return null;

  const bloqueado = !info.writable;
  const color = bloqueado ? "#b91c1c" : "#92400e";
  const fondo = bloqueado ? "#fee2e2" : "#fef3c7";

  const instalar = async () => {
    setMensaje("");
    try {
      const { data } = await api.post("/license", { licenseKey: clave.trim() });
      setMensaje(data?.message || "Licencia instalada.");
      setClave("");
      setAbierto(false);
      cargar();
    } catch (err) {
      setMensaje(err?.mensajeUsuario || "La licencia no es válida.");
    }
  };

  return (
    <div style={{ background: fondo, color, padding: "8px 16px", fontSize: 13, borderBottom: `1px solid ${color}33` }}>
      <span style={{ fontWeight: 600 }}>
        {bloqueado ? "Solo lectura: " : "Aviso: "}
      </span>
      {info.message}
      {pocoTiempo && ` Vence en ${info.daysLeft} día(s).`}
      {esAdmin && (
        <button onClick={() => setAbierto(!abierto)}
          style={{ marginLeft: 12, background: "transparent", border: `1px solid ${color}`, color, borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>
          Instalar licencia
        </button>
      )}
      {abierto && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Pegue aquí la licencia"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontFamily: "monospace", fontSize: 12 }} />
          <button onClick={instalar} disabled={!clave.trim()}
            style={{ background: "#1e40af", color: "#fff", border: 0, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Guardar
          </button>
        </div>
      )}
      {abierto && info.machineId && (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          Código de este equipo (envíelo a su proveedor para recibir la licencia): <code style={{ userSelect: "all" }}>{info.machineId}</code>
        </div>
      )}
      {mensaje && <div style={{ marginTop: 6 }}>{mensaje}</div>}
    </div>
  );
}
