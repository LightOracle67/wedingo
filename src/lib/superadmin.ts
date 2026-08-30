import i18next from "i18next";

// Fallback a /_/console (NUNCA a ""): con una ruta vacía, el guard de
// SuperAdminContext (pathname.startsWith(SUPERADMIN_ROUTE)) evaluaría
// startsWith("") === true y TODO visitante público descargaría firebase/auth.
const BASE = import.meta.env.VITE_SUPERADMIN_ROUTE || "/_/console";

export const SUPERADMIN_ROUTE = BASE;
export const SUPERADMIN_DASHBOARD = BASE ? `${BASE}/dashboard` : "";

export const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "adriancl2001@gmail.com";

export function formatDate(iso: string, ..._args: string[]) {
  try {
    // El idioma de la UI (i18next) manda sobre el del navegador. El locale se
    // PINNEA a es-ES/en-US (v2.186): `toLocaleString(i18n.language)` podía
    // ejecutarse con la carrera del idioma asíncrono (formato inestable).
    const locale = (i18next.language || "").toLowerCase().startsWith("en") ? "en-US" : "es-ES";
    return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
