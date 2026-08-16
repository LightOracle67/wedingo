/**
 * animations.test.ts — Pruebas del registro canónico de animaciones y de los
 * helpers de `disabledAnimations` (parse/serialize/toggle) + integración con
 * normalizeConfig y con las traducciones (todo id del registro debe tener
 * nombre y hint en es.json y en.json).
 */

import { describe, it, expect } from "vitest";
import {
  ANIMATIONS,
  ANIMATION_GROUPS,
  ANIMATION_IDS,
  isAnimationId,
  parseDisabledAnimations,
  serializeDisabledAnimations,
  toggleDisabledAnimations,
  animationsByGroup,
} from "../animations";
import { normalizeConfig } from "../normalize-config";
import { defaultConfig } from "../constants";
import esJson from "../../i18n/locales/es.json";
import enJson from "../../i18n/locales/en.json";

describe("Registro de animaciones", () => {
  it("todos los ids son únicos y en kebab-case", () => {
    const ids = ANIMATIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("todos los grupos referenciados existen en ANIMATION_GROUPS", () => {
    const groupIds = new Set(ANIMATION_GROUPS.map((g) => g.id));
    for (const anim of ANIMATIONS) expect(groupIds.has(anim.groupId)).toBe(true);
  });

  it("todos los grupos tienen al menos una animación", () => {
    for (const group of ANIMATION_GROUPS) {
      expect(ANIMATIONS.filter((a) => a.groupId === group.id).length).toBeGreaterThan(0);
    }
  });

  it("animationsByGroup agrupa todas las animaciones sin perder ninguna", () => {
    const map = animationsByGroup();
    const total = Array.from(map.values()).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(ANIMATIONS.length);
  });

  it("todos los ids del registro tienen nombre y hint en es.json y en.json", () => {
    type JsonLocale = { animations?: { items?: Record<string, { name?: string; hint?: string }> } };
    const esItems = (esJson as JsonLocale).animations?.items ?? {};
    const enItems = (enJson as JsonLocale).animations?.items ?? {};
    for (const anim of ANIMATIONS) {
      expect(esItems[anim.id], `falta animaciones.items.${anim.id} en es.json`).toBeDefined();
      expect(esItems[anim.id]?.name, `falta nombre de ${anim.id} en es.json`).toBeTruthy();
      expect(esItems[anim.id]?.hint, `falta hint de ${anim.id} en es.json`).toBeTruthy();
      expect(enItems[anim.id], `falta animaciones.items.${anim.id} en en.json`).toBeDefined();
      expect(enItems[anim.id]?.name, `falta nombre de ${anim.id} en en.json`).toBeTruthy();
      expect(enItems[anim.id]?.hint, `falta hint de ${anim.id} en en.json`).toBeTruthy();
    }
  });
});

describe("parseDisabledAnimations", () => {
  it("devuelve el set vacío compartido para undefined/null/vacío", () => {
    expect(parseDisabledAnimations(undefined)).toBe(parseDisabledAnimations(""));
    expect(parseDisabledAnimations("   ").size).toBe(0);
    expect(parseDisabledAnimations(null)).toBe(parseDisabledAnimations(undefined));
  });

  it("parsa una lista separada por comas", () => {
    const set = parseDisabledAnimations("fireflies,countdown-tick");
    expect(set.size).toBe(2);
    expect(set.has("fireflies")).toBe(true);
    expect(set.has("countdown-tick")).toBe(true);
  });

  it("descarta ids no registrados y duplicados", () => {
    const set = parseDisabledAnimations("fireflies,no-existe,fireflies");
    expect(set.size).toBe(1);
    expect(set.has("fireflies")).toBe(true);
  });
});

describe("serializeDisabledAnimations", () => {
  it("ordena y deduplica", () => {
    expect(serializeDisabledAnimations(["countdown-tick", "fireflies", "countdown-tick"])).toBe(
      "countdown-tick,fireflies",
    );
  });

  it("filtra ids no registrados", () => {
    expect(serializeDisabledAnimations(["fireflies", "bogus"])).toBe("fireflies");
  });

  it("devuelve string vacío para un conjunto vacío", () => {
    expect(serializeDisabledAnimations([])).toBe("");
  });
});

describe("toggleDisabledAnimations", () => {
  it("desactivar añade el id conservando los demás", () => {
    expect(toggleDisabledAnimations("fireflies", "countdown-tick", false)).toBe("countdown-tick,fireflies");
  });

  it("reactivar elimina el id", () => {
    expect(toggleDisabledAnimations("countdown-tick,fireflies", "fireflies", true)).toBe("countdown-tick");
  });

  it("reactivar un id inexistente es un no-op determinista", () => {
    expect(toggleDisabledAnimations("", "fireflies", true)).toBe("");
  });
});

describe("Integración con la config", () => {
  it("defaultConfig incluye disabledAnimations vacío", () => {
    expect(defaultConfig).toHaveProperty("disabledAnimations", "");
  });

  it("normalizeConfig sanitiza disabledAnimations (solo ids válidos y ordenados)", () => {
    const normalized = normalizeConfig({ disabledAnimations: "bogus,fireflies,countdown-tick,fireflies" });
    expect(normalized.disabledAnimations).toBe("countdown-tick,fireflies");
  });

  it("normalizeConfig normaliza undefined a string vacío", () => {
    expect(normalizeConfig({}).disabledAnimations).toBe("");
  });

  it("isAnimationId discrimina ids válidos e inválidos", () => {
    expect(isAnimationId("fireflies")).toBe(true);
    expect(isAnimationId("fireflys")).toBe(false);
    expect(ANIMATION_IDS.size).toBe(ANIMATIONS.length);
  });
});
