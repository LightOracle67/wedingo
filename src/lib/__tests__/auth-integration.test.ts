import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ activeSession: null }) })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn(() => "collection-ref"),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  runTransaction: vi.fn((cb) => cb({ get: vi.fn(), set: vi.fn(), update: vi.fn() })),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  invitationDocRef: vi.fn(() => "invitation-ref"),
  INVITATIONS_COLLECTION_REF: "invitations",
}));

vi.mock("../../lib/storage", () => ({
  safeSetItem: vi.fn(),
  safeGetItem: vi.fn(() => null),
}));

vi.mock("../../lib/sessionVars", () => ({
  saveSession: vi.fn(),
  getSession: vi.fn(() => null),
  renewSession: vi.fn(),
  clearSession: vi.fn(),
  firestoreSessionExpiry: vi.fn(() => new Date(Date.now() + 86400000)),
}));

vi.mock("../../lib/constants", () => ({
  defaultConfig: { firstName: "", theme: "golden" },
}));

import { activateSessionWithToken } from "../session-activator";

describe("activateSessionWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exists and is a function", () => {
    expect(typeof activateSessionWithToken).toBe("function");
  });
});
