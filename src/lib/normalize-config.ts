import { STORY_SECTION_ORDER, THEME_VALUES } from "./constants";

const s = (v) => {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return String(v[0] ?? "");
  return "";
};

export const normalizeConfig = (value) => ({
  adminUsername: s(value?.adminUsername).toLowerCase(),
  firstName: s(value?.firstName),
  secondName: s(value?.secondName),
  inviteMessage: s(value?.inviteMessage),
  weddingPlace: s(value?.weddingPlace),
  weddingLatitude: s(value?.weddingLatitude),
  weddingLongitude: s(value?.weddingLongitude),
  weddingDay: s(value?.weddingDay),
  weddingMonth: s(value?.weddingMonth),
  weddingYear: s(value?.weddingYear),
  weddingHour: s(value?.weddingHour),
  weddingMinute: s(value?.weddingMinute),
  weddingSchedule: s(value?.weddingSchedule),
  weddingDressCode: s(value?.weddingDressCode),
  theme:
    typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim())
      ? value.theme.trim()
      : "golden",
  couplePhoto: s(value?.couplePhoto),
  sectionOrder:
    typeof value?.sectionOrder === "string" ? value.sectionOrder.trim() : STORY_SECTION_ORDER.join(","),
  hiddenSections: s(value?.hiddenSections),
  storyText: s(value?.storyText),
  giftsInfo: s(value?.giftsInfo),
  bankInfo: s(value?.bankInfo),
  accommodationInfo: s(value?.accommodationInfo),
  transportInfo: s(value?.transportInfo),
  godparent1: s(value?.godparent1),
  godparent2: s(value?.godparent2),
  musicUrl: s(value?.musicUrl),
  musicFile: s(value?.musicFile),
  kidsPolicy: s(value?.kidsPolicy),
  menuEnabled: s(value?.menuEnabled) === "true" ? "true" : "false",
  menuTexto: s(value?.menuTexto),
  privacyPolicyVersion: s(value?.privacyPolicyVersion),
  menuCarne: s(value?.menuCarne),
  menuPescado: s(value?.menuPescado),
  menuVegano: s(value?.menuVegano),
  menuPostre: s(value?.menuPostre),
});
