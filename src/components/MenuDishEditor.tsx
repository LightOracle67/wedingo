import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MAX_MENU_DISHES, MAX_MENU_DISH_TEXT, MENU_DISH_ORDERS } from "../lib/constants";

interface Dish {
  order: string;
  text: string;
}

export default function MenuDishEditor({ value, onChange, idBase }: { value: string; onChange: (json: string) => void; idBase: string }) {
  const { t } = useTranslation();

  const dishes: Dish[] = (() => {
    try {
      const parsed = JSON.parse(value || "");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(0, MAX_MENU_DISHES)
        .map((d: Record<string, unknown>) => ({
          order: MENU_DISH_ORDERS.includes(String(d.order)) ? String(d.order) : "otro",
          text: typeof d.text === "string" ? d.text.slice(0, MAX_MENU_DISH_TEXT) : "",
        }));
    } catch {
      return [];
    }
  })();
  // JSON corrupto: se avisa al admin para que reescriba los platos (antes se
  // vaciaba en silencio y el menú desaparecía sin feedback).
  const parseError = (value || "").trim() !== "" && !(() => {
    try { return Array.isArray(JSON.parse(value || "")); } catch { return false; }
  })();

  const setDishes = useCallback((next: Dish[]) => {
    onChange(JSON.stringify(next.slice(0, MAX_MENU_DISHES)));
  }, [onChange]);

  const handleField = useCallback((index: number, field: "order" | "text") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const next = [...dishes];
      next[index] = { ...(next[index] ?? { order: "entrante", text: "" }), [field]: e.target.value };
      setDishes(next);
    }, [dishes, setDishes]);

  const addDish = useCallback(() => {
    if (dishes.length >= MAX_MENU_DISHES) return;
    setDishes([...dishes, { order: "entrante", text: "" }]);
  }, [dishes, setDishes]);

  const removeDish = useCallback((index: number) => {
    setDishes(dishes.filter((_, i) => i !== index));
  }, [dishes, setDishes]);

  return (
    <div>
      {parseError ? (
        <p className="setup-muted" style={{ color: "var(--color-danger, #b91c1c)", margin: "0.5rem 0" }}>
          {t("errors.menuParseError")}
        </p>
      ) : null}
      {dishes.map((dish, i) => (
        <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 130px" }}>
            <label className="setup-label" htmlFor={`${idBase}-order-${i}`} style={{ fontSize: "0.75rem" }}>{t("setup.menuOrderLabel")}</label>
            <select
              id={`${idBase}-order-${i}`}
              className="setup-input"
              value={dish.order}
              onChange={handleField(i, "order")}
            >
              {MENU_DISH_ORDERS.map((order: string) => (
                <option key={order} value={order}>{t("setup.menuOrder" + order.charAt(0).toUpperCase() + order.slice(1))}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="setup-label" htmlFor={`${idBase}-dish-${i}`} style={{ fontSize: "0.75rem" }}>{t("setup.menuDishLabel")}</label>
            <input
              id={`${idBase}-dish-${i}`}
              className="setup-input"
              type="text"
              value={dish.text}
              onChange={handleField(i, "text")}
              placeholder={t("setup.menuDishPlaceholder")}
              maxLength={MAX_MENU_DISH_TEXT}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="setup-button setup-button--ghost setup-button--compact"
            onClick={() => removeDish(i)}
            style={{ marginTop: "1.4rem", flexShrink: 0 }}
            aria-label={t("setup.menuRemoveDish")}
          >
            ✕
          </button>
        </div>
      ))}
      {dishes.length < MAX_MENU_DISHES ? (
        <button
          type="button"
          className="setup-button setup-button--ghost setup-button--compact"
          onClick={addDish}
          style={{ marginTop: "0.6rem" }}
        >
          + {t("setup.menuAddDish")}
        </button>
      ) : null}
      {dishes.length >= MAX_MENU_DISHES ? (
        <p className="setup-help">{t("setup.menuMaxDishes", { max: MAX_MENU_DISHES })}</p>
      ) : null}
    </div>
  );
}
