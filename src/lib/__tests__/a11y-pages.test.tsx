import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";

function runAxe(html: HTMLElement): Promise<axe.AxeResults> {
  return new Promise((resolve) => {
    axe.run(html, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    }, (err, results) => {
      if (err) throw err;
      resolve(results);
    });
  });
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("react-router", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token", search: "" }),
  useNavigate: () => vi.fn(),
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: { firstName: "John", secondName: "Jane", theme: "golden" },
    formData: {},
    isConfigLoading: false,
    configLoadError: "",
    hasStoredConfig: true,
    isAdminTokenLoggedIn: false,
    inviteToken: "test-token",
    rsvpForm: { attendees: [], guestName: "", attendance: "yes", birthDate: "", privacyConsent: false, healthConsent: false, parentalConsent: false },
    rsvpEntries: [],
    rsvpMessage: "",
    isRsvpSubmitting: false,
    hasSubmitted: false,
    alreadySubmittedEntry: null,
    updateRsvpField: vi.fn(),
    handleRsvpSubmit: vi.fn(),
    handleDeleteRsvp: vi.fn(),
    DIETARY_OPTIONS: [],
    computeAge: vi.fn(),
    updateFormField: vi.fn(),
    handleSaveSetup: vi.fn(),
    handleDayChange: vi.fn(),
    handleTimeChange: vi.fn(),
    handleTimeBlur: vi.fn(),
    handleYearChange: vi.fn(),
    handleCoordinateChange: vi.fn(),
    handleDeleteInvitation: vi.fn(),
    setHasStoredConfig: vi.fn(),
    registerOnFirstSave: vi.fn(),
    reloadConfig: vi.fn(),
    setupToken: "",
    isTokenVerified: true,
    adminLoginUsername: "",
    setLegalModal: vi.fn(),
    saveMessage: "",
    saveError: "",
    adminMessage: "",
    adminMessageType: "success",
    setAdminMessage: vi.fn(),
    setAdminMessageType: vi.fn(),
    visitCount: 0,
    handleClearRsvpEntries: vi.fn(),
    handleAdminLogout: vi.fn(),
    handleResetTokenFromAdmin: vi.fn(),
    locationMapContainerRef: { current: null },
    setLocationMapError: vi.fn(),
    setLocationMapLoading: vi.fn(),
    locationMapTarget: null,
    setLocationMapTarget: vi.fn(),
    maxAllowedYear: 2099,
    previewBackgrounds: [],
    isPreviewLoading: false,
    formattedDate: "June 15, 2026",
    formattedTime: "5:00 PM",
    calendarLink: null,
    exportPdf: vi.fn(),
    setActiveTab: vi.fn(),
    setAttendanceFilter: vi.fn(),
    formatDate: vi.fn(() => ""),
    setSearchQuery: vi.fn(),
    searchQuery: "",
    attendanceFilter: "all",
    filteredEntries: [],
  }),
}));

const BASE_MOCK_CTX = {
  firebase: () => ({ db: {} }),
  toast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
  constants: () => ({
    STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"],
    THEME_VALUES: new Set(["golden", "silver", "rose"]),
    defaultConfig: {},
    MAX_YEARS_AHEAD: 10,
    INVITE_CACHE_TTL_MS: 60000,
    TOKEN_ROUTE_REGEX: /^[a-zA-Z0-9]+$/,
    SPECIAL_SECTIONS: [],
    MAX_USERNAME_LENGTH: 50,
    MAX_INVITE_MESSAGE_LENGTH: 500,
    MAX_LONG_TEXT_LENGTH: 2000,
    MAX_SCHEDULE_EVENTS: 10,
    MAX_SCHEDULE_EVENT_TEXT: 60,
    PRIVACY_POLICY_VERSION: 1,
  }),
};

describe("a11y-page-audit", () => {
  it("LandingPage has no critical violations", async () => {
    const LandingPage = (await import("../../pages/LandingPage")).default;
    const { container } = render(<LandingPage />);
    const results = await runAxe(container);
    const criticalViolations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(criticalViolations).toHaveLength(0);
  });

  it("PrintPage has no a11y violations", async () => {
    vi.mock("../../lib/constants", () => BASE_MOCK_CTX.constants());
    const PrintPage = (await import("../../pages/PrintPage")).default;
    const { container } = render(<PrintPage />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("ErrorMessage renders with proper role", async () => {
    const { ErrorMessage } = await import("../../components/ErrorMessage");
    const { container } = render(<ErrorMessage error={new Error("Test")} />);
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("RsvpSection with transport and menu has no serious violations", async () => {
    vi.mock("../../lib/constants", () => BASE_MOCK_CTX.constants());
    const RsvpSection = (await import("../../pages/sections/RsvpSection")).default;
    const rsvpForm = {
      guestName: "",
      attendance: "with",
      birthDate: "",
      companionCount: 1,
      companionNames: [""],
      companionMenus: [""],
      companionAllergies: [[]],
      companionAllergiesOther: [""],
      companionBirthDates: [""],
      companionParentalConsents: [false],
      companionHealthConsents: [false],
      companionTransportChoices: ["0"],
      companionTransportModes: ["bus"],
      menuSelection: "",
      allergies: [],
      allergiesOther: "",
      parentalConsent: false,
      privacyConsent: false,
      healthConsent: false,
      transportChoice: "0",
      transportMode: "bus",
    };
    const { container } = render(
      <RsvpSection
        style={{}}
        className="test"
        rsvpForm={rsvpForm}
        updateRsvpField={vi.fn()}
        handleRsvpSubmit={vi.fn()}
        handleDeleteRsvp={vi.fn()}
        menuEnabled
        menuCarne="Solomillo"
        menuPescado="Lubina"
        menuVegano="Risotto"
        transportEnabled="both"
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
        computeAge={vi.fn(() => 30)}
      />,
    );
    const results = await runAxe(container);
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious).toHaveLength(0);
  });

  it("AccessibilityPanel open state has no violations", async () => {
    const AccessibilityPanel = (await import("../../components/AccessibilityPanel")).default;
    const { container } = render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });
});
