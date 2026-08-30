import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { APP_VERSION, THEME_PREVIEW_COLORS, FONT_FAMILY, COLOR_FIELDS } from "../lib/constants";
import { logError } from "../lib/error-utils";

const RTL_LANGS = new Set(["ar", "he", "fa", "ps", "ur", "sd", "ckb", "dv"]);

/**
 * useAppShellEffects — Agrupa los efectos de documento del shell de la app:
 * idioma/RTL, título de pestaña, tema del wedding, noindex dinámico, fondo,
 * registro global de errores y scroll-to-top. Antes vivían todos en App.tsx
 * (componente de 320 líneas).
 */
export function useAppShellEffects(
  config: {
    firstName?: string;
    secondName?: string;
    theme?: string;
    fontHeading?: string;
    fontBody?: string;
    colorAccent?: string;
    colorTitle?: string;
    colorCopy?: string;
    colorBackground?: string;
  },
  formData: { theme?: string },
  inviteToken: string | undefined,
  isEditingRoute: boolean,
) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Idioma + dirección (RTL) del documento.
  useEffect(() => {
    const lang = i18n.language?.split("-")[0] || "es";
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.translate = true;
  }, [i18n.language]);

  // noindex dinámico: solo la landing es indexable. Las invitaciones son
  // secretas y /admin, /setup, /print y el superadmin no deben indexarse
  // (defensa en profundidad junto a robots.txt).
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

  // Título de pestaña por ruta. v2.188: solo se escribe cuando cambia
  // realmente (antes, en /setup y /admin, cada tecla del editor re-escribía
  // el mismo título porque las deps incluyen firstName/secondName).
  useEffect(() => {
    const path = location.pathname;
    let next: string;
    if (path === "/") next = t("app.titleLanding");
    else if (path.includes("/admin")) next = t("app.titleAdmin");
    else if (path.includes("/setup")) next = t("app.titleSetup");
    else if (inviteToken)
      next = `${config.firstName || t("app.titleInvitation")} & ${config.secondName || ""} — Wedingo`;
    else next = t("app.titleLanding");
    if (document.title !== next) document.title = next;
  }, [location.pathname, inviteToken, config.firstName, config.secondName, t]);

  // Tema del wedding + theme-color de la barra del navegador.
  useEffect(() => {
    const activeTheme = isEditingRoute ? "golden" : formData.theme || config.theme;
    document.documentElement.dataset.weddingTheme = activeTheme || "golden";
    const preview = THEME_PREVIEW_COLORS[activeTheme || "golden"];
    const color = preview?.bg || "#2a2418";
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, [formData.theme, config.theme, isEditingRoute]);

  // Personalización de tipografía y colores del usuario: sobrescribe las
  // variables CSS del tema. Los valores llegan ya sanitizados (lista blanca
  // de fuentes y colores hex) por normalize-config; en ningún caso se inyecta
  // CSS arbitrario. Un valor vacío = se deja la del tema. En el editor
  // (isEditingRoute) el tema es "golden" pero la personalización del invitado
  // NO debe aplicarse (es una vista de configuración).
  useEffect(() => {
    if (isEditingRoute) return;
    const root = document.documentElement;
    const { fontHeading, fontBody, colorAccent, colorTitle, colorCopy, colorBackground } = config;
    if (fontHeading) {
      root.style.setProperty("--font-heading", FONT_FAMILY[fontHeading] || `"${fontHeading}", serif`);
    }
    if (fontBody) {
      root.style.setProperty("--font-body", FONT_FAMILY[fontBody] || `"${fontBody}", serif`);
    }
    if (colorAccent) root.style.setProperty("--invite-core-color", colorAccent);
    if (colorTitle) root.style.setProperty("--invite-title-color", colorTitle);
    if (colorCopy) root.style.setProperty("--invite-copy-color", colorCopy);
    if (colorBackground) root.style.setProperty("--page-bg", colorBackground);
    // No se limpian las variables al retirar la personalización: cada tema
    // define las suyas en :root[data-wedding-theme] y un dataset cambio
    // recalcula las del tema.
    return () => {
      if (fontHeading) root.style.removeProperty("--font-heading");
      if (fontBody) root.style.removeProperty("--font-body");
      for (const { cssVar } of COLOR_FIELDS) root.style.removeProperty(cssVar);
    };
  }, [
    config.fontHeading,
    config.fontBody,
    config.colorAccent,
    config.colorTitle,
    config.colorCopy,
    config.colorBackground,
    isEditingRoute,
  ]);

  // Fondo por defecto al arrancar.
  useEffect(() => {
    document.documentElement.style.setProperty("--wedding-background-image", "none");
  }, []);

  // Registro global de errores (Sentry-gated).
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

  // Scroll-to-top al cambiar de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return APP_VERSION;
}
