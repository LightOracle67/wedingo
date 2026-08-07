import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { APP_VERSION, THEME_PREVIEW_COLORS } from "../lib/constants";
import { logError } from "../lib/error-utils";

const RTL_LANGS = new Set(["ar", "he", "fa", "ps", "ur", "sd", "ckb", "dv"]);

/**
 * useAppShellEffects — Agrupa los efectos de documento del shell de la app:
 * idioma/RTL, título de pestaña, tema del wedding, noindex dinámico, fondo,
 * registro global de errores y scroll-to-top. Antes vivían todos en App.tsx
 * (componente de 320 líneas).
 */
export function useAppShellEffects(
  config: { firstName?: string; secondName?: string; theme?: string },
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

  // Título de pestaña por ruta.
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") document.title = t("app.titleLanding");
    else if (path.includes("/admin")) document.title = t("app.titleAdmin");
    else if (path.includes("/setup")) document.title = t("app.titleSetup");
    else if (inviteToken)
      document.title = `${config.firstName || t("app.titleInvitation")} & ${config.secondName || ""} — Wedingo`;
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
