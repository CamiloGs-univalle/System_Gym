// ============================================================
// ERROR BOUNDARY GLOBAL
// Evita que un error de render deje la pantalla congelada:
// muestra un aviso y permite recargar la aplicación.
// ============================================================
import React from "react";
import { registrarError, obtenerErroresGuardados, limpiarErrores } from "../../utils/errorCapture";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    registrarError("errorBoundary", error);
    try {
      console.error("🧩 ErrorBoundary capturó:", error, info?.componentStack || "");
    } catch (e) { /* noop */ }
  }

  handleRecargar = () => {
    limpiarErrores();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const errores = obtenerErroresGuardados();

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "24px"
      }}>
        <div style={{
          background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "520px", width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.12)", border: "1px solid #e2e8f0"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>😵</div>
          <h2 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: "20px" }}>
            Ocurrió un error inesperado
          </h2>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>
            La interfaz se detuvo para no quedarse congelada. Tus datos están seguros en el
            servidor. Pulsa el botón para recargar la aplicación.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button
              onClick={this.handleRecargar}
              style={{
                padding: "10px 18px", borderRadius: "8px", border: "none", background: "#3b82f6",
                color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px"
              }}
            >
              🔄 Recargar aplicación
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1",
                background: "#fff", color: "#475569", fontWeight: "600", cursor: "pointer", fontSize: "14px"
              }}
            >
              Volver a la vista
            </button>
          </div>
          {errores.length > 0 && (
            <details style={{ fontSize: "12px", color: "#475569" }}>
              <summary style={{ cursor: "pointer", fontWeight: "600" }}>
                🐞 Ver detalles del error ({errores.length} registrados)
              </summary>
              <pre style={{
                marginTop: "8px", padding: "10px", background: "#f1f5f9", borderRadius: "8px",
                overflowX: "auto", fontSize: "11px", lineHeight: 1.4, whiteSpace: "pre-wrap"
              }}>
                {errores.slice(-3).map((e, i) => `${i + 1}. [${e.t}] ${e.origen}: ${e.msg}\n${e.stack || ""}`).join("\n\n")}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}