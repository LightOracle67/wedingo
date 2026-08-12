import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router", () => {
  const params = new URLSearchParams("");
  return {
    Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
    useSearchParams: vi.fn(() => {
      const set = (next: unknown, _opts?: unknown) => {
        params.set("tab", next instanceof URLSearchParams ? String(next.get("tab") || "") : String(next ?? ""));
      };
      return [params, set];
    }),
  };
});

const mockUseSuperAdmin = vi.fn();
vi.mock("../../contexts/SuperAdminContext", () => ({
  useSuperAdmin: (...args: unknown[]) => mockUseSuperAdmin(...args),
}));

vi.mock("../superadmin/DashboardTab", () => ({
  default: () => <div data-testid="dashboard-tab" />,
}));

vi.mock("../superadmin/InvitationsTab", () => ({
  default: () => <div data-testid="invitations-tab" />,
}));

vi.mock("../superadmin/TokensTab", () => ({
  default: () => <div data-testid="tokens-tab" />,
}));

vi.mock("../superadmin/SettingsTab", () => ({
  default: () => <div data-testid="settings-tab" />,
}));

vi.mock("../superadmin/ComplianceTab", () => ({
  default: () => <div data-testid="compliance-tab" />,
}));

vi.mock("../superadmin/DataTab", () => ({
  default: () => <div data-testid="data-tab" />,
}));

vi.mock("../superadmin/ManageTab", () => ({
  default: () => <div data-testid="manage-tab" />,
}));
vi.mock("../superadmin/PlatformTab", () => ({
  default: () => <div data-testid="platform-tab" />,
}));
vi.mock("../superadmin/MetricsTab", () => ({
  default: () => <div data-testid="metrics-tab" />,
}));
vi.mock("../superadmin/SupportTab", () => ({
  default: () => <div data-testid="support-tab" />,
}));

import SuperAdminPanel from "../SuperAdminPanel";

const baseMock = {
  isSuperAdmin: true,
  isLoading: false,
};

describe("SuperAdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSuperAdmin.mockReturnValue(baseMock);
  });

  it("renders loading state", () => {
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, isLoading: true });

    render(<SuperAdminPanel />);
    expect(screen.getByText("common.loading")).toBeDefined();
  });

  it("redirects when not superadmin", () => {
    mockUseSuperAdmin.mockReturnValue({ ...baseMock, isSuperAdmin: false });

    render(<SuperAdminPanel />);
    expect(screen.getByText(/Redirect to/)).toBeDefined();
  });

  it("renders dashboard tab by default", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    expect(await screen.findByTestId("dashboard-tab")).toBeDefined();
    expect(screen.getByText("superadmin.controlPanel")).toBeDefined();
    expect(screen.getByText("superadmin.managePlatform")).toBeDefined();
  });

  it("renders all tab buttons", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    const tabs = ["dashboard", "invitations", "tokens", "data", "session", "compliance"];
    tabs.forEach((tab) => {
      expect(screen.getByText(`superadmin.tabs.${tab}`)).toBeDefined();
    });
  });

  it("switches tab on click", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    fireEvent.click(screen.getByText("superadmin.tabs.invitations"));
    expect(await screen.findByTestId("invitations-tab")).toBeDefined();
    expect(screen.queryByTestId("dashboard-tab")).toBeNull();
  });

  it("marks active tab with aria-selected", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    const firstTab = await screen.findByText("superadmin.tabs.dashboard");
    expect(firstTab.closest("button")?.getAttribute("aria-selected")).toBe("true");
  });

  it("switches to data tab", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    fireEvent.click(screen.getByText("superadmin.tabs.data"));
    expect(await screen.findByTestId("data-tab")).toBeDefined();
  });

  it("switches to settings tab", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    fireEvent.click(screen.getByText("superadmin.tabs.session"));
    expect(await screen.findByTestId("settings-tab")).toBeDefined();
  });

  it("switches to compliance tab", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    fireEvent.click(screen.getByText("superadmin.tabs.compliance"));
    expect(await screen.findByTestId("compliance-tab")).toBeDefined();
  });

  it("switches to tokens tab", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    fireEvent.click(screen.getByText("superadmin.tabs.tokens"));
    expect(await screen.findByTestId("tokens-tab")).toBeDefined();
  });

  it("switches to the remaining tabs (manage, platform, metrics, support)", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    const cases: Array<[string, string]> = [
      ["superadmin.tabs.manage", "manage-tab"],
      ["superadmin.tabs.platform", "platform-tab"],
      ["superadmin.tabs.metrics", "metrics-tab"],
      ["superadmin.tabs.support", "support-tab"],
    ];
    for (const [tabLabel, testId] of cases) {
      fireEvent.click(screen.getByText(tabLabel));
      expect(await screen.findByTestId(testId)).toBeDefined();
    }
  });

  it("navigates tabs with the keyboard (ArrowRight/ArrowLeft)", async () => {
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    await screen.findByTestId("dashboard-tab");
    // ArrowRight desde dashboard → metricas.
    fireEvent.keyDown(screen.getByText("superadmin.tabs.dashboard"), { key: "ArrowRight" });
    expect(await screen.findByTestId("metrics-tab")).toBeDefined();
    // ArrowLeft de vuelta a dashboard.
    fireEvent.keyDown(screen.getByText("superadmin.tabs.metrics"), { key: "ArrowLeft" });
    expect(await screen.findByTestId("dashboard-tab")).toBeDefined();
  });

  it("reconoce el parámetro ?tab= al arrancar", async () => {
    const { useSearchParams } = await import("react-router");
    (useSearchParams as ReturnType<typeof vi.fn>).mockImplementation(() => [new URLSearchParams("tab=datos"), vi.fn()]);
    render(
      <Suspense fallback={null}>
        <SuperAdminPanel />
      </Suspense>,
    );
    expect(await screen.findByTestId("data-tab")).toBeDefined();
  });
});
