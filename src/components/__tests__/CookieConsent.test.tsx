import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/firebase", () => ({ db: {} }));

import CookieConsent from "../CookieConsent";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { store = {}; },
      };
    })(),
    configurable: true,
  });
});

describe("CookieConsent", () => {
  it("renders consent message", () => {
    render(<CookieConsent />);
    expect(screen.getByText("cookie.text")).toBeDefined();
  });
});
