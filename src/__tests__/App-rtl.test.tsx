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
  useApp: (...args: unknown[]) => mockUseApp(...args),
  useAuth: (...args: unknown[]) => mockUseApp(...args),
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
