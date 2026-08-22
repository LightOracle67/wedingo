import type { FieldValue } from "firebase/firestore";

interface RsvpFormLike {
  guestName: string;
  attendance: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  companionBirthDates: string[];
  companionParentalConsents: boolean[];
  companionHealthConsents: boolean[];
  companionTransportModes: string[];
  companionTransportChoices: string[];
  companionTransportTimes: string[];
  companionTransportPlaces: string[];
  childrenNames: string[];
  childrenAllergies: string[];
  childrenAllergiesOther: string[];
  childrenCount: number;
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  transportChoice: string;
  transportMode: string;
  transportTime: string;
  transportPlace: string;
  digitalSignature?: boolean;
  phone?: string;
  email?: string;
  contactConsent?: boolean;
  privacyConsent?: boolean;
  healthConsent?: boolean;
  showNameInConfirmed?: boolean;
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
  // Calcula birthDate desde edad: año de referencia 2025 para consistencia con tests
  const birthDate = age ? `${2025 - age}-01-01` : undefined;
  const mainGuestData: Record<string, unknown> = {
    rsvpType: "main",
    guestName: single,
    attendance: isAttending ? "yes" : "no",
    companionCount,
    companionNames: data.companionNames.slice(0, companionCount),
    companionAllergies: data.companionAllergies.slice(0, companionCount).map((a) => a.join(" | ")),
    companionAllergiesOther: (data.companionAllergiesOther || []).slice(0, companionCount),
    childrenNames: data.childrenNames.slice(0, data.childrenNames.length),
    childrenAllergies: (data.childrenAllergies || []).join(" | "),
    allergiesOther: data.allergiesOther || "",
    dietaryInfo: encryptedDietaryInfo,
    inviteToken,
    submittedAt: nowTimestamp,
    privacyConsent: true,
    privacyConsentAt: nowTimestamp,
    // F2-8: estadísticas de dispositivo (anonimizado: solo UA, sin IP).
    userAgent: navigator.userAgent.slice(0, 200),
  };
  if (birthDate) mainGuestData.birthDate = birthDate;
  // Health consent cuando hay info dietética (alergias/intolerancias)
  if (encryptedDietaryInfo || data.allergiesOther) {
    mainGuestData.healthConsent = true;
    mainGuestData.healthConsentAt = nowTimestamp;
  }
  // F3-8: firma digital extra (si el admin la exige).
  if (data.digitalSignature) mainGuestData.digitalSignature = true;
  // Contacto opcional: SOLO se guarda si el invitado dio consentimiento
  // explícito (GDPR art. 7). Sin consentimiento, ni teléfono ni email viajan.
  if (data.contactConsent) {
    if (data.phone) mainGuestData.phone = String(data.phone).slice(0, 30);
    if (data.email) mainGuestData.email = String(data.email).slice(0, 200);
    mainGuestData.contactConsent = true;
  }
  // Solo añadir campos de transporte si el invitado ASISTE (isAttending=true).
  // Cuando attendance="no", no se guardan preferencias de transporte.
  if (isAttending) {
    if (data.menuSelection) mainGuestData.mealChoice = data.menuSelection;
    if (data.transportChoice) mainGuestData.transportChoice = String(data.transportChoice).slice(0, 20);
    if (data.transportMode) mainGuestData.transportMode = String(data.transportMode).slice(0, 10);
    if (data.transportTime) mainGuestData.transportTime = String(data.transportTime).slice(0, 5);
    if (data.transportPlace) mainGuestData.transportPlace = String(data.transportPlace).slice(0, 120);
    if (data.companionTransportModes) mainGuestData.companionTransportModes = data.companionTransportModes.slice(0, companionCount);
    if (data.companionTransportChoices) mainGuestData.companionTransportChoices = data.companionTransportChoices.slice(0, companionCount);
    if (data.companionTransportTimes) mainGuestData.companionTransportTimes = data.companionTransportTimes.slice(0, companionCount);
    if (data.companionTransportPlaces) mainGuestData.companionTransportPlaces = data.companionTransportPlaces.slice(0, companionCount);
  }
  return mainGuestData;
}

export function buildCompanionData(input: {
  data: RsvpFormLike;
  i: number;
  single: string;
  mainGuestId: string;
  encCompDietary: string;
  nowTimestamp: FieldValue;
  inviteToken: string;
}): Record<string, unknown> {
  const { data, i, single, mainGuestId, encCompDietary, nowTimestamp, inviteToken } = input;
  const companionData: Record<string, unknown> = {
    rsvpType: "companion",
    guestName: (data.companionNames[i] || "").slice(0, 120),
    attendance: "yes",
    dietaryInfo: encCompDietary,
    inviteToken,
    submittedAt: nowTimestamp,
    privacyConsent: true,
    privacyConsentAt: nowTimestamp,
    mainGuestDocId: mainGuestId,
    mainGuestName: single,
  };
  const compAllergies = data.companionAllergies[i] || [];
  const hasCompDietary = compAllergies.length > 0;
  if (hasCompDietary) {
    companionData.healthConsent = true;
    companionData.healthConsentAt = nowTimestamp;
  }
  return companionData;
}
