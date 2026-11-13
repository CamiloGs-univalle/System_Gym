import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "./styles/theme.css";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { instalarCapturaGlobal } from "./utils/errorCapture";

// En producción no se imprimen logs informativos: Electron los guarda en disco
// y podrían contener datos de clientes o de sesión.
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

instalarCapturaGlobal();

// En Electron, alert()/confirm() nativos bloquean el teclado de la ventana
// (los campos dejan de recibir texto). Se usan los diálogos de la app.
if (typeof window !== "undefined" && window.systemGym?.dialogo) {
  window.alert = (mensaje) => { window.systemGym.dialogo.alert(mensaje); };
  window.confirm = (mensaje) => window.systemGym.dialogo.confirm(mensaje);
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);