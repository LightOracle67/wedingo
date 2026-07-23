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

const RTL_LANGS = new Set(["ar", "he", "fa", "ps", "ur", "sd", "ku", "ckb", "dv", "ha"]);
const AccessibilityPanel = lazy(() => import("./components/AccessibilityPanel"));
import LegalModal from "./components/LegalModal";
import ChangelogModal from "./components/ChangelogModal";
import Fireflies from "./components/Fireflies";
import { APP_VERSION } from "./lib/constants";
import { logError } from "./lib/error-utils";
import "./styles/admin.css";
import "./styles/rtl.css";
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
  const [username, setUsername] = useState("");
  
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wedin_session");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.identifier && data.expiresAt && Date.now() < data.expiresAt) {
          setUsername(data.identifier);
        }
      }
    } catch {}
  }, []);
  const location = useLocation();
  const [showA11y, setShowA11y] = useState(false);
  const [legalSection, setLegalSection] = useState("");
  const [showChangelog, setShowChangelog] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const isEditingRoute = location.pathname.endsWith("/setup") || (location.pathname.endsWith("/admin") && isAdminTokenLoggedIn);


  useEffect(() => {
    const lang = i18n.language?.split("-")[0] || "es";
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.translate = true;
  }, [i18n.language]);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") document.title = t("app.titleLanding");
    else if (path.includes("/admin")) document.title = t("app.titleAdmin");
    else if (path.includes("/setup")) document.title = t("app.titleSetup");
    else if (inviteToken) document.title = `${config.firstName || t("app.titleInvitation")} & ${config.secondName || ""} — Wedingo`;
  }, [location.pathname, inviteToken, config.firstName, config.secondName, t]);

  useEffect(() => {
    const activeTheme = isEditingRoute ? "golden" : formData.theme || config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
  }, [formData.theme, config.theme, isEditingRoute]);

  useEffect(() => {
    document.documentElement.style.setProperty("--wedding-background-image", "none");
  }, []);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      logError(event.error || event.message, "global");
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      logError(event.reason, "unhandledRejection");
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {import.meta.env.DEV ? (
        <div style={{
          position: "fixed", top: 0, left: 0, zIndex: 100000,
          background: "#ff9800", color: "#000", fontSize: "0.7rem",
          padding: "0.1rem 0.4rem", borderRadius: "0 0 0.25rem 0",
          fontWeight: 700, letterSpacing: "0.05em",
        }}>DEV</div>
      ) : null}

      <a href="#main-content" className="skip-link" style={{
        position: "absolute", top: "-100px", left: "8px", zIndex: 100000,
        background: "var(--setup-accent)", color: "var(--setup-accent-text)",
        padding: "0.5rem 1rem", borderRadius: "0 0 0.5rem 0.5rem",
        fontWeight: 600, fontSize: "0.85rem", textDecoration: "none",
        transition: "top 0.2s",
      }} onFocus={(e) => e.target.style.top = "0"} onBlur={(e) => e.target.style.top = "-100px"}>
        {t("common.skipToContent")}
      </a>

      {!isOnline ? (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
          background: "#e06060", color: "#fff", textAlign: "center",
          padding: "0.5rem", fontSize: "0.85rem", fontWeight: 600,
          transition: "transform 0.3s ease, opacity 0.3s ease",
          transform: "translateY(0)",
          opacity: 1,
        }}>
          {t("common.offline")}
        </div>
      ) : null}

      {isAdminTokenLoggedIn && inviteToken && !location.pathname.endsWith("/setup") && !location.pathname.endsWith("/print") ? (
        <nav className="admin-bar" aria-label={t("common.adminBar.ariaLabel")}>
          <div className="admin-bar__inner">
            <span className="admin-bar__title">{username || tokenLoginUsername || config.adminUsername || t("common.adminBar.fallback")}</span>
            <div className="admin-bar__links">
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}`}>{t("admin.tabs.invitation")}</Link>
              <Link className={`admin-bar__link ${location.pathname === `/${inviteToken}/admin` ? "admin-bar__link--active" : ""}`} to={`/${inviteToken}/admin`}>{t("admin.tabs.panel")}</Link>
               <LanguageSwitcher />
            </div>
          </div>
        </nav>
      ) : null}

      {inviteToken && location.pathname === `/${inviteToken}` && (config.musicFile || config.musicUrl) ? <MusicPlayer musicUrl={config.musicFile || config.musicUrl} /> : null}

      {!isEditingRoute && !isAdminTokenLoggedIn && (
        <>
          <button type="button" className="app-nav-toggle" onClick={() => setNavOpen(!navOpen)} aria-label={t("common.menu")}>
            <span className={`app-nav-toggle__icon${navOpen ? " app-nav-toggle__icon--open" : ""}`}>
              <span /><span /><span />
            </span>
          </button>

          <div className={`app-nav-overlay${navOpen ? " app-nav-overlay--open" : ""}`}>
            <div className="app-nav-overlay__content">
              <LanguageSwitcher />
              <button type="button" className="app-nav-overlay__link" onClick={() => { setShowA11y(true); setNavOpen(false); }} aria-label={t("common.accessibility")}>♿ {t("common.accessibility")}</button>
              <button type="button" className="app-nav-overlay__link" onClick={() => { setLegalSection("privacy"); setNavOpen(false); }}>{t("public.privacyPolicy")}</button>
              <button type="button" className="app-nav-overlay__link" onClick={() => { setLegalSection("terms"); setNavOpen(false); }}>{t("public.terms")}</button>
              <button type="button" className="app-nav-overlay__link" onClick={() => { setLegalSection("legal"); setNavOpen(false); }}>{t("public.legalNotice")}</button>
              <button type="button" className="app-nav-overlay__link app-nav-overlay__link--version" onClick={() => { setShowChangelog(true); setNavOpen(false); }}>{t("common.version", { version: APP_VERSION })}</button>
            </div>
          </div>

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
              <button type="button" onClick={() => setShowChangelog(true)} className="app-footer__link" style={{ opacity: 0.4 }}>{t("common.version", { version: APP_VERSION })}</button>
            </div>
          </footer>
        </>
      )}

      <main id="main-content" tabIndex={-1}>
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

      <Fireflies />
      <AccessibilityPanel open={showA11y} onClose={() => setShowA11y(false)} />
      {legalSection ? <LegalModal section={legalSection} onClose={() => setLegalSection("")} /> : null}
      {showChangelog ? <ChangelogModal onClose={() => setShowChangelog(false)} /> : null}
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
