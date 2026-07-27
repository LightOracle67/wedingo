import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
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

vi.mock("../components/LegalModal", () => ({
  default: ({ section }: { section: string }) =>
    section ? <div data-testid="legal-modal">{section}</div> : null,
}));

vi.mock("../components/ChangelogModal", () => ({
  default: () => <div data-testid="changelog-modal" />,
}));

vi.mock("../components/Fireflies", () => ({
  default: () => <div data-testid="fireflies" />,
}));

vi.mock("../pages/LandingPage", () => ({
  default: () => <div data-testid="landing-page" />,
}));

vi.mock("../lib/error-utils", () => ({
  logError: vi.fn(),
}));

vi.mock("../lib/superadmin", () => ({
  SUPERADMIN_ROUTE: "/superadmin",
  SUPERADMIN_DASHBOARD: "",
}));

import App from "../App";

const baseUseApp = {
  config: { theme: "golden", musicFile: "", firstName: "Test", secondName: "User" },
  formData: {},
  isConfigLoading: false,
  configLoadError: "",
  rsvpForm: { attendance: "" },
  isAdminTokenLoggedIn: false,
  tokenLoginUsername: "",
  inviteToken: undefined,
};

describe("App", () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue(baseUseApp);
  });

  it("renders landing page at root route", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("landing-page")).toBeDefined();
    expect(screen.getByTestId("fireflies")).toBeDefined();
    expect(screen.getByTestId("cookie-consent")).toBeDefined();
  });

  it("renders lang switcher in nav and footer", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getAllByTestId("lang-switcher").length).toBe(2);
  });

  it("shows offline banner when offline", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByText("common.offline")).toBeDefined();

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });

  it("does not show offline banner when online", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.queryByText("common.offline")).toBeNull();
  });

  it("renders admin bar when admin token logged in", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
      tokenLoginUsername: "AdminUser",
    });

    render(
      <MemoryRouter initialEntries={["/abc123/admin"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByText("admin.tabs.invitation")).toBeDefined();
    expect(screen.getByText("admin.tabs.panel")).toBeDefined();
  });

  it("renders music player when musicFile is configured", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      inviteToken: "abc123",
      config: { ...baseUseApp.config, musicFile: "song.mp3" },
    });

    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByTestId("music-player")).toBeDefined();
  });

  it("does not render admin bar when no admin token", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.queryByText("admin.tabs.invitation")).toBeNull();
  });

  it("renders footer when not editing route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getAllByText("public.privacyPolicy").length).toBe(2);
    expect(screen.getAllByText("public.terms").length).toBe(2);
    expect(screen.getAllByText("public.legalNotice").length).toBe(2);
  });

  it("redirects unknown multi-segment paths to root", async () => {
    render(
      <MemoryRouter initialEntries={["/random/test"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("landing-page")).toBeDefined();
  });
});
