import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

import { trackEvent } from "../analytics";

describe("analytics", () => {
  it("exports trackEvent as a function", () => {
    expect(typeof trackEvent).toBe("function");
  });

  it("trackEvent does not throw when analytics unsupported", () => {
    expect(() => trackEvent("test", {})).not.toThrow();
  });
});
