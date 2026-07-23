import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAddDoc, mockCollection, mockServerTimestamp } = vi.hoisted(() => ({
  mockAddDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockServerTimestamp: vi.fn(() => new Date("2026-01-01")),
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mockAddDoc,
  collection: mockCollection,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock("../firebase", () => ({
  db: {},
}));

import { logAudit } from "../audit";

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, "userAgent", {
      value: "Mozilla/5.0 TestAgent",
      configurable: true,
    });
  });

  it("adds audit document with correct fields", async () => {
    mockCollection.mockReturnValue("auditLogRef");
    mockAddDoc.mockResolvedValue({ id: "audit-123" });

    await logAudit("session.login", "User 123 logged in");

    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "auditLog");
    expect(mockAddDoc).toHaveBeenCalledWith("auditLogRef", {
      action: "session.login",
      detail: "User 123 logged in",
      createdAt: expect.any(Date),
      userAgent: "Mozilla/5.0 TestAgent",
    });
  });

  it("truncates userAgent to 200 characters", async () => {
    mockCollection.mockReturnValue("auditLogRef");
    mockAddDoc.mockResolvedValue({ id: "audit-123" });
    const longUA = "x".repeat(500);

    Object.defineProperty(globalThis.navigator, "userAgent", {
      value: longUA,
      configurable: true,
    });

    await logAudit("test.action", "");

    const callArg = mockAddDoc.mock.calls[0][1];
    expect(callArg.userAgent).toHaveLength(200);
    expect(callArg.userAgent).toBe("x".repeat(200));
  });

  it("handles Firestore errors without throwing", async () => {
    mockCollection.mockReturnValue("auditLogRef");
    mockAddDoc.mockRejectedValue(new Error("Firestore unavailable"));

    await expect(logAudit("test.action")).resolves.toBeUndefined();
  });

  it("defaults detail to empty string", async () => {
    mockCollection.mockReturnValue("auditLogRef");
    mockAddDoc.mockResolvedValue({ id: "audit-456" });

    await logAudit("session.logout");

    expect(mockAddDoc).toHaveBeenCalledWith("auditLogRef", expect.objectContaining({
      action: "session.logout",
      detail: "",
    }));
  });
});
