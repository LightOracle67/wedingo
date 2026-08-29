/**
 * Núcleo de tipos y helpers puros del RSVP.
 *
 * Se separa del hook `useRsvp` para:
 * - mantener el hook centrado en el estado/efectos, y
 * - poder importar la lógica pura desde el editor admin (AttendanceTab)
 * sin acoplar a React ni a la suscripción de Firestore.
 */

import type { Attendee } from "../types";

export interface RsvpFormData {
  guestName: string;
  attendance: string;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  /** Nº de niños que asisten como acompañantes del principal ("0" = ninguno). */
  childrenCount: string;
  /** Alergias del grupo de niños (chips + texto libre). */
  childrenAllergies: string[];
  childrenAllergiesOther: string;
  companionTransportModes: string[];
  companionTransportChoices: string[];
  menuSelection: string;
  allergies: string[];
  allergiesOther: string;
  privacyConsent: boolean;
  healthConsent: boolean;
  transportChoice: string;
  transportMode: string;
  transportTime: string;
  transportPlace: string;
  digitalSignature: boolean;
}

export interface RsvpEntryData {
  id: string;
  rsvpType?: "main" | "companion";
  guestName: string;
  attendance: string;
  dietaryInfo: string;
  attendees: Attendee[];
  companions: number;
  companionCount: number;
  companionNames: string[];
  companionMenus: string[];
  companionAllergies: string[][];
  companionAllergiesOther: string[];
  allergiesOther: string;
  mealChoice: string;
  guestNames: string;
  note: string;
  submittedAt: string;
  /** Nº de niños del principal (lectura legacy de docs que ya lo guardan). */
  childrenCount?: number;
  childrenAllergies?: string[];
  childrenAllergiesOther?: string;
  healthConsent?: boolean;
  transportChoice?: string;
  transportMode?: string;
  transportTime?: string;
  transportPlace?: string;
  companionTransportChoices?: string[];
  companionTransportModes?: string[];
  companionTransportTimes?: string[];
  companionTransportPlaces?: string[];
  companionDocIds?: string[];
  mainGuestDocId?: string;
  mainGuestName?: string;
}

/** Estado inicial del formulario RSVP: "alone" por defecto, sin acompañantes. */
export function RsvpFormDefault(): RsvpFormData {
  return {
    guestName: "",
    attendance: "alone",
    companionCount: 0,
    companionNames: [],
    companionMenus: [],
    companionAllergies: [],
    companionAllergiesOther: [],
    childrenCount: "0",
    childrenAllergies: [],
    childrenAllergiesOther: "",
    companionTransportModes: [],
    companionTransportChoices: [],
    menuSelection: "",
    allergies: [],
    allergiesOther: "",
    privacyConsent: false,
    healthConsent: false,
    transportChoice: "own",
    transportMode: "own",
    transportTime: "",
    transportPlace: "",
    digitalSignature: false,
  };
}

/**
 * Fusiona un formulario restaurado del marcador local sobre el estado previo.
 * Valida el tipo de cada campo (solo copia valores con el tipo correcto) y
 * fuerza la asistencia a uno de los tres valores del modelo.
 */
export function applyRestoredForm(prev: RsvpFormData, parsed: Record<string, unknown>): RsvpFormData {
  const next: RsvpFormData = { ...prev };
  const str = (k: string): boolean => {
    const v = parsed[k];
    if (typeof v === "string") {
      (next as unknown as Record<string, unknown>)[k] = v;
      return true;
    }
    return false;
  };
  const strArr = (k: string): boolean => {
    const v = parsed[k];
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      (next as unknown as Record<string, unknown>)[k] = v;
      return true;
    }
    return false;
  };
  const strArr2 = (k: string): boolean => {
    const v = parsed[k];
    if (Array.isArray(v) && v.every((x) => Array.isArray(x) && x.every((y) => typeof y === "string"))) {
      (next as unknown as Record<string, unknown>)[k] = v;
      return true;
    }
    return false;
  };
  const bool = (k: string): boolean => {
    const v = parsed[k];
    if (typeof v === "boolean") {
      (next as unknown as Record<string, unknown>)[k] = v;
      return true;
    }
    return false;
  };
  const num = (k: string): boolean => {
    const v = parsed[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      (next as unknown as Record<string, unknown>)[k] = v;
      return true;
    }
    return false;
  };
  const letters: Array<[string, "str" | "arr" | "arr2" | "bool" | "num"]> = [
    ["guestName", "str"], ["attendance", "str"], ["childrenCount", "str"],
    ["childrenAllergiesOther", "str"], ["menuSelection", "str"], ["allergiesOther", "str"],
    ["transportChoice", "str"], ["transportMode", "str"], ["transportTime", "str"],
    ["transportPlace", "str"], ["companionCount", "num"], ["companionNames", "arr"],
    ["companionMenus", "arr"], ["companionAllergies", "arr2"], ["companionAllergiesOther", "arr"],
    ["childrenAllergies", "arr"], ["allergies", "arr"],
    ["companionTransportModes", "arr"], ["companionTransportChoices", "arr"],
    ["privacyConsent", "bool"], ["healthConsent", "bool"], ["digitalSignature", "bool"],
  ];
  for (const [k, kind] of letters) {
    if (kind === "str") str(k);
    else if (kind === "arr") strArr(k);
    else if (kind === "arr2") strArr2(k);
    else if (kind === "bool") bool(k);
    else num(k);
  }
  // La asistencia solo admite los tres valores del modelo.
  if (next.attendance !== "alone" && next.attendance !== "with" && next.attendance !== "no") {
    next.attendance = prev.attendance;
  }
  return next;
}
