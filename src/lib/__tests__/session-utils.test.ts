import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../sessionVars", () => ({
  saveSession: vi.fn(),
  getSession: vi.fn(() => ({ type: "admin", identifier: "testuser" })),
  renewSession: vi.fn(),
  clearSession: vi.fn(),
  firestoreSessionExpiry: vi.fn(() => new Date()),
}));

import { createAdminSession, createSetupSession, getActiveSession, renewActiveSession, clearSession, firestoreSessionExpiry } from "../session-utils";
import { saveSession, renewSession } from "../sessionVars";

describe("session-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates admin session", () => {
    createAdminSession("testuser", "token");
    expect(saveSession).toHaveBeenCalledWith("admin", "testuser");
  });

  it("creates setup session", () => {
    createSetupSession("invite123");
    expect(saveSession).toHaveBeenCalledWith("setup", "invite123");
  });

  it("gets active session", () => {
    const session = getActiveSession();
    expect(session?.identifier).toBe("testuser");
  });

  it("renewActiveSession calls renewSession", () => {
    renewActiveSession();
    expect(renewSession).toHaveBeenCalled();
  });

  it("firestoreSessionExpiry returns a Date", () => {
    const result = firestoreSessionExpiry();
    expect(result).toBeInstanceOf(Date);
  });

  it("clearSession is a function", () => {
    expect(typeof clearSession).toBe("function");
  });
});
