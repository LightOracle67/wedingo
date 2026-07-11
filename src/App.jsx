import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppProvider, useApp } from "./contexts/AppContext";
import { SuperAdminProvider } from "./contexts/SuperAdminContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import LanguageSwitcher from "./components/LanguageSwitcher";
import MusicPlayer from "./components/MusicPlayer";
import AccessibilityPanel from "./components/AccessibilityPanel";
import LegalModal from "./components/LegalModal";
import { APP_VERSION } from "./lib/constants";
import LandingPage from "./pages/LandingPage";
import { SUPERADMIN_ROUTE, SUPERADMIN_DASHBOARD } from "./lib/superadmin";

const PublicInvitation = lazy(() => import("./pages/PublicInvitation"));
const SetupPage = lazy(() => import("./pages/SetupPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminPanel = lazy(() => import("./pages/SuperAdminPanel"));
const PrintPage = lazy(() => import("./pages/PrintPage"));

function AppShell() {
  const { t, i18n } = useTranslation();
  const { config, formData, isAdminTokenLoggedIn, tokenLoginUsername, inviteToken } = useApp();
  const location = useLocation();
  const [showA11y, setShowA11y] = useState(false);
  const [legalSection, setLegalSection] = useState("");

  const isEditingRoute = location.pathname.endsWith("/setup") || (location.pathname.endsWith("/admin") && isAdminTokenLoggedIn);
  const topBarPadding = isAdminTokenLoggedIn ? "2.5rem" : "0";
  const publicNavPadding = !isEditingRoute ? "2.2rem" : "0";

  const RTL_LANGS = new Set(["ar", "he", "ur", "fa", "ps", "ku"]);

  useEffect(() => {
    const lang = i18n.language?.split("-")[0] || "es";
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  }, [i18n.language]);

  useEffect(() => {
    const activeTheme = isEditingRoute ? "golden" : formData.theme || config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [formData.theme, config.theme, isEditingRoute]);

  useEffect(() => {
    const bg = isEditingRoute ? null : config.backgroundImage;
    let encoded = "none";
    if (bg && bg.length < 100000 && (bg.startsWith("data:image/") || bg.startsWith("https://firebasestorage.googleapis.com") || bg.startsWith("https://storage.googleapis.com"))) {
      if (bg.startsWith("data:image/")) {
        const base64 = bg.split(",")[1] || "";
        if (base64.length > 100 && /^[A-Za-z0-9+/=]+$/.test(base64)) encoded = `url('${bg}')`;
      } else {
        encoded = `url('${bg}')`;
      }
    }
    document.documentElement.style.setProperty("--wedding-background-image", encoded);
  }, [config.backgroundImage, isEditingRoute]);

  return (
    <>
      <a href="#main-content" className="skip-link" tabIndex={0}>
        {t("common.skipToContent")}
      </a>

      {isAdminTokenLoggedIn && inviteToken && !location.pathname.endsWith("/setup") && !location.pathname.endsWith("/print") ? (
        <nav className="admin-bar" aria-label={t("common.adminBar.ariaLabel")}>
          <div className="admin-bar__inner">
            <span className="admin-bar__title">{tokenLoginUsername || config.adminUsername || t("common.adminBar.fallback")}</span>
            <div className="admin-bar__links">
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}`}>{t("admin.tabs.invitation")}</Link>
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}/admin` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}/admin`}>{t("admin.tabs.panel")}</Link>
               <LanguageSwitcher />
            </div>
          </div>
        </nav>
      ) : null}

      {inviteToken && location.pathname === `/${inviteToken}` ? <MusicPlayer musicUrl={config.musicUrl} /> : null}

      <main id="main-content" tabIndex={-1} style={{ paddingTop: topBarPadding || publicNavPadding }}>
        <Suspense fallback={<div className="page-loading" />}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
          <Route path="/:inviteToken" element={<ErrorBoundary><PublicInvitation /></ErrorBoundary>} />
          <Route path="/:inviteToken/setup" element={<ErrorBoundary><SetupPage /></ErrorBoundary>} />
          <Route path="/:inviteToken/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
          <Route path={SUPERADMIN_ROUTE} element={<ErrorBoundary><SuperAdminLogin /></ErrorBoundary>} />
          <Route path="/:inviteToken/print" element={<ErrorBoundary><PrintPage /></ErrorBoundary>} />
          {SUPERADMIN_DASHBOARD && (
            <Route path={SUPERADMIN_DASHBOARD} element={<ErrorBoundary><SuperAdminPanel /></ErrorBoundary>} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <CookieConsent />
      </main>

      {!isEditingRoute && (
        <footer className="app-footer">
          <div className="app-footer__left">
            <LanguageSwitcher />
            <button type="button" className="a11y-trigger" onClick={() => setShowA11y(true)} aria-label={t("common.accessibility")}>♿</button>
          </div>
          <div className="app-footer__right">
            <button type="button" onClick={() => setLegalSection("privacy")} className="app-footer__link">{t("public.privacyPolicy")}</button>
            <span className="app-footer__sep">·</span>
            <button type="button" onClick={() => setLegalSection("terms")} className="app-footer__link">{t("public.terms")}</button>
            <span className="app-footer__sep">·</span>
            <button type="button" onClick={() => setLegalSection("legal")} className="app-footer__link">{t("public.legalNotice")}</button>
            <span className="app-footer__sep">·</span>
            <span className="app-footer__link" style={{ cursor: "default", opacity: 0.4 }}>v{APP_VERSION}</span>
          </div>
        </footer>
      )}

      <AccessibilityPanel open={showA11y} onClose={() => setShowA11y(false)} />
      {legalSection ? <LegalModal section={legalSection} onClose={() => setLegalSection("")} /> : null}
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
