import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AccessTab from "../AccessTab";

describe("AccessTab", () => {
  const defaultProps = {
    setupToken: "abc123",
    handleResetTokenFromAdmin: vi.fn(),
    handleAdminLogout: vi.fn(),
    handleDeleteInvitation: vi.fn(),
  };

  afterEach(cleanup);

  it("renders description and token input", () => {
    render(<AccessTab {...defaultProps} />);
    expect(screen.getByText("access.description")).toBeDefined();
    const input = screen.getByDisplayValue("abc123");
    expect(input).toBeDefined();
    expect(input).toHaveAttribute("readOnly");
  });

  it("shows active token indicator when setupToken is provided", () => {
    render(<AccessTab {...defaultProps} />);
    expect(screen.getByText("access.activeToken")).toBeDefined();
  });

  it("does not show active token indicator when setupToken is empty", () => {
    render(<AccessTab {...defaultProps} setupToken="" />);
    expect(screen.queryByText("access.activeToken")).toBeNull();
  });

  it("renders placeholder when setupToken is empty", () => {
    render(<AccessTab {...defaultProps} setupToken="" />);
    expect(screen.getByPlaceholderText("access.newTokenPlaceholder")).toBeDefined();
  });

  it("calls handleResetTokenFromAdmin on generate token click", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const handleResetTokenFromAdmin = vi.fn();
    render(<AccessTab {...defaultProps} handleResetTokenFromAdmin={handleResetTokenFromAdmin} />);
    fireEvent.click(screen.getByText("access.generateToken"));
    expect(handleResetTokenFromAdmin).toHaveBeenCalledOnce();
  });

  it("does not regenerate the token when the user cancels", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const handleResetTokenFromAdmin = vi.fn();
    render(<AccessTab {...defaultProps} handleResetTokenFromAdmin={handleResetTokenFromAdmin} />);
    fireEvent.click(screen.getByText("access.generateToken"));
    expect(handleResetTokenFromAdmin).not.toHaveBeenCalled();
  });

  it("calls handleAdminLogout on logout click", () => {
    const handleAdminLogout = vi.fn();
    render(<AccessTab {...defaultProps} handleAdminLogout={handleAdminLogout} />);
    fireEvent.click(screen.getByText("access.logout"));
    expect(handleAdminLogout).toHaveBeenCalledOnce();
  });

  it("calls handleDeleteInvitation on delete invitation click", () => {
    const handleDeleteInvitation = vi.fn();
    render(<AccessTab {...defaultProps} handleDeleteInvitation={handleDeleteInvitation} />);
    fireEvent.click(screen.getByText("access.deleteInvitation"));
    expect(handleDeleteInvitation).toHaveBeenCalledOnce();
  });

  it("renders delete data description", () => {
    render(<AccessTab {...defaultProps} />);
    expect(screen.getByText("access.deleteDataDescription")).toBeDefined();
  });

  it("displays empty placeholder fallback for missing token", () => {
    render(<AccessTab {...defaultProps} setupToken={""} />);
    const input = screen.getByDisplayValue("");
    expect(input).toBeDefined();
  });
});
