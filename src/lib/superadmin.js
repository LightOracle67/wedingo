const BASE = import.meta.env.VITE_SUPERADMIN_ROUTE || "";

export const SUPERADMIN_ROUTE = BASE;
export const SUPERADMIN_DASHBOARD = BASE ? `${BASE}/dashboard` : "";

export const SUPERADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim() || "";

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
