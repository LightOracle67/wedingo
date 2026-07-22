const INVITE_KEY_MAP = {
  fn: "firstName", sn: "secondName", im: "inviteMessage",
  wp: "weddingPlace", la: "weddingLatitude", lo: "weddingLongitude",
  dd: "weddingDay", mm: "weddingMonth", yy: "weddingYear",
  hh: "weddingHour", mi: "weddingMinute",
  sc: "weddingSchedule", dc: "weddingDressCode",
  th: "theme", so: "sectionOrder", hs: "hiddenSections",
  st: "storyText", gi: "giftsInfo",
  ai: "accommodationInfo", kp: "kidsPolicy",
};

const INVITE_KEY_REV = Object.fromEntries(
  Object.entries(INVITE_KEY_MAP).map(([k, v]) => [v, k]),
);

function toBase64Url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const padded = str.length % 4 === 3 ? str + "=" : str.length % 4 === 2 ? str + "==" : str;
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodeInviteConfig(config) {
  const { backgroundImageLabel: _bgl, backgroundImageSource: _bgs, adminUsername: _au, ...rest } = config;
  const compact = {};
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

export function decodeInviteConfig(hash) {
  const raw = fromBase64Url(hash);
  const compact = JSON.parse(raw);
  const expanded = {};
  for (const [key, val] of Object.entries(compact)) {
    const long = INVITE_KEY_MAP[key] || key;
    expanded[long] = val;
  }
  return expanded;
}
