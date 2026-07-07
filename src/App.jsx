import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import { SuperAdminProvider } from "./contexts/SuperAdminContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import { SUPERADMIN_ROUTE, SUPERADMIN_DASHBOARD } from "./lib/superadmin";

const PublicInvitation = lazy(() => import("./pages/PublicInvitation"));
const SetupPage = lazy(() => import("./pages/SetupPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminPanel = lazy(() => import("./pages/SuperAdminPanel"));
const PrintPage = lazy(() => import("./pages/PrintPage"));

function AppShell() {
  const { config, formData, isAdminTokenLoggedIn, tokenLoginUsername, inviteToken } = useApp();
  const location = useLocation();

  const isEditingRoute = location.pathname.endsWith("/setup") || (location.pathname.endsWith("/admin") && isAdminTokenLoggedIn);
  const topBarPadding = isAdminTokenLoggedIn ? "2.5rem" : "0";

  useEffect(() => {
    const activeTheme = isEditingRoute ? "golden" : formData.theme || config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [formData.theme, config.theme, isEditingRoute]);

  useEffect(() => {
    const bg = isEditingRoute ? null : config.backgroundImage;
    let encoded = "none";
    if (bg && (bg.startsWith("data:image/") || bg.startsWith("https://firebasestorage.googleapis.com") || bg.startsWith("https://storage.googleapis.com"))) {
      if (bg.startsWith("data:image/")) {
        const base64 = bg.split(",")[1] || "";
        if (/^[A-Za-z0-9+/=]+$/.test(base64)) encoded = `url('${bg}')`;
      } else {
        encoded = `url('${bg}')`;
      }
    }
    document.documentElement.style.setProperty("--wedding-background-image", encoded);
  }, [config.backgroundImage, isEditingRoute]);

  return (
    <>
      <a href="#main-content" className="skip-link" tabIndex={0}>
        Saltar al contenido principal
      </a>

      {isAdminTokenLoggedIn && inviteToken && !location.pathname.endsWith("/setup") && !location.pathname.endsWith("/print") ? (
        <nav className="admin-bar" role="navigation" aria-label="Barra de administración">
          <div className="admin-bar__inner">
            <span className="admin-bar__title">{tokenLoginUsername || config.adminUsername || "Administración"}</span>
            <div className="admin-bar__links">
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}`}>Invitación</Link>
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}/admin` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}/admin`}>Panel</Link>
            </div>
          </div>
        </nav>
      ) : null}

      <main id="main-content" role="main" tabIndex={-1} style={{ '--navbar-height': topBarPadding, paddingTop: topBarPadding }}>
        <Suspense fallback={<div className="page-loading" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/:inviteToken" element={<ErrorBoundary><PublicInvitation /></ErrorBoundary>} />
          <Route path="/:inviteToken/setup" element={<ErrorBoundary><SetupPage /></ErrorBoundary>} />
          <Route path="/:inviteToken/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
          <Route path={SUPERADMIN_ROUTE} element={<ErrorBoundary><SuperAdminLogin /></ErrorBoundary>} />
          <Route path="/:inviteToken/print" element={<PrintPage />} />
          {SUPERADMIN_DASHBOARD && (
            <Route path={SUPERADMIN_DASHBOARD} element={<ErrorBoundary><SuperAdminPanel /></ErrorBoundary>} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SuperAdminProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </SuperAdminProvider>
    </AppProvider>
  );
}
