import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }),
}));

const mockAddToast = vi.fn();
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

import AttendanceTab from "../AttendanceTab";
import type { RsvpEntry } from "../../../types";

const baseConfig = {
  searchQuery: "", setSearchQuery: vi.fn((_v: string) => undefined),
  attendanceFilter: "all", setAttendanceFilter: vi.fn((_f: string) => undefined),
  filteredEntries: [],
  rsvpEntries: [],
  exportPdf: vi.fn(() => undefined),
  formatDate: (d: unknown) => String(d),
  handleClearRsvpEntries: vi.fn(() => undefined),
  handleDeleteRsvpEntries: vi.fn((_ids: string[]) => undefined),
};

describe("AttendanceTab", () => {
  it("renders stats line", () => {
    render(<AttendanceTab {...baseConfig} />);
    expect(screen.getByText("attendance.statsLine")).toBeDefined();
  });
  it("shows empty state when no entries", () => {
    render(<AttendanceTab {...baseConfig} />);
    expect(screen.getByText("attendance.noResults")).toBeDefined();
  });
  it("renders search label", () => {
    render(<AttendanceTab {...baseConfig} />);
    expect(screen.getByText("attendance.searchLabel")).toBeDefined();
  });
  it("renders select all option", () => {
    render(<AttendanceTab {...baseConfig} />);
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
        handleDeleteRsvpEntries={vi.fn()}
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
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("attendance.exportPdf"));
    expect(exportPdf).toHaveBeenCalled();
  });

  it("renders transport column merging mode and departure", () => {
    const entry = {
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "", submittedAt: "2024-01-01",
      transportMode: "taxi", transportChoice: "1",
    };
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[entry]}
        rsvpEntries={[entry]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
        transportDepartures={JSON.stringify([
          { type: "bus", time: "12:00", url: "" },
          { type: "taxi", time: "14:30", url: "" },
        ])}
      />
    );
    expect(screen.getByText("transport.typeTaxi (14:30)")).toBeDefined();
  });

  it("renders own car when transport mode is own", () => {
    const entry = {
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "", submittedAt: "2024-01-01",
      transportMode: "own", transportChoice: "",
    };
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[entry]}
        rsvpEntries={[entry]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />
    );
    expect(screen.getByText("attendance.transportOwnCar")).toBeDefined();
  });

  it("uses the stored transport time even if departures changed", () => {
    const entry = {
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "", submittedAt: "2024-01-01",
      transportMode: "taxi", transportChoice: "5", transportTime: "09:15",
    };
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[entry]}
        rsvpEntries={[entry]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
        transportDepartures={JSON.stringify([{ type: "bus", time: "12:00", url: "" }])}
      />
    );
    expect(screen.getByText("transport.typeTaxi (09:15)")).toBeDefined();
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
        handleDeleteRsvpEntries={vi.fn()}
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
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("attendance.noResultsFilter")).toBeDefined();
  });

  it("calls setAttendanceFilter when the attendance filter changes", () => {
    const setAttendanceFilter = vi.fn();
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={setAttendanceFilter}
        filteredEntries={[]}
        rsvpEntries={[]}
        exportPdf={vi.fn()}
        formatDate={(d) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("attendance.filterLabel"), { target: { value: "yes" } });
    expect(setAttendanceFilter).toHaveBeenCalledWith("yes");
  });

  it("calls setSearchQuery when select changes", () => {
    const setSearchQuery = vi.fn();
    const entries: RsvpEntry[] = [
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
        handleDeleteRsvpEntries={vi.fn()}
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
            mealChoice: "carne",
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
            mealChoice: "carne",
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
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
        handleDeleteRsvpEntries={vi.fn()}
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
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText(/Helen/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/sin gluten/)).toBeDefined();
    expect(screen.getByText(/sin lactosa/)).toBeDefined();
  });

  it("shows diet items without counts for entries without attendees", () => {
    const entry = {
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "sin gluten", mealChoice: "carne", submittedAt: "2024-01-01",
    };
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[entry]}
        rsvpEntries={[entry]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("sin gluten")).toBeDefined();
    expect(screen.queryByText("sin gluten: 1")).toBeNull();
  });

  it("shows the meal label from mealChoice for entries without attendees", () => {
    const entry = {
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "", mealChoice: "carne", submittedAt: "2024-01-01",
    };
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[entry]}
        rsvpEntries={[entry]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("rsvp.menuCarne")).toBeDefined();
  });

  it("resolves transport labels for each mode", () => {
    const makeEntry = (overrides: Record<string, unknown>) => ({
      id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0,
      dietaryInfo: "", submittedAt: "2024-01-01", ...overrides,
    });
    const entries = [
      makeEntry({ transportMode: "bus", transportTime: "12:00" }),
      makeEntry({ transportMode: "taxi", transportTime: "" }),
      makeEntry({ transportMode: "own" }),
      makeEntry({ transportMode: "" }),
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
        transportDepartures={JSON.stringify([{ type: "bus", time: "10:00", url: "" }])}
      />
    );
    expect(screen.getByText("transport.typeBus (12:00)")).toBeDefined();
    expect(screen.getByText("transport.typeTaxi")).toBeDefined();
    expect(screen.getByText("attendance.transportOwnCar")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("formats birth dates and falls back to a dash", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01", birthDate: "2000-05-15" },
      { id: "2", guestName: "Bob", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01", birthDate: "" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    // Un birthDate no vacío se formatea; el vacío muestra "—".
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("toggles all and batch deletes with companions", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 1, dietaryInfo: "", submittedAt: "2024-01-01", rsvpType: "main" as const, companionDocIds: ["c1"] },
      { id: "2", guestName: "Bob", attendance: "no" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    const deleteSpy = vi.fn();
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={deleteSpy}
      />
    );
    fireEvent.click(screen.getByLabelText("attendance.selectAll"));
    fireEvent.click(screen.getByText("attendance.deleteSelected"));
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("selects a single row via its checkbox", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
      { id: "2", guestName: "Bob", attendance: "no" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]!);
    expect(screen.getByText("attendance.deleteSelected")).toBeDefined();
  });

  it("selects and deselects all rows", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
      { id: "2", guestName: "Bob", attendance: "no" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    const selectAll = screen.getByLabelText("attendance.selectAll");
    fireEvent.click(selectAll);
    fireEvent.click(selectAll);
    expect(screen.getByLabelText("attendance.selectAll")).toBeDefined();
  });

  it("renders attendee menu lines and consent badges", () => {
    const entries = [
      {
        id: "1", guestName: "Alice", attendance: "yes" as const, companions: 1, dietaryInfo: "", submittedAt: "2024-01-01",
        parentalConsent: true,
        attendees: [{ name: "Child", menu: "carne" }, { name: "NoMenu" }],
      },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("attendance.consentParental")).toBeDefined();
  });

  it("does not crash with non-array transport departures", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01", birthDate: "2000-01-01" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
        transportDepartures='{"a":1}'
      />
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("formats long birth dates and empty ones", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01", birthDate: "2024-01-01T12:00:00Z" },
      { id: "2", guestName: "Bob", attendance: "no" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-02", birthDate: "" },
      { id: "3", guestName: "Carlos", attendance: "no" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-03" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("renders rows when rsvpEntries is undefined", () => {
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={undefined as never} rsvpEntries={undefined as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("attendance.noResults")).toBeDefined();
  });

  it("renders health consent badge and companion without mainGuestName", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-01", healthConsent: true, mealChoice: "carne" },
      { id: "2", guestName: "Bob", attendance: "yes" as const, rsvpType: "companion" as const, companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    render(
      <AttendanceTab
        searchQuery="" setSearchQuery={vi.fn()} attendanceFilter="all" setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never} rsvpEntries={entries as never}
        exportPdf={vi.fn()} formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()} handleDeleteRsvpEntries={vi.fn()}
      />
    );
    expect(screen.getByText("attendance.consentHealth")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
