import { describe, it, expect, vi, beforeEach } from "vitest";

const originalEnv = import.meta.env;

describe("superadmin", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports SUPERADMIN_ROUTE from VITE_SUPERADMIN_ROUTE", async () => {
    vi.stubEnv("VITE_SUPERADMIN_ROUTE", "/admin");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@wedding.com,backup@wedding.com");

    const mod = await import("../superadmin");
    expect(mod.SUPERADMIN_ROUTE).toBe("/admin");
    expect(mod.SUPERADMIN_DASHBOARD).toBe("/admin/dashboard");
  });

  it("exports empty routes when env var is not set", async () => {
    vi.stubEnv("VITE_SUPERADMIN_ROUTE", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    const mod = await import("../superadmin");
    expect(mod.SUPERADMIN_ROUTE).toBe("");
    expect(mod.SUPERADMIN_DASHBOARD).toBe("");
    expect(mod.SUPERADMIN_EMAIL).toBe("");
  });

  it("extracts first admin email from comma-separated list", async () => {
    vi.stubEnv("VITE_SUPERADMIN_ROUTE", "/admin");
    vi.stubEnv("VITE_ADMIN_EMAILS", "primary@wedding.com,secondary@wedding.com");

    const mod = await import("../superadmin");
    expect(mod.SUPERADMIN_EMAIL).toBe("primary@wedding.com");
  });

  it("formatDate formats ISO string to locale string", async () => {
    vi.stubEnv("VITE_SUPERADMIN_ROUTE", "/admin");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    const mod = await import("../superadmin");
    const result = mod.formatDate("2026-07-15T18:30:00");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("");
  });

  it("formatDate returns Invalid Date string on invalid input", async () => {
    vi.stubEnv("VITE_SUPERADMIN_ROUTE", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    const mod = await import("../superadmin");
    const result = mod.formatDate("not-a-date");
    expect(result).toBe("Invalid Date");
  });
});
