import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { RsvpFormContext } from "../../contexts/useRsvpContext";

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
}));

function mockSection(name: string) {
  return { default: () => <div data-testid={`section-${name}`} /> };
}
vi.mock("../../pages/sections/TransportSection", () => mockSection("transport"));
vi.mock("../../pages/sections/InfoSection", () => mockSection("info"));
vi.mock("../../pages/sections/StorySection", () => mockSection("story"));
vi.mock("../../pages/sections/GiftsSection", () => mockSection("gifts"));
vi.mock("../../pages/sections/AccommodationSection", () => mockSection("accommodation"));
vi.mock("../../pages/sections/GallerySection", () => mockSection("gallery"));
vi.mock("../../pages/sections/RsvpSection", () => mockSection("rsvp"));
vi.mock("../../lib/image-store", () => ({
  loadGallery: vi.fn(() => Promise.resolve([])),
}));

function runAxe(html: HTMLElement): Promise<axe.AxeResults> {
  return new Promise((resolve) => {
    axe.run(
      html,
      {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
      (err, results) => {
        if (err) throw err;
        resolve(results);
      },
    );
  });
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("react-router", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token", search: "", hash: "" }),
  useNavigate: () => vi.fn(),
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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
  useApp: () => ({
    config: { firstName: "John", secondName: "Jane", theme: "golden" },
    formData: {},
    isConfigLoading: false,
    configLoadError: "",
    hasStoredConfig: true,
    isAdminTokenLoggedIn: false,
    inviteToken: "test-token",
    rsvpForm: {
      attendees: [],
      guestName: "",
      attendance: "yes",
      privacyConsent: false,
      healthConsent: false,
      parentalConsent: false,
    },
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
  useConfig: () => ({
    config: { firstName: "John", secondName: "Jane", theme: "golden" },
    formData: {},
    isConfigLoading: false,
    configLoadError: "",
    hasStoredConfig: true,
    inviteToken: "test-token",
    maxAllowedYear: 2099,
    previewBackgrounds: [],
    isPreviewLoading: false,
    formattedDate: "June 15, 2026",
    formattedTime: "5:00 PM",
    calendarLink: null,
    updateFormField: vi.fn(),
    handleSaveSetup: vi.fn(),
    handleDeleteInvitation: vi.fn(),
    setHasStoredConfig: vi.fn(),
    registerOnFirstSave: vi.fn(),
    reloadConfig: vi.fn(),
    visitCount: 0,
  }),
  useAuth: () => ({
    isAdminTokenLoggedIn: false,
    isTokenVerified: true,
    setupToken: "",
    tokenLoginUsername: "",
    handleAdminLogout: vi.fn(),
    handleResetTokenFromAdmin: vi.fn(),
    setIsTokenVerified: vi.fn(),
    setTokenLoginUsername: vi.fn(),
  }),
  useRsvpContext: () => ({
    rsvpForm: {
      attendees: [],
      guestName: "",
      attendance: "yes",
      privacyConsent: false,
      healthConsent: false,
      parentalConsent: false,
    },
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
  }),
  useAppUI: () => ({
    setLegalModal: vi.fn(),
    saveMessage: "",
    saveError: "",
    adminMessage: "",
    adminMessageType: "success",
    setAdminMessage: vi.fn(),
    setAdminMessageType: vi.fn(),
  }),
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
    SESSION_DURATION_MS: 3600000,
    MONTH_VALUE_TO_NUMBER: {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    },
  }),
};

// Mock de constantes a nivel de módulo: PrintPage y RsvpSection leen APP_VERSION
// y configuraciones globales en su render (vi.mock se aplica por hoisting).
vi.mock("../../lib/constants", () => BASE_MOCK_CTX.constants());

describe("a11y-page-audit", () => {
  it("LandingPage has no critical violations", async () => {
    const LandingPage = (await import("../../pages/LandingPage")).default;
    const { container } = render(<LandingPage />);
    const results = await runAxe(container);
    const criticalViolations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(criticalViolations).toHaveLength(0);
  });

  it("PrintPage has no a11y violations", async () => {
    const PrintPage = (await import("../../pages/PrintPage")).default;
    const { container } = render(<PrintPage />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("RsvpSection with transport and menu has no serious violations", async () => {
    const RsvpSection = (await import("../../pages/sections/RsvpSection")).default;
    const rsvpForm = {
      guestName: "",
      attendance: "with",
      companionCount: 1,
      companionNames: [""],
      companionMenus: [""],
      companionAllergies: [[]],
      companionAllergiesOther: [""],
      companionIsChildren: [],
      companionHealthConsents: [false],
      companionTransportChoices: ["0"],
      companionTransportModes: ["bus"],
      companionTransportTimes: [""],
      companionTransportPlaces: [""],
      menuSelection: "",
      allergies: [],
      allergiesOther: "",
      parentalConsent: false,
      privacyConsent: false,
      healthConsent: false,
      transportChoice: "0",
      transportMode: "bus",
      transportTime: "",
      transportPlace: "",
      digitalSignature: false,
      phone: "",
      email: "",
    };
    const { container } = render(
      <RsvpFormContext.Provider
        value={{
          rsvpForm: rsvpForm,
          updateRsvpField: vi.fn(),
          handleRsvpSubmit: vi.fn(),
          setRsvpForm: vi.fn(),
        }}
      >
        <RsvpSection
          style={{}}
          className="test"
          handleDeleteRsvp={vi.fn()}
          menuEnabled
          menuCarneDishes={JSON.stringify([{ order: "primero", text: "Solomillo" }])}
          transportEnabled="both"
          transportDepartures={JSON.stringify([
            { type: "bus", time: "12:00", url: "https://www.google.com/maps/place/Plaza+Mayor/@40.41,-3.70,17z" },
            { type: "taxi", time: "14:30", url: "" },
          ])}
        />
      </RsvpFormContext.Provider>,
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

  it("EnvelopeOverlay has no serious violations", async () => {
    const EnvelopeOverlay = (await import("../../components/EnvelopeOverlay")).default;
    const { container } = render(<EnvelopeOverlay onOpen={vi.fn()} firstName="John" secondName="Jane" />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("LegalModal has no serious violations", async () => {
    const LegalModal = (await import("../../components/LegalModal")).default;
    const { container } = render(<LegalModal section="privacy" onClose={vi.fn()} />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("ChangelogModal has no serious violations", async () => {
    const ChangelogModal = (await import("../../components/ChangelogModal")).default;
    const { container } = render(<ChangelogModal onClose={vi.fn()} />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("CookieConsent has no serious violations", async () => {
    // jsdom no expone localStorage: se provee un shim para el banner.
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k]);
        },
      },
      configurable: true,
    });
    const CookieConsent = (await import("../../components/CookieConsent")).default;
    const { container } = render(<CookieConsent />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("DataRequestModal has no serious violations", async () => {
    const DataRequestModal = (await import("../../components/DataRequestModal")).default;
    const { container } = render(<DataRequestModal inviteToken="test-token" onClose={vi.fn()} />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("PublicInvitation has no serious violations", async () => {
    const PublicInvitation = (await import("../../pages/PublicInvitation")).default;
    const { container } = render(<PublicInvitation />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  // ── Secciones REALES (no mockeadas) ─────────────────────────────────
  // El audit detectó que PublicInvitation mockeaba las secciones con
  // mockSection(): las secciones presentacionales nunca pasaban por axe.
  // Estas pruebas renderizan las secciones reales con props mínimas.

  it("HeroSection (real) has no serious violations", async () => {
    const HeroSection = (await import("../../pages/sections/HeroSection")).default;
    const { container } = render(
      <HeroSection
        style={{}}
        className="test"
        firstName="John"
        secondName="Jane"
        inviteMessage="¡Nos casamos!"
        weddingDate={new Date(Date.now() + 3 * 86400000)}
      />,
    );
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("StorySection (real) has no serious violations", async () => {
    const StorySection = (await import("../../pages/sections/StorySection")).default;
    const { container } = render(<StorySection style={{}} className="test" storyText="Nos conocimos en el parque." />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("GiftsSection (real) has no serious violations", async () => {
    const GiftsSection = (await import("../../pages/sections/GiftsSection")).default;
    const { container } = render(
      <GiftsSection
        style={{}}
        className="test"
        giftsInfo="Tu presencia es el mejor regalo"
        bankInfo="ES91 2100 0418 4502 0005 1332"
      />,
    );
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("InfoSection (real) with schedule, dress code and kids policy has no serious violations", async () => {
    const InfoSection = (await import("../../pages/sections/InfoSection")).default;
    const { container } = render(
      <InfoSection
        style={{}}
        className="test"
        weddingScheduleEvents={JSON.stringify([
          { time: "18:00", text: "Ceremonia", emoji: "💍" },
          { time: "20:00", text: "Banquete" },
        ])}
        weddingDressCode="Vestimenta formal"
        kidsPolicy="playArea"
      />,
    );
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("Pagination has no serious violations", async () => {
    const Pagination = (await import("../../components/Pagination")).default;
    const { container } = render(
      <Pagination
        page={0}
        totalPages={3}
        pageSize={10}
        total={30}
        pageSizes={[5, 10, 25]}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("LoadingOverlay has no serious violations", async () => {
    const LoadingOverlay = (await import("../../components/LoadingOverlay")).default;
    const { container } = render(<LoadingOverlay visible />);
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });

  it("CollapsibleSection has no serious violations", async () => {
    const CollapsibleSection = (await import("../../components/CollapsibleSection")).default;
    const { container } = render(
      <CollapsibleSection title="Mi sección" defaultOpen>
        <p>Contenido</p>
      </CollapsibleSection>,
    );
    const results = await runAxe(container);
    const violations = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(violations).toHaveLength(0);
  });
});
