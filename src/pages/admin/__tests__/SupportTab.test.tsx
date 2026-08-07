import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../lib/constants", () => ({
  APP_VERSION: "2.26.0",
}));

vi.mock("../../../components/ChangelogModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="changelog-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import SupportTab from "../SupportTab";

describe("SupportTab", () => {
  afterEach(cleanup);

  it("renders support sections with translations", () => {
    render(<SupportTab />);
    expect(screen.getByText("support.title")).toBeDefined();
    expect(screen.getByText("support.description")).toBeDefined();
    expect(screen.getByText("support.email")).toBeDefined();
    expect(screen.getByText("support.rightsTitle")).toBeDefined();
    expect(screen.getByText("support.rightsDescription")).toBeDefined();
    expect(screen.getByText("support.ccpaTitle")).toBeDefined();
    expect(screen.getByText("support.ccpaText")).toBeDefined();
    expect(screen.getByText("support.appTitle")).toBeDefined();
    expect(screen.getByText("support.appDescription")).toBeDefined();
  });

  it("renders delete and export buttons", () => {
    render(<SupportTab />);
    expect(screen.getByText("support.deleteButton")).toBeDefined();
    expect(screen.getByText("support.exportButton")).toBeDefined();
  });

  it("renders version button with APP_VERSION", () => {
    render(<SupportTab />);
    expect(screen.getByText("common.version")).toBeDefined();
  });

  it("renders copyright with current year", () => {
    render(<SupportTab />);
    expect(screen.getByText("support.copyright")).toBeDefined();
  });

  it("opens changelog modal when version button is clicked", () => {
    render(<SupportTab />);
    const versionButton = screen.getByText("common.version");
    fireEvent.click(versionButton);
    expect(screen.getByTestId("changelog-modal")).toBeDefined();
  });

  it("closes changelog modal when close is clicked", () => {
    render(<SupportTab />);
    const versionButton = screen.getByText("common.version");
    fireEvent.click(versionButton);
    expect(screen.getByTestId("changelog-modal")).toBeDefined();
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("changelog-modal")).toBeNull();
  });

  it("renders rights hint text", () => {
    render(<SupportTab />);
    expect(screen.getByText("support.rightsHint")).toBeDefined();
  });

  it("opens mailto when delete button is clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SupportTab />);
    fireEvent.click(screen.getByText("support.deleteButton"));
    expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining("mailto:"), "_blank");
    windowOpenSpy.mockRestore();
  });

  it("opens mailto when export button is clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SupportTab />);
    fireEvent.click(screen.getByText("support.exportButton"));
    expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining("mailto:"), "_blank");
    windowOpenSpy.mockRestore();
  });
});
