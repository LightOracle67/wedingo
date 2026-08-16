import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useState } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/analytics", () => ({ grantAnalyticsConsent: vi.fn() }));
vi.mock("../../lib/sentry", () => ({ enableSentryTracking: vi.fn(), disableSentryTracking: vi.fn() }));

vi.mock("../../lib/firebase", () => ({ db: {} }));

// Mock del contexto UI con estado REAL de React: así cambiar legalModal
// re-renderiza el consumidor (memo) igual que en producción, aunque el
// componente memo no reciba props nuevas.
let mockLegalModal = "";
let mockSetLegalModal: (v: string) => void = () => {};
let mockCookiePrefsOpen = false;
// El setter se expone vía cierre para que los tests simulen la apertura desde
// el footer (se usa dentro de useAppUIMock, por eso el prefijo guion bajo).
let _mockSetCookiePrefsOpen: ((v: boolean) => void) | undefined;
void _mockSetCookiePrefsOpen;

function useAppUIMock() {
  const [legal, setLegal] = useState(mockLegalModal);
  const [prefs, setPrefs] = useState(mockCookiePrefsOpen);
  mockSetLegalModal = setLegal;
  _mockSetCookiePrefsOpen = setPrefs;
  return {
    legalModal: legal,
    setLegalModal: (v: string) => {
      mockLegalModal = v;
      setLegal(v);
    },
    cookiePrefsOpen: prefs,
    setCookiePrefsOpen: (v: boolean) => {
      mockCookiePrefsOpen = v;
      setPrefs(v);
    },
  };
}

vi.mock("../../contexts", () => ({
  useConfigActions: () => ({
    updateFormField: vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    maxAllowedYear: 2099,
    inviteToken: "",
    hasStoredConfig: false,
  }),

  useAppUI: useAppUIMock,
  useConfig: () => ({ inviteToken: undefined }),
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
import { PRIVACY_POLICY_VERSION } from "../../lib/constants";

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
    expect(screen.getByText("cookie.point1")).toBeDefined();
    expect(screen.getByText("cookie.point4")).toBeDefined();
  });

  it("calls acceptCookies on accept button click", () => {
    render(<CookieConsent />);
    const acceptBtn = screen.getByText("cookie.accept");
    fireEvent.click(acceptBtn);

    // El consentimiento se persiste como registro JSON con timestamp y versión
    // de la política (GDPR art. 7.1: consentimiento demostrable).
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_consent",
      expect.stringContaining('"status":"accepted"'),
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_prefs",
      JSON.stringify({ necessary: true, analytics: true }),
    );
  });

  it("calls rejectCookies on reject button click", () => {
    render(<CookieConsent />);
    const rejectBtn = screen.getByText("cookie.reject");
    fireEvent.click(rejectBtn);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_consent",
      expect.stringContaining('"status":"rejected"'),
    );
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("wedin_cookie_prefs");
  });

  it("does not render when consent already given", () => {
    // Formato actual: registro JSON con la versión vigente de la política.
    mockLocalStorage.getItem.mockImplementationOnce(() =>
      JSON.stringify({ status: "accepted", ts: Date.now(), version: PRIVACY_POLICY_VERSION }),
    );
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
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_consent",
      expect.stringContaining('"status":"accepted"'),
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "wedin_cookie_prefs",
      JSON.stringify({ necessary: true, analytics: false }),
    );
  });

  it("toggles analytics preference", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    // Abre la sección "Estadísticas de visita" del accordion.
    fireEvent.click(screen.getByRole("button", { name: /analytics/ }));
    const analyticsCheckbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
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
    expect(screen.getByText("cookie.point1")).toBeDefined();
    expect(screen.getByText("cookie.point4")).toBeDefined();
  });

  it("does not toggle necessary preference", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const necessaryCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
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
    fireEvent.click(screen.getByRole("button", { name: /analytics/ }));
    const analyticsCheckbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
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
    const necessaryCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    fireEvent.click(necessaryCheckbox);
    expect(mockLocalStorage.setItem.mock.calls.length).toBe(prefsBefore);
  });

  it("calling togglePreference with necessary key returns early", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: "cookie.configure" }));
    const necessaryCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    expect(necessaryCheckbox.checked).toBe(true);
    const analyticsCheckbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
    const analyticsBefore = analyticsCheckbox.checked;
    fireEvent.click(necessaryCheckbox);
    expect(necessaryCheckbox.checked).toBe(true);
    expect(analyticsCheckbox.checked).toBe(analyticsBefore);
  });

  it("closes when opening the privacy policy and reopens after it closes", () => {
    render(<CookieConsent />);
    expect(screen.getByText("cookie.point1")).toBeDefined();
    // Abre la política: el consentimiento se cierra para que el legal se vea.
    fireEvent.click(screen.getByRole("button", { name: "cookie.policyLink" }));
    expect(screen.queryByText("cookie.point1")).toBeNull();
    expect(mockLegalModal).toBe("privacy");
    // Se cierra el legal: el consentimiento reaparece sin haber decidido.
    act(() => {
      mockSetLegalModal("");
    });
    expect(screen.getByText("cookie.point1")).toBeDefined();
  });
});
