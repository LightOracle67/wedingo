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
