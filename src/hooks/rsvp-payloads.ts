import type { FieldValue } from "firebase/firestore";

export interface RsvpFormLike {
  guestName: string;
  attendance: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  companionBirthDates: string[];
  companionTransportChoices: string[];
  companionTransportModes: string[];
  companionTransportTimes: string[];
  companionTransportPlaces: string[];
  menuSelection: string;
  allergiesOther: string;
  healthConsent: boolean;
  birthDate: string;
  transportChoice: string;
  transportMode: string;
  transportTime: string;
  transportPlace: string;
}

export function buildMainGuestData(input: {
  data: RsvpFormLike;
  isAttending: boolean;
  companionCount: number;
  single: string;
  encryptedDietaryInfo: string;
  age: number | null;
  inviteToken: string;
  nowTimestamp: FieldValue;
}): Record<string, unknown> {
  const { data, isAttending, companionCount, single, encryptedDietaryInfo, age, inviteToken, nowTimestamp } = input;
  const mainGuestData: Record<string, unknown> = {
    rsvpType: "main",
    guestName: single,
    attendance: isAttending ? "yes" : "no",
    companionCount,
    companionNames: data.companionNames.slice(0, companionCount),
    companionMenus: data.companionMenus.slice(0, companionCount),
    companionAllergies: data.companionAllergies.slice(0, companionCount).map((a) => a.join(" | ")),
    companionAllergiesOther: (data.companionAllergiesOther || []).slice(0, companionCount),
    allergiesOther: data.allergiesOther || "",
    dietaryInfo: encryptedDietaryInfo,
    inviteToken,
    submittedAt: nowTimestamp,
    privacyConsent: true,
    privacyConsentAt: nowTimestamp,
  };
  if (data.menuSelection) mainGuestData.mealChoice = data.menuSelection;
  if (data.birthDate) mainGuestData.birthDate = data.birthDate;
  if (age !== null && age < 14) mainGuestData.parentalConsent = true;
  if (data.healthConsent) {
    mainGuestData.healthConsent = true;
    mainGuestData.healthConsentAt = nowTimestamp;
  }
  if (isAttending && data.transportChoice) {
    mainGuestData.transportChoice = String(data.transportChoice).slice(0, 20);
  }
  if (isAttending && data.transportMode) {
    mainGuestData.transportMode = String(data.transportMode).slice(0, 10);
  }
  if (isAttending && data.transportTime) {
    mainGuestData.transportTime = String(data.transportTime).slice(0, 5);
  }
  if (isAttending && data.transportPlace) {
    mainGuestData.transportPlace = String(data.transportPlace).slice(0, 120);
  }
  mainGuestData.companionTransportChoices = (data.companionTransportChoices || []).slice(0, companionCount);
  mainGuestData.companionTransportModes = (data.companionTransportModes || []).slice(0, companionCount);
  mainGuestData.companionTransportTimes = (data.companionTransportTimes || []).slice(0, companionCount);
  mainGuestData.companionTransportPlaces = (data.companionTransportPlaces || []).slice(0, companionCount);
  return mainGuestData;
}

export function buildCompanionData(input: {
  data: RsvpFormLike;
  i: number;
  single: string;
  mainGuestId: string;
  encCompDietary: string;
  compBirthDate: string;
  compAge: number | null;
  nowTimestamp: FieldValue;
  inviteToken: string;
}): Record<string, unknown> {
  const { data, i, single, mainGuestId, encCompDietary, compBirthDate, compAge, nowTimestamp, inviteToken } = input;
  const companionData: Record<string, unknown> = {
    rsvpType: "companion",
    guestName: (data.companionNames[i] || "").slice(0, 120),
    attendance: "yes",
    dietaryInfo: encCompDietary,
    inviteToken,
    submittedAt: nowTimestamp,
    privacyConsent: true,
    mainGuestDocId: mainGuestId,
    mainGuestName: single,
  };
  if (compBirthDate) companionData.birthDate = compBirthDate;
  if (compAge !== null && compAge < 14) companionData.parentalConsent = true;
  if (data.companionMenus[i]) companionData.mealChoice = data.companionMenus[i];
  if (data.companionAllergiesOther?.[i]) {
    companionData.allergiesOther = String(data.companionAllergiesOther[i]).slice(0, 200);
  }
  if (data.companionTransportChoices?.[i]) {
    companionData.transportChoice = String(data.companionTransportChoices[i]).slice(0, 20);
  }
  if (data.companionTransportModes?.[i]) {
    companionData.transportMode = String(data.companionTransportModes[i]).slice(0, 10);
  }
  if (data.companionTransportTimes?.[i]) {
    companionData.transportTime = String(data.companionTransportTimes[i]).slice(0, 5);
  }
  if (data.companionTransportPlaces?.[i]) {
    companionData.transportPlace = String(data.companionTransportPlaces[i]).slice(0, 120);
  }
  const compAllergies = data.companionAllergies[i] || [];
  const hasCompDietary = compAllergies.length > 0 || (data.companionAllergiesOther[i] || "").trim();
  if (hasCompDietary) {
    companionData.healthConsent = true;
    companionData.healthConsentAt = nowTimestamp;
  }
  return companionData;
}
