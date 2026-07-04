import { STORY_SECTION_ORDER } from "./constants";

export function parseSectionOrder(raw) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  const valid = new Set(STORY_SECTION_ORDER);
  return order.filter((s) => valid.has(s));
}

export function parseHidden(raw) {
  return new Set((raw || "").split(",").filter(Boolean));
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
