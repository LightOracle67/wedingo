import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeConfig } from "../normalize-config";

vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn(() => "collection-ref"),
  increment: vi.fn(() => 1),
  updateDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  invitationDocRef: vi.fn(() => "invitation-ref"),
}));

vi.mock("../../lib/crypto-utils", () => ({
  encrypt: vi.fn((text) => Promise.resolve(`encrypted-${text}`)),
  decrypt: vi.fn((text) => Promise.resolve(text.replace("encrypted-", ""))),
}));

vi.mock("../../lib/image-store", () => ({
  loadDecryptedField: vi.fn((_, text) => Promise.resolve(text)),
  deleteGallery: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../lib/sessionVars", () => ({
  clearSession: vi.fn(),
}));

vi.mock("../../lib/storage", () => ({
  safeSetItem: vi.fn(),
  safeGetItem: vi.fn(() => null),
}));

describe("Config Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates required fields", () => {
    const result = normalizeConfig({});
    expect(result.theme).toBe("golden");
    expect(result.firstName).toBe("");
  });

  it("preserves valid theme", () => {
    const result = normalizeConfig({ theme: "forest" });
    expect(result.theme).toBe("forest");
  });

  it("trims string values", () => {
    const result = normalizeConfig({ firstName: "  Juan  ", secondName: "  María  " });
    expect(result.firstName).toBe("Juan");
    expect(result.secondName).toBe("María");
  });
});
