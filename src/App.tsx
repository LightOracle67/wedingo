import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Routes, Route, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAppUI } from "./contexts/useAppUI";
import { AnimationsProvider } from "./contexts/AnimationsContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import { UIProvider } from "./contexts/UIContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { safeGetItem, safeSetItem } from "./lib/storage";
import { getFooterVisible, getAdminMode, subscribeFooterVisible } from "./lib/chrome-store";
import { APP_VERSION } from "./lib/constants";
import { logError } from "./lib/error-utils";
import { SUPERADMIN_ROUTE, SUPERADMIN_DASHBOARD } from "./lib/superadmin";
import "./styles/rtl.css";
import { useOptionalInviteToken } from "./contexts/useConfig";

const CookieConsent = lazy(() => import("./components/CookieConsent"));
const DataRequestModal = lazy(() => import("./components/DataRequestModal"));
const LanguageSwitcher = lazy(() => import("./components/LanguageSwitcher"));
const GoogleTranslateToggle = lazy(() => import("./components/GoogleTranslateToggle"));
const Fireflies = lazy(() => import("./components/Fireflies"));
import { useFocusTrap, useEscapeKey } from "./hooks/useFocusTrap";

const AccessibilityPanel = lazy(() => import("./components/AccessibilityPanel"));
const LegalModal = lazy(() => import("./components/LegalModal"));
const ChangelogModal = lazy(() => import("./components/ChangelogModal"));
import AnimationPrefsApplier from "./components/AnimationPrefsApplier";

// v2.192: cada ruta es un BUNDLE perezoso que envuelve la página con sus
// providers (Config/Auth/Rsvp) — el shell ya no importa Firebase de forma
// estática; vendor-firebase se descarga al navegar a la primera ruta que lo
// necesita (en paralelo con el chunk de la página).
const LandingRoute = lazy(() => import("./routes/landing"));
const PublicInvitationRoute = lazy(() => import("./routes/invitation"));
const SetupRoute = lazy(() => import("./routes/setup"));
const AdminRoute = lazy(() => import("./routes/admin"));
const PrintRoute = lazy(() => import("./routes/print"));
const SuperAdminLoginRoute = lazy(() => import("./routes/superadmin-login"));
const SuperAdminPanelRoute = lazy(() => import("./routes/superadmin-panel"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const RTL_LANGS = new Set(["ar", "he", "fa", "ps", "ur", "sd", "ckb", "dv"]);

/**
 * Efectos de documento INDEPENDIENTES de la config (v2.192): idioma/RTL
 * (global, también en la landing), noindex por ruta, scroll-to-top y los
 * listeners globales de error. Antes vivían en useAppShellEffects (que ahora
 * solo corre en rutas con InviteChrome).
 */
function useDocumentBasics() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const lang = i18n.language?.split("-")[0] || "es";
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.translate = true;
  }, [i18n.language]);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (location.pathname === "/") {
      if (meta) meta.remove();
      return;
    }
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
  }, [location.pathname]);

  // Título por defecto de la landing (las rutas de invitación lo sobrescriben
  // en InviteChrome con el nombre de la pareja).
  useEffect(() => {
    if (location.pathname === "/") document.title = t("app.titleLanding");
  }, [location.pathname, t]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
}

/**
 * Shell global SIN providers de Firebase (v2.192, rama firebase-lazy):
 * los providers que dependen de Firestore (Config/Auth/Rsvp) se montan DENTRO
 * de cada ruta (providers.tsx), así `vendor-firebase` no viaja en el primer
 * pintado. El chrome público (nav/footer) se oculta cuando el admin navega
 * con sesión vía micro-store (chrome-store.ts) avisado por InviteChrome.
 */
function AppShell() {
  useDocumentBasics();
  const { t } = useTranslation();
  const { setCookiePrefsOpen } = useAppUI();
  const inviteToken = useOptionalInviteToken();
  const location = useLocation();
  const [showA11y, setShowA11y] = useState(false);
  const [legalSection, setLegalSection] = useState("");
  const [showDataRequest, setShowDataRequest] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  /** Nueva versión desplegada: se detecta comparando el meta deploy-id. */
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // Trampa de foco del menú móvil: mientras está abierto, el teclado no
  // puede tabular hacia el contenido detrás del overlay.
  const navOverlayRef = useFocusTrap<HTMLDivElement>(navOpen);
  // Escape cierra el menú móvil (patrón de diálogo accesible).
  useEscapeKey(() => setNavOpen(false), navOpen);

  // Footer público visible salvo que el admin con sesión esté navegando.
  const footerVisible = useSyncExternalStore(subscribeFooterVisible, getFooterVisible, () => true);
  const adminMode = useSyncExternalStore(
    subscribeFooterVisible,
    getAdminMode,
    () => false,
  );

  const onOnline = () => setIsOnline(true);
  const onOffline = () => setIsOnline(false);
  useEffect(() => {
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

  // Detecta una nueva versión desplegada comparando el deploy-id inyectado en
  // cada build (vite.config buildTimestamp) con el de la última visita.
  useEffect(() => {
    const deployId = document.querySelector('meta[name="deploy-id"]')?.getAttribute("content");
    if (!deployId) return;
    try {
      const last = safeGetItem("wedin_deploy_id");
      if (last && last !== deployId) setUpdateAvailable(true);
      safeSetItem("wedin_deploy_id", deployId);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  return (
    <>
      {/* Aplica las clases de animaciones desactivadas (base + invitado). */}
      <AnimationPrefsApplier />
      {/* Enlace de salto directo al contenido principal (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-link">
        {t("common.skipToContent")}
      </a>
      {import.meta.env.DEV ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 100000,
            background: "#ff9800",
            color: "#000",
            fontSize: "0.7rem",
            padding: "0.1rem 0.4rem",
            borderRadius: "0 0 0.25rem 0",
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          DEV
        </div>
      ) : null}

      {!isOnline ? (
        <div
          className="offline-banner"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: "#c9302c",
            color: "#fff",
            textAlign: "center",
            padding: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {t("common.offline")}
        </div>
      ) : null}

      {updateAvailable ? (
        <div className="update-banner" role="status">
          <span>{t("common.updateAvailable")}</span>
          <button type="button" className="update-banner__btn" onClick={() => window.location.reload()}>
            {t("common.reload")}
          </button>
        </div>
      ) : null}

      {adminMode ? (
        <button
          type="button"
          className="a11y-trigger a11y-trigger--admin"
          onClick={() => setShowA11y(true)}
          aria-label={t("common.accessibility")}
        >
          ♿
        </button>
      ) : null}

      {footerVisible ? (
        <>
          <button
            type="button"
            className="app-nav-toggle"
            onClick={() => {
              setNavOpen(!navOpen);
            }}
            aria-label={t("common.menu")}
            aria-expanded={navOpen}
            aria-controls="app-nav-overlay"
          >
            <span className={`app-nav-toggle__icon${navOpen ? " app-nav-toggle__icon--open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>

          <div
            id="app-nav-overlay"
            ref={navOverlayRef}
            className={`app-nav-overlay${navOpen ? " app-nav-overlay--open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={t("common.menu")}
          >
            <div className="app-nav-overlay__content">
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
              <button
                type="button"
                className="app-nav-overlay__link"
                onClick={() => {
                  setShowA11y(true);
                  setNavOpen(false);
                }}
                aria-label={t("common.accessibility")}
              >
                ♿ {t("common.accessibility")}
              </button>
              <button
                type="button"
                className="app-nav-overlay__link"
                onClick={() => {
                  setLegalSection("privacy");
                  setNavOpen(false);
                }}
              >
                {t("public.privacyPolicy")}
              </button>
              <button
                type="button"
                className="app-nav-overlay__link"
                onClick={() => {
                  setLegalSection("terms");
                  setNavOpen(false);
                }}
              >
                {t("public.terms")}
              </button>
              <button
                type="button"
                className="app-nav-overlay__link"
                onClick={() => {
                  setLegalSection("legal");
                  setNavOpen(false);
                }}
              >
                {t("public.legalNotice")}
              </button>
              <button
                type="button"
                className="app-nav-overlay__link"
                onClick={() => {
                  setShowDataRequest(true);
                  setNavOpen(false);
                }}
              >
                {t("public.dataRequest")}
              </button>
              <button
                type="button"
                className="app-nav-overlay__link app-nav-overlay__link--version"
                onClick={() => {
                  setShowChangelog(true);
                  setNavOpen(false);
                }}
              >
                {t("common.version", { version: APP_VERSION })}
              </button>
            </div>
          </div>

          <footer className="app-footer">
            <div className="app-footer__left">
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
              <Suspense fallback={null}>
                <GoogleTranslateToggle />
              </Suspense>
              <button
                type="button"
                className="a11y-trigger"
                onClick={() => setShowA11y(true)}
                aria-label={t("common.accessibility")}
              >
                ♿
              </button>
            </div>
            <div className="app-footer__right">
              <button type="button" onClick={() => setLegalSection("privacy")} className="app-footer__link">
                {t("public.privacyPolicy")}
              </button>
              <span className="app-footer__sep">·</span>
              <button type="button" onClick={() => setLegalSection("terms")} className="app-footer__link">
                {t("public.terms")}
              </button>
              <span className="app-footer__sep">·</span>
              <button type="button" onClick={() => setLegalSection("legal")} className="app-footer__link">
                {t("public.legalNotice")}
              </button>
              <span className="app-footer__sep">·</span>
              <button type="button" onClick={() => setShowDataRequest(true)} className="app-footer__link">
                {t("public.dataRequest")}
              </button>
              <span className="app-footer__sep">·</span>
              <button type="button" onClick={() => setCookiePrefsOpen(true)} className="app-footer__link">
                {t("public.cookiePreferences")}
              </button>
              <span className="app-footer__sep">·</span>
              <button type="button" onClick={() => setShowChangelog(true)} className="app-footer__link">
                {t("common.version", { version: APP_VERSION })}
              </button>
            </div>
          </footer>
        </>
      ) : null}

      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="page-loading" />}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <LandingRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path="/:inviteToken"
              element={
                <ErrorBoundary key={location.pathname}>
                  <PublicInvitationRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path="/:inviteToken/setup"
              element={
                <ErrorBoundary key={location.pathname}>
                  <SetupRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path="/:inviteToken/admin"
              element={
                <ErrorBoundary key={location.pathname}>
                  <AdminRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path={SUPERADMIN_ROUTE}
              element={
                <ErrorBoundary>
                  <SuperAdminLoginRoute />
                </ErrorBoundary>
              }
            />
            <Route
              path="/:inviteToken/print"
              element={
                <ErrorBoundary key={location.pathname}>
                  <PrintRoute />
                </ErrorBoundary>
              }
            />
            {SUPERADMIN_DASHBOARD && (
              <Route
                path={SUPERADMIN_DASHBOARD}
                element={
                  <ErrorBoundary>
                    <SuperAdminPanelRoute />
                  </ErrorBoundary>
                }
              />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Fireflies solo en la landing y en la invitación pública: su
          animación continua no debe ejecutarse en rutas de trabajo. */}
      {location.pathname === "/" || (inviteToken && location.pathname === `/${inviteToken}`) ? (
        <Suspense fallback={null}>
          <Fireflies />
        </Suspense>
      ) : null}
      <AccessibilityPanel open={showA11y} onClose={() => setShowA11y(false)} />

      {/* Modales bajo demanda: su chunk se descarga solo al abrirlos. */}
      <Suspense fallback={null}>
        <CookieConsent />
        {legalSection ? <LegalModal section={legalSection} onClose={() => setLegalSection("")} /> : null}
        {showDataRequest ? (
          <DataRequestModal inviteToken={inviteToken} onClose={() => setShowDataRequest(false)} />
        ) : null}
        {showChangelog ? <ChangelogModal onClose={() => setShowChangelog(false)} /> : null}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      {/* UIProvider separado del árbol de Firebase (v2.192): el shell lo usa
          (nav, footer, modales) y las rutas solo montan Config/Auth/Rsvp. */}
      <UIProvider>
        <ToastProvider>
          <AnimationsProvider>
            <AppShell />
          </AnimationsProvider>
        </ToastProvider>
      </UIProvider>
    </ConfirmProvider>
  );
}
