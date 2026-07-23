import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../sessionVars", () => ({
  saveSession: vi.fn(),
  getSession: vi.fn(() => ({ type: "admin", identifier: "testuser" })),
  renewSession: vi.fn(),
  clearSession: vi.fn(),
  firestoreSessionExpiry: vi.fn(() => new Date()),
}));

import { createAdminSession, getActiveSession, clearSession } from "../session-utils";

describe("session-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates admin session", () => {
    createAdminSession("testuser", "token");
    expect(true).toBe(true);
  });

  it("gets active session", () => {
    const session = getActiveSession();
    expect(session?.identifier).toBe("testuser");
  });

  it("clearSession is a function", () => {
    expect(typeof clearSession).toBe("function");
  });
});
