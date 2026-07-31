import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";
import "./i18n";
import "./lib/sentry";
import { reportWebVitals } from "./lib/vitals";

reportWebVitals();

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
