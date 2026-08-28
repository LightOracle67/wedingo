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
interface HealthConsentsInput {
  attendance: string;
  allergies?: string[];
  allergiesOther?: string;
  healthConsent?: boolean;
  companionCount: number;
  companionAllergies: Array<string[] | undefined>;
  companionAllergiesOther?: string[];
  childrenAllergies?: string[];
  childrenAllergiesOther?: string;
}

/**
 * Valida en CLIENTE el consentimiento de datos de salud (GDPR art. 9):
 * UN único checkbox por confirmación cubre a todo el grupo (principal,
 * acompañantes y niños) porque las reglas Firestore exigen healthConsent
 * en cada doc con alergias y el usuario no debe marcar uno por persona.
 * Devuelve true si CUALQUIERA tiene datos de salud y el consentimiento
 * único no está marcado.
 */
export function missingHealthConsent(d: HealthConsentsInput): boolean {
  if (d.attendance === "no") return false;
  const mainNeeds = (d.allergies || []).length > 0 || (d.allergiesOther || "").trim().length > 0;
  const anyCompanionNeeds = (d.companionAllergies || []).some(
    (a, idx) => (a || []).length > 0 || (d.companionAllergiesOther?.[idx] || "").trim().length > 0,
  );
  const childrenNeeds =
    (d.childrenAllergies || []).length > 0 || (d.childrenAllergiesOther || "").trim().length > 0;
  return mainNeeds || anyCompanionNeeds || childrenNeeds ? !d.healthConsent : false;
}
