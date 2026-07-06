import { STORY_SECTION_ORDER, THEME_VALUES } from "./constants";

const s = (v) => (typeof v === "string" ? v.trim() : "");

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
  darkMode: s(value?.darkMode) === "true" ? "true" : "false",
  backgroundImage: s(value?.backgroundImage),
  backgroundImageLabel: s(value?.backgroundImageLabel),
  backgroundImageSource: s(value?.backgroundImageSource),
  backgroundImageStorage: s(value?.backgroundImageStorage),
  couplePhoto: s(value?.couplePhoto),
  couplePhotoStorage: s(value?.couplePhotoStorage),
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
  galleryImages: s(value?.galleryImages),
  kidsPolicy: s(value?.kidsPolicy),
});
