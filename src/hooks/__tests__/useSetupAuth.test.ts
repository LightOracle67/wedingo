import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockT = vi.fn((key) => key);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  runTransaction: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../lib/firebase", () => ({
  app: {},
  db: {},
  invitationDocRef: vi.fn(() => "invite-ref"),
}));

vi.mock("../../lib/constants", () => ({
  defaultConfig: {},
}));

vi.mock("../../lib/token-utils", () => ({
  generateSetupToken: vi.fn(() => "new-token"),
  normalizeTokenValue: vi.fn((v) => v),
}));

vi.mock("../../lib/sessionVars", () => ({
  getSession: vi.fn(() => null),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  renewSession: vi.fn(() => Promise.resolve()),
  firestoreSessionExpiry: vi.fn(() => new Date()),
}));

vi.mock("../../lib/storage", () => ({
  safeSetItem: vi.fn(),
  safeGetItem: vi.fn(() => null),
  safeRemoveItem: vi.fn(),
}));

import { useSetupAuth } from "../useSetupAuth";

describe("useSetupAuth", () => {
  it("is a function", () => {
    expect(typeof useSetupAuth).toBe("function");
  });

  it("returns expected shape", () => {
    const setAdminMessage = vi.fn();
    const setAdminMessageType = vi.fn();
    const setHasStoredConfig = vi.fn();
    const { result } = renderHook(() =>
      useSetupAuth("test-token", {}, setAdminMessage, setAdminMessageType, setHasStoredConfig),
    );
    expect(result.current).toHaveProperty("setupToken");
    expect(result.current).toHaveProperty("isTokenVerified");
    expect(result.current).toHaveProperty("isAdminTokenLoggedIn");
    expect(result.current).toHaveProperty("handleTokenLogin");
    expect(result.current).toHaveProperty("handleAdminTokenLogin");
    expect(result.current).toHaveProperty("handleAdminLogout");
    expect(result.current).toHaveProperty("handleResetSetupToken");
  });
});
