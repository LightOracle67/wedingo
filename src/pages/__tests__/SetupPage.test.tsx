import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token/setup", search: "" }),
  useNavigate: () => vi.fn(),
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden" },
    formData: {},
    isConfigLoading: false,
    configLoadError: "",
    hasStoredConfig: false,
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
    isAdminTokenLoggedIn: true,
    authMessage: undefined,
    authMessageType: undefined,
    saveMessage: undefined,
    refreshSetupToken: vi.fn(),
  }),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

import SetupPage from "../SetupPage";

describe("SetupPage", () => {
  it("renders setup title", () => {
    render(<SetupPage />);
    expect(screen.getByText("setup.configTitle")).toBeDefined();
  });
});
