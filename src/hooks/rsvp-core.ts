/**
 * Núcleo de tipos y helpers puros del RSVP.
 *
 * Se separa del hook `useRsvp` para:
 * - mantener el hook centrado en el estado/efectos, y
 * - poder importar la lógica pura desde el editor admin (AttendanceTab)
 * sin acoplar a React ni a la suscripción de Firestore.
 */

import { MAX_CHILDREN, MAX_COMPANIONS } from "../pages/sections/rsvp/constants";
import type { Attendee } from "../types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

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

/** Convierte un QuerySnapshot de respuestas en la lista de entradas
 *  (main + acompañantes individuales), descifrando alergias. Función pura
 *  movida fuera del hook: no usa estado React, solo el snapshot, el token de
 *  invitación y las dos dependencias externas descifrar/analizar dietas.
 *  El descifrado se cachea por (inviteToken, docId): un documento ya
 *  procesado no se vuelve a descifrar en snapshots posteriores. */
const dietaryInfoCache = new Map<string, string>();

export async function processRsvpSnapshot(
  snapshot: { docs: QueryDocumentSnapshot<DocumentData>[] },
  inviteToken: string,
  decrypt: (value: string, key: string) => Promise<string>,
  parseDietaryInfo: (dietaryInfo: string, hasMeal: boolean) => { dietarySelection: string[]; dietaryOther: string | null },
): Promise<RsvpEntryData[]> {
  const allDocs = await Promise.all(
    snapshot.docs.map(async (entryDoc) => {
      const data = entryDoc.data();
      const submittedAt =
        typeof data.submittedAt?.toDate === "function"
          ? data.submittedAt.toDate().toISOString()
          : typeof data.submittedAt === "string"
            ? data.submittedAt
            : data.submittedAt?.seconds
              ? new Date(data.submittedAt.seconds * 1000).toISOString()
              : new Date().toISOString();

      const cacheKey = `${inviteToken}|${entryDoc.id}`;
      let decryptedDietaryInfo = typeof data.dietaryInfo === "string" ? data.dietaryInfo : "";
      if (typeof data.dietaryInfo === "string" && data.dietaryInfo !== "") {
        const cached = dietaryInfoCache.get(cacheKey);
        if (cached !== undefined) {
          decryptedDietaryInfo = cached;
        } else {
          decryptedDietaryInfo = await decrypt(data.dietaryInfo, inviteToken);
          dietaryInfoCache.set(cacheKey, decryptedDietaryInfo);
        }
      }

      const attendees = data.attendees || [];

      return {
        id: entryDoc.id,
        rsvpType: (data.rsvpType as "main" | "companion") || (data.mainGuestDocId ? "companion" : "main"),
        guestName: data.guestName || "",
        attendance: data.attendance || "no",
        dietaryInfo: decryptedDietaryInfo,
        attendees,
        companions:
          attendees.length > 0 ? attendees.length : Number.isFinite(data.companions) ? data.companions : 0,
        companionCount: data.companionCount || 0,
        companionNames: data.companionNames || [],
        companionMenus: data.companionMenus || [],
        companionAllergies: data.companionAllergies || [],
        companionAllergiesOther: data.companionAllergiesOther || [],
        allergiesOther: data.allergiesOther || "",
        mealChoice: data.mealChoice || "",
        guestNames: data.guestNames || "",
        note: data.note || "",
        submittedAt,
        // Niños declarados por el principal (nuevo modelo): el contador y
        // las alergias del grupo viajan en el doc del invitado principal.
        childrenCount: Number(data.childrenCount) || 0,
        childrenAllergies: Array.isArray(data.childrenAllergies)
          ? (data.childrenAllergies as string[])
          : [],
        childrenAllergiesOther:
          typeof data.childrenAllergiesOther === "string" ? data.childrenAllergiesOther : "",
        healthConsent: data.healthConsent || false,
        transportChoice: data.transportChoice || "",
        transportMode: data.transportMode || "",
        transportTime: data.transportTime || "",
        transportPlace: data.transportPlace || "",
        companionTransportChoices: data.companionTransportChoices || [],
        companionTransportModes: data.companionTransportModes || [],
        companionTransportTimes: data.companionTransportTimes || [],
        companionTransportPlaces: data.companionTransportPlaces || [],
        companionDocIds: data.companionDocIds || [],
        mainGuestDocId: data.mainGuestDocId || "",
        mainGuestName: data.mainGuestName || "",
      };
    }),
  );

  const mainEntries = allDocs.filter((d) => d.rsvpType === "main" || (!d.rsvpType && !d.mainGuestDocId));
  const companionEntries = allDocs.filter((d) => d.rsvpType === "companion" || d.mainGuestDocId);

  const companionAsEntries: RsvpEntryData[] = [];
  for (const main of mainEntries) {
    const linkedCompanions = companionEntries.filter((c) => c.mainGuestDocId === main.id);
    if (linkedCompanions.length > 0) {
      main.companions = linkedCompanions.length;
      main.companionCount = linkedCompanions.length;
      main.companionNames = linkedCompanions.map((c) => c.guestName);
      main.companionMenus = linkedCompanions.map((c) => c.mealChoice);
      main.companionTransportChoices = linkedCompanions.map((c) => c.transportChoice || "");
      main.companionTransportModes = linkedCompanions.map((c) => c.transportMode || "own");
      main.companionTransportTimes = linkedCompanions.map((c) => c.transportTime || "");
      main.companionTransportPlaces = linkedCompanions.map((c) => c.transportPlace || "");
      main.companionAllergies = linkedCompanions.map((c) => {
        const parsed = parseDietaryInfo(c.dietaryInfo, !!c.mealChoice);
        return [...parsed.dietarySelection, ...(parsed.dietaryOther ? [parsed.dietaryOther] : [])];
      });
      main.companionAllergiesOther = linkedCompanions.map((c) => c.allergiesOther || "");
      main.companionDocIds = linkedCompanions.map((c) => c.id);
      for (const comp of linkedCompanions) {
        companionAsEntries.push({
          ...comp,
          companions: 0,
          companionCount: 0,
          companionNames: [],
          companionMenus: [],
          companionAllergies: [],
          attendees: [],
        });
      }
    }
  }

  return [...companionAsEntries, ...mainEntries].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

/**
 * Aplica un cambio de campo del formulario RSVP sobre el estado actual.
 *
 * Es la lógica pura de `updateRsvpField`: recibe el formulario actual y
 * devuelve el nuevo sin tocar refs del hook (la limpieza de prefill se
 * resuelve en el hook). Los cambios de asistencia recalcularán los campos
 * de acompañantes/niños para que no queden restos de un modo anterior.
 */
export function applyRsvpFieldUpdate(
  current: RsvpFormData,
  field: string,
  value: unknown,
): RsvpFormData {
  if (field === "attendance") {
    const a = value as string;
    const noComps = a === "no" || a === "alone";
    return {
      ...current,
      attendance: a,
      companionCount: noComps ? 0 : current.companionCount || 1,
      companionNames: noComps ? [] : current.companionNames,
      companionAllergies: noComps ? [] : current.companionAllergies,
      childrenCount: noComps ? "0" : current.childrenCount,
      childrenAllergies: noComps ? [] : current.childrenAllergies,
      childrenAllergiesOther: noComps ? "" : current.childrenAllergiesOther,
    };
  }
  if (field === "companionCount") {
    const count = Math.max(0, Math.min(MAX_COMPANIONS, Number(value) || 0));
    const names = current.companionNames.slice(0, count);
    const allergies = current.companionAllergies.slice(0, count);
    while (names.length < count) {
      names.push("");
      allergies.push([]);
    }
    return { ...current, companionCount: count, companionNames: names, companionAllergies: allergies };
  }
  if (field.startsWith("companionNames[")) {
    const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
    const names = [...current.companionNames];
    names[idx] = String(value).slice(0, 120);
    return { ...current, companionNames: names };
  }
  if (field.startsWith("companionMenus[")) {
    const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
    const menus = [...current.companionMenus];
    menus[idx] = String(value);
    return { ...current, companionMenus: menus };
  }
  if (field.startsWith("companionAllergies[")) {
    const idx = parseInt(field.match(/\d+/)?.[0] || "0", 10);
    const all = [...current.companionAllergies];
    all[idx] = value as string[];
    return { ...current, companionAllergies: all };
  }
  if (field === "childrenCount") {
    const n = Number(value);
    return {
      ...current,
      childrenCount: String(Number.isFinite(n) ? Math.max(0, Math.min(MAX_CHILDREN, n)) : 0),
    };
  }
  return { ...current, [field]: value };
}

/**
 * Calcula el siguiente valor del contador de confirmaciones de una invitación.
 *
 * Lógica pura del bloque de contador de `submitRsvpData`: a partir del
 * contador actual persistido calcula el nuevo `count` (total de respuestas,
 * que las reglas exigen exactamente == valor_previo + 1 en escrituras
 * públicas) y el nuevo `attendingCount` (aforo real: solo suma si esta
 * respuesta asiste). Separa esta aritmética del hook para poder testearla
 * sin Firestore y para que `useRsvp` solo alcance la escritura.
 */
export function computeNextCounter(
  existing: { count?: unknown; attendingCount?: unknown } | undefined,
  isAttending: boolean,
): { count: number; attendingCount: number } {
  const raw = Number(existing?.count ?? 0);
  const count = Number.isFinite(raw) ? raw + 1 : 1;
  // attendingCount refleja solo a quien asiste; si un doc legacy no tiene el
  // campo, se trata como 0 para no inflar el aforo.
  const rawAttending = Number(existing?.attendingCount ?? 0);
  const attendingCount = (Number.isFinite(rawAttending) ? rawAttending : 0) + (isAttending ? 1 : 0);
  return { count, attendingCount };
}
