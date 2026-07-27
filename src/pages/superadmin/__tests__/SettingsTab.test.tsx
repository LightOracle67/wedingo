import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetSession = vi.fn();
const mockClearSession = vi.fn();
const mockLogout = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../../lib/superadmin", () => ({
  SUPERADMIN_EMAIL: "admin@test.com",
}));

vi.mock("../../../lib/sessionVars", () => ({
  getSession: () => mockGetSession(),
  clearSession: () => mockClearSession(),
}));

vi.mock("../../../contexts/SuperAdminContext", () => ({
  useSuperAdmin: () => ({
    user: { uid: "test-uid" },
    logout: () => mockLogout(),
  }),
}));

import SettingsTab from "../SettingsTab";

describe("SettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders account email", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.accountEmail")).toBeInTheDocument();
  });

  it("renders account UID", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.accountUid")).toBeInTheDocument();
  });

  it("shows session inactive when no session", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.sessionInactive")).toBeInTheDocument();
  });

  it("shows session active when session exists", () => {
    mockGetSession.mockReturnValue({
      type: "superadmin",
      identifier: "admin@test.com",
      expiresAt: Date.now() + 3600000,
    });
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.sessionActive")).toBeInTheDocument();
  });

  it("shows session details when session exists", () => {
    const expiresAt = Date.now() + 3600000;
    mockGetSession.mockReturnValue({
      type: "superadmin",
      identifier: "admin@test.com",
      expiresAt,
    });
    render(<SettingsTab />);
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("superadmin.sessionTypeSuperadmin")).toBeInTheDocument();
  });

  it("shows session type setup", () => {
    mockGetSession.mockReturnValue({
      type: "setup",
      identifier: "token123",
      expiresAt: Date.now() + 3600000,
    });
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.sessionTypeSetup")).toBeInTheDocument();
  });

  it("shows session type admin", () => {
    mockGetSession.mockReturnValue({
      type: "admin",
      identifier: "username",
      expiresAt: Date.now() + 3600000,
    });
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.sessionTypeAdmin")).toBeInTheDocument();
  });

  it("shows logout button", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.logoutButton")).toBeInTheDocument();
  });

  it("calls logout and clearSession on button click", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    fireEvent.click(screen.getByText("superadmin.logoutButton"));
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("shows firebase link", () => {
    mockGetSession.mockReturnValue(null);
    render(<SettingsTab />);
    expect(screen.getByText("superadmin.firebaseLink")).toBeInTheDocument();
    expect(screen.getByText("superadmin.firebaseAccount")).toBeInTheDocument();
  });
});
