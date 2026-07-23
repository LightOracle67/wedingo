import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetDoc,
  mockRunTransaction,
  mockServerTimestamp,
  mockFirestoreSessionExpiry,
  mockInvitationDocRef,
  mockDb,
} = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockRunTransaction: vi.fn(),
  mockServerTimestamp: vi.fn(() => new Date("2026-01-01")),
  mockFirestoreSessionExpiry: vi.fn(() => new Date("2026-01-02")),
  mockInvitationDocRef: vi.fn((token: string) => token),
  mockDb: {},
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mockGetDoc,
  runTransaction: mockRunTransaction,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock("../firebase", () => ({
  db: mockDb,
  invitationDocRef: mockInvitationDocRef,
}));

vi.mock("../sessionVars", () => ({
  firestoreSessionExpiry: mockFirestoreSessionExpiry,
}));

import { activateSessionWithToken } from "../session-activator";

describe("activateSessionWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new session via transaction when invite doc does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }) => Promise<void>) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({ exists: () => false }),
        set: vi.fn(),
        update: vi.fn(),
      };
      await cb(transaction);
      expect(transaction.set).toHaveBeenCalledWith("invite-123", expect.objectContaining({
        activeSession: expect.any(Date),
        sessionExpiresAt: expect.any(Date),
      }));
    });

    await activateSessionWithToken("invite-123", "token-abc");
    expect(mockInvitationDocRef).toHaveBeenCalledWith("invite-123");
    expect(mockRunTransaction).toHaveBeenCalledWith(mockDb, expect.any(Function));
  });

  it("updates existing session when invite doc exists and token matches", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ _activeSetupToken: "token-abc" }),
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }) => Promise<void>) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ _activeSetupToken: "token-abc" }),
        }),
        set: vi.fn(),
        update: vi.fn(),
      };
      await cb(transaction);
      expect(transaction.update).toHaveBeenCalledWith("invite-123", expect.objectContaining({
        activeSession: expect.any(Date),
        sessionExpiresAt: expect.any(Date),
      }));
    });

    await activateSessionWithToken("invite-123", "token-abc");
  });

  it("throws on token mismatch in first check", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ _activeSetupToken: "token-xyz", activeSession: null }),
    });

    await expect(activateSessionWithToken("invite-123", "token-abc")).rejects.toThrow("Token no válido");
  });

  it("throws on token mismatch in transaction check", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ _activeSetupToken: "token-abc", activeSession: null }),
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: { get: ReturnType<typeof vi.fn> }) => Promise<void>) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ _activeSetupToken: "token-wrong" }),
        }),
      };
      await expect(cb(transaction)).rejects.toThrow("Token no válido");
    });

    await activateSessionWithToken("invite-123", "token-abc");
    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it("returns early when onSessionExists callback returns false", async () => {
    const onSessionExists = vi.fn(() => false);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ _activeSetupToken: "token-abc", activeSession: true }),
    });

    await activateSessionWithToken("invite-123", "token-abc", onSessionExists);
    expect(onSessionExists).toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("proceeds when onSessionExists returns true", async () => {
    const onSessionExists = vi.fn(() => true);
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ _activeSetupToken: "token-abc", activeSession: true }),
    });
    mockRunTransaction.mockImplementation(async (_db: unknown, cb: (t: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }) => Promise<void>) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ _activeSetupToken: "token-abc" }),
        }),
        update: vi.fn(),
      };
      await cb(transaction);
    });

    await activateSessionWithToken("invite-123", "token-abc", onSessionExists);
    expect(onSessionExists).toHaveBeenCalled();
    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it("handles Firestore errors gracefully", async () => {
    mockGetDoc.mockRejectedValue(new Error("Network error"));

    await expect(activateSessionWithToken("invite-123", "token-abc")).rejects.toThrow("Network error");
  });
});
