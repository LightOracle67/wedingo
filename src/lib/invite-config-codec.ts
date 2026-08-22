const INVITE_KEY_MAP = {
  fn: "firstName",
  sn: "secondName",
  im: "inviteMessage",
  wp: "weddingPlace",
  su: "weddingSiteURL",
  mv: "weddingMapView",
  ms: "weddingMapStatic",
  dmm: "detailsMapMode",
  tmm: "transportMapMode",
  amm: "accommodationMapMode",
  te: "transportEnabled",
  td: "transportDepartures",
  dd: "weddingDay",
  mm: "weddingMonth",
  yy: "weddingYear",
  hh: "weddingHour",
  mi: "weddingMinute",
  sc: "weddingScheduleEvents",
  dc: "weddingDressCode",
  dx: "weddingDressCodeCustom",
  th: "theme",
  so: "sectionOrder",
  hs: "hiddenSections",
  st: "storyText",
  gi: "giftsInfo",
  ai: "accommodationInfo",
  am: "accommodationURL",
  kp: "kidsPolicy",
};

const INVITE_KEY_REV: Record<string, string> = Object.fromEntries(
  Object.entries(INVITE_KEY_MAP).map(([k, v]) => [v, k]),
);

function toBase64Url(str: string) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  const padded = str.length % 4 === 3 ? str + "=" : str.length % 4 === 2 ? str + "==" : str;
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

const INTERNAL_FIELDS = new Set<string>([
  "adminUsername",
  "backgroundImageLabel",
  "backgroundImageSource",
  "activeSession",
  "sessionExpiresAt",
  "setupTokenHash",
  "_visits",
  "_activeSetupToken",
  "legacyToken",
  "verified",
  "adminNotes",
  "manualExpiry",
  "status",
  "tags",
  "rsvpCapacity",
  "rsvpSignatureEnabled",
  "createdAt",
  "privacyConsent",
  "privacyConsentAt",
  "privacyPolicyVersion",
  "musicFile",
]);

export function encodeInviteConfig(config: Record<string, unknown>) {
  const rest: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(config)) {
    if (!INTERNAL_FIELDS.has(key)) {
      rest[key] = val;
    }
  }
  const compact: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(rest)) {
    const short = INVITE_KEY_REV[key];
    compact[short || key] = val;
  }
  for (const k of Object.keys(compact)) {
    if (compact[k] === "" || compact[k] === null || compact[k] === undefined) {
      delete compact[k];
    }
  }
  return toBase64Url(JSON.stringify(compact));
}

export function decodeInviteConfig(hash: string) {
  const raw = fromBase64Url(hash);
  const compact: Record<string, unknown> = JSON.parse(raw);
  const expanded: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(compact)) {
    const long = (INVITE_KEY_MAP as Record<string, string>)[key] || key;
    expanded[long] = val;
  }
  return expanded;
}
