export { normalizeConfig } from "./normalize-config";
export { generateInviteToken } from "./token-utils";

export function escHtml(s: unknown) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
