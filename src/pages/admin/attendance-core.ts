/**
 * Helpers puros de la tabla de asistencias.
 *
 * Se extraen de AttendanceTab.tsx para separar la lógica de presentación
 * (filas, estadísticas, ordenación) de los cálculos puros sobre los datos.
 * No dependen del estado ni de React: son funciones de transformación,
 * por lo que son fáciles de cubrir en tests unitarios de forma aislada.
 */

/** Alergias e intolerancias de un invitado, descartando el prefijo de menú. */
function parseDietaryItems(dietaryInfo: string): string[] {
  if (!dietaryInfo) return [];
  return dietaryInfo
    .split(" | ")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("Menú:"));
}

/** Lista de alergias de un invitado (alias de parseDietaryItems). */
export function getDietaryItems(dietaryInfo: string): string[] {
  return parseDietaryItems(dietaryInfo);
}

/** Lista de alergias de los niños de un invitado principal. */
export function getChildrenDietary(entry: {
  childrenAllergies?: string[];
  childrenAllergiesOther?: string;
}): string[] {
  const list = Array.isArray(entry.childrenAllergies) ? entry.childrenAllergies.filter(Boolean) : [];
  const other = (entry.childrenAllergiesOther || "").trim();
  if (other) list.push(other);
  return list;
}

/** Etiqueta legible del plato seleccionado (p. ej. carne → "Carne"). */
export function formatMenuLabel(mealChoice: string, t: (key: string) => string): string | null {
  if (!mealChoice) return null;
  return t("rsvp.menu" + mealChoice.charAt(0).toUpperCase() + mealChoice.slice(1));
}

/** Datos de un invitado principal editado manualmente (alta/edición). */
interface ManualMainInput {
  name: string;
  attendance: string;
  mealChoice?: string;
  allergySelection: string[];
  allergyOther: string;
  transportMode: string;
  transportChoice?: string;
  companions?: Array<{ name: string; menu?: string; allergies: string[]; other: string }>;
}

/** Aplanado del nombre para ids deterministas ("Ana García" → "ana_garcia"). */
export function normalizeManualName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 30);
}

/**
 * Construye el payload de un invitado principal guardado manualmente.
 *
 * Es la lógica que comparte con el flujo público del RSVP: aplanamiento de
 * alergias en " | " y cifrado del texto (las reglas exigen dietaryInfo
 * cifrado o vacío), campos condicionales (salud/transporte/acompañantes)
 * y la whitelist de reglas. Se separa del componente para poder testear la
 * construcción sin Firestore ni estado de React.
 */
export async function buildManualMainPayload(
  input: ManualMainInput,
  inviteToken: string,
  now: unknown,
  encrypt: (v: string, k: string) => Promise<string>,
): Promise<Record<string, unknown>> {
  const allergyText = [...input.allergySelection, input.allergyOther]
    .filter((a: string) => a.trim())
    .join(" | ");
  const encryptedDietary = allergyText ? await encrypt(allergyText, inviteToken) : "";
  const attending = input.attendance === "yes";
  const complements = (input.companions || []).filter((c) => c.name.trim());
  const payload: Record<string, unknown> = {
    rsvpType: "main",
    guestName: input.name.slice(0, 120),
    attendance: input.attendance,
    dietaryInfo: encryptedDietary,
    inviteToken,
    submittedAt: now,
    privacyConsent: true,
    privacyConsentAt: now,
  };
  if (attending) {
    if (input.mealChoice) payload.mealChoice = input.mealChoice.slice(0, 30);
    if (allergyText) {
      payload.healthConsent = true;
      payload.healthConsentAt = now;
    }
    payload.transportMode = input.transportMode.slice(0, 10);
    if (input.transportChoice) payload.transportChoice = input.transportChoice.slice(0, 20);
    if (complements.length) {
      payload.companionCount = complements.length;
      payload.companionNames = complements.map((c) => c.name.trim().slice(0, 120));
      payload.companionMenus = complements.map((c) => (c.menu ? c.menu.slice(0, 30) : ""));
      payload.companionAllergies = complements.map((c) =>
        [...c.allergies, c.other].filter((a: string) => a.trim()).join(" | "),
      );
      payload.companionAllergiesOther = complements.map((c) => c.other.slice(0, 200));
    }
  }
  return payload;
}

/** Construye el payload de un compañero guardado manualmente (enlazado al main). */
export async function buildManualCompanionPayload(
  companion: { name: string; allergies: string[]; other: string },
  inviteToken: string,
  now: unknown,
  mainGuestDocId: string,
  mainGuestName: string,
  encrypt: (v: string, k: string) => Promise<string>,
): Promise<Record<string, unknown>> {
  const compAllergyText = [...companion.allergies, companion.other]
    .filter((a: string) => a.trim())
    .join(" | ");
  const payload: Record<string, unknown> = {
    rsvpType: "companion",
    guestName: companion.name.trim().slice(0, 120),
    attendance: "yes",
    dietaryInfo: compAllergyText ? await encrypt(compAllergyText, inviteToken) : "",
    inviteToken,
    submittedAt: now,
    privacyConsent: true,
    privacyConsentAt: now,
    mainGuestDocId,
    mainGuestName,
  };
  if (compAllergyText) {
    payload.healthConsent = true;
    payload.healthConsentAt = now;
  }
  return payload;
}
