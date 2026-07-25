import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token/admin", search: "" }),
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", firstName: "John", secondName: "Jane" },
    formData: {},
    isConfigLoading: true,
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
    formatDate: vi.fn(() => ""),
  }),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../lib/constants", () => ({
  STORY_SECTION_ORDER: ["hero", "details", "info", "story", "gifts", "accommodation", "gallery", "rsvp"],
  THEME_VALUES: new Set(["golden", "silver", "rose"]),
}));

import AdminPage from "../AdminPage";

describe("AdminPage", () => {
  it("shows loading state", () => {
    render(<AdminPage />);
    expect(screen.getByText("admin.loadingConfig")).toBeDefined();
  });

  it("has loading aria-label", () => {
    render(<AdminPage />);
    expect(screen.getByLabelText("setup.loadingTitle")).toBeDefined();
  });
});
