import { describe, it, expect } from "vitest";
import { randomMessage, WEDDING_MESSAGES, EN_MESSAGES } from "../invite-messages";

const LANG_MAP = { es: WEDDING_MESSAGES, en: EN_MESSAGES };

describe("language message arrays", () => {
  for (const [lang, messages] of Object.entries(LANG_MAP)) {
    describe(`${lang} messages`, () => {
      it("has at least 20 messages", () => {
        expect(messages.length).toBeGreaterThanOrEqual(20);
      });

      it("every message is a non-empty string", () => {
        for (const msg of messages) {
          expect(typeof msg).toBe("string");
          expect(msg.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("randomMessage", () => {
  it("returns a string from the default (Spanish) list when no lang given", () => {
    const result = randomMessage();
    expect(WEDDING_MESSAGES).toContain(result);
  });

  it("returns a string from the English list", () => {
    const result = randomMessage("en");
    expect(EN_MESSAGES).toContain(result);
  });

  it("falls back to Spanish for unknown lang", () => {
    const result = randomMessage("zz");
    expect(WEDDING_MESSAGES).toContain(result);
  });

  it("falls back to Spanish for undefined", () => {
    const result = randomMessage(undefined);
    expect(WEDDING_MESSAGES).toContain(result);
  });

  it("returns different messages on multiple calls", () => {
    const results = new Set(Array.from({ length: 50 }, () => randomMessage()));
    expect(results.size).toBeGreaterThan(1);
  });
});
