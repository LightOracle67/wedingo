import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";
import "./styles/animations.css";
// Estilos de la CASCO PÚBLICA que vivían en admin.css (app-scene, story-card,
// invite-shell, admin-bar…): v2.186, la ruta del invitado ya no arrastra los
// 44 KB de estilos de los paneles admin/setup.
import "./styles/public-shell.css";
import "./i18n";
import "./lib/sentry";
import { reportWebVitals } from "./lib/vitals";

reportWebVitals();

/**
 * Monta la aplicación en el contenedor raíz. Se exporta para poder invocarla
 * desde los tests de integración sin depender del side-effect de import.
 *
 * @param container Elemento DOM que hace de raíz de React.
 */
export function mountApp(container: HTMLElement) {
  createRoot(container).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

// En tests (vitest) el contenedor no existe o no debe montarse la app real:
// evita el render completo del árbol y los unhandled errors de React DOM.
if (import.meta.env.MODE !== "test") {
  const container = document.getElementById("root");
  if (container) mountApp(container);
}
