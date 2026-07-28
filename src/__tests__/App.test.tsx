import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockSuperadminModule = vi.hoisted(() => ({
  SUPERADMIN_ROUTE: "/superadmin",
  SUPERADMIN_DASHBOARD: "",
}));

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

vi.mock("../pages/PublicInvitation", () => ({
  default: () => <div data-testid="public-invitation" />,
}));

vi.mock("../pages/SetupPage", () => ({
  default: () => <div data-testid="setup-page" />,
}));

vi.mock("../pages/AdminPage", () => ({
  default: () => <div data-testid="admin-page" />,
}));

vi.mock("../pages/SuperAdminLogin", () => ({
  default: () => <div data-testid="superadmin-login" />,
}));

vi.mock("../pages/SuperAdminPanel", () => ({
  default: () => <div data-testid="superadmin-panel" />,
}));

vi.mock("../pages/PrintPage", () => ({
  default: () => <div data-testid="print-page" />,
}));

vi.mock("../lib/error-utils", () => ({
  logError: vi.fn(),
}));

vi.mock("../lib/superadmin", () => mockSuperadminModule);

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

  it("renders setup route", async () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });

    render(
      <MemoryRouter initialEntries={["/abc123/setup"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("setup-page")).toBeDefined();
  });

  it("renders admin route", async () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });

    render(
      <MemoryRouter initialEntries={["/abc123/admin"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("admin-page")).toBeDefined();
  });

  it("renders superadmin login route", async () => {
    mockUseApp.mockReturnValue({ ...baseUseApp });

    render(
      <MemoryRouter initialEntries={["/superadmin"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("superadmin-login")).toBeDefined();
  });

  it("renders superadmin panel route when dashboard is configured", async () => {
    (mockSuperadminModule as { SUPERADMIN_ROUTE: string }).SUPERADMIN_DASHBOARD = "/superadmin/dashboard";
    mockUseApp.mockReturnValue({ ...baseUseApp });

    render(
      <MemoryRouter initialEntries={["/superadmin/dashboard"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("superadmin-panel")).toBeDefined();

    (mockSuperadminModule as { SUPERADMIN_DASHBOARD: string }).SUPERADMIN_DASHBOARD = "";
  });

  it("renders print route", async () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });

    render(
      <MemoryRouter initialEntries={["/abc123/print"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("print-page")).toBeDefined();
  });

  it("renders public invitation at token route", async () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });

    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("public-invitation")).toBeDefined();
  });

  it("renders music player with musicUrl fallback", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      inviteToken: "abc123",
      config: { ...baseUseApp.config, musicFile: "", musicUrl: "https://example.com/song.mp3" },
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

  it("renders admin bar when admin token logged in on invitation page", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
      tokenLoginUsername: "AdminUser",
    });

    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByText("admin.tabs.invitation")).toBeDefined();
    expect(screen.getByText("admin.tabs.panel")).toBeDefined();
  });

  it("renders nav toggle when not editing and not admin", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const toggle = document.querySelector(".app-nav-toggle");
    expect(toggle).toBeDefined();
  });

  it("shows overlay when nav toggle is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    expect(document.querySelector(".app-nav-overlay--open")).toBeDefined();
  });

  it("opens accessibility panel from overlay", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const a11yButton = Array.from(buttons).find((b) => b.textContent?.includes("common.accessibility"));
    expect(a11yButton).toBeDefined();
    fireEvent.click(a11yButton!);
    expect(screen.getByTestId("a11y-panel")).toBeDefined();
  });

  it("opens legal modal from overlay privacy button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const privacyButton = Array.from(buttons).find((b) => b.textContent === "public.privacyPolicy");
    expect(privacyButton).toBeDefined();
    fireEvent.click(privacyButton!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens changelog from overlay version button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const versionButton = Array.from(buttons).find((b) => b.textContent?.includes("common.version"));
    expect(versionButton).toBeDefined();
    fireEvent.click(versionButton!);
    expect(screen.getByTestId("changelog-modal")).toBeDefined();
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

  it("opens legal modal for terms from overlay", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const termsButton = Array.from(buttons).find((b) => b.textContent === "public.terms");
    expect(termsButton).toBeDefined();
    fireEvent.click(termsButton!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens legal modal for legal notice from overlay", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const legalButton = Array.from(buttons).find((b) => b.textContent === "public.legalNotice");
    expect(legalButton).toBeDefined();
    fireEvent.click(legalButton!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens legal modal from footer privacy button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const footerButtons = document.querySelectorAll(".app-footer__link");
    const privacyBtn = Array.from(footerButtons).find((b) => b.textContent === "public.privacyPolicy");
    expect(privacyBtn).toBeDefined();
    fireEvent.click(privacyBtn!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens legal modal from footer terms button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const footerButtons = document.querySelectorAll(".app-footer__link");
    const termsBtn = Array.from(footerButtons).find((b) => b.textContent === "public.terms");
    expect(termsBtn).toBeDefined();
    fireEvent.click(termsBtn!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens legal modal from footer legal button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const footerButtons = document.querySelectorAll(".app-footer__link");
    const legalBtn = Array.from(footerButtons).find((b) => b.textContent === "public.legalNotice");
    expect(legalBtn).toBeDefined();
    fireEvent.click(legalBtn!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
  });

  it("opens changelog from footer version button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const footerButtons = document.querySelectorAll(".app-footer__link");
    const versionBtn = Array.from(footerButtons).find((b) => b.textContent?.includes("common.version"));
    expect(versionBtn).toBeDefined();
    fireEvent.click(versionBtn!);
    expect(screen.getByTestId("changelog-modal")).toBeDefined();
  });

  it("renders a11y trigger in admin mode", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
    });
    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const adminA11y = document.querySelector(".a11y-trigger--admin");
    expect(adminA11y).toBeDefined();
  });

  it("navigating overlay closes nav", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    expect(document.querySelector(".app-nav-overlay--open")).toBeDefined();
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const privacyButton = Array.from(buttons).find((b) => b.textContent === "public.privacyPolicy")!;
    fireEvent.click(privacyButton);
    expect(document.querySelector(".app-nav-overlay--open")).toBeNull();
  });

  it("sets document title for admin route", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });
    render(
      <MemoryRouter initialEntries={["/abc123/admin"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(document.title).toBe("app.titleAdmin");
  });

  it("sets document title for setup route", () => {
    mockUseApp.mockReturnValue({ ...baseUseApp, inviteToken: "abc123" });
    render(
      <MemoryRouter initialEntries={["/abc123/setup"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(document.title).toBe("app.titleSetup");
  });

  it("sets document theme based on formData", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      formData: { theme: "rose" },
      inviteToken: "abc123",
    });
    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(document.documentElement.dataset.weddingTheme).toBe("rose");
  });

  it("sets document theme to golden on editing route", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
      formData: { theme: "rose" },
    });
    render(
      <MemoryRouter initialEntries={["/abc123/admin"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(document.documentElement.dataset.weddingTheme).toBe("golden");
  });

  it("restores username from sessionStorage", () => {
    const sessionMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((k: string) => store[k] ?? null),
        setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
        removeItem: vi.fn((k: string) => { delete store[k]; }),
        clear: vi.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "sessionStorage", {
      value: sessionMock,
      configurable: true,
    });
    sessionMock.setItem("wedin_session", JSON.stringify({ identifier: "restored-user", expiresAt: Date.now() + 99999 }));
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
      tokenLoginUsername: "",
    });
    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByText("restored-user")).toBeDefined();
    Object.defineProperty(window, "sessionStorage", { value: undefined, configurable: true });
  });

  it("handles corrupted sessionStorage JSON", () => {
    const sessionMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((k: string) => store[k] ?? null),
        setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
        removeItem: vi.fn((k: string) => { delete store[k]; }),
        clear: vi.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "sessionStorage", {
      value: sessionMock,
      configurable: true,
    });
    sessionMock.setItem("wedin_session", "{invalid json}");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByTestId("landing-page")).toBeDefined();
    Object.defineProperty(window, "sessionStorage", { value: undefined, configurable: true });
  });

  it("handles expired sessionStorage data", () => {
    const sessionMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((k: string) => store[k] ?? null),
        setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
        removeItem: vi.fn((k: string) => { delete store[k]; }),
        clear: vi.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "sessionStorage", {
      value: sessionMock,
      configurable: true,
    });
    sessionMock.setItem("wedin_session", JSON.stringify({ identifier: "user", expiresAt: Date.now() - 1000 }));
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByTestId("landing-page")).toBeDefined();
    Object.defineProperty(window, "sessionStorage", { value: undefined, configurable: true });
  });

  it("handles null sessionStorage gracefully", () => {
    const sessionMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn(() => null),
        setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
        removeItem: vi.fn((k: string) => { delete store[k]; }),
        clear: vi.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "sessionStorage", {
      value: sessionMock,
      configurable: true,
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByTestId("landing-page")).toBeDefined();
    Object.defineProperty(window, "sessionStorage", { value: undefined, configurable: true });
  });

  it("renders DEV badge in dev mode", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(screen.getByText("DEV")).toBeDefined();
  });

  it("renders changelog modal directly when showChangelog is true", () => {
    let capturedSetShowChangelog: (v: boolean) => void = () => {};
    const origRender = render;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const versionButton = Array.from(buttons).find((b) => b.textContent?.includes("common.version"));
    fireEvent.click(versionButton!);
    expect(screen.getByTestId("changelog-modal")).toBeDefined();
  });

  it("renders legal modal when legalSection is set via overlay", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const privacyButton = Array.from(buttons).find((b) => b.textContent === "public.privacyPolicy");
    fireEvent.click(privacyButton!);
    expect(screen.getByTestId("legal-modal")).toBeDefined();
    expect(screen.getByTestId("legal-modal").textContent).toBe("privacy");
  });

  it("renders accessibility panel when showA11y is true via overlay", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    fireEvent.click(document.querySelector(".app-nav-toggle")!);
    const buttons = document.querySelectorAll(".app-nav-overlay__link");
    const a11yButton = Array.from(buttons).find((b) => b.textContent?.includes("common.accessibility"));
    fireEvent.click(a11yButton!);
    expect(screen.getByTestId("a11y-panel")).toBeDefined();
  });

  it("opens accessibility panel from footer a11y trigger", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const footerTrigger = document.querySelector(".app-footer .a11y-trigger");
    expect(footerTrigger).toBeDefined();
    fireEvent.click(footerTrigger!);
    expect(screen.getByTestId("a11y-panel")).toBeDefined();
  });

  it("opens accessibility panel from admin a11y trigger", () => {
    mockUseApp.mockReturnValue({
      ...baseUseApp,
      isAdminTokenLoggedIn: true,
      inviteToken: "abc123",
    });
    render(
      <MemoryRouter initialEntries={["/abc123"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const adminTrigger = document.querySelector(".a11y-trigger--admin");
    expect(adminTrigger).toBeDefined();
    fireEvent.click(adminTrigger!);
    expect(screen.getByTestId("a11y-panel")).toBeDefined();
  });

  it("handles window error event via logError", async () => {
    const { logError } = await import("../lib/error-utils");
    mockUseApp.mockReturnValue({ ...baseUseApp });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    window.dispatchEvent(new ErrorEvent("error", { message: "test error", error: new Error("test") }));
    expect(logError).toHaveBeenCalled();
  });

  it("handles unhandledrejection event via logError", async () => {
    const { logError } = await import("../lib/error-utils");
    mockUseApp.mockReturnValue({ ...baseUseApp });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const reason = new Error("rejected");
    const promise = Promise.reject(reason);
    promise.catch(() => {});
    window.dispatchEvent(new PromiseRejectionEvent("unhandledrejection", { promise, reason }));
    await vi.waitFor(() => {
      expect(logError).toHaveBeenCalledWith(reason, "unhandledRejection");
    });
  });

  it("focuses and blurs the skip link", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    const skipLink = document.querySelector(".skip-link") as HTMLAnchorElement;
    expect(skipLink).toBeDefined();
    fireEvent.focus(skipLink);
    expect(skipLink.style.top).toBe("0px");
    fireEvent.blur(skipLink);
    expect(skipLink.style.top).toBe("-100px");
  });

  it("handles service worker registration in PROD", () => {
    const origEnv = import.meta.env.PROD;
    const registerMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
    });
    import.meta.env.PROD = true;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(registerMock).toHaveBeenCalledWith("/sw.js");
    import.meta.env.PROD = origEnv;
  });

  it("handles service worker registration failure", () => {
    const origEnv = import.meta.env.PROD;
    const registerMock = vi.fn().mockRejectedValue(new Error("register failed"));
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
    });
    import.meta.env.PROD = true;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(registerMock).toHaveBeenCalledWith("/sw.js");
    import.meta.env.PROD = origEnv;
  });

  it("does not register service worker in DEV", () => {
    const origEnv = import.meta.env.PROD;
    const registerMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
    });
    import.meta.env.PROD = false;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </MemoryRouter>
    );
    expect(registerMock).not.toHaveBeenCalled();
    import.meta.env.PROD = origEnv;
  });
});
