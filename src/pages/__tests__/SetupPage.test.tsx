import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
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
  useToast: (...args: Parameters<typeof mockUseToast>) => mockUseToast(...args),
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
  generateNewToken: vi.fn(),
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

  it("shows the success card (no token modal) when saveMessage and hasStoredConfig are set", () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token-123",
    });

    render(<SetupPage />);
    expect(screen.getByText("setup.successTitle")).toBeDefined();
    expect(screen.queryByText("setup.tokenModalTitle")).toBeNull();
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

  it("renders retry button in error state and triggers reload", () => {
    const reloadSpy = vi.fn();
    // Sustituye solo location.reload preservando el resto de window
    // (eventos, etc.) mediante un objeto con herencia del window real.
    const realWindow = globalThis.window;
    const fakeWindow = Object.create(realWindow);
    Object.defineProperty(fakeWindow, "location", { value: { reload: reloadSpy }, configurable: true });
    Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true, writable: true });
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

  it("redirects to admin after showSuccess timer", () => {
    vi.useFakeTimers();
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token",
      config: { ...baseMock.config, adminUsername: "admin" },
    });

    render(<SetupPage />);
    // Tras guardar se muestra la tarjeta de éxito (sin modal).
    expect(screen.getByText("setup.successTitle")).toBeDefined();
    expect(screen.queryByText("setup.tokenModalTitle")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/test-token/admin", { replace: true });
    vi.useRealTimers();
  });

  it("does not regenerate the token when saving (usa las credenciales previas)", async () => {
    const generateFn = vi.fn().mockResolvedValue(undefined);
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token",
      generateNewToken: generateFn,
      refreshSetupToken: vi.fn(),
    });

    render(<SetupPage />);
    await screen.findByText("setup.successTitle");
    expect(generateFn).not.toHaveBeenCalled();
  });

  it("navigates to cover page when viewCover is clicked", async () => {
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
    await screen.findByText("setup.successTitle");
    fireEvent.click(screen.getByText("setup.viewCover"));
    expect(mockNavigate).toHaveBeenCalledWith("/test-token");
  });

  it("navigates to admin panel from success card", async () => {
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
    await screen.findByText("setup.successTitle");
    fireEvent.click(screen.getByText("setup.goToPanel"));
    expect(mockNavigate).toHaveBeenCalledWith("/test-token/admin");
  });

  it("shows the success card after save without requiring the token modal", async () => {
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
      config: { ...baseMock.config, adminUsername: "" },
    });

    render(<SetupPage />);
    await screen.findByText("setup.successTitle");
    expect(screen.queryByText("setup.tokenModalTitle")).toBeNull();
    expect(screen.getByText("setup.successTitle")).toBeDefined();
  });

  it("hides the form and shows the success card when saveMessage is set", async () => {
    mockUseApp.mockReturnValue({
      ...baseMock,
      hasStoredConfig: true,
      saveMessage: "Saved!",
      setupToken: "my-setup-token",
    });

    render(<SetupPage />);
    await screen.findByText("setup.successTitle");
    const transitionDiv = document.querySelector(".setup-page-transition");
    expect(transitionDiv).toBeDefined();
    expect(transitionDiv?.className).toContain("setup-page-hidden");
  });
});
