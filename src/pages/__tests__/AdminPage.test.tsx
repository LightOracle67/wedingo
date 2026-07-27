import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token/admin", search: "" }),
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
}));

const mockUseApp = vi.fn();
vi.mock("../../contexts", () => ({
  useApp: (...args: unknown[]) => mockUseApp(...args),
}));

const mockAddToast = vi.fn();
vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("../../lib/constants", () => ({
  STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"],
  THEME_VALUES: new Set(["golden", "silver", "rose"]),
}));

vi.mock("../admin/PanelTab", () => ({
  default: () => <div data-testid="panel-tab" />,
}));

vi.mock("../admin/InvitationTab", () => ({
  default: () => <div data-testid="invitation-tab" />,
}));

vi.mock("../admin/AttendanceTab", () => ({
  default: () => <div data-testid="attendance-tab" />,
}));

vi.mock("../admin/AccessTab", () => ({
  default: () => <div data-testid="access-tab" />,
}));

vi.mock("../admin/ShareTab", () => ({
  default: () => <div data-testid="share-tab" />,
}));

vi.mock("../admin/SupportTab", () => ({
  default: () => <div data-testid="support-tab" />,
}));

import AdminPage from "../AdminPage";

const baseMock = {
  config: { theme: "golden", firstName: "John", secondName: "Jane" },
  formData: {},
  isConfigLoading: false,
  configLoadError: "",
  hasStoredConfig: true,
  isAdminTokenLoggedIn: true,
  inviteToken: "test-token",
  updateFormField: vi.fn(),
  handleSaveSetup: vi.fn(),
  maxAllowedYear: 2099,
  previewBackgrounds: [],
  isPreviewLoading: false,
  formattedDate: "",
  formattedTime: "",
  calendarLink: null,
  handleDayChange: vi.fn(),
  handleHourChange: vi.fn(),
  handleMinuteChange: vi.fn(),
  handleMinuteBlur: vi.fn(),
  handleYearChange: vi.fn(),
  handleCoordinateChange: vi.fn(),
  handleDeleteInvitation: vi.fn(),
  setHasStoredConfig: vi.fn(),
  registerOnFirstSave: vi.fn(),
  setupToken: "",
  isTokenVerified: true,
  adminLoginUsername: "",
  rsvpEntries: [],
  rsvpForm: { attendees: [] },
  rsvpMessage: "",
  isRsvpSubmitting: false,
  hasSubmitted: false,
  alreadySubmittedEntry: null,
  updateRsvpField: vi.fn(),
  handleRsvpSubmit: vi.fn(),
  handleDeleteRsvp: vi.fn(),
  handleDietaryToggle: vi.fn(),
  DIETARY_OPTIONS: [],
  computeAge: vi.fn(),
  setSaveError: vi.fn(),
  setSaveMessage: vi.fn(),
  adminMessage: "",
  adminMessageType: "success",
  setAdminMessage: vi.fn(),
  setAdminMessageType: vi.fn(),
  setLegalModal: vi.fn(),
  saveMessage: "",
  saveError: "",
  visitCount: 0,
  handleClearRsvpEntries: vi.fn(),
  handleAdminLogout: vi.fn(),
  handleResetTokenFromAdmin: vi.fn(),
  reloadConfig: vi.fn(),
};

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApp.mockReturnValue(baseMock);
  });

  it("shows loading state", () => {
    mockUseApp.mockReturnValue({ ...baseMock, isConfigLoading: true });

    render(<AdminPage />);
    expect(screen.getByText("admin.loadingConfig")).toBeDefined();
  });

  it("has loading aria-label", () => {
    mockUseApp.mockReturnValue({ ...baseMock, isConfigLoading: true });

    render(<AdminPage />);
    expect(screen.getByLabelText("setup.loadingTitle")).toBeDefined();
  });

  it("shows error state with retry button", () => {
    mockUseApp.mockReturnValue({ ...baseMock, configLoadError: "Failed to load" });

    render(<AdminPage />);
    expect(screen.getByText("admin.errorLoadingConfig")).toBeDefined();
    expect(screen.getByText("Failed to load")).toBeDefined();
    expect(screen.getByText("common.retry")).toBeDefined();
  });

  it("redirects when no stored config", () => {
    mockUseApp.mockReturnValue({ ...baseMock, hasStoredConfig: false });

    render(<AdminPage />);
    expect(screen.getByText(/Redirect to.*setup/)).toBeDefined();
  });

  it("redirects when not admin token logged in", () => {
    mockUseApp.mockReturnValue({ ...baseMock, isAdminTokenLoggedIn: false });

    render(<AdminPage />);
    expect(screen.getByText(/Redirect to.*test-token/)).toBeDefined();
  });

  it("renders panel tab by default when all conditions met", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    expect(await screen.findByTestId("panel-tab")).toBeDefined();
    expect(screen.getByText("John & Jane")).toBeDefined();
    expect(screen.getByText("admin.manageInvitation")).toBeDefined();
  });

  it("renders all tab buttons", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    const tabKeys = ["panel", "invitation", "attendance", "share", "access", "support"];
    tabKeys.forEach((key) => {
      expect(screen.getByText(`admin.tabs.${key}`)).toBeDefined();
    });
  });

  it("shows toast when adminMessage is set", () => {
    mockUseApp.mockReturnValue({ ...baseMock, adminMessage: "Action completed", adminMessageType: "success" });

    render(<AdminPage />);
    expect(mockAddToast).toHaveBeenCalledWith("success", "Action completed");
  });

  it("shows error toast when adminMessageType is error", () => {
    mockUseApp.mockReturnValue({ ...baseMock, adminMessage: "Something failed", adminMessageType: "error" });

    render(<AdminPage />);
    expect(mockAddToast).toHaveBeenCalledWith("error", "Something failed");
  });
});
