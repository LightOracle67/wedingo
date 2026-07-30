import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders table with entries when data provided", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "Veg", submittedAt: "2024-01-01" },
          { id: "2", guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
        ]}
        rsvpEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "Veg", submittedAt: "2024-01-01" },
          { id: "2", guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    expect(screen.getByText("attendance.exportPdf")).toBeDefined();
    expect(screen.getByText("attendance.clearAttendance")).toBeDefined();
  });

  it("calls exportPdf when button clicked", () => {
    const exportPdf = vi.fn();
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "", submittedAt: "2024-01-01" },
        ]}
        rsvpEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "", submittedAt: "2024-01-01" },
        ]}
        exportPdf={exportPdf}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("attendance.exportPdf"));
    expect(exportPdf).toHaveBeenCalled();
  });

  it("calls handleClearRsvpEntries when clear button clicked", () => {
    const handleClearRsvpEntries = vi.fn();
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "", submittedAt: "2024-01-01" },
        ]}
        rsvpEntries={[
          { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "", submittedAt: "2024-01-01" },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={handleClearRsvpEntries}
      />
    );
    fireEvent.click(screen.getByText("attendance.clearAttendance"));
    expect(handleClearRsvpEntries).toHaveBeenCalled();
  });

  it("shows no results filter text when searchQuery is set", () => {
    render(
      <AttendanceTab
        searchQuery="nonexistent"
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[]}
        rsvpEntries={[]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("attendance.noResultsFilter")).toBeDefined();
  });

  it("calls setSearchQuery when select changes", () => {
    const setSearchQuery = vi.fn();
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes", companions: 2, dietaryInfo: "", submittedAt: "2024-01-01" },
      { id: "2", guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={setSearchQuery}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries}
        rsvpEntries={entries}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    const select = screen.getByDisplayValue("attendance.all");
    fireEvent.change(select, { target: { value: "Alice" } });
    expect(setSearchQuery).toHaveBeenCalledWith("Alice");
  });

  it("renders entries with guestNames fallback and attendees list", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          {
            id: "1",
            guestName: "Charlie",
            attendance: "yes",
            companions: 2,
            dietaryInfo: "gluten free | vegan",
            submittedAt: "2024-01-03",
            guestNames: "Charlie,David,Eve",
          },
          {
            id: "2",
            guestName: "Frank",
            attendance: "yes",
            companions: 1,
            dietaryInfo: "",
            submittedAt: "2024-01-04",
            attendees: [
              { name: "Frank", menu: "carne", allergies: ["sin gluten"] },
            ],
            menuHeadcounts: { carne: 1, pescado: 1 },
          },
        ]}
        rsvpEntries={[
          {
            id: "1",
            guestName: "Charlie",
            attendance: "yes",
            companions: 2,
            dietaryInfo: "gluten free | vegan",
            submittedAt: "2024-01-03",
            guestNames: "Charlie,David,Eve",
          },
          {
            id: "2",
            guestName: "Frank",
            attendance: "yes",
            companions: 1,
            dietaryInfo: "",
            submittedAt: "2024-01-04",
            attendees: [
              { name: "Frank", menu: "carne", allergies: ["sin gluten"] },
            ],
            menuHeadcounts: { carne: 1, pescado: 1 },
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText("Charlie").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Frank/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders attendees with menu data", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          {
            id: "1",
            guestName: "Grace",
            attendance: "yes",
            companions: 0,
            dietaryInfo: "",
            submittedAt: "2024-01-05",
            attendees: [
              { name: "Grace", menu: "carne", allergies: [] },
            ],
          },
        ]}
        rsvpEntries={[
          {
            id: "1",
            guestName: "Grace",
            attendance: "yes",
            companions: 0,
            dietaryInfo: "",
            submittedAt: "2024-01-05",
            attendees: [
              { name: "Grace", menu: "carne", allergies: [] },
            ],
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText(/Grace/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText((text: string) => text.includes("rsvp.menuCarne"))).toBeDefined();
  });

  it("renders attendees with allergies data", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          {
            id: "1",
            guestName: "Helen",
            attendance: "yes",
            companions: 1,
            dietaryInfo: "",
            submittedAt: "2024-01-06",
            attendees: [
              { name: "Helen", menu: "", allergies: ["sin gluten", "sin lactosa"] },
            ],
          },
        ]}
        rsvpEntries={[
          {
            id: "1",
            guestName: "Helen",
            attendance: "yes",
            companions: 1,
            dietaryInfo: "",
            submittedAt: "2024-01-06",
            attendees: [
              { name: "Helen", menu: "", allergies: ["sin gluten", "sin lactosa"] },
            ],
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText(/Helen/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/sin gluten/)).toBeDefined();
    expect(screen.getByText(/sin lactosa/)).toBeDefined();
  });
});
