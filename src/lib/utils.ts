export { normalizeConfig } from "./normalize-config";
export { isValidGoogleMapsUrl, convertToEmbedUrl, extractPlaceNameFromUrl } from "./geo-utils";
export { buildGoogleCalendarUrl } from "./calendar-utils";
export { generateSetupToken, normalizeTokenValue, generateInviteToken } from "./token-utils";
export { compressImage } from "./image-utils";
export { encodeInviteConfig, decodeInviteConfig } from "./invite-config-codec";

export function escHtml(s: unknown) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
