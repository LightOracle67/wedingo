import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// Este fichero comprueba que el idioma RTL (p. ej. árabe) ajusta el atributo
// dir del documento, cubriendo la rama RTL_LANGS.has(lang) de AppShell.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ar-AR" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("../contexts/AppContext", () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../contexts/SuperAdminContext", () => ({
  SuperAdminProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../contexts/ToastContext", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseApp = vi.fn();
vi.mock("../contexts", () => ({
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

  useApp: (...args: unknown[]) => mockUseApp(...args),
  useConfig: (...args: unknown[]) => mockUseApp(...args),
  useAuth: (...args: unknown[]) => mockUseApp(...args),
  useAppUI: () => ({ setCookiePrefsOpen: vi.fn() }),

  useUIMessages: () => ({
    saveMessage: "", setSaveMessage: vi.fn(),
    saveError: "", setSaveError: vi.fn(),
    adminMessage: "", setAdminMessage: vi.fn(),
    adminMessageType: "success", setAdminMessageType: vi.fn(),
  }),
  // App lee el theme del setup con useFormField (tienda por campo): devuelve
  // el valor del formData simulado por el test.
  useFormField: (field: string) => (mockUseApp().formData as Record<string, string | undefined>)?.[field] ?? "",
  // Animaciones: provider de paso y prefs activas por defecto.
  AnimationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ConfirmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimations: () => ({
    adminDisabled: new Set<string>(),
    guestDisabled: new Set<string>(),
    effectiveDisabled: new Set<string>(),
    isDisabled: () => false,
    isGroupFullyDisabled: () => false,
    toggleGuestAnimation: vi.fn(),
    setGuestGroup: vi.fn(),
    allOff: false,
    setAllGuest: vi.fn(),
    resetGuest: vi.fn(),
  }),
  useConfirm: () => ({
    confirm: vi.fn(async () => true),
    prompt: vi.fn(async () => null),
  }),
}));

vi.mock("../components/AccessibilityPanel", () => ({
  default: () => <div data-testid="a11y-panel" />,
}));

vi.mock("../components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../components/LanguageSwitcher", () => ({
  default: () => <div data-testid="lang-switcher" />,
}));

vi.mock("../components/CookieConsent", () => ({
  default: () => <div data-testid="cookie-consent" />,
}));

vi.mock("../components/MusicPlayer", () => ({
  default: () => <div data-testid="music-player" />,
}));

vi.mock("../components/Fireflies", () => ({
  default: () => <div data-testid="fireflies" />,
}));

vi.mock("../components/LegalModal", () => ({
  default: () => <div />,
}));

vi.mock("../components/ChangelogModal", () => ({
  default: () => <div />,
}));

vi.mock("../components/AdminBarHeightSync", () => ({
  default: () => <div />,
}));

vi.mock("../lib/superadmin", () => ({
  SUPERADMIN_ROUTE: "/superadmin",
  SUPERADMIN_DASHBOARD: "",
}));

import App from "../App";

describe("App (RTL)", () => {
  it("sets the document direction to rtl for RTL languages", async () => {
    mockUseApp.mockReturnValue({
      config: {},
      formData: {},
      isAdminTokenLoggedIn: false,
      tokenLoginUsername: "",
      inviteToken: "",
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
    });
    expect(document.documentElement.lang).toBe("ar");
  });
});
