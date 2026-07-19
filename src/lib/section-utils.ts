import { STORY_SECTION_ORDER } from "./constants";

export function parseSectionOrder(raw) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  const valid = new Set(STORY_SECTION_ORDER);
  const parsed = order.filter((s) => valid.has(s));
  const existing = new Set(parsed);
  for (const s of STORY_SECTION_ORDER) {
    if (!existing.has(s)) parsed.push(s);
  }
  return parsed;
}

export function parseHidden(raw) {
  return new Set((raw || "").split(",").map((s) => s.trim()).filter(Boolean));
}

export { formatDate } from "./superadmin";
