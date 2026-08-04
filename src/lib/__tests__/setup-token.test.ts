import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDoc = vi.hoisted(() => vi.fn((_db: unknown, col: string, id: string) => ({ id, path: `${col}/${id}` })));
const mockGetDoc = vi.hoisted(() => vi.fn());
const mockSetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockDeleteDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockNormalize = vi.hoisted(() => vi.fn((v: string) => v?.trim().toUpperCase() ?? ""));

vi.mock("firebase/firestore", () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("../token-utils", () => ({
  normalizeTokenValue: (v: string) => mockNormalize(v),
}));

import { hashSetupToken, setupTokenRef, createSetupTokenRecord, deleteSetupTokenRecord, findInviteBySetupToken } from "../setup-token";

describe("setup-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalize.mockImplementation((v: string) => v?.trim().toUpperCase() ?? "");
  });

  it("hashes a normalized token to a 64-char hex SHA-256", async () => {
    // "ABC123" → hash conocido (calculable), pero solo comprobamos forma.
    const hash = await hashSetupToken("  abc123  ");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(mockNormalize).toHaveBeenCalled();
  });

  it("produces deterministic hashes for the same token", async () => {
    const a = await hashSetupToken("TOKEN-1");
    const b = await hashSetupToken("token-1");
    expect(a).toBe(b);
  });

  it("produces different hashes for different tokens", async () => {
    const a = await hashSetupToken("TOKEN-1");
    const c = await hashSetupToken("TOKEN-2");
    expect(a).not.toBe(c);
  });

  it("setupTokenRef builds a doc reference in setupTokens", () => {
    const ref = setupTokenRef("abc123...");
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "setupTokens", "abc123...");
    expect(ref.id).toBe("abc123...");
  });

  it("creates a setup token record", async () => {
    mockNormalize.mockImplementation((v: string) => v);
    const hash = await createSetupTokenRecord("invite-1", "mytoken");
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: hash }),
      expect.objectContaining({ inviteToken: "invite-1" }),
    );
  });

  it("deletes a setup token record", async () => {
    mockNormalize.mockImplementation((v: string) => v);
    await deleteSetupTokenRecord("mytoken");
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it("finds an invite token when the record exists", async () => {
    mockNormalize.mockImplementation((v: string) => v);
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ inviteToken: "invite-9" }) });
    const result = await findInviteBySetupToken("mytoken");
    expect(result).toBe("invite-9");
  });

  it("returns null when no record exists", async () => {
    mockNormalize.mockImplementation((v: string) => v);
    mockGetDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined });
    const result = await findInviteBySetupToken("unknown");
    expect(result).toBeNull();
  });

  it("returns null when the record has no valid inviteToken", async () => {
    mockNormalize.mockImplementation((v: string) => v);
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ inviteToken: 42 }) });
    const result = await findInviteBySetupToken("mytoken");
    expect(result).toBeNull();
  });
});
