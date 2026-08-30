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

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/superadmin" }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "settings-doc"),
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("@firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  getAuthInstance: () => Promise.resolve("auth-mock"),
}));

vi.mock("../../lib/sessionVars", () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
  getSession: () => mockGetSession(),
  clearSession: () => mockClearSession(),
  renewSession: vi.fn(),
}));

vi.mock("../../lib/storage", () => ({
  safeGetItem: vi.fn(() => null),
  safeSetItem: vi.fn(),
  safeRemoveItem: vi.fn(),
}));

import { SuperAdminProvider, useSuperAdmin } from "../SuperAdminContext";
import { SUPERADMIN_ROUTE } from "../../lib/superadmin";

function TestConsumer() {
  const ctx = useSuperAdmin();
  return (
    <div>
      <span data-testid="isSuperAdmin">{String(ctx.isSuperAdmin)}</span>
      <span data-testid="email">{ctx.email}</span>
      <span data-testid="isLoading">{String(ctx.isLoading)}</span>
      <span data-testid="error">{ctx.error}</span>
      {ctx.user && <span data-testid="user-uid">{ctx.user.uid}</span>}
      <button data-testid="login-btn" onClick={() => ctx.login("test@test.com", "password")}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => ctx.logout()}>
        Logout
      </button>
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
    // El provider solo inicializa auth en la consola de superadmin (o con
    // sesión persistida): todos los tests simulan estar en esa ruta real.
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: SUPERADMIN_ROUTE || "/_/console" },
      configurable: true,
      writable: true,
    });
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (u: null) => void) => {
      setTimeout(() => cb(null), 0);
      return () => {};
    });
    mockGetSession.mockReturnValue(null);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("renders children", () => {
    // En ruta pública para no disparar la carga diferida de auth: dejar esa
    // microtarea (getAuthInstance().then) pendiente contaminaría el conteo de
    // onAuthStateChanged del siguiente test (se resuelve tras clearAllMocks).
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: "/abcdefghij" },
      configurable: true,
      writable: true,
    });
    render(
      <SuperAdminProvider>
        <div>child</div>
      </SuperAdminProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("does not initialize auth outside the superadmin console", async () => {
    // Un invitado en una invitación pública no debe descargar firebase/auth.
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: "/abcdefghij" },
      configurable: true,
      writable: true,
    });
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
  });

  it("shows not superadmin initially", async () => {
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isLoading").textContent).toBe("false"));
    expect(screen.getByTestId("isSuperAdmin").textContent).toBe("false");
  });

  it("sets user when Firebase user matches superadmin email and session exists", async () => {
    mockGetSession.mockReturnValue({ type: "superadmin", identifier: FALLBACK_ADMIN_EMAIL });
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
        setTimeout(() => cb({ email: FALLBACK_ADMIN_EMAIL, uid: "uid-123" }), 0);
        return () => {};
      },
    );
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isSuperAdmin").textContent).toBe("true"));
    expect(screen.getByTestId("user-uid").textContent).toBe("uid-123");
  });

  it("re-hydrates the session when Firebase user is superadmin but local session is missing", async () => {
    // Pestaña nueva: sessionStorage vacío, pero el token de Firebase sigue
    // válido. El hydrate debe restaurar la sesión local y NO hacer signOut.
    mockGetSession.mockReturnValue(null);
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
        setTimeout(() => cb({ email: FALLBACK_ADMIN_EMAIL, uid: "uid-999" }), 0);
        return () => {};
      },
    );
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isSuperAdmin").textContent).toBe("true"));
    expect(screen.getByTestId("user-uid").textContent).toBe("uid-999");
    // La sesión local se restaura y el token NO se invalida.
    expect(mockSaveSession).toHaveBeenCalledWith("superadmin", FALLBACK_ADMIN_EMAIL, expect.anything());
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does not hydrate a non-superadmin Firebase account (signs it out)", async () => {
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
        setTimeout(() => cb({ email: "other@admin.com", uid: "uid-777" }), 0);
        return () => {};
      },
    );
    renderProvider();
    await vi.waitFor(() => expect(screen.getByTestId("isSuperAdmin").textContent).toBe("false"));
    await vi.waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });

  it("does not set user when email does not match superadmin email", async () => {
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: { email: string; uid?: string } | null) => void) => {
        setTimeout(() => cb({ email: "other@admin.com", uid: "uid-456" }), 0);
        return () => {};
      },
    );
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

describe("useSuperAdmin", () => {
  it("throws when used outside the provider", () => {
    const err = () => {
      const original = console.error;
      console.error = vi.fn();
      render(<TestConsumer />);
      console.error = original;
    };
    expect(err).toThrow("useSuperAdmin debe usarse dentro de SuperAdminProvider");
  });
});
