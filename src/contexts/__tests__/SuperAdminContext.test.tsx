import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The fallback email in SuperAdminContext is "adriancl2001@gmail.com"
 * (when VITE_ADMIN_EMAILS is not set in the test env).
 */
const FALLBACK_ADMIN_EMAIL = "adriancl2001@gmail.com";

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSaveSession = vi.fn();
const mockGetSession = vi.fn(() => null as { type: string; identifier: string } | null);
const mockClearSession = vi.fn();
const mockNavigate = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/superadmin" }),
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  auth: "auth-mock",
}));

vi.mock("../../lib/sessionVars", () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
  getSession: () => mockGetSession(),
  clearSession: () => mockClearSession(),
  renewSession: vi.fn(),
}));

vi.mock("../../lib/storage", () => ({
  safeGetItem: vi.fn(() => null), safeSetItem: vi.fn(), safeRemoveItem: vi.fn(),
}));

import { SuperAdminProvider, useSuperAdmin } from "../SuperAdminContext";

function TestConsumer() {
  const ctx = useSuperAdmin();
  return (
    <div>
      <span data-testid="isSuperAdmin">{String(ctx.isSuperAdmin)}</span>
      <span data-testid="email">{ctx.email}</span>
      <span data-testid="isLoading">{String(ctx.isLoading)}</span>
      <span data-testid="error">{ctx.error}</span>
      {ctx.user && <span data-testid="user-uid">{ctx.user.uid}</span>}
      <button data-testid="login-btn" onClick={() => ctx.login("test@test.com", "password")}>Login</button>
      <button data-testid="logout-btn" onClick={() => ctx.logout()}>Logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <SuperAdminProvider>
      <TestConsumer />
    </SuperAdminProvider>,
  );
}

describe("SuperAdminProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: null) => void) => {
      setTimeout(() => cb(null), 0);
      return () => {};
    });
    mockGetSession.mockReturnValue(null);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("renders children", () => {
    render(<SuperAdminProvider><div>child</div></SuperAdminProvider>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("shows not superadmin initially", async () => {
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    expect(screen.getByTestId("isSuperAdmin").textContent).toBe("false");
  });

  it("sets user when Firebase user matches superadmin email and session exists", async () => {
    mockGetSession.mockReturnValue({ type: "superadmin", identifier: FALLBACK_ADMIN_EMAIL });
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
      setTimeout(() => cb({ email: FALLBACK_ADMIN_EMAIL, uid: "uid-123" }), 0);
      return () => {};
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isSuperAdmin").textContent).toBe("true"));
    expect(screen.getByTestId("user-uid").textContent).toBe("uid-123");
  });

  it("does not set user when email does not match superadmin email", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
      setTimeout(() => cb({ email: "other@admin.com", uid: "uid-456" }), 0);
      return () => {};
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isSuperAdmin").textContent).toBe("false"));
  });

  it("calls login successfully with correct admin email", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { email: FALLBACK_ADMIN_EMAIL, uid: "uid-123" },
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(mockSignInWithEmailAndPassword).toHaveBeenCalled());
    expect(mockSaveSession).toHaveBeenCalledWith("superadmin", FALLBACK_ADMIN_EMAIL, { uid: "uid-123" });
  });

  it("rejects login with wrong (non-admin) email", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { email: "other@admin.com", uid: "uid-456" },
    });
    mockSignOut.mockResolvedValue(undefined);
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(screen.getByTestId("error").textContent).toBe("auth.superadminNoPermissions");
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it("handles auth/user-not-found error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/user-not-found" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminWrongCredentials"));
  });

  it("handles auth/wrong-password error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminWrongCredentials"));
  });

  it("handles auth/invalid-credential error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminWrongCredentials"));
  });

  it("handles auth/too-many-requests error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/too-many-requests" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminTooManyAttempts"));
  });

  it("handles auth/invalid-email error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-email" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminInvalidEmail"));
  });

  it("handles generic error on login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: "auth/unknown" });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminLoginError"));
  });

  it("calls logout and navigates home", async () => {
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("logout-btn"));
    await vi.waitFor(() => expect(mockClearSession).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  it("signs out when Firebase user has no local session", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
      setTimeout(() => cb({ email: FALLBACK_ADMIN_EMAIL, uid: "uid-no-session" }), 0);
      return () => {};
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    expect(mockSignOut).toHaveBeenCalled();
    expect(screen.getByTestId("isSuperAdmin").textContent).toBe("false");
  });

  it("handles non-object error in login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue("string error");
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminLoginError"));
  });

  it("handles error without code property in login", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ noCode: true });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminLoginError"));
  });

  it("handles login error with missing code property", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({});
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(screen.getByTestId("error").textContent).toBe("auth.superadminLoginError"));
  });

  it("sets user when auth state changes during login", async () => {
    let authCallback: ((u: unknown) => void) | null = null;
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: unknown) => void) => {
      authCallback = cb;
      setTimeout(() => cb(null), 0);
      return () => {};
    });
    mockSignInWithEmailAndPassword.mockImplementation(async () => {
      if (authCallback) authCallback({ email: FALLBACK_ADMIN_EMAIL, uid: "uid-during-login" });
      return { user: { email: FALLBACK_ADMIN_EMAIL, uid: "uid-during-login" } };
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    fireEvent.click(screen.getByTestId("login-btn"));
    await vi.waitFor(() => expect(mockSaveSession).toHaveBeenCalled());
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
