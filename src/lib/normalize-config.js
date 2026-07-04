import { STORY_SECTION_ORDER, THEME_VALUES } from "./constants";

export const normalizeConfig = (value) => ({
  adminUsername:
    typeof value?.adminUsername === "string" ? value.adminUsername.trim().toLowerCase() : "",
  firstName: typeof value?.firstName === "string" ? value.firstName.trim() : "",
  secondName: typeof value?.secondName === "string" ? value.secondName.trim() : "",
  inviteMessage: typeof value?.inviteMessage === "string" ? value.inviteMessage.trim() : "",
  weddingPlace: typeof value?.weddingPlace === "string" ? value.weddingPlace.trim() : "",
  weddingLatitude: typeof value?.weddingLatitude === "string" ? value.weddingLatitude.trim() : "",
  weddingLongitude: typeof value?.weddingLongitude === "string" ? value.weddingLongitude.trim() : "",
  weddingDay: typeof value?.weddingDay === "string" ? value.weddingDay.trim() : "",
  weddingMonth: typeof value?.weddingMonth === "string" ? value.weddingMonth.trim() : "",
  weddingYear: typeof value?.weddingYear === "string" ? value.weddingYear.trim() : "",
  weddingHour: typeof value?.weddingHour === "string" ? value.weddingHour.trim() : "",
  weddingMinute: typeof value?.weddingMinute === "string" ? value.weddingMinute.trim() : "",
  weddingSchedule: typeof value?.weddingSchedule === "string" ? value.weddingSchedule.trim() : "",
  weddingDressCode: typeof value?.weddingDressCode === "string" ? value.weddingDressCode.trim() : "",
  theme:
    typeof value?.theme === "string" && THEME_VALUES.has(value.theme.trim())
      ? value.theme.trim()
      : "golden",
  backgroundImage: typeof value?.backgroundImage === "string" ? value.backgroundImage.trim() : "",
  backgroundImageLabel:
    typeof value?.backgroundImageLabel === "string" ? value.backgroundImageLabel.trim() : "",
  backgroundImageSource:
    typeof value?.backgroundImageSource === "string" ? value.backgroundImageSource.trim() : "",
  sectionOrder:
    typeof value?.sectionOrder === "string" ? value.sectionOrder.trim() : STORY_SECTION_ORDER.join(","),
  hiddenSections:
    typeof value?.hiddenSections === "string" ? value.hiddenSections.trim() : "",
  storyText:
    typeof value?.storyText === "string" ? value.storyText.trim() : "",
  giftsInfo:
    typeof value?.giftsInfo === "string" ? value.giftsInfo.trim() : "",
  accommodationInfo:
    typeof value?.accommodationInfo === "string" ? value.accommodationInfo.trim() : "",
  kidsPolicy:
    typeof value?.kidsPolicy === "string" ? value.kidsPolicy.trim() : "",
});
