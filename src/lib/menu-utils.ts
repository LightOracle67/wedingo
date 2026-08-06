import { MENU_DISH_ORDERS, MAX_MENU_DISHES, MAX_MENU_DISH_TEXT } from "./constants";

export interface MenuDish {
  order: string;
  text: string;
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
