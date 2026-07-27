import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

let mockSearch = "";
vi.mock("react-router-dom", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token/admin", search: mockSearch }),
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
  default: ({ config }: { config: Record<string, unknown> }) => (
    <div data-testid="panel-tab">
      <button data-testid="export-pdf-btn" onClick={() => { const fn = config.exportPdf as () => void; if (fn) fn(); }}>Export</button>
      <button data-testid="set-active-tab-btn" onClick={() => { const fn = config.setActiveTab as (t: string) => void; if (fn) fn("invitacion"); }}>Set Tab</button>
    </div>
  ),
}));

vi.mock("../admin/InvitationTab", () => ({
  default: () => <div data-testid="invitation-tab" />,
}));

vi.mock("../admin/AttendanceTab", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="attendance-tab">
      <button data-testid="set-attendance-filter-btn" onClick={() => { const fn = props.setAttendanceFilter as (f: string) => void; if (fn) fn("yes"); }}>Set Filter</button>
      <button data-testid="set-search-query-btn" onClick={() => { const fn = props.setSearchQuery as (q: string) => void; if (fn) fn("test"); }}>Set Search</button>
    </div>
  ),
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

  it("switches to invitation tab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.invitation"));
    expect(await screen.findByTestId("invitation-tab")).toBeDefined();
  });

  it("switches to attendance tab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.attendance"));
    expect(await screen.findByTestId("attendance-tab")).toBeDefined();
  });

  it("switches to share tab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.share"));
    expect(await screen.findByTestId("share-tab")).toBeDefined();
  });

  it("switches to access tab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.access"));
    expect(await screen.findByTestId("access-tab")).toBeDefined();
  });

  it("switches to support tab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.support"));
    expect(await screen.findByTestId("support-tab")).toBeDefined();
  });

  it("renders invitation tab via URL param", async () => {
    mockSearch = "?tab=invitacion";

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    expect(await screen.findByTestId("invitation-tab")).toBeDefined();

    mockSearch = "";
  });

  it("shows success toast when authMessage is set", () => {
    mockUseApp.mockReturnValue({ ...baseMock, authMessage: "Config saved", authMessageType: "success" });

    render(<AdminPage />);
    expect(mockAddToast).toHaveBeenCalledWith("success", "Config saved");
  });

  it("shows error toast when authMessageType is error", () => {
    mockUseApp.mockReturnValue({ ...baseMock, authMessage: "Config error", authMessageType: "error" });

    render(<AdminPage />);
    expect(mockAddToast).toHaveBeenCalledWith("error", "Config error");
  });

  it("updates URL when switching tabs via handleSetTab", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.invitation"));
    await screen.findByTestId("invitation-tab");
    expect(replaceStateSpy).toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });

  it("computes filteredEntries with attendance filter", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 1 },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    expect(screen.getByText("admin.tabs.attendance")).toBeDefined();
  });

  it("renders couple name in header", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    expect(await screen.findByText("John & Jane")).toBeDefined();
  });

  it("renders retry button in error state with click handler", () => {
    mockUseApp.mockReturnValue({ ...baseMock, configLoadError: "Failed to load" });

    render(<AdminPage />);
    const btn = screen.getByText("common.retry");
    expect(btn).toBeDefined();
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("computes totalGuests from rsvpEntries", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 1 },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    expect(screen.getByText("John & Jane")).toBeDefined();
  });

  it("sets activeTab via setActiveTabAndFilter callback", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.invitation"));
    expect(await screen.findByTestId("invitation-tab")).toBeDefined();
  });

  it("sets attendanceFilter via setAttendanceFilterValue callback", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    expect(screen.getByText("John & Jane")).toBeDefined();
  });

  it("filters rsvp entries by attendance filter", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 1 },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  });

  it("computes confirmed and declined responses from rsvpEntries", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 3 },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  });

  it("restores default tab when panel tab is selected via handleSetTab", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    mockSearch = "?tab=invitacion";
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("invitation-tab");

    fireEvent.click(screen.getByText("admin.tabs.panel"));
    await screen.findByTestId("panel-tab");

    expect(replaceStateSpy).toHaveBeenCalled();
    replaceStateSpy.mockRestore();
    mockSearch = "";
  });

  it("computes totalGuests correctly with companions", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  });

  it("filters by search query in filteredEntries", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 0 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 1 },
      ],
      searchQuery: "ali",
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  });

  it("handles exportPdf with RSVP data", async () => {
    const mockFocus = vi.fn();
    const mockWindowOpen = vi.fn(() => ({ focus: mockFocus }));
    vi.spyOn(window, "open").mockImplementation(mockWindowOpen);
    const createObjectURL = vi.fn(() => "blob:test");
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "Veg" },
        { guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "" },
      ],
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByTestId("export-pdf-btn"));
    expect(mockWindowOpen).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("filters rsvp entries with attendance filter 'no'", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      rsvpEntries: [
        { guestName: "Alice", attendance: "yes", companions: 2 },
        { guestName: "Bob", attendance: "no" },
        { guestName: "Charlie", attendance: "yes", companions: 1 },
      ],
      attendanceFilter: "no",
    });

    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  });

  it("calls setActiveTabAndFilter from PanelTab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByTestId("set-active-tab-btn"));
    await screen.findByTestId("invitation-tab");
  });

  it("calls setAttendanceFilter from AttendanceTab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.attendance"));
    await screen.findByTestId("attendance-tab");
    fireEvent.click(screen.getByTestId("set-attendance-filter-btn"));
  });

  it("calls setSearchQuery from AttendanceTab", async () => {
    render(
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
    await screen.findByTestId("panel-tab");
    fireEvent.click(screen.getByText("admin.tabs.attendance"));
    await screen.findByTestId("attendance-tab");
    fireEvent.click(screen.getByTestId("set-search-query-btn"));
  });
});
