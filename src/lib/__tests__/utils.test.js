import { describe, it, expect } from "vitest";
import {
  normalizeConfig,
  parseCoordinate,
  getValidCoordinates,
  normalizeTokenValue,
  generateSetupToken,
  generateInviteToken,
  encodeInviteConfig,
  decodeInviteConfig,
} from "../utils";

describe("normalizeConfig", () => {
  it("normalizes all fields with defaults", () => {
    const result = normalizeConfig(undefined);
    expect(result.adminUsername).toBe("");
    expect(result.firstName).toBe("");
    expect(result.theme).toBe("golden");
    expect(result.sectionOrder).toBeTruthy();
  });

  it("trims and lowercases adminUsername", () => {
    const result = normalizeConfig({ adminUsername: "  TestUser  " });
    expect(result.adminUsername).toBe("testuser");
  });

  it("trims firstName and secondName", () => {
    const result = normalizeConfig({ firstName: "  Ana  ", secondName: "  Luis  " });
    expect(result.firstName).toBe("Ana");
    expect(result.secondName).toBe("Luis");
  });

  it("falls back to golden for invalid theme", () => {
    const result = normalizeConfig({ theme: "nonexistent" });
    expect(result.theme).toBe("golden");
  });

  it("preserves valid theme", () => {
    const result = normalizeConfig({ theme: "forest" });
    expect(result.theme).toBe("forest");
  });

  it("handles null and non-object values", () => {
    expect(normalizeConfig(null).adminUsername).toBe("");
    expect(normalizeConfig("string").adminUsername).toBe("");
    expect(normalizeConfig(123).adminUsername).toBe("");
  });

  it("preserves empty sectionOrder", () => {
    const withOrder = normalizeConfig({ sectionOrder: "hero,details" });
    expect(withOrder.sectionOrder).toBe("hero,details");
  });
});

describe("parseCoordinate", () => {
  it("parses valid decimal", () => {
    expect(parseCoordinate("40.4168")).toBe(40.4168);
  });

  it("replaces comma with dot", () => {
    expect(parseCoordinate("40,4168")).toBe(40.4168);
  });

  it("replaces multiple commas (European decimal)", () => {
    const result = parseCoordinate("40,5");
    expect(result).toBe(40.5);
  });

  it("returns null for non-string", () => {
    expect(parseCoordinate(123)).toBeNull();
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("   ")).toBeNull();
  });

  it("returns null for non-numeric", () => {
    expect(parseCoordinate("abc")).toBeNull();
  });

  it("handles negative values", () => {
    expect(parseCoordinate("-3.7038")).toBe(-3.7038);
  });
});

describe("getValidCoordinates", () => {
  it("returns coords for valid lat/lng", () => {
    const result = getValidCoordinates("40.4168", "-3.7038");
    expect(result).toEqual({ latitude: 40.4168, longitude: -3.7038 });
  });

  it("returns null for out-of-range latitude", () => {
    expect(getValidCoordinates("100", "0")).toBeNull();
    expect(getValidCoordinates("-100", "0")).toBeNull();
  });

  it("returns null for out-of-range longitude", () => {
    expect(getValidCoordinates("0", "200")).toBeNull();
    expect(getValidCoordinates("0", "-200")).toBeNull();
  });

  it("returns null for invalid values", () => {
    expect(getValidCoordinates("abc", "0")).toBeNull();
    expect(getValidCoordinates("", "")).toBeNull();
  });
});

describe("normalizeTokenValue", () => {
  it("uppercases and removes non-alphanumeric", () => {
    expect(normalizeTokenValue("ab-cd-12")).toBe("ABCD12");
  });

  it("returns empty for non-string", () => {
    expect(normalizeTokenValue(null)).toBe("");
    expect(normalizeTokenValue(undefined)).toBe("");
    expect(normalizeTokenValue(123)).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeTokenValue("  a1  ")).toBe("A1");
  });

  it("removes special characters", () => {
    expect(normalizeTokenValue("a!b@c#")).toBe("ABC");
  });
});

describe("generateSetupToken", () => {
  it("produces token with hyphens every 4 chars", () => {
    const token = generateSetupToken();
    expect(token).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4})+$/);
  });

  it("produces 32 chars without hyphens", () => {
    const token = generateSetupToken();
    const raw = token.replace(/-/g, "");
    expect(raw.length).toBe(32);
  });

  it("only uses allowed chars", () => {
    const token = generateSetupToken();
    const allowed = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789-");
    for (const ch of token) {
      expect(allowed.has(ch)).toBe(true);
    }
  });

  it("generates different tokens each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSetupToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("generateInviteToken", () => {
  it("produces 10 char alphanumeric", () => {
    const token = generateInviteToken();
    expect(token.length).toBe(10);
    expect(token).toMatch(/^[a-zA-Z0-9]{10}$/);
  });

  it("generates different tokens each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("encodeInviteConfig / decodeInviteConfig", () => {
  it("round-trips config without loss", () => {
    const config = {
      firstName: "Ana",
      secondName: "Luis",
      weddingDay: "15",
      weddingMonth: "junio",
      weddingYear: "2027",
      weddingHour: "12",
      weddingMinute: "30",
      theme: "golden",
      sectionOrder: "hero,details,info,story,gifts,accommodation,rsvp",
    };
    const encoded = encodeInviteConfig(config);
    const decoded = decodeInviteConfig(encoded);
    expect(decoded.firstName).toBe("Ana");
    expect(decoded.secondName).toBe("Luis");
    expect(decoded.theme).toBe("golden");
  });

  it("excludes backgroundImage and adminUsername", () => {
    const config = {
      firstName: "Test",
      backgroundImage: "data:image/png;base64,...",
      adminUsername: "admin",
    };
    const encoded = encodeInviteConfig(config);
    const decoded = decodeInviteConfig(encoded);
    expect(decoded.backgroundImage).toBeUndefined();
    expect(decoded.adminUsername).toBeUndefined();
  });

  it("skips empty values", () => {
    const config = {
      firstName: "Test",
      secondName: "",
      inviteMessage: "",
    };
    const encoded = encodeInviteConfig(config);
    const decoded = decodeInviteConfig(encoded);
    expect(decoded.firstName).toBe("Test");
    expect(decoded.secondName).toBeUndefined();
  });

  it("throws on invalid base64", () => {
    expect(() => decodeInviteConfig("!!!invalid!!!")).toThrow();
  });
});
