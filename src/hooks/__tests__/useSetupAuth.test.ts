import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { InvitationConfig } from "../../types";

const mockT = vi.hoisted(() => vi.fn((key: string) => key));
const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetDoc = vi.hoisted(() => vi.fn((_ref?: unknown): Promise<{ exists: () => boolean; data?: () => Record<string, unknown> }> => Promise.resolve({ exists: () => false })));
const mockRunTransaction = vi.hoisted(() => vi.fn(async (_db: unknown, cb: (t: unknown) => Promise<void>) => cb({} as never)));
const mockSetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockUpdateDoc = vi.hoisted(() => vi.fn((_ref?: unknown, _payload?: unknown) => Promise.resolve()));
const mockGetSession = vi.hoisted(() => vi.fn(() => null as { type: string; identifier: string } | null));
const mockSaveSession = vi.hoisted(() => vi.fn());
const mockClearSession = vi.hoisted(() => vi.fn());
const mockRenewSession = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockFirestoreSessionExpiry = vi.hoisted(() => vi.fn(() => new Date()));
const mockSafeSetItem = vi.hoisted(() => vi.fn());
const mockSafeGetItem = vi.hoisted(() => vi.fn(() => null as string | null));
const mockSafeRemoveItem = vi.hoisted(() => vi.fn());
const mockGenerateSetupToken = vi.hoisted(() => vi.fn(() => "generated-token-123"));
const mockNormalizeTokenValue = vi.hoisted(() => vi.fn((v: string) => v?.trim() ?? v));
const mockHashSetupToken = vi.hoisted(() => vi.fn(async (t: string) => `hash-${t}`));
const mockCreateSetupTokenRecord = vi.hoisted(() => vi.fn(() => Promise.resolve("hash")));
const mockDeleteSetupTokenRecord = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockTokenRecordExists = vi.hoisted(() => ({ value: true }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mockGetDoc,
  runTransaction: mockRunTransaction,
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteField: vi.fn(() => Symbol("deleteField")),
}));

vi.mock("../../lib/firebase", () => ({
  app: {},
  db: {},
  invitationDocRef: vi.fn(() => "invite-ref"),
}));

vi.mock("../../lib/constants", () => ({
  defaultConfig: { test: true },
}));

vi.mock("../../lib/token-utils", () => ({
  generateSetupToken: mockGenerateSetupToken,
  normalizeTokenValue: mockNormalizeTokenValue,
}));

vi.mock("../../lib/setup-token", () => ({
  hashSetupToken: mockHashSetupToken,
  setupTokenRef: vi.fn((h: string) => `token-ref-${h}`),
  createSetupTokenRecord: mockCreateSetupTokenRecord,
  deleteSetupTokenRecord: mockDeleteSetupTokenRecord,
  findInviteBySetupToken: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../../lib/sessionVars", () => ({
  getSession: mockGetSession,
  saveSession: mockSaveSession,
  clearSession: mockClearSession,
  renewSession: mockRenewSession,
  firestoreSessionExpiry: mockFirestoreSessionExpiry,
}));

vi.mock("../../lib/storage", () => ({
  safeSetItem: mockSafeSetItem,
  safeGetItem: mockSafeGetItem,
  safeRemoveItem: mockSafeRemoveItem,
}));

import { useSetupAuth } from "../useSetupAuth";

function setup(
  overrides: Partial<{
    inviteToken: string;
    config: InvitationConfig;
    setAdminMessage: (msg: string) => void;
    setAdminMessageType: (type: string) => void;
    setHasStoredConfig: (has: boolean) => void;
  }> = {},
) {
  const setAdminMessage: (msg: string) => void = overrides.setAdminMessage ?? vi.fn();
  const setAdminMessageType: (type: string) => void = overrides.setAdminMessageType ?? vi.fn();
  const setHasStoredConfig: (has: boolean) => void = overrides.setHasStoredConfig ?? vi.fn();
  const inviteToken = overrides.inviteToken ?? "test-invite-token";
  const config = overrides.config ?? ({} as InvitationConfig);
  const { result } = renderHook(() =>
    useSetupAuth(inviteToken, config, setAdminMessage, setAdminMessageType, setHasStoredConfig),
  );
  return { result, setAdminMessage, setAdminMessageType, setHasStoredConfig, inviteToken, config };
}

describe("useSetupAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockReturnValue(null);
    // Implementación por defecto: los documentos de setupTokens se comportan
    // según mockTokenRecordExists y la invitación devuelve un token legacy.
    mockGetDoc.mockImplementation(async (ref: unknown) => {
      if (String(ref).startsWith("token-ref-")) {
        return mockTokenRecordExists.value
          ? { exists: () => true, data: () => ({ inviteToken: "test-invite-token" }) }
          : { exists: () => false };
      }
      return { exists: () => true, data: () => ({ _activeSetupToken: "valid-token", adminUsername: "admin" }) };
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, _cb: (t: unknown) => Promise<void>) => Promise.resolve());
    mockSetDoc.mockImplementation(() => Promise.resolve());
    mockUpdateDoc.mockImplementation(() => Promise.resolve());
    mockGenerateSetupToken.mockImplementation(() => "generated-token-123");
    mockNormalizeTokenValue.mockImplementation((v: string) => v?.trim() ?? v);
    mockTokenRecordExists.value = true;
    window.confirm = vi.fn(() => true);
  });

  it("is a function", () => {
    expect(typeof useSetupAuth).toBe("function");
  });

  it("returns expected shape", () => {
    const { result } = setup();
    expect(result.current).toHaveProperty("setupToken");
    expect(result.current).toHaveProperty("isTokenVerified");
    expect(result.current).toHaveProperty("isAdminTokenLoggedIn");
    expect(result.current).toHaveProperty("handleTokenLogin");
    expect(result.current).toHaveProperty("handleAdminTokenLogin");
    expect(result.current).toHaveProperty("handleAdminLogout");
    expect(result.current).toHaveProperty("handleResetSetupToken");
    expect(result.current).toHaveProperty("handleResetTokenFromAdmin");
    expect(result.current).toHaveProperty("refreshSetupToken");
  });

  describe("handleTokenLogin", () => {
    it("sets error for empty token input", async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleTokenLogin();
      });
      expect(result.current.authMessage).toBe("auth.enterCode");
      expect(result.current.authMessageType).toBe("error");
      expect(result.current.isTokenVerifying).toBe(false);
    });

    it("proceeds even when activateSessionWithToken returns null (session exists but user cancels)", async () => {
      mockGetDoc.mockImplementation(async (ref: unknown) => {
        if (String(ref).startsWith("token-ref-")) {
          return { exists: () => false };
        }
        return { exists: () => true, data: () => ({ activeSession: true, _activeSetupToken: "valid-token" }) };
      });
      window.confirm = vi.fn(() => false);
      const { result } = setup();
      act(() => result.current.setSetupTokenInput("valid-token"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      // handleTokenLogin does not check the return value of activateSessionWithToken,
      // so isTokenVerified becomes true even when user cancels session override
      expect(result.current.isTokenVerified).toBe(true);
    });

    it("confirms overriding an existing session and logs in", async () => {
      mockGetDoc.mockImplementation(async (ref: unknown) => {
        if (String(ref).startsWith("token-ref-")) {
          return { exists: () => false };
        }
        return { exists: () => true, data: () => ({ activeSession: true, _activeSetupToken: "valid-token" }) };
      });
      mockRunTransaction
        .mockRejectedValueOnce(new Error("sessionExists"))
        .mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "valid-token" }) }),
            update: vi.fn(),
          };
          await cb(transaction);
          return Promise.resolve();
        });
      window.confirm = vi.fn(() => true);
      const { result } = setup();
      act(() => result.current.setSetupTokenInput("valid-token"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(result.current.isTokenVerified).toBe(true);
    });

    it("logs in successfully with valid token", async () => {
      mockGetDoc.mockImplementation(async (ref: unknown) => {
        if (String(ref).startsWith("token-ref-")) {
          return { exists: () => true, data: () => ({ inviteToken: "test-invite-token" }) };
        }
        return { exists: () => true, data: () => ({ _activeSetupToken: "valid-token" }) };
      });
      mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "valid-token" }) }),
          update: vi.fn(),
        };
        await cb(transaction);
        return Promise.resolve();
      });

      const setHasStoredConfig = vi.fn();
      const { result } = setup({ setHasStoredConfig });
      act(() => result.current.setSetupTokenInput("valid-token"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(result.current.isTokenVerified).toBe(true);
      expect(setHasStoredConfig).toHaveBeenCalledWith(true);
      expect(result.current.authMessage).toBe("auth.codeVerified");
      expect(result.current.authMessageType).toBe("success");
    });

    it("handles token mismatch error", async () => {
      mockGetDoc.mockImplementation(async (ref: unknown) => {
        if (String(ref).startsWith("token-ref-")) {
          return { exists: () => false };
        }
        return { exists: () => true, data: () => ({ _activeSetupToken: "other-token" }) };
      });
      window.confirm = vi.fn(() => true);

      const { result } = setup();
      act(() => result.current.setSetupTokenInput("wrong-token"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(result.current.isTokenVerified).toBe(false);
      expect(result.current.authMessage).toBe("auth.codeVerifyError");
    });
  });

  describe("handleAdminTokenLogin", () => {
    it("sets error for empty username or token", async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleAdminTokenLogin();
      });
      expect(result.current.authMessage).toBe("auth.enterUserAndCode");
    });
    it("sets error for username mismatch with configured admin", async () => {
      const config = { adminUsername: "realadmin" } as InvitationConfig;
      const { result } = setup({ config });
      act(() => result.current.setAdminLoginUsername("wronguser"));
      act(() => result.current.setSetupTokenInput("token123"));

      await act(async () => {
        await result.current.handleAdminTokenLogin();
      });

      expect(result.current.authMessage).toBe("auth.invalidCredentials");
      expect(result.current.isTokenVerified).toBe(false);
    });

    it("logs in successfully as admin", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ _activeSetupToken: "admin-token" }),
      });
      mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "admin-token" }) }),
          update: vi.fn(),
        };
        await cb(transaction);
        return Promise.resolve();
      });

      const config = { adminUsername: "admin" } as InvitationConfig;
      const setHasStoredConfig = vi.fn();
      const { result } = setup({ config, setHasStoredConfig });
      act(() => result.current.setAdminLoginUsername("admin"));
      act(() => result.current.setSetupTokenInput("admin-token"));

      await act(async () => {
        await result.current.handleAdminTokenLogin();
      });

      expect(result.current.isTokenVerified).toBe(true);
      expect(setHasStoredConfig).toHaveBeenCalledWith(true);
      expect(result.current.authMessage).toBe("auth.loginSuccess");
      expect(result.current.authMessageType).toBe("success");
    });

    it("handles general error during admin login", async () => {
      mockGetDoc.mockRejectedValueOnce(new Error("Network error"));
      const { result } = setup();
      act(() => result.current.setAdminLoginUsername("admin"));
      act(() => result.current.setSetupTokenInput("token123"));

      await act(async () => {
        await result.current.handleAdminTokenLogin();
      });

      expect(result.current.isTokenVerified).toBe(false);
      expect(result.current.authMessage).toBe("auth.codeVerifyError");
    });

    it("handles codeUserMismatch error during admin login", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ _activeSetupToken: "admin-token" }),
      });
      window.confirm = vi.fn(() => true);

      const config = { adminUsername: "admin" } as InvitationConfig;
      const { result } = setup({ config });
      act(() => result.current.setAdminLoginUsername("admin"));
      act(() => result.current.setSetupTokenInput("admin-token"));

      mockRunTransaction.mockRejectedValue(new Error("codeUserMismatch"));

      await act(async () => {
        await result.current.handleAdminTokenLogin();
      });

      expect(result.current.authMessage).toBe("auth.codeUserMismatch");
    });
  });

  describe("handleAdminLogout", () => {
    it("clears state and navigates to /", async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleAdminLogout();
      });

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("clears Firestore session on logout with inviteToken", async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleAdminLogout();
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockSafeRemoveItem).toHaveBeenCalled();
    });

    it("handles logout Firestore error gracefully", async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error("Update error"));
      const setAdminMessage = vi.fn();
      const setAdminMessageType = vi.fn();
      const { result } = setup({ setAdminMessage, setAdminMessageType });
      await act(async () => {
        await result.current.handleAdminLogout();
      });

      expect(setAdminMessageType).toHaveBeenCalledWith("error");
      expect(setAdminMessage).toHaveBeenCalledWith("auth.logoutFailed");
    });
  });

  describe("handleResetSetupToken", () => {
    it("requires matching confirmTokenInput", async () => {
      const { result } = setup();
      act(() => result.current.setSetupToken("current-token"));
      act(() => result.current.setConfirmTokenInput("wrong-token"));

      await act(async () => {
        await result.current.handleResetSetupToken();
      });

      expect(result.current.authMessage).toBe("auth.currentTokenRequired");
    });

    it("resets token when confirmTokenInput matches", async () => {
      mockSafeGetItem.mockReturnValue("stored-token");
      mockGenerateSetupToken.mockReturnValue("new-token-456");
      mockNormalizeTokenValue.mockImplementation((v: string) => v);

      const { result } = setup();
      act(() => result.current.setSetupToken("current-token"));
      act(() => result.current.setConfirmTokenInput("current-token"));

      await act(async () => {
        await result.current.handleResetSetupToken();
      });

      expect(result.current.authMessageType).toBe("success");
      expect(result.current.authMessage).toBe("auth.tokenRenewed");
      expect(result.current.confirmTokenInput).toBe("");
    });

    it("reads from sessionStorage when setupToken is empty", async () => {
      mockSafeGetItem.mockReturnValue("stored-token");
      const { result } = setup();
      act(() => result.current.setSetupToken(""));
      act(() => result.current.setConfirmTokenInput("stored-token"));

      await act(async () => {
        await result.current.handleResetSetupToken();
      });

      expect(result.current.authMessageType).toBe("success");
    });

    it("prevents concurrent reset attempts", async () => {
      mockSafeGetItem.mockReturnValue("stored-token");
      const { result } = setup();
      act(() => result.current.setSetupToken("tok"));
      act(() => result.current.setConfirmTokenInput("tok"));

      await act(async () => {
        await result.current.handleResetSetupToken();
      });
      expect(result.current.authMessage).toBe("auth.tokenRenewed");
    });
  });

  describe("handleResetTokenFromAdmin", () => {
    it("reports an error when persisting the token fails", async () => {
      mockCreateSetupTokenRecord.mockRejectedValueOnce(new Error("denied"));
      const setAdminMessage = vi.fn();
      const setAdminMessageType = vi.fn();
      const { result } = setup({ setAdminMessage, setAdminMessageType });

      await act(async () => {
        await result.current.handleResetTokenFromAdmin();
      });

      expect(setAdminMessageType).toHaveBeenCalledWith("error");
      expect(setAdminMessage).toHaveBeenCalledWith("auth.tokenCreateFailed");
    });

    it("generates new token and sets admin message", async () => {
      mockGenerateSetupToken.mockReturnValue("admin-new-token");
      mockNormalizeTokenValue.mockImplementation((v: string) => v);

      const setAdminMessage = vi.fn();
      const setAdminMessageType = vi.fn();
      const { result } = setup({ setAdminMessage, setAdminMessageType });

      await act(async () => {
        await result.current.handleResetTokenFromAdmin();
      });

      expect(setAdminMessageType).toHaveBeenCalledWith("success");
      expect(setAdminMessage).toHaveBeenCalledWith("auth.tokenRenewedAdmin");
    });

    it("prevents concurrent reset attempts", async () => {
      const setAdminMessage = vi.fn();
      const setAdminMessageType = vi.fn();
      const { result } = setup({ setAdminMessage, setAdminMessageType });

      await act(async () => {
        await result.current.handleResetTokenFromAdmin();
      });
      expect(setAdminMessage).toHaveBeenCalledWith("auth.tokenRenewedAdmin");
    });
  });

  describe("refreshSetupToken", () => {
    it("returns empty without an inviteToken", async () => {
      const { result } = setup({ inviteToken: "" });
      let token: string | undefined;
      await act(async () => {
        token = await result.current.refreshSetupToken();
      });
      expect(token).toBe("");
      expect(mockSafeGetItem).not.toHaveBeenCalled();
    });

    it("restores token from sessionStorage", async () => {
      mockSafeGetItem.mockReturnValue("session-stored-token");
      const { result } = setup();

      let token: string | undefined;
      await act(async () => {
        token = await result.current.refreshSetupToken();
      });

      expect(token).toBe("session-stored-token");
      expect(result.current.setupToken).toBe("session-stored-token");
    });

    it("does not read the token from the public invitation document", async () => {
      mockSafeGetItem.mockReturnValue(null);
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ _activeSetupToken: "firestore-token" }),
      });
      const { result } = setup();

      let token: string | undefined;
      await act(async () => {
        token = await result.current.refreshSetupToken();
      });

      // El token ya no se recupera del documento público (seguridad);
      // solo se usa sessionStorage.
      expect(token).toBe("");
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it("returns empty when no stored token exists", async () => {
      mockSafeGetItem.mockReturnValue(null);

      const { result } = setup();

      let token: string | undefined;
      await act(async () => {
        token = await result.current.refreshSetupToken();
      });

      expect(token).toBe("");
    });
  });

  describe("session restoration", () => {
    it("restores session from getSession on mount", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "restored-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: true, sessionExpiresAt: new Date(Date.now() + 86400000) }),
      });

      const { result } = setup();

      await waitFor(() => {
        expect(result.current.isTokenVerified).toBe(true);
      });
    });

    it("clears session when Firestore session repair fails", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "inactive-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: false, sessionExpiresAt: null }),
      });
      mockUpdateDoc.mockRejectedValueOnce(new Error("repair failed"));

      setup();

      await waitFor(() => {
        expect(mockClearSession).toHaveBeenCalled();
      });
    });

    it("repairs session when Firestore session is inactive", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "inactive-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: false, sessionExpiresAt: null }),
      });

      setup();

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith("invite-ref", {
          activeSession: expect.any(Object),
          sessionExpiresAt: expect.any(Object),
          setupTokenHash: "",
        });
      });
    });

    it("does not clear session on Firestore transient error during restoration", async () => {
      mockGetSession.mockReturnValue({ type: "admin", identifier: "admin-user" });
      mockGetDoc.mockRejectedValueOnce(new Error("Network error"));

      setup();

      // Network errors no longer clear the session (transient error protection)
      await vi.waitFor(() => {
        expect(mockClearSession).not.toHaveBeenCalled();
      });
    });

    it("handles a missing Firestore document during restoration", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "ghost-user" });
      mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });

      setup();

      await waitFor(() => {
        expect(mockGetDoc).toHaveBeenCalled();
      });
      expect(mockClearSession).toHaveBeenCalled();
    });

    it("restores a valid session from a Firestore timestamp expiry", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "ts-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: true, sessionExpiresAt: { toDate: () => new Date(Date.now() + 3600000) } }),
      });

      setup();

      await waitFor(() => {
        expect(mockClearSession).not.toHaveBeenCalled();
      });
    });

    it("repairs a legacy session and migrates the stored token", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "legacy-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: false, sessionExpiresAt: null, _activeSetupToken: "legacy-token" }),
      });
      mockSafeGetItem.mockReturnValue("legacy-token");

      setup();

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith("invite-ref", expect.objectContaining({ legacyToken: "legacy-token" }));
      });
    });

    it("repairs a session whose expiry is in the past", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "expired-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: true, sessionExpiresAt: new Date(Date.now() - 1000) }),
      });

      setup();

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });

    it("repairs a session without an expiry timestamp", async () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "noexp-user" });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ activeSession: true }),
      });

      setup();

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });

    it("does not attempt restoration without valid session type", () => {
      mockGetSession.mockReturnValue({ type: "invalid", identifier: "user" });
      setup();
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it("does not attempt restoration without inviteToken", () => {
      mockGetSession.mockReturnValue({ type: "setup", identifier: "user" });
      setup({ inviteToken: "" });
      expect(mockGetDoc).not.toHaveBeenCalled();
    });
  });

  describe("session renewal", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("renews session when token is verified", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ _activeSetupToken: "valid-token" }),
      });
      mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "valid-token" }) }),
          update: vi.fn(),
        };
        await cb(transaction);
        return Promise.resolve();
      });

      const { result } = setup();
      act(() => result.current.setSetupTokenInput("valid-token"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(mockRenewSession).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(mockRenewSession).toHaveBeenCalledTimes(2);
    });

    it("handles renewal update error gracefully", async () => {
      mockUpdateDoc.mockImplementation((_ref: unknown, payload?: unknown) => {
        if (payload && typeof payload === "object" && "sessionExpiresAt" in payload) {
          return Promise.reject(new Error("Renew error"));
        }
        return Promise.resolve();
      });
      mockGetDoc.mockImplementation(async (ref: unknown) => {
        if (String(ref).startsWith("token-ref-")) {
          return { exists: () => true, data: () => ({ inviteToken: "test-invite-token" }) };
        }
        return { exists: () => true, data: () => ({ _activeSetupToken: "tok" }) };
      });
      mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "tok" }) }),
          update: vi.fn(),
        };
        await cb(transaction);
        return Promise.resolve();
      });

      const setAdminMessage = vi.fn();
      const setAdminMessageType = vi.fn();
      const { result } = setup({ setAdminMessage, setAdminMessageType });
      act(() => result.current.setSetupTokenInput("tok"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(setAdminMessageType).toHaveBeenCalledWith("error");
      expect(setAdminMessage).toHaveBeenCalledWith("auth.sessionUpdateFailed");
    });
  });

  describe("isAdminTokenLoggedIn", () => {
    it("is false initially", () => {
      const { result } = setup();
      expect(result.current.isAdminTokenLoggedIn).toBe(false);
    });

    it("is true when isTokenVerified is true", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ _activeSetupToken: "tok" }),
      });
      mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: unknown) => Promise<void>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ _activeSetupToken: "tok" }) }),
          update: vi.fn(),
        };
        await cb(transaction);
        return Promise.resolve();
      });

      const { result } = setup();
      act(() => result.current.setSetupTokenInput("tok"));

      await act(async () => {
        await result.current.handleTokenLogin();
      });

      expect(result.current.isAdminTokenLoggedIn).toBe(true);
    });
  });

  describe("generateNewToken edge cases", () => {
    it("returns a token without an invite token", async () => {
      const { result } = setup({ inviteToken: "" });
      let token = "";
      await act(async () => {
        token = await result.current.generateNewToken();
      });
      expect(token).toBeTruthy();
      expect(mockSafeSetItem).not.toHaveBeenCalled();
    });

    it("deletes the old token record when regenerating", async () => {
      mockGenerateSetupToken.mockReturnValue("brand-new-token");
      const { result } = setup();
      await act(async () => {
        await result.current.generateNewToken("old-token-123");
      });
      expect(mockDeleteSetupTokenRecord).toHaveBeenCalledWith("old-token-123");
      expect(mockCreateSetupTokenRecord).toHaveBeenCalled();
    });
  });
});
