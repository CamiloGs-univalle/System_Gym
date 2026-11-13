// ============================================================
// Renovar o activar el plan de un cliente (cobro en el turno abierto).
// ============================================================
import { useMemo, useState } from "react";
import { X, CalendarPlus, Banknote, CreditCard, Landmark } from "lucide-react";
import clientesService from "../../services/clientesService";
import { planesService } from "../../services/gimnasio/planesService";
import FotoCliente from "./FotoCliente";

const TIPOS = [
  { id: "DAILY", label: "Día", dias: 1 },
  { id: "MONTHLY", label: "Mensual", dias: 30 },
  { id: "QUARTERLY", label: "Trimestral", dias: 90 },
  { id: "SEMIANNUAL", label: "Semestral", dias: 180 },
  { id: "ANNUAL", label: "Anual", dias: 365 },
];

const tipoDePlan = (p) => {
  const n = (p?.nombre || "").toLowerCase();
  const d = Number(p?.duracion) || 30;
  if (n.includes("día") || n.includes("dia") || d === 1) return "DAILY";
  if (n.includes("anual") || d >= 365) return "ANNUAL";
  if (n.includes("semestr") || d >= 180) return "SEMIANNUAL";
  if (n.includes("trimestr") || d >= 90) return "QUARTERLY";
  return "MONTHLY";
};

export default function RenovarPlan({ cliente, onCerrar, onListo }) {
  const planes = useMemo(() => {
    try { return planesService.filtrar({ tipo: "MEMBRESIA", estado: "ACTIVO" }) || []; } catch { return []; }
  }, []);
  const [planId, setPlanId] = useState(planes[0]?.id ?? "");
  const plan = planes.find((p) => String(p.id) === String(planId));
  const [tipo, setTipo] = useState(plan ? tipoDePlan(plan) : "MONTHLY");
  const [monto, setMonto] = useState(plan?.precio ? String(plan.precio) : "");
  const [metodo, setMetodo] = useState("CASH");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const elegirPlan = (id) => {
    setPlanId(id);
    const p = planes.find((x) => String(x.id) === String(id));
    if (p) {
      setTipo(tipoDePlan(p));
      setMonto(String(p.precio || ""));
    }
  };

  const guardar = async () => {
    setError("");
    setGuardando(true);
    try {
      await clientesService.renovarMembresia(cliente.id, {
        tipo: TIPOS.find((t) => t.id === tipo)?.label.toLowerCase() === "día" ? "diario" : tipo.toLowerCase(),
        monto: Number(String(monto).replace(/\D/g, "")),
        metodoPago: metodo,
        shiftId: null,
      });
      onListo?.();
      onCerrar();
    } catch (e) {
      setError(e?.mensajeUsuario || e?.message || "No se pudo renovar.");
    } finally {
      setGuardando(false);
    }
  };

  const vence = cliente.membresia?.fechaVencimiento;
  const vigente = cliente.membresia && cliente.membresia.diasRestantes > 0;

  return (
    <div className="sg-overlay" onClick={onCerrar}>
      <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sg-modal-head">
          <div className="sg-row">
            <FotoCliente id={cliente.id} nombre={cliente.nombre} version={cliente.fotoVersion} size={48} />
            <div>
              <h2 className="sg-modal-title">Renovar plan</h2>
              <p className="sg-card-sub">{cliente.nombre}</p>
            </div>
          </div>
          <button className="sg-btn sg-btn-ghost sg-btn-icon" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        </div>
        <div className="sg-modal-body">
          {vigente && (
            <div className="sg-alert" style={{ marginBottom: 14 }}>
              <CalendarPlus />
              <span>Su plan actual vence el {new Date(`${vence}T12:00:00`).toLocaleDateString("es-CO")}. El nuevo empieza al día siguiente: no pierde días.</span>
            </div>
          )}
          {planes.length > 0 && (
            <div className="sg-field">
              <label className="sg-label">Plan</label>
              <select className="sg-select" value={planId} onChange={(e) => elegirPlan(e.target.value)}>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} · ${Number(p.precio || 0).toLocaleString("es-CO")}</option>)}
                <option value="">Otro valor</option>
              </select>
            </div>
          )}
          <div className="sg-field">
            <label className="sg-label">Duración</label>
            <div className="sg-tabs" style={{ flexWrap: "wrap" }}>
              {TIPOS.map((t) => (
                <button key={t.id} className={`sg-tab ${tipo === t.id ? "active" : ""}`} onClick={() => setTipo(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="sg-field">
            <label className="sg-label">Valor cobrado</label>
            <input className="sg-input" inputMode="numeric" value={monto ? `$ ${Number(String(monto).replace(/\D/g, "")).toLocaleString("es-CO")}` : ""}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} placeholder="$ 0" />
          </div>
          <div className="sg-field">
            <label className="sg-label">Medio de pago</label>
            <div className="sg-tabs">
              <button className={`sg-tab ${metodo === "CASH" ? "active" : ""}`} onClick={() => setMetodo("CASH")}><Banknote /> Efectivo</button>
              <button className={`sg-tab ${metodo === "CARD" ? "active" : ""}`} onClick={() => setMetodo("CARD")}><CreditCard /> Tarjeta</button>
              <button className={`sg-tab ${metodo === "TRANSFER" ? "active" : ""}`} onClick={() => setMetodo("TRANSFER")}><Landmark /> Transferencia</button>
            </div>
          </div>
          {error && <div className="sg-alert sg-alert-danger">{error}</div>}
        </div>
        <div className="sg-modal-foot">
          <button className="sg-btn sg-btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button className="sg-btn sg-btn-primary" onClick={guardar} disabled={guardando || !Number(String(monto).replace(/\D/g, ""))}>
            <CalendarPlus /> {guardando ? "Cobrando…" : "Cobrar y renovar"}
          </button>
        </div>
      </div>
    </div>
  );
}
