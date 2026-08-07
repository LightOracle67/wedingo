import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement, Fragment, useContext } from "react";

const mockHandleSaveSetup = vi.fn();
let mockHasStoredConfig = true;
let mockIsTokenVerified = true;
let mockSetupToken = "";
let mockMenuEnabled = "true";
let mockMenuCarne = "";
let mockMenuPescado = "";
let mockMenuVegano = "";
let mockMenuTexto = "";
let mockConfigMenuEnabled = "false";
let mockConfigMenuCarne = "";
let mockConfigMenuPescado = "";
let mockConfigMenuVegano = "";
let mockConfigMenuTexto = "";
let mockRsvpEntries: Array<{ attendance: string }> = [];
let mockT = vi.fn((key: string) => key);
let mockSetSaveError = vi.fn();
let mockSetSaveMessage = vi.fn();

const mockUseAppUI = vi.fn(() => ({
  setSaveError: mockSetSaveError,
  setSaveMessage: mockSetSaveMessage,
}));

const mockUseConfig = vi.fn(() => ({
  hasStoredConfig: mockHasStoredConfig,
  config: {
    menuEnabled: mockConfigMenuEnabled,
    menuCarne: mockConfigMenuCarne,
    menuPescado: mockConfigMenuPescado,
    menuVegano: mockConfigMenuVegano,
    menuTexto: mockConfigMenuTexto,
  },
  formData: {
    menuEnabled: mockMenuEnabled,
    menuCarne: mockMenuCarne,
    menuPescado: mockMenuPescado,
    menuVegano: mockMenuVegano,
    menuTexto: mockMenuTexto,
  },
  handleSaveSetup: mockHandleSaveSetup,
}));

const mockUseAuth = vi.fn(() => ({
  isTokenVerified: mockIsTokenVerified,
  setupToken: mockSetupToken,
}));

const mockUseRsvp = vi.fn(() => ({
  rsvpEntries: mockRsvpEntries,
}));

const mockConfirm = vi.fn();
window.confirm = mockConfirm;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("../useAppUI", () => ({ useAppUI: () => mockUseAppUI() }));
vi.mock("../useConfig", () => ({ useConfig: () => mockUseConfig() }));
vi.mock("../useAuth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../useRsvpContext", () => ({ useRsvpContext: () => mockUseRsvp() }));

function MockProvider({ children, value: _value }: { value?: unknown; children: unknown }) {
  return createElement(Fragment, null, children as React.ReactNode);
}

vi.mock("../UIContext", () => ({ UIProvider: MockProvider }));
vi.mock("../ConfigContext", () => ({ ConfigProvider: MockProvider }));
vi.mock("../AuthContext", () => ({ AuthProvider: MockProvider }));
vi.mock("../RsvpContext", () => ({ RsvpProvider: MockProvider }));

import { AppProvider } from "../AppContext";
import { AppContext } from "../useApp";

function TestConsumer() {
  const ctx = useContext(AppContext);
  return (
    <div>
      <button data-testid="save-btn" onClick={(e) => ctx?.handleSaveSetup(e)}>
        Save
      </button>
    </div>
  );
}

describe("AppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    mockT.mockImplementation((key: string) => key);
    mockHandleSaveSetup.mockResolvedValue(undefined);
    mockHasStoredConfig = true;
    mockIsTokenVerified = true;
    mockSetupToken = "";
    mockMenuEnabled = "true";
    mockMenuCarne = "";
    mockMenuPescado = "";
    mockMenuVegano = "";
    mockMenuTexto = "";
    mockConfigMenuEnabled = "false";
    mockConfigMenuCarne = "";
    mockConfigMenuPescado = "";
    mockConfigMenuVegano = "";
    mockConfigMenuTexto = "";
    mockRsvpEntries = [];
  });

  it("renders children", () => {
    render(
      <AppProvider>
        <div>child</div>
      </AppProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("shows verify token error when no stored config and no verified token", () => {
    mockHasStoredConfig = false;
    mockIsTokenVerified = false;
    mockSetupToken = "";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockSetSaveError).toHaveBeenCalledWith("errors.verifyTokenFirst");
    expect(mockHandleSaveSetup).not.toHaveBeenCalled();
  });

  it("calls handleSaveSetup when no rsvp entries", () => {
    mockRsvpEntries = [];
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockHandleSaveSetup).toHaveBeenCalled();
  });

  it("shows confirm dialog when menu changes and rsvp exists", () => {
    mockRsvpEntries = [{ attendance: "yes" }, { attendance: "no" }];
    mockMenuEnabled = "true";
    mockConfigMenuEnabled = "false";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockConfirm).toHaveBeenCalledWith("settings.menuChangeConfirm");
    expect(mockHandleSaveSetup).toHaveBeenCalled();
  });

  it("cancels save when user declines menu change confirm", () => {
    mockConfirm.mockReturnValue(false);
    mockRsvpEntries = [{ attendance: "yes" }];
    mockMenuEnabled = "false";
    mockConfigMenuEnabled = "true";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockHandleSaveSetup).not.toHaveBeenCalled();
  });

  it("detects menuCarne change", () => {
    mockRsvpEntries = [{ attendance: "yes" }];
    mockMenuCarne = "chicken";
    mockConfigMenuCarne = "beef";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockConfirm).toHaveBeenCalled();
  });

  it("detects menuTexto change", () => {
    mockRsvpEntries = [{ attendance: "yes" }];
    mockMenuTexto = "new text";
    mockConfigMenuTexto = "old text";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockConfirm).toHaveBeenCalled();
  });

  it("computes rsvpCount with zero filtered yes entries", () => {
    mockRsvpEntries = [{ attendance: "no" }, { attendance: "no" }];
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockHandleSaveSetup).toHaveBeenCalled();
  });

  it("skips confirm when no menu changes even with rsvp", () => {
    mockRsvpEntries = [{ attendance: "yes" }];
    mockMenuEnabled = "true";
    mockConfigMenuEnabled = "true";
    mockMenuCarne = "chicken";
    mockConfigMenuCarne = "chicken";
    mockMenuPescado = "fish";
    mockConfigMenuPescado = "fish";
    mockMenuVegano = "vegan";
    mockConfigMenuVegano = "vegan";
    mockMenuTexto = "text";
    mockConfigMenuTexto = "text";
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );
    fireEvent.click(screen.getByTestId("save-btn"));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockHandleSaveSetup).toHaveBeenCalled();
  });
});
