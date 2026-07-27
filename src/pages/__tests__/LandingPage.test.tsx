import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: {},
    setIsTokenVerified: vi.fn(),
    setTokenLoginUsername: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => "mocked-ts"),
  runTransaction: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  invitationDocRef: vi.fn(() => ({ id: "test-ref" })),
  INVITATIONS_COLLECTION_REF: {},
}));

let mockNormalizeTokenValue = vi.fn((v: string) => v?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "");
vi.mock("../../lib/token-utils", () => ({
  normalizeTokenValue: (...args: unknown[]) => mockNormalizeTokenValue(...args),
  generateInviteToken: () => "mocked-invite-token",
  generateSetupToken: () => "mocked-setup-token",
}));

vi.mock("../../lib/utils", () => ({
  generateInviteToken: () => "mocked-invite-token",
}));

vi.mock("../../lib/normalize-config", () => ({
  normalizeConfig: (d: unknown) => d,
}));

vi.mock("../../lib/constants", () => ({
  defaultConfig: {},
}));

vi.mock("../../lib/storage", () => ({
  safeSetItem: vi.fn(),
}));

vi.mock("../../lib/storage-utils", () => ({
  clearExpiredCache: vi.fn(),
}));

vi.mock("../../lib/sessionVars", () => ({
  saveSession: vi.fn(),
  firestoreSessionExpiry: () => "mocked-expiry",
}));

vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
  useEscapeKey: () => {},
}));

import LandingPage from "../LandingPage";

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(globalThis, "crypto", {
    value: { getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = i; } },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { store = {}; },
      };
    })(),
    configurable: true,
    writable: true,
  });
});

describe("LandingPage", () => {
  it("renders the title, subtitle, and description", () => {
    render(<LandingPage />);
    expect(screen.getByText("landing.title")).toBeDefined();
    expect(screen.getByText("landing.subtitle")).toBeDefined();
    expect(screen.getByText("landing.description")).toBeDefined();
  });

  it("renders both CTA buttons", () => {
    render(<LandingPage />);
    expect(screen.getByText("landing.createInvitation")).toBeDefined();
    expect(screen.getByText("landing.haveInvitation")).toBeDefined();
  });

  it("navigates to setup when create button is clicked", () => {
    render(<LandingPage />);
    const createBtn = screen.getByText("landing.createInvitation");
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/mocked-invite-token/setup");
  });

  it("opens login modal when have invitation is clicked", () => {
    render(<LandingPage />);
    expect(screen.queryByText("landing.modalTitle")).toBeNull();
    const haveBtn = screen.getByText("landing.haveInvitation");
    fireEvent.click(haveBtn);
    expect(screen.getByText("landing.modalTitle")).toBeDefined();
    expect(screen.getByText("landing.usernameLabel")).toBeDefined();
    expect(screen.getByText("landing.tokenLabel")).toBeDefined();
  });

  it("shows error on login with empty fields", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    expect(screen.getByText("landing.errorEmpty")).toBeDefined();
  });

  it("shows error on login with short token", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABC" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    expect(screen.getByText("landing.errorInvalidToken")).toBeDefined();
  });

  it("shows error when token not found", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as any);

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(screen.getByText("landing.errorTokenNotFound")).toBeDefined();
    });
  });

  it("shows error when username mismatches", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{ id: "target-invite", data: () => ({ adminUsername: "jane" }) }],
    } as any);

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "john" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(screen.getByText("landing.errorUsernameMismatch")).toBeDefined();
    });
  });

  it("navigates on successful login", async () => {
    const { getDocs, getDoc, runTransaction } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{ id: "target-invite", data: () => ({ adminUsername: "john", activeSession: null }) }],
    } as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    } as any);
    vi.mocked(runTransaction).mockImplementation(async (_db: any, cb: any) => {
      await cb({
        get: vi.fn().mockResolvedValue({ exists: () => false }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "john" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/target-invite");
    });
  });

  it("closes modal on overlay click", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    expect(screen.getByText("landing.modalTitle")).toBeDefined();
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);
    expect(screen.queryByText("landing.modalTitle")).toBeNull();
  });

  it("closes modal via close button", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    expect(screen.getByText("landing.modalTitle")).toBeDefined();
    const closeBtn = screen.getByLabelText("common.close");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("landing.modalTitle")).toBeNull();
  });

  it("handles transaction update path when invite exists", async () => {
    const { getDocs, getDoc, runTransaction } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{ id: "target-invite", data: () => ({}) }],
    } as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    } as any);
    const txUpdate = vi.fn();
    vi.mocked(runTransaction).mockImplementation(async (_db: any, cb: any) => {
      await cb({
        get: vi.fn().mockResolvedValue({ exists: () => true }),
        set: vi.fn(),
        update: txUpdate,
      });
    });

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(txUpdate).toHaveBeenCalled();
    });
  });

  it("shows error on transaction failure", async () => {
    const { getDocs, runTransaction } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{ id: "target-invite", data: () => ({}) }],
    } as any);
    vi.mocked(runTransaction).mockRejectedValue(new Error("tx failed"));

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(screen.getByText("landing.errorTransactionFailed")).toBeDefined();
    });
  });

  it("shows error on verify failure (outer catch)", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockRejectedValue(new Error("network error"));

    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    fireEvent.change(screen.getByLabelText("landing.usernameLabel"), { target: { value: "user" } });
    fireEvent.change(screen.getByLabelText("landing.tokenLabel"), { target: { value: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => {
      expect(screen.getByText("landing.errorVerifyFailed")).toBeDefined();
    });
  });

  it("blocks login after 3 failed empty-field attempts", async () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText("landing.haveInvitation"));
    const form = screen.getByRole("dialog").querySelector("form")!;
    for (let i = 0; i < 4; i++) {
      fireEvent.submit(form);
    }
    await vi.waitFor(() => {
      expect(screen.getByText("landing.errorTooManyAttempts")).toBeDefined();
    });
  });
});
