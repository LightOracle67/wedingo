import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AttendanceTab from "../AttendanceTab";

const baseConfig = {
  searchQuery: "", setSearchQuery: vi.fn(),
  attendanceFilter: "all", setAttendanceFilter: vi.fn(),
  filteredEntries: [],
  rsvpEntries: [],
  exportPdf: vi.fn(),
  formatDate: (d: unknown) => String(d),
  handleClearRsvpEntries: vi.fn(),
};

describe("AttendanceTab", () => {
  it("renders stats line", () => {
    render(<AttendanceTab config={baseConfig} />);
    expect(screen.getByText("attendance.statsLine")).toBeDefined();
  });
  it("shows empty state when no entries", () => {
    render(<AttendanceTab config={baseConfig} />);
    expect(screen.getByText("attendance.noResults")).toBeDefined();
  });
  it("renders search label", () => {
    render(<AttendanceTab config={baseConfig} />);
    expect(screen.getByText("attendance.searchLabel")).toBeDefined();
  });
  it("renders select all option", () => {
    render(<AttendanceTab config={baseConfig} />);
    expect(screen.getByText("attendance.all")).toBeDefined();
  });
});
