import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUpdateDoc = vi.fn(() => Promise.resolve());
const mockGetSession = vi.fn(() => null);
const mockSaveSession = vi.fn();
const mockRegisterOnFirstSave = vi.fn();
const mockSetAdminMessage = vi.fn();
const mockSetAdminMessageType = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/test" }),
}));

const mockUseConfig = vi.fn(() => ({
  inviteToken: "test-token",
  config: { adminUsername: "admin" },
  setHasStoredConfig: vi.fn(),
  registerOnFirstSave: mockRegisterOnFirstSave,
}));

vi.mock("../useConfig", () => ({
  useConfig: () => mockUseConfig(),
}));

vi.mock("../useAppUI", () => ({
  useAppUI: () => ({ setAdminMessage: mockSetAdminMessage, setAdminMessageType: mockSetAdminMessageType }),
}));

const mockSetSetupToken = vi.fn();
const mockSetSetupTokenInput = vi.fn();
const mockSetIsTokenVerified = vi.fn();
const mockSetTokenLoginUsername = vi.fn();
const mockRefreshSetupToken = vi.fn();

vi.mock("../../hooks/useSetupAuth", () => ({
  useSetupAuth: () => ({
    setupToken: "",
    setupTokenInput: "",
    isTokenVerifying: false,
    isTokenVerified: false,
    tokenLoginUsername: "",
    adminLoginUsername: "",
    isAdminTokenLoggedIn: false,
    confirmTokenInput: "",
    authMessage: "",
    authMessageType: "success",
    refreshSetupToken: mockRefreshSetupToken,
    handleTokenLogin: vi.fn(),
    handleAdminTokenLogin: vi.fn(),
    handleAdminLogout: vi.fn(),
    handleResetSetupToken: vi.fn(),
    handleResetTokenFromAdmin: vi.fn(),
    setSetupTokenInput: mockSetSetupTokenInput,
    setIsTokenVerified: mockSetIsTokenVerified,
    setTokenLoginUsername: mockSetTokenLoginUsername,
    setAdminLoginUsername: vi.fn(),
    setConfirmTokenInput: vi.fn(),
    setSetupToken: mockSetSetupToken,
    setAuthMessage: vi.fn(),
  }),
}));

vi.mock("firebase/firestore", () => ({
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => new Date("2026-01-01")),
  doc: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
  invitationDocRef: vi.fn(() => "invitations/test-token"),
}));

vi.mock("../../lib/sessionVars", () => ({
  getSession: () => mockGetSession(),
  firestoreSessionExpiry: vi.fn(() => new Date("2027-01-01")),
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
}));

import { AuthProvider } from "../AuthContext";

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(<AuthProvider><div>child</div></AuthProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("registers onFirstSave callback", () => {
    render(<AuthProvider><div>child</div></AuthProvider>);
    expect(mockRegisterOnFirstSave).toHaveBeenCalledWith(expect.any(Function));
  });

  it("calls refreshSetupToken on mount with inviteToken", () => {
    render(<AuthProvider><div>child</div></AuthProvider>);
    expect(mockRefreshSetupToken).toHaveBeenCalled();
  });

  it("does not call refreshSetupToken without inviteToken", () => {
    mockUseConfig.mockReturnValueOnce({
      inviteToken: "",
      config: { adminUsername: "" },
      setHasStoredConfig: vi.fn(),
      registerOnFirstSave: vi.fn(),
    });
    render(<AuthProvider><div>child</div></AuthProvider>);
    expect(mockRefreshSetupToken).not.toHaveBeenCalled();
  });

  it("triggers session renewal via onFirstSave callback", async () => {
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetSetupToken).toHaveBeenCalledWith("");
    expect(mockSetSetupTokenInput).toHaveBeenCalledWith("");
    expect(mockUpdateDoc).toHaveBeenCalledWith("invitations/test-token", {
      activeSession: expect.any(Date),
      sessionExpiresAt: expect.any(Date),
    });
    expect(mockSetIsTokenVerified).toHaveBeenCalledWith(true);
  });

  it("handles session update error gracefully", async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error("update failed"));
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetAdminMessageType).toHaveBeenCalledWith("error");
    expect(mockSetAdminMessage).toHaveBeenCalledWith("errors.sessionUpdateFailed");
  });
});
