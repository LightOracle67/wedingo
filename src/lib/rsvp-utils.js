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
export function parseDietaryInfo(dietaryInfo, menuEnabled) {
  const parts = (dietaryInfo || "").split(" | ").filter(Boolean);
  let mealChoice = "";
  const dietarySelection = [];
  let dietaryOther = "";
  let startIdx = 0;
  if (menuEnabled && parts[0] && parts[0].startsWith("Menú: ")) {
    mealChoice = parts[0].slice("Menú: ".length);
    startIdx = 1;
  }
  for (let i = startIdx; i < parts.length; i++) {
    const part = parts[i];
    if (DIETARY_OPTIONS.some((opt) => opt.value === part)) {
      dietarySelection.push(part);
    } else {
      dietaryOther = part;
    }
  }
  return { mealChoice, dietarySelection, dietaryOther };
}

/**
 * Formatea el menú y restricciones para mostrar.
 */
export function formatDietary(dietaryInfo, menuEnabled) {
  const parsed = parseDietaryInfo(dietaryInfo, menuEnabled);
  const parts = [];
  if (parsed.mealChoice) parts.push(parsed.mealChoice);
  parts.push(...parsed.dietarySelection);
  if (parsed.dietaryOther) parts.push(parsed.dietaryOther);
  return parts.join(", ") || "—";
}
