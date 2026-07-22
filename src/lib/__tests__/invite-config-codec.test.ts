import { describe, it, expect } from "vitest";
import { encodeInviteConfig, decodeInviteConfig } from "../invite-config-codec";

const SAMPLE_CONFIG = {
  firstName: "Juan",
  secondName: "María",
  inviteMessage: "Ven a la boda",
  weddingPlace: "Iglesia San José",
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: "2026",
  weddingHour: "18",
  weddingMinute: "30",
  theme: "golden",
};

const CONFIG_WITH_ALL = {
  firstName: "Juan",
  secondName: "María",
  inviteMessage: "Save the date!",
  weddingPlace: "Madrid",
  weddingLatitude: "40.4168",
  weddingLongitude: "-3.7038",
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: "2026",
  weddingHour: "18",
  weddingMinute: "30",
  weddingSchedule: "Tarde",
  weddingDressCode: "Formal",
  theme: "forest",
  sectionOrder: "hero,rsvp",
  hiddenSections: "gifts",
  storyText: "Our story...",
  giftsInfo: "No gifts",
  accommodationInfo: "Hotel",
  kidsPolicy: "yes",
};

describe("encodeInviteConfig", () => {
  it("excludes backgroundImage fields", () => {
    const result = encodeInviteConfig({ ...SAMPLE_CONFIG, backgroundImageLabel: "label", backgroundImageSource: "local", adminUsername: "admin" });
    const decoded = decodeInviteConfig(result);
    expect(decoded.backgroundImageLabel).toBeUndefined();
    expect(decoded.backgroundImageSource).toBeUndefined();
    expect(decoded.adminUsername).toBeUndefined();
  });

  it("removes empty/null/undefined values", () => {
    const result = encodeInviteConfig({ ...SAMPLE_CONFIG, weddingPlace: "", weddingDay: null, weddingHour: undefined });
    const decoded = decodeInviteConfig(result);
    expect(decoded.weddingPlace).toBeUndefined();
    expect(decoded.weddingDay).toBeUndefined();
    expect(decoded.weddingHour).toBeUndefined();
  });

  it("produces base64url output (no + / =)", () => {
    const result = encodeInviteConfig(SAMPLE_CONFIG);
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toContain("=");
  });

  it("uses short keys for known fields", () => {
    const result = encodeInviteConfig(SAMPLE_CONFIG);
    const decoded = JSON.parse(atob(result.replace(/-/g, "+").replace(/_/g, "/")));
    expect(decoded.fn).toBe("Juan");
    expect(decoded.sn).toBe("María");
    expect(decoded.th).toBe("golden");
    expect(decoded.wp).toBe("Iglesia San José");
  });

  it("produces consistent output for same input", () => {
    const a = encodeInviteConfig(SAMPLE_CONFIG);
    const b = encodeInviteConfig(SAMPLE_CONFIG);
    expect(a).toBe(b);
  });
});

describe("decodeInviteConfig", () => {
  it("decodes an encoded config back to original", () => {
    const encoded = encodeInviteConfig(CONFIG_WITH_ALL);
    const decoded = decodeInviteConfig(encoded);
    expect(decoded.firstName).toBe("Juan");
    expect(decoded.secondName).toBe("María");
    expect(decoded.weddingPlace).toBe("Madrid");
    expect(decoded.theme).toBe("forest");
  });

  it("round-trips all known fields", () => {
    const encoded = encodeInviteConfig(CONFIG_WITH_ALL);
    const decoded = decodeInviteConfig(encoded);
    for (const [key, val] of Object.entries(CONFIG_WITH_ALL)) {
      expect(decoded[key]).toBe(val);
    }
  });

  it("preserves unknown keys as-is", () => {
    const encoded = encodeInviteConfig({ ...SAMPLE_CONFIG, customField: "customValue" });
    const decoded = decodeInviteConfig(encoded);
    expect(decoded.customField).toBe("customValue");
  });

  it("handles empty config", () => {
    const encoded = encodeInviteConfig({});
    const decoded = decodeInviteConfig(encoded);
    expect(decoded).toEqual({});
  });
});
