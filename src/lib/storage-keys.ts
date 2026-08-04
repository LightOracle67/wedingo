/**
 * Claves de storage (localStorage / sessionStorage) centralizadas.
 * Un único punto de verdad para evitar typos y facilitar auditorías.
 */
export const STORAGE_KEYS = {
  session: "wedin_session",
  cookieConsent: "wedin_cookie_consent",
  cookiePrefs: "wedin_cookie_prefs",
  inviteToken: "wedin_invite_token",
  a11y: "wedin_a11y",
  inviteCacheLegacy: "wedin_invite_cache",
  audio: (token: string) => `wedin_audio_${token}`,
  setupToken: (token: string) => `wedin_setup_token_${token}`,
  inviteCache: (token: string) => `wedin_invite_cache_${token}`,
  rsvpCache: (token: string) => `wedin_rsvp_cache_${token}`,
} as const;

export const INVITE_CACHE_PREFIX = "wedin_invite_cache_";
export const AUDIO_PREFIX = "wedin_audio_";
