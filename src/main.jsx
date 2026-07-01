import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Punto de entrada de la SPA: monta la invitacion en el nodo raiz.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode ayuda a detectar efectos secundarios durante el desarrollo.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
