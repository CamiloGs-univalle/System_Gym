// ============================================================
// Respaldos de la base de datos (solo administrador).
// El sistema hace una copia automática cada noche (11:00 p. m.) y una al
// arrancar si ese día no hay copia. Aquí se ven y se puede crear una ya.
// ============================================================
import { useEffect, useState } from "react";
import api from "../../services/api";

const tamano = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function RespaldosCard() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    try {
      const { data } = await api.get("/backups");
      setLista(data?.data || []);
    } catch {
      setLista([]);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    setCargando(true);
    setMensaje("");
    try {
      await api.post("/backups");
      setMensaje("Respaldo creado correctamente.");
      cargar();
    } catch (err) {
      setMensaje(err?.mensajeUsuario || "No se pudo crear el respaldo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Respaldos de la información</h3>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Copia automática todas las noches. Se guardan en la carpeta .gymcore\backups del usuario de Windows.
          </p>
        </div>
        <button onClick={crear} disabled={cargando}
          style={{ background: "#1e40af", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>
          {cargando ? "Creando..." : "Crear respaldo ahora"}
        </button>
      </div>
      {mensaje && <p style={{ fontSize: 13, color: "#065f46", marginTop: 8 }}>{mensaje}</p>}
      <ul style={{ marginTop: 10, fontSize: 13, color: "#374151", maxHeight: 160, overflowY: "auto" }}>
        {lista.length === 0 && <li style={{ color: "#9ca3af" }}>Aún no hay respaldos.</li>}
        {lista.slice(0, 10).map((b) => (
          <li key={b.name} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
            {b.name} · {tamano(b.sizeBytes)}
          </li>
        ))}
      </ul>
    </div>
  );
}
