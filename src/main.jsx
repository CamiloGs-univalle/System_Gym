import React from "react";
import ReactDOM from "react-dom/client";
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

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);