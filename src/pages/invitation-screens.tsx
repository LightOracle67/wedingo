/**
 * invitation-screens.tsx (v2.190)
 * ─────────────────────────────────────────────────────────────
 * Pantallas PRESENTACIONALES de la invitación pública, extraídas de
 * PublicInvitation.tsx en la ronda de modularización (misma línea que
 * v2.177–v2.184): cada una recibe únicamente el traductor y los datos que
 * necesita, sin estado ni efectos. Son componentes puramente visuales y
 * testables de forma aislada.
 *
 * @module invitation-screens
 */

import { memo } from "react";
import type { TFunction } from "i18next";

interface ScreenProps {
  t: TFunction;
}

/** Fondo común de las pantallas de estado (load/maintenance/error). */
const screenSectionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "0 1rem",
};

/** Estado de CARGA de la invitación (espera al config de Firestore). */
export const InvitationLoadingScreen = memo(function InvitationLoadingScreen({ t }: ScreenProps) {
  return (
    <div className="app-scene">
      <section
        className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
        style={screenSectionStyle}
      >
        <div
          className="w-full max-w-md text-center story-panel story-panel--hero"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/60 leading-relaxed">
            {t("public.loadingInvitation")}
          </p>
        </div>
      </section>
    </div>
  );
});

/** Kill-switch global de la plataforma (mantenimiento del superadmin). */
export const MaintenanceScreen = memo(function MaintenanceScreen({ t }: ScreenProps) {
  return (
    <div className="app-scene">
      <section
        className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
        style={screenSectionStyle}
      >
        <div className="w-full max-w-md text-center story-panel story-panel--hero">
          <p className="story-eyebrow">{t("public.maintenanceEyebrow")}</p>
          <h1 className="story-title">{t("public.maintenanceTitle")}</h1>
          <p className="story-copy">{t("public.maintenanceText")}</p>
        </div>
      </section>
    </div>
  );
});

/**
 * Error de carga de la invitación. Un enlace corrupto (invalid link) no se
 * arregla recargando: se ofrece volver al inicio (evita el bucle infinito
 * de "Reintentar" en un hash inválido).
 */
export const InvitationLoadErrorScreen = memo(function InvitationLoadErrorScreen({
  t,
  error,
  isInvalidLink,
}: {
  t: TFunction;
  error: string;
  isInvalidLink: boolean;
}) {
  return (
    <div className="app-scene">
      <section
        className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
        style={screenSectionStyle}
      >
        <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
          <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
            {t("public.emptyTitle")}
          </h1>
          <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
            {t("setup.errorTitle")}
          </p>
          <div className="my-6 story-divider" />
          <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{error}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <button
              className="text-sm setup-button"
              type="button"
              onClick={() => {
                if (isInvalidLink) {
                  window.location.assign("/");
                } else {
                  window.location.reload();
                }
              }}
            >
              {isInvalidLink ? t("common.goHome") : t("common.retry")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
});

/** Invitación bloqueada por el superadmin (F3-6). */
export const InvitationBlockedScreen = memo(function InvitationBlockedScreen({ t }: ScreenProps) {
  return (
    <section
      className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
      style={screenSectionStyle}
    >
      <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
        <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
          {t("public.blockedTitle")}
        </h1>
        <div className="my-6 story-divider" />
        <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.blockedText")}</p>
      </div>
    </section>
  );
});

/** Token no encontrado (URL con un token que no existe). */
export const InvitationNotFoundScreen = memo(function InvitationNotFoundScreen({ t }: ScreenProps) {
  return (
    <section
      className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
      style={screenSectionStyle}
    >
      <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
        <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
          {t("public.emptyTitle")}
        </h1>
        <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
          {t("public.notFoundTitle")}
        </p>
        <div className="my-6 story-divider" />
        <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.notFoundText")}</p>
      </div>
    </section>
  );
});

/** Invitación vacía (el organizador aún no la configuró). */
export const InvitationEmptyScreen = memo(function InvitationEmptyScreen({ t }: ScreenProps) {
  return (
    <section
      className="flex items-center justify-center min-h-screen px-4 story-section story-section--is-active landing-bg"
      style={screenSectionStyle}
    >
      <div className="w-full max-w-md text-center story-panel story-panel--hero" aria-live="assertive">
        <h1 className="font-serif text-[clamp(2.5rem,8vw,4.5rem)] text-boda-texto leading-tight hero-title invite-title">
          {t("public.emptyTitle")}
        </h1>
        <p className="mt-4 font-serif text-[clamp(1rem,3vw,1.35rem)] text-boda-texto/80 leading-relaxed">
          {t("public.emptyText")}
        </p>
        <div className="my-6 story-divider" />
        <p className="text-[0.95rem] text-boda-texto/60 leading-relaxed">{t("public.emptyDescription")}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <a href="/" className="text-sm setup-button">
            {t("public.createLink")}
          </a>
        </div>
      </div>
    </section>
  );
});
