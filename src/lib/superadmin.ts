import i18next from "i18next";

const BASE = import.meta.env.VITE_SUPERADMIN_ROUTE || "";

export const SUPERADMIN_ROUTE = BASE;
export const SUPERADMIN_DASHBOARD = BASE ? `${BASE}/dashboard` : "";

export const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "adriancl2001@gmail.com";

export function formatDate(iso: string, ..._args: string[]) {
  try {
    // El idioma de la UI (i18next) manda sobre el del navegador.
    return new Date(iso).toLocaleString(i18next.language || "es", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
