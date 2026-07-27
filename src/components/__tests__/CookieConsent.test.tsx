import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/firebase", () => ({ db: {} }));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: () => { store = {}; },
  };
})();

import CookieConsent from "../CookieConsent";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
  });
  mockLocalStorage.clear();
  vi.clearAllMocks();
});

describe("CookieConsent", () => {
  it("renders consent message", () => {
    render(<CookieConsent />);
    expect(screen.getByText("cookie.text")).toBeDefined();
  });

  it("calls acceptCookies on accept button click", () => {
    render(<CookieConsent />);
    const acceptBtn = screen.getByText("cookie.accept");
    fireEvent.click(acceptBtn);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("wedin_cookie_consent", "accepted");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_prefs",
      JSON.stringify({ necessary: true, analytics: true })
    );
  });

  it("calls rejectCookies on reject button click", () => {
    render(<CookieConsent />);
    const rejectBtn = screen.getByText("cookie.reject");
    fireEvent.click(rejectBtn);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("wedin_cookie_consent", "rejected");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("wedin_cookie_prefs");
  });

  it("does not render when consent already given", () => {
    mockLocalStorage.getItem.mockReturnValue("accepted");
    const { container } = render(<CookieConsent />);
    expect(container.innerHTML).toBe("");
  });
});
