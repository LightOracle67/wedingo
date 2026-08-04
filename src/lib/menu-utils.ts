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
      .map((d: Record<string, unknown>) => ({
        order: MENU_DISH_ORDERS.includes(String(d.order)) ? String(d.order) : "otro",
        text: typeof d.text === "string" ? d.text.slice(0, MAX_MENU_DISH_TEXT) : "",
      }))
      .filter((d) => d.text);
  } catch {
    return [];
  }
}
