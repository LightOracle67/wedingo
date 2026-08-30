/**
 * providers.tsx (rama firebase-lazy, v2.192 en preparación)
 * ─────────────────────────────────────────────────────────────
 * Composición de providers ACOTADA por ruta. Objetivo: el SHELL global
 * (AppShell) ya no importa Firebase de forma estática — el árbol que depende
 * de Firestore (Config/Auth/Rsvp/AppMerger) vive DENTRO de cada ruta que lo
 * necesita, así que `vendor-firebase` deja de viajar en el primer pintado
 * (290 KB gz → ~120 KB gz de arranque; las rutas lo cargan en paralelo al
 * navegar).
 *
 * - AppProviders: rutas de invitación/setup/admin/print/landing.
 * - SuperAdminProviders: consola superadmin (Firebase Auth, sin Firestore).
 * - InviteChrome: piezas del shell que necesitan config/auth
 *   (barra admin, música, título/tema, visibilidad del footer).
 */

import { lazy, memo, Suspense, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useConfig, useAuth, useFormField } from "./contexts";
import { useAppShellEffects } from "./hooks/useAppShellEffects";
import { AppProvidersTree } from "./contexts/AppContext";
import { SuperAdminProvider } from "./contexts/SuperAdminContext";
import { setAdminMode, setFooterVisible } from "./lib/chrome-store";

/** Rutas que necesitan configuración/auth/RSVP (incluido el AppMerger). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppProvidersTree>{children}</AppProvidersTree>;
}

/** Superadmin: solo necesita Firebase Auth (contexto propio). */
export function SuperAdminProviders({ children }: { children: React.ReactNode }) {
  return <SuperAdminProvider>{children}</SuperAdminProvider>;
}

/** Música bajo demanda (chunk propio). */
const MusicPlayerLazy = lazy(() => import("./components/MusicPlayer"));

/**
 * Piezas del shell que dependen de config/auth (solo en rutas con providers).
 * Renderiza: efectos de documento (título/tema), barra del admin, reproductor
 * de música y el aviso al shell de ocultar/restaurar el footer público.
 */
export const InviteChrome = memo(function InviteChrome() {
  const { t } = useTranslation();
  const location = useLocation();
  const { config, inviteToken } = useConfig();
  const setupTheme = useFormField("theme");
  const { isAdminTokenLoggedIn, tokenLoginUsername } = useAuth();

  const isEditingRoute =
    location.pathname.endsWith("/setup") || (location.pathname.endsWith("/admin") && isAdminTokenLoggedIn);

  // Documento: idioma/RTL, título de pestaña, tema del wedding, noindex.
  useAppShellEffects(config, { theme: setupTheme }, inviteToken, isEditingRoute);

  // El footer público se oculta y se activa el modo admin cuando el invitado
  // es, en realidad, el admin con sesión (antes el shell leía useAuth();
  // ahora avisa por micro-store useSyncExternalStore).
  useEffect(() => {
    const hide = isAdminTokenLoggedIn && !isEditingRoute;
    setFooterVisible(!hide);
    setAdminMode(isAdminTokenLoggedIn);
    return () => {
      setFooterVisible(true);
      setAdminMode(false);
    };
  }, [isAdminTokenLoggedIn, isEditingRoute]);

  const showAdminBar =
    isAdminTokenLoggedIn &&
    Boolean(inviteToken) &&
    !location.pathname.endsWith("/setup") &&
    !location.pathname.endsWith("/print");

  return (
    <>
      {showAdminBar ? (
        <nav className="admin-bar" aria-label={t("common.adminBar.ariaLabel")}>
          <div className="admin-bar__inner">
            <span className="admin-bar__title">
              {tokenLoginUsername || config.adminUsername || t("common.adminBar.fallback")}
            </span>
            <div className="admin-bar__links">
              <Link
                className={`admin-bar__link ${location.pathname === `/${inviteToken}` ? "admin-bar__link--active" : ""}`}
                to={`/${inviteToken}`}
                aria-current={location.pathname === `/${inviteToken}` ? "page" : undefined}
              >
                {t("admin.tabs.invitation")}
              </Link>
              <Link
                className={`admin-bar__link ${location.pathname === `/${inviteToken}/admin` ? "admin-bar__link--active" : ""}`}
                to={`/${inviteToken}/admin`}
                aria-current={location.pathname === `/${inviteToken}/admin` ? "page" : undefined}
              >
                {t("admin.tabs.panel")}
              </Link>
            </div>
          </div>
        </nav>
      ) : null}

      {inviteToken && location.pathname === `/${inviteToken}` && config.musicFile ? (
        <Suspense fallback={null}>
          <MusicPlayerLazy musicUrl={config.musicFile} />
        </Suspense>
      ) : null}
    </>
  );
});
