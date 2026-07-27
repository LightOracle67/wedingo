import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ inviteToken: "test-token" }),
  useLocation: () => ({ pathname: "/test-token/setup", search: "" }),
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
}));

const mockUseApp = vi.fn();
vi.mock("../../contexts", () => ({
  useApp: (...args: unknown[]) => mockUseApp(...args),
}));

const mockUseToast = vi.fn(() => ({ addToast: vi.fn() }));
vi.mock("../../hooks/useToast", () => ({
  useToast: (...args: unknown[]) => mockUseToast(...args),
}));

vi.mock("../../components/SetupForm", () => ({
  default: ({ prefix }: { prefix: string }) => <div data-testid="setup-form">{prefix}</div>,
}));

vi.mock("../../components/MusicPlayer", () => ({
  default: ({ musicUrl }: { musicUrl: string }) => <div data-testid="music-player">{musicUrl}</div>,
}));

import SetupPage from "../SetupPage";

const baseMock = {
  config: { theme: "golden", firstName: "John", secondName: "Jane", adminUsername: "admin", musicFile: "", musicUrl: "" },
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
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseApp.mockReset();
  mockUseToast.mockClear();
  mockUseToast.mockReturnValue({ addToast: vi.fn() });
});

describe("SetupPage", () => {
  it("renders loading state when config is loading", () => {
    mockUseApp.mockReturnValue({ ...baseMock, isConfigLoading: true });

    render(<SetupPage />);
    expect(screen.getByText("setup.loadingTitle")).toBeDefined();
    expect(screen.getByText("setup.loadingText")).toBeDefined();
  });

  it("renders error state when configLoadError is set", () => {
    mockUseApp.mockReturnValue({ ...baseMock, configLoadError: "Something went wrong" });

    render(<SetupPage />);
    expect(screen.getByText("setup.errorTitle")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("common.retry")).toBeDefined();
  });

  it("redirects when hasStoredConfig is true and no saveMessage", () => {
    mockUseApp.mockReturnValue({ ...baseMock, hasStoredConfig: true, saveMessage: undefined });

    render(<SetupPage />);
    expect(screen.getByText("Redirect to /test-token/admin")).toBeDefined();
  });

  it("renders setup title and form in normal state", () => {
    mockUseApp.mockReturnValue(baseMock);

    render(<SetupPage />);
    expect(screen.getByText("setup.configTitle")).toBeDefined();
    expect(screen.getByText("setup.configSubtitle")).toBeDefined();
    expect(screen.getByText("setup.configText")).toBeDefined();
    expect(screen.getByTestId("setup-form")).toBeDefined();
  });

  it("renders token modal when saveMessage and hasStoredConfig are set", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token-123",
    });

    render(<SetupPage />);
    expect(screen.getByText("setup.tokenModalTitle")).toBeDefined();
    expect(screen.getByText("setup.tokenModalText")).toBeDefined();
    expect(screen.getByDisplayValue("my-setup-token-123")).toBeDefined();
  });

  it("shows success card after closing token modal", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { credentials: { store: vi.fn() }, clipboard: { writeText: vi.fn() } },
      configurable: true,
      writable: true,
    });
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token-123",
      config: { ...baseMock.config, adminUsername: "admin" },
    });

    render(<SetupPage />);
    const continueBtn = screen.getByText("setup.tokenModalContinue");
    fireEvent.click(continueBtn);
    expect(screen.getByText("setup.successTitle")).toBeDefined();
    expect(screen.getByText("setup.goToPanel")).toBeDefined();
    expect(screen.getByText("setup.viewCover")).toBeDefined();
  });

  it("renders music player when musicFile is present", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      config: { ...baseMock.config, musicFile: "song.mp3", musicUrl: "" },
    });

    render(<SetupPage />);
    expect(screen.getByTestId("music-player")).toBeDefined();
  });

  it("renders music player when musicUrl is present", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      config: { ...baseMock.config, musicFile: "", musicUrl: "https://example.com/song.mp3" },
    });

    render(<SetupPage />);
    expect(screen.getByTestId("music-player")).toBeDefined();
  });

  it("copies token and shows copied state", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText: vi.fn() } },
      configurable: true,
      writable: true,
    });
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token-123",
    });

    render(<SetupPage />);
    const copyBtn = screen.getByText("common.copy");
    fireEvent.click(copyBtn);
    expect(screen.getByText("common.copied")).toBeDefined();
    expect(screen.queryByText("common.copy")).toBeNull();
  });

  it("renders retry button in error state and triggers reload", () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(globalThis, "window", {
      value: { location: { reload: reloadSpy } },
      configurable: true,
      writable: true,
    });
    mockUseApp.mockReturnValue({ ...baseMock, configLoadError: "Error loading config" });

    render(<SetupPage />);
    const retryBtn = screen.getByText("common.retry");
    fireEvent.click(retryBtn);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it("shows toast when authMessage is set", () => {
    const addToast = vi.fn();
    mockUseToast.mockReturnValue({ addToast });
    mockUseApp.mockReturnValue({
      ...baseMock,
      authMessage: "Config saved!",
      authMessageType: "success",
    });

    render(<SetupPage />);
    expect(addToast).toHaveBeenCalledWith("success", "Config saved!");
  });

  it("shows error toast when authMessageType is error", () => {
    const addToast = vi.fn();
    mockUseToast.mockReturnValue({ addToast });
    mockUseApp.mockReturnValue({
      ...baseMock,
      authMessage: "Something went wrong",
      authMessageType: "error",
    });

    render(<SetupPage />);
    expect(addToast).toHaveBeenCalledWith("error", "Something went wrong");
  });

  it("redirects after showSuccess timer", () => {
    vi.useFakeTimers();
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token",
      config: { ...baseMock.config, adminUsername: "admin" },
    });

    render(<SetupPage />);
    const continueBtn = screen.getByText("setup.tokenModalContinue");
    fireEvent.click(continueBtn);
    expect(screen.getByText("setup.successTitle")).toBeDefined();
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith("/test-token/admin", { replace: true });
  });

  it("refreshes setup token when empty on save", () => {
    const refreshFn = vi.fn().mockResolvedValue(undefined);
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "",
      refreshSetupToken: refreshFn,
    });

    render(<SetupPage />);
    expect(refreshFn).toHaveBeenCalled();
  });
});
