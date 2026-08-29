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
