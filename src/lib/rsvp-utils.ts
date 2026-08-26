/**
 * Opciones predefinidas de restricciones alimentarias.
 */
export const DIETARY_OPTIONS = [
  { value: "sin gluten", label: "Gluten" },
  { value: "sin lactosa", label: "Lactosa" },
  { value: "alergia frutos secos", label: "F. Secos" },
  { value: "alergia mariscos", label: "Mariscos" },
];

/**
 * Parsea la cadena de información dietética en sus componentes.
 * Formato esperado: "Menú: <elección> | <restricción1> | <restricción2> | <otro>"
 */
export function parseDietaryInfo(dietaryInfo: string | null | undefined, menuEnabled: boolean) {
  const parts = (dietaryInfo || "").split(" | ").filter(Boolean);
  let mealChoice = "";
  const dietarySelection: string[] = [];
  let dietaryOther = "";
  let startIdx = 0;
  if (menuEnabled && parts[0] && parts[0].startsWith("Menú: ")) {
    mealChoice = parts[0].slice("Menú: ".length);
    startIdx = 1;
  }
  for (let i = startIdx; i < parts.length; i++) {
    const part = parts[i];
    if (DIETARY_OPTIONS.some((opt) => opt.value === part)) {
      dietarySelection.push(part!);
    } else {
      dietaryOther = part!;
    }
  }
  return { mealChoice, dietarySelection, dietaryOther };
}

/** Datos mínimos que exige la validación de consentimiento de salud. */
export interface HealthConsentsInput {
  attendance: string;
  allergies?: string[];
  allergiesOther?: string;
  healthConsent?: boolean;
  companionCount: number;
  companionAllergies: Array<string[] | undefined>;
  companionAllergiesOther?: string[];
  companionHealthConsents: boolean[];
}

/**
 * Valida en CLIENTE el consentimiento de datos de salud (GDPR art. 9):
 * con alergias marcadas o texto libre, el invitado principal y cada
 * acompañante necesitan su checkbox. Si falta, las reglas Firestore
 * rechazarían el lote con un error genérico mal traducido al usuario.
 * Devuelve true si falta algún consentimiento.
 */
export function missingHealthConsent(d: HealthConsentsInput): boolean {
  if (d.attendance === "no") return false;
  const mainNeeds = (d.allergies || []).length > 0 || (d.allergiesOther || "").trim().length > 0;
  if (mainNeeds && !d.healthConsent) return true;
  for (let i = 0; i < d.companionCount; i++) {
    const compNeeds =
      (d.companionAllergies[i] || []).length > 0 || (d.companionAllergiesOther?.[i] || "").trim().length > 0;
    if (compNeeds && !d.companionHealthConsents[i]) return true;
  }
  return false;
}
