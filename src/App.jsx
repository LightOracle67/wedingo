import { useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PublicInvitation from "./pages/PublicInvitation";
import SetupPage from "./pages/SetupPage";
import AdminPage from "./pages/AdminPage";

function AppShell() {
  const { config, formData, isAdminTokenLoggedIn } = useApp();
  const location = useLocation();

  const isEditingRoute = location.pathname === "/setup" || (location.pathname === "/admin" && isAdminTokenLoggedIn);

  useEffect(() => {
    const activeTheme = isEditingRoute ? "golden" : formData.theme || config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [formData.theme, config.theme, isEditingRoute]);

  useEffect(() => {
    const activeBackground = isEditingRoute ? null : config.backgroundImage;
    const encodedBackground = activeBackground ? `url('${activeBackground.replace(/'/g, "\\'")}')` : "none";
    document.documentElement.style.setProperty("--wedding-background-image", encodedBackground);
  }, [config.backgroundImage, isEditingRoute]);

  return (
    <>
      <a href="#main-content" className="skip-link" tabIndex={0}>
        Saltar al contenido principal
      </a>

      {isAdminTokenLoggedIn ? (
        <nav className="admin-bar" role="navigation" aria-label="Barra de administración">
          <div className="admin-bar__inner">
            <span className="admin-bar__title">Administración</span>
            <div className="admin-bar__links">
              <Link className={`admin-bar__link ${location.pathname === "/" ? "admin-bar__link--active" : ""}`} to="/">Invitación</Link>
              <Link className={`admin-bar__link ${location.pathname === "/admin" ? "admin-bar__link--active" : ""}`} to="/admin">Panel</Link>
            </div>
          </div>
        </nav>
      ) : null}

      <main id="main-content" role="main" tabIndex={-1} style={{ paddingTop: isAdminTokenLoggedIn ? "2.5rem" : "0" }}>
        <Routes>
          <Route path="/" element={<PublicInvitation />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
