import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/analytics", () => ({ grantAnalyticsConsent: vi.fn() }));
vi.mock("../../lib/sentry", () => ({ enableSentryTracking: vi.fn() }));

vi.mock("../../lib/firebase", () => ({ db: {} }));

vi.mock("../../contexts", () => ({
  useAppUI: () => ({ setLegalModal: vi.fn() }),
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: () => {
      store = {};
    },
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
      JSON.stringify({ necessary: true, analytics: true }),
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
    mockLocalStorage.getItem.mockImplementationOnce(() => "accepted");
    const { container } = render(<CookieConsent />);
    expect(container.innerHTML).toBe("");
  });

  it("shows settings view when configure is clicked", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    expect(screen.getByText("cookie.settingsTitle")).toBeDefined();
  });

  it("saves preferences with analytics enabled", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    fireEvent.click(screen.getByRole("button", { name: "cookie.savePreferences" }));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("wedin_cookie_consent", "accepted");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_prefs",
      JSON.stringify({ necessary: true, analytics: false }),
    );
  });

  it("toggles analytics preference", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const analyticsCheckbox = screen.getByText("cookie.analytics").previousElementSibling as HTMLInputElement;
    expect(analyticsCheckbox.checked).toBe(false);
    fireEvent.click(analyticsCheckbox);
    expect(analyticsCheckbox.checked).toBe(true);
  });

  it("navigates back from settings to main view", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    expect(screen.getByText("cookie.settingsTitle")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(screen.queryByText("cookie.settingsTitle")).toBeNull();
    expect(screen.getByText("cookie.text")).toBeDefined();
  });

  it("does not toggle necessary preference", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const necessaryCheckbox = screen.getByText("cookie.necessary").previousElementSibling as HTMLInputElement;
    expect(necessaryCheckbox).toBeDisabled();
    expect(necessaryCheckbox.checked).toBe(true);
  });

  it("removes analytics cache when saving preferences with analytics off", () => {
    mockLocalStorage.setItem("wedin_invite_cache", "some-data");
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    fireEvent.click(screen.getByRole("button", { name: "cookie.savePreferences" }));
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("wedin_invite_cache");
  });

  it("does not remove cache when saving preferences with analytics enabled", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const analyticsCheckbox = screen.getByText("cookie.analytics").previousElementSibling as HTMLInputElement;
    fireEvent.click(analyticsCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "cookie.savePreferences" }));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_prefs",
      JSON.stringify({ necessary: true, analytics: true }),
    );
  });

  it("does not toggle necessary preference via togglePreference", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const prefsBefore = mockLocalStorage.setItem.mock.calls.length;
    const necessaryCheckbox = screen.getByText("cookie.necessary").previousElementSibling as HTMLInputElement;
    fireEvent.click(necessaryCheckbox);
    expect(mockLocalStorage.setItem.mock.calls.length).toBe(prefsBefore);
  });

  it("calling togglePreference with necessary key returns early", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const necessaryCheckbox = screen.getByText("cookie.necessary").previousElementSibling as HTMLInputElement;
    expect(necessaryCheckbox.checked).toBe(true);
    const analyticsCheckbox = screen.getByText("cookie.analytics").previousElementSibling as HTMLInputElement;
    const analyticsBefore = analyticsCheckbox.checked;
    fireEvent.click(necessaryCheckbox);
    expect(necessaryCheckbox.checked).toBe(true);
    expect(analyticsCheckbox.checked).toBe(analyticsBefore);
  });
});
