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

function AppShell() {
  const { config, formData, isAdminTokenLoggedIn, tokenLoginUsername, inviteToken } = useApp();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isInviteMode = searchParams.has("invitar");

  const isEditingRoute = location.pathname.endsWith("/setup") || (location.pathname.endsWith("/admin") && isAdminTokenLoggedIn);
  const showSessionBar = !isInviteMode && location.pathname === "/" && !isAdminTokenLoggedIn;
  const topBarPadding = isAdminTokenLoggedIn || showSessionBar ? "2.5rem" : "0";

  const storedToken = sessionStorage.getItem("weddingo_invite_token");

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

      {showSessionBar ? (
        <nav className="admin-bar" role="navigation" aria-label="Sesión">
          <div className="admin-bar__inner">
            <span className="admin-bar__title">No has iniciado sesión</span>
            <div className="admin-bar__links">
              <Link className="admin-bar__link" to={`/${storedToken || ""}/setup`}>Iniciar sesión</Link>
            </div>
          </div>
        </nav>
      ) : null}

      {isAdminTokenLoggedIn ? (
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

      <main id="main-content" role="main" tabIndex={-1} style={{ paddingTop: topBarPadding }}>
        <Suspense fallback={<div className="page-loading" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/:inviteToken" element={<PublicInvitation />} />
          <Route path="/:inviteToken/setup" element={<SetupPage />} />
          <Route path="/:inviteToken/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
          <Route path={SUPERADMIN_ROUTE} element={<SuperAdminLogin />} />
          <Route path={SUPERADMIN_DASHBOARD} element={<SuperAdminPanel />} />
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
