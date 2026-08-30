import { MENU_DISH_ORDERS, MAX_MENU_DISHES, MAX_MENU_DISH_TEXT } from "./constants";

interface MenuDish {
  order: string;
  text: string;
}

/**
 * Etiqueta legible de un plato seleccionado (p. ej. carne → "Carne").
 * Unificada aquí (v2.186): existían 4 copias casi idénticas en
 * excel-builders, attendance-core, AdminPage y AttendanceTab.
 * Devuelve "" para un valor vacío; si la clave existe traduce y, si no
 * (plato legacy sin traducción), devuelve el valor crudo (comportamiento
 * que ya tenían las copias de excel-builders y attendance-core).
 */
export function formatMenuLabel(mealChoice: string, t: (key: string) => string): string {
  if (!mealChoice) return "";
  const key = "rsvp.menu" + mealChoice.charAt(0).toUpperCase() + mealChoice.slice(1);
  const label = t(key);
  return label === key ? mealChoice : label;
}

export function parseMenuDishes(json: string): MenuDish[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, MAX_MENU_DISHES)
      .map((d: unknown) => {
        if (!d || typeof d !== "object") return null;
        const rec = d as Record<string, unknown>;
        return {
          order: MENU_DISH_ORDERS.includes(String(rec.order)) ? String(rec.order) : "otro",
          // El texto se recorta (trim) para que un plato " Plato " no persista
          // con espacios que luego desaparezcan en el render.
          text: typeof rec.text === "string" ? rec.text.trim().slice(0, MAX_MENU_DISH_TEXT) : "",
        };
      })
      .filter((d): d is MenuDish => d !== null && d.text.length > 0);
  } catch {
    return [];
  }
}
