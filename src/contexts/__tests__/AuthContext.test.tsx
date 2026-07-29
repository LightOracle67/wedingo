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

const mockUseAppUI = vi.fn(() => ({ setAdminMessage: mockSetAdminMessage, setAdminMessageType: mockSetAdminMessageType }));
vi.mock("../useAppUI", () => ({
  useAppUI: (...args: unknown[]) => mockUseAppUI(...args),
}));

const mockSetSetupToken = vi.fn();
const mockSetSetupTokenInput = vi.fn();
const mockSetIsTokenVerified = vi.fn();
const mockSetTokenLoginUsername = vi.fn();
const mockRefreshSetupToken = vi.fn();

const mockUseSetupAuth = vi.fn(() => ({
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
}));

vi.mock("../../hooks/useSetupAuth", () => ({
  useSetupAuth: () => mockUseSetupAuth(),
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

  it("skips session renewal when already verified", async () => {
    mockUseSetupAuth.mockReturnValueOnce({
      setupToken: "",
      setupTokenInput: "",
      isTokenVerifying: false,
      isTokenVerified: true,
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
    });
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetSetupToken).not.toHaveBeenCalled();
  });

  it("saves session with displayName on first save", async () => {
    mockGetSession.mockReturnValue({ identifier: "admin-user-name", expiresAt: Date.now() + 999999 });
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetTokenLoginUsername).toHaveBeenCalledWith("admin");
  });

  it("uses adminUsername when session has short identifier", async () => {
    mockGetSession.mockReturnValue({ identifier: "short", expiresAt: Date.now() + 999999 });
    mockUseConfig.mockReturnValue({
      inviteToken: "test-token",
      config: { adminUsername: "AdminUser" },
      setHasStoredConfig: vi.fn(),
      registerOnFirstSave: mockRegisterOnFirstSave,
    });
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetTokenLoginUsername).toHaveBeenCalledWith("AdminUser");
    expect(mockSaveSession).toHaveBeenCalledWith("admin", "AdminUser");
  });

  it("saves session with inviteToken when adminUsername is empty", async () => {
    mockGetSession.mockReturnValue({ identifier: "ab", expiresAt: Date.now() + 999999 });
    mockUseConfig.mockReturnValue({
      inviteToken: "test-token",
      config: { adminUsername: "" },
      setHasStoredConfig: vi.fn(),
      registerOnFirstSave: mockRegisterOnFirstSave,
    });
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetTokenLoginUsername).toHaveBeenCalledWith("test-token");
    expect(mockSaveSession).toHaveBeenCalledWith("admin", "test-token");
  });

  it("handles null setAdminMessage gracefully", async () => {
    mockUseAppUI.mockReturnValueOnce({
      setAdminMessage: null,
      setAdminMessageType: null,
    });
    mockUpdateDoc.mockRejectedValueOnce(new Error("update failed"));
    render(<AuthProvider><div>child</div></AuthProvider>);
    const onFirstSave = mockRegisterOnFirstSave.mock.calls[0][0];
    await onFirstSave();
    expect(mockSetIsTokenVerified).toHaveBeenCalledWith(true);
  });
});
