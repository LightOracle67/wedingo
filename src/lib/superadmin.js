const BASE = import.meta.env.VITE_SUPERADMIN_ROUTE || "/_/console";

export const SUPERADMIN_ROUTE = BASE;
export const SUPERADMIN_DASHBOARD = `${BASE}/dashboard`;

export const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "";

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
