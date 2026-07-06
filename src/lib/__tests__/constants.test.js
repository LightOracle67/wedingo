import { describe, it, expect } from "vitest";
import {
  MONTH_OPTIONS,
  MONTH_VALUE_TO_NUMBER,
  THEME_OPTIONS,
  THEME_VALUES,
  THEME_PREVIEW_COLORS,
  STORY_SECTION_ORDER,
  SECTION_LABELS,
  SECTION_MOVABLE,
  defaultConfig,
} from "../constants";

describe("MONTH_OPTIONS", () => {
  it("has 12 months", () => {
    expect(MONTH_OPTIONS).toHaveLength(12);
  });

  it("each month has value and label", () => {
    for (const m of MONTH_OPTIONS) {
      expect(m.value).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });
});

describe("MONTH_VALUE_TO_NUMBER", () => {
  it("maps each month option to correct number", () => {
    for (const m of MONTH_OPTIONS) {
      expect(MONTH_VALUE_TO_NUMBER[m.value]).toBeGreaterThanOrEqual(1);
      expect(MONTH_VALUE_TO_NUMBER[m.value]).toBeLessThanOrEqual(12);
    }
  });

  it("enero is 1, diciembre is 12", () => {
    expect(MONTH_VALUE_TO_NUMBER["enero"]).toBe(1);
    expect(MONTH_VALUE_TO_NUMBER["diciembre"]).toBe(12);
  });
});

describe("THEME_OPTIONS", () => {
  it("all themes have required fields", () => {
    for (const t of THEME_OPTIONS) {
      expect(t.value).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.hint).toBeTruthy();
      expect(["claros", "oscuros", "lgtbiq+"]).toContain(t.group);
    }
  });

  it("THEME_VALUES matches options", () => {
    expect(THEME_VALUES.size).toBe(THEME_OPTIONS.length);
    for (const t of THEME_OPTIONS) {
      expect(THEME_VALUES.has(t.value)).toBe(true);
    }
  });

  it("THEME_PREVIEW_COLORS covers all themes", () => {
    for (const t of THEME_OPTIONS) {
      const colors = THEME_PREVIEW_COLORS[t.value];
      expect(colors).toBeTruthy();
      expect(colors.accent).toBeTruthy();
      expect(colors.bg).toBeTruthy();
    }
  });
});

describe("STORY_SECTION_ORDER", () => {
  it("hero is first, rsvp is last", () => {
    expect(STORY_SECTION_ORDER[0]).toBe("hero");
    expect(STORY_SECTION_ORDER[STORY_SECTION_ORDER.length - 1]).toBe("rsvp");
  });

  it("all sections have labels", () => {
    for (const s of STORY_SECTION_ORDER) {
      expect(SECTION_LABELS[s]).toBeTruthy();
    }
  });

  it("hero is not movable", () => {
    expect(SECTION_MOVABLE.hero).toBe(false);
  });

  it("other sections are movable", () => {
    for (const s of STORY_SECTION_ORDER) {
      if (s !== "hero") {
        expect(SECTION_MOVABLE[s]).toBe(true);
      }
    }
  });
});

describe("defaultConfig", () => {
  it("has all required fields", () => {
    expect(defaultConfig.adminUsername).toBe("");
    expect(defaultConfig.firstName).toBe("");
    expect(defaultConfig.theme).toBe("golden");
    expect(defaultConfig.backgroundImage).toBe("");
    expect(defaultConfig.sectionOrder).toBe(STORY_SECTION_ORDER.join(","));
    expect(defaultConfig.hiddenSections).toBe("");
  });

  it("has all date fields", () => {
    expect(defaultConfig).toHaveProperty("weddingDay", "");
    expect(defaultConfig).toHaveProperty("weddingMonth", "");
    expect(defaultConfig).toHaveProperty("weddingYear", "");
    expect(defaultConfig).toHaveProperty("weddingHour", "");
    expect(defaultConfig).toHaveProperty("weddingMinute", "");
  });
});
