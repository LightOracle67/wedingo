export { normalizeConfig } from "./normalize-config";
export { geocodeLocation, parseCoordinate, getValidCoordinates, resolveLocationTarget, buildGoogleMapsUrl, buildAppleMapsUrl } from "./geo-utils";
export { buildGoogleCalendarUrl } from "./calendar-utils";
export { generateSetupToken, normalizeTokenValue, generateInviteToken } from "./token-utils";
export { compressImage } from "./image-utils";
export { buildOpenFreeMapPreviewUrl } from "./map-utils";
export { encodeInviteConfig, decodeInviteConfig } from "./invite-config-codec";

export function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
