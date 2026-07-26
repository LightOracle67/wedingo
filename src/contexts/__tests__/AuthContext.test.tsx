import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/test" }),
}));

vi.mock("../useConfig", () => ({
  useConfig: () => ({
    inviteToken: "test",
    config: { adminUsername: "admin" },
    setHasStoredConfig: vi.fn(),
    registerOnFirstSave: vi.fn(),
  }),
}));

vi.mock("../useAppUI", () => ({
  useAppUI: () => ({ setAdminMessage: vi.fn(), setAdminMessageType: vi.fn() }),
}));

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
    refreshSetupToken: vi.fn(),
    handleTokenLogin: vi.fn(),
    handleAdminTokenLogin: vi.fn(),
    handleAdminLogout: vi.fn(),
    handleResetSetupToken: vi.fn(),
    handleResetTokenFromAdmin: vi.fn(),
    setSetupTokenInput: vi.fn(),
    setIsTokenVerified: vi.fn(),
    setTokenLoginUsername: vi.fn(),
    setAdminLoginUsername: vi.fn(),
    setConfirmTokenInput: vi.fn(),
    setSetupToken: vi.fn(),
    setAuthMessage: vi.fn(),
  }),
}));

vi.mock("firebase/firestore", () => ({
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => new Date()),
  doc: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
  invitationDocRef: vi.fn(),
}));

vi.mock("../../lib/sessionVars", () => ({
  getSession: vi.fn(() => null),
  firestoreSessionExpiry: vi.fn(() => new Date()),
  saveSession: vi.fn(),
}));

import { AuthProvider } from "../AuthContext";

describe("AuthProvider", () => {
  it("renders children", () => {
    render(<AuthProvider><div>child</div></AuthProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });
});
