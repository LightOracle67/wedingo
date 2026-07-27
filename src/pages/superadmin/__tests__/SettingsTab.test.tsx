import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../../lib/superadmin", () => ({
  SUPERADMIN_EMAIL: "admin@test.com",
}));

vi.mock("../../../lib/sessionVars", () => ({
  getSession: vi.fn(() => null),
  clearSession: vi.fn(),
}));

vi.mock("../../../contexts/SuperAdminContext", () => ({
  useSuperAdmin: () => ({
    user: { uid: "test-uid" },
    logout: vi.fn(),
  }),
}));

import SettingsTab from "../SettingsTab";

describe("SettingsTab", () => {
  it("renders account email", () => {
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.accountEmail")).toBeDefined();
  });

  it("renders account UID", () => {
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.accountUid")).toBeDefined();
  });

  it("shows session inactive by default", () => {
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.sessionInactive")).toBeDefined();
  });

  it("shows logout button", () => {
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.logoutButton")).toBeDefined();
  });
});
