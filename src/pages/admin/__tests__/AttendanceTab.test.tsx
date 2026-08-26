import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }),
}));

const mockAddToast = vi.fn();
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// Firestore: solo se ejercitan en los callbacks de añadir/editar manual.
// (vi.hoisted evita el error de hoisting de vi.mock con variables top-level).
const fsMocks = vi.hoisted(() => ({
  commit: vi.fn(() => Promise.resolve()),
  update: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "doc-ref"),
  writeBatch: () => ({ update: fsMocks.update, set: fsMocks.setDoc, commit: fsMocks.commit }),
  serverTimestamp: () => "ts",
  getDoc: fsMocks.getDoc,
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
vi.mock("../../../lib/async-utils", () => ({
  withWriteRetry: <T,>(fn: () => Promise<T>) => fn(),
}));
vi.mock("../../components/Modal", () => ({
  default: ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div role="dialog" aria-label={title}>
      {children}
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

import AttendanceTab from "../AttendanceTab";
import type { RsvpEntry } from "../../../types";

const baseConfig = {
  searchQuery: "",
  setSearchQuery: vi.fn((_v: string) => undefined),
  attendanceFilter: "all",
  setAttendanceFilter: vi.fn((_f: string) => undefined),
  filteredEntries: [],
  rsvpEntries: [],
  exportPdf: vi.fn(() => undefined),
  formatDate: (d: unknown) => String(d),
  handleClearRsvpEntries: vi.fn(() => undefined),
  handleDeleteRsvpEntries: vi.fn((_ids: string[]) => undefined),
  inviteToken: "tok",
  onDataChanged: vi.fn(() => undefined),
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
          {
            id: "1",
            guestName: "Alice",
            attendance: "yes",
            companions: 2,
            dietaryInfo: "Veg",
            submittedAt: "2024-01-01",
          },
          { id: "2", guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
        ]}
        rsvpEntries={[
          {
            id: "1",
            guestName: "Alice",
            attendance: "yes",
            companions: 2,
            dietaryInfo: "Veg",
            submittedAt: "2024-01-01",
          },
          { id: "2", guestName: "Bob", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
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
      />,
    );
    fireEvent.click(screen.getByText("attendance.exportPdf"));
    expect(exportPdf).toHaveBeenCalled();
  });

  it("renders transport column merging mode and departure", () => {
    const entry = {
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "",
      submittedAt: "2024-01-01",
      transportMode: "taxi",
      transportChoice: "1",
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
      />,
    );
    expect(screen.getByText("transport.typeTaxi (14:30)")).toBeDefined();
  });

  it("renders own car when transport mode is own", () => {
    const entry = {
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "",
      submittedAt: "2024-01-01",
      transportMode: "own",
      transportChoice: "",
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
      />,
    );
    expect(screen.getByText("attendance.transportOwnCar")).toBeDefined();
  });

  it("uses the stored transport time even if departures changed", () => {
    const entry = {
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "",
      submittedAt: "2024-01-01",
      transportMode: "taxi",
      transportChoice: "5",
      transportTime: "09:15",
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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
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
            attendees: [{ name: "Frank", menu: "carne", allergies: ["sin gluten"] }],
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
            attendees: [{ name: "Frank", menu: "carne", allergies: ["sin gluten"] }],
            mealChoice: "carne",
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
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
            attendees: [{ name: "Grace", menu: "carne", allergies: [] }],
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
            attendees: [{ name: "Grace", menu: "carne", allergies: [] }],
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
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
            attendees: [{ name: "Helen", menu: "", allergies: ["sin gluten", "sin lactosa"] }],
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
            attendees: [{ name: "Helen", menu: "", allergies: ["sin gluten", "sin lactosa"] }],
          },
        ]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Helen/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/sin gluten/)).toBeDefined();
    expect(screen.getByText(/sin lactosa/)).toBeDefined();
  });

  it("shows diet items without counts for entries without attendees", () => {
    const entry = {
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "sin gluten",
      mealChoice: "carne",
      submittedAt: "2024-01-01",
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
      />,
    );
    expect(screen.getByText("sin gluten")).toBeDefined();
    expect(screen.queryByText("sin gluten: 1")).toBeNull();
  });

  it("shows the meal label from mealChoice for entries without attendees", () => {
    const entry = {
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "",
      mealChoice: "carne",
      submittedAt: "2024-01-01",
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
      />,
    );
    expect(screen.getByText("rsvp.menuCarne")).toBeDefined();
  });

  it("resolves transport labels for each mode", () => {
    const makeEntry = (overrides: Record<string, unknown>) => ({
      id: "1",
      guestName: "Alice",
      attendance: "yes" as const,
      companions: 0,
      dietaryInfo: "",
      submittedAt: "2024-01-01",
      ...overrides,
    });
    const entries = [
      makeEntry({ transportMode: "bus", transportTime: "12:00" }),
      makeEntry({ transportMode: "taxi", transportTime: "" }),
      makeEntry({ transportMode: "own" }),
      makeEntry({ transportMode: "" }),
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
        transportDepartures={JSON.stringify([{ type: "bus", time: "10:00", url: "" }])}
      />,
    );
    expect(screen.getByText("transport.typeBus (12:00)")).toBeDefined();
    expect(screen.getByText("transport.typeTaxi")).toBeDefined();
    expect(screen.getByText("attendance.transportOwnCar")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("formats birth dates and falls back to a dash", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        birthDate: "2000-05-15",
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        birthDate: "",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    // Un birthDate no vacío se formatea; el vacío muestra "—".
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("toggles all and batch deletes with companions", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 1,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        rsvpType: "main" as const,
        companionDocIds: ["c1"],
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "no" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-02",
      },
    ];
    const deleteSpy = vi.fn();
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={deleteSpy}
      />,
    );
    fireEvent.click(screen.getByLabelText("attendance.selectAll"));
    fireEvent.click(screen.getByText("attendance.deleteSelected"));
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("selects a single row via its checkbox", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "no" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-02",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]!);
    expect(screen.getByText("attendance.deleteSelected")).toBeDefined();
  });

  it("selects and deselects all rows", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "no" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-02",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    const selectAll = screen.getByLabelText("attendance.selectAll");
    fireEvent.click(selectAll);
    fireEvent.click(selectAll);
    expect(screen.getByLabelText("attendance.selectAll")).toBeDefined();
  });

  it("renders attendee menu lines and consent badges", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 1,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        parentalConsent: true,
        attendees: [{ name: "Child", menu: "carne" }, { name: "NoMenu" }],
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    expect(screen.getByText("attendance.consentParental")).toBeDefined();
  });

  it("does not crash with non-array transport departures", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        birthDate: "2000-01-01",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
        transportDepartures='{"a":1}'
      />,
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("formats long birth dates and empty ones", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        birthDate: "2024-01-01T12:00:00Z",
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "no" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-02",
        birthDate: "",
      },
      {
        id: "3",
        guestName: "Carlos",
        attendance: "no" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-03",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
  });

  it("renders rows when rsvpEntries is undefined", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={undefined as never}
        rsvpEntries={undefined as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    expect(screen.getByText("attendance.noResults")).toBeDefined();
  });

  it("renders health consent badge and companion without mainGuestName", () => {
    const entries = [
      {
        id: "1",
        guestName: "Alice",
        attendance: "yes" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-01",
        healthConsent: true,
        mealChoice: "carne",
      },
      {
        id: "2",
        guestName: "Bob",
        attendance: "yes" as const,
        rsvpType: "companion" as const,
        companions: 0,
        dietaryInfo: "",
        submittedAt: "2024-01-02",
      },
    ];
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );
    expect(screen.getByText("attendance.consentHealth")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("opens the add-manual modal and saves a new guest via writeBatch", async () => {
    fsMocks.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 3 }) });
    const withData = {
      ...baseConfig,
      rsvpEntries: [
        { id: "x", guestName: "A", attendance: "yes", companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
      ] as never,
    };
    render(<AttendanceTab {...withData} />);
    fireEvent.click(screen.getByText("attendance.addManual"));
    // El modal aparece.
    expect(screen.getByRole("dialog", { name: "attendance.manualAddTitle" })).toBeDefined();
    // Rellena y guarda.
    fireEvent.change(screen.getByLabelText("attendance.manualNameLabel"), { target: { value: "Manuel" } });
    fireEvent.click(screen.getByText("attendance.manualAdd"));
    await vi.waitFor(() => expect(fsMocks.setDoc).toHaveBeenCalled());
    // commit es posterior al await del getDoc del contador: se espera también.
    await vi.waitFor(() => expect(fsMocks.commit).toHaveBeenCalled());
    expect(mockAddToast).toHaveBeenCalledWith("success", "attendance.manualAdded");
    expect(withData.onDataChanged as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("requires a name before saving manually", () => {
    const withData = {
      ...baseConfig,
      rsvpEntries: [
        { id: "x", guestName: "A", attendance: "yes", companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
      ] as never,
    };
    render(<AttendanceTab {...withData} />);
    fireEvent.click(screen.getByText("attendance.addManual"));
    // Sin nombre, el botón guardar está deshabilitado y no se envía nada.
    const addBtn = screen.getByText("attendance.manualAdd").closest("button");
    expect(addBtn).toBeDisabled();
  });

  it("edits an existing response via writeBatch update", async () => {
    const entries = [
      { id: "1", guestName: "Ana", attendance: "yes", companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
    ];
    render(<AttendanceTab {...baseConfig} filteredEntries={entries as never} rsvpEntries={entries as never} />);
    // Botón de edición en la fila.
    const editBtns = screen.getAllByText("attendance.editManual");
    fireEvent.click(editBtns[0]!);
    expect(screen.getByRole("dialog", { name: "attendance.manualEditTitle" })).toBeDefined();
    fireEvent.click(screen.getByText("attendance.manualSave"));
    await vi.waitFor(() => expect(fsMocks.update).toHaveBeenCalled());
    expect(mockAddToast).toHaveBeenCalledWith("success", "attendance.manualUpdated");
  });

  it("shows the filtered results counter", () => {
    const entries = [
      { id: "1", guestName: "Ana", attendance: "yes", companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
      { id: "2", guestName: "Luis", attendance: "no", companions: 0, dietaryInfo: "", submittedAt: "2024-01-02" },
    ];
    render(<AttendanceTab {...baseConfig} filteredEntries={entries as never} rsvpEntries={entries as never} />);
    const counter = document.querySelector("[data-testid='attendance-results-count']");
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toContain("2");
  });

  it("shows the reset-filters button only when a filter/search is active", () => {
    const entries = [
      { id: "1", guestName: "Ana", attendance: "yes", companions: 0, dietaryInfo: "", submittedAt: "2024-01-01" },
    ];
    render(
      <AttendanceTab
        {...baseConfig}
        filteredEntries={entries as never}
        rsvpEntries={entries as never}
        attendanceFilter="yes"
      />,
    );
    expect(screen.getByText("attendance.resetFilters")).toBeDefined();
  });

  // Matriz de ordenación: un clic por cada cabecera ejercita el getValue de
  // las 10 columnas de sortColumns (incluidas las variantes attendees vs
  // mealChoice/dietaryInfo) y el segundo clic cubre el orden descendente.
  it("sorts by every column header with main and companion rows", () => {
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={[
          {
            id: "m1",
            rsvpType: "main",
            guestName: "Ana García López",
            attendance: "yes",
            companions: 1,
            dietaryInfo: "Sin gluten|Lactosa",
            mealChoice: "",
            attendees: [{ name: "Ana", menu: "pollo", allergies: ["Gluten"] }],
            transportMode: "bus",
            transportChoice: "Coche",
            transportTime: "12:00",
            isChild: false,
            parentalConsent: true,
            phone: "600111222",
            email: "ana@x.es",
            submittedAt: "2024-01-02T10:00:00Z",
          },
          {
            id: "c1",
            rsvpType: "companion",
            guestName: "Beto Ruiz Soler",
            mainGuestName: "Ana García López",
            attendance: "yes",
            companions: 0,
            dietaryInfo: "Vegano",
            mealChoice: "cerdo",
            isChild: true,
            healthConsent: true,
            submittedAt: "2024-01-01T09:00:00Z",
          },
        ]}
        rsvpEntries={[]}
        exportPdf={vi.fn()}
        formatDate={(d: string) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );

    const headers = [
      "attendance.tableName",
      "attendance.tableAccompanies",
      "attendance.tableAttendance",
      "attendance.tableMenu",
      "attendance.tableDiet",
      "attendance.tableTransport",
      "attendance.tableChild",
      "attendance.tableConsents",
      "attendance.tableContact",
      "attendance.tableDate",
    ];

    for (const label of headers) {
      const btn = screen.getByRole("button", { name: new RegExp(`^${label}\\. Pulsa para ordenar$`) });
      // Ascendente: el th pasa a aria-sort="ascending".
      fireEvent.click(btn);
      expect(btn.closest("th")).toHaveAttribute("aria-sort", "ascending");
      // Descendente: segundo clic sobre la misma columna.
      fireEvent.click(btn);
      expect(btn.closest("th")).toHaveAttribute("aria-sort", "descending");
      // Tercer clic resetea a sin orden (cubre la rama "none" del indicador).
      fireEvent.click(btn);
      expect(btn.closest("th")).toHaveAttribute("aria-sort", "none");
    }

    // Sanidad: ambas filas siguen visibles tras tantas reordenaciones.
    expect(screen.getAllByText("Ana García López").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beto Ruiz Soler").length).toBeGreaterThan(0);
  });
});

describe("AttendanceTab — matriz de ordenación", () => {
  // Tres entradas diseñadas para que cada columna tenga un orden determinista:
  // una main con attendees (menú y alergias por acompañante), una main con
  // campos planos (mealChoice/dietaryInfo/transporte propio/contacto) y una
  // companion sin consentimientos (para que los booleanos tengan único true).
  const entries = [
    {
      id: "1",
      guestName: "Ana",
      attendance: "yes",
      companions: 1,
      rsvpType: "main",
      attendees: [{ name: "C1", menu: "pollo", allergies: ["Gluten"] }],
      dietaryInfo: "",
      mealChoice: "",
      transportMode: "bus",
      transportChoice: "Bus 5",
      transportTime: "18:00",
      phone: "600",
      email: "",
      submittedAt: "2024-02-01",
    },
    {
      id: "2",
      guestName: "Beto",
      attendance: "yes",
      companions: 0,
      rsvpType: "main",
      attendees: [],
      dietaryInfo: "Lactosa",
      mealChoice: "pescado",
      transportMode: "own",
      transportChoice: "",
      transportTime: "",
      phone: "",
      email: "b@x.es",
      submittedAt: "2024-01-01",
      isChild: true,
      healthConsent: true,
    },
    {
      id: "3",
      guestName: "Carla",
      attendance: "yes",
      companions: 0,
      rsvpType: "companion",
      mainGuestName: "Zoe",
      attendees: [],
      dietaryInfo: "",
      mealChoice: "",
      submittedAt: "2024-03-01",
    },
  ];

  const mount = () =>
    render(
      <AttendanceTab
        searchQuery=""
        setSearchQuery={vi.fn()}
        attendanceFilter="all"
        setAttendanceFilter={vi.fn()}
        filteredEntries={entries as unknown as RsvpEntry[]}
        rsvpEntries={entries as unknown as RsvpEntry[]}
        exportPdf={vi.fn()}
        formatDate={(d: unknown) => String(d)}
        handleClearRsvpEntries={vi.fn()}
        handleDeleteRsvpEntries={vi.fn()}
      />,
    );

  // Filas SOLO de la tabla principal: el componente renderiza un segundo
  // <tbody> (panel lateral) que contaminaría el índice si se lee del contenedor.
  const rowNames = (c: HTMLElement) =>
    Array.from(c.querySelectorAll("table.admin-table tbody tr")).map((r) => r.textContent || "");

  const clickHeader = (label: string) => {
    const btn = screen.getByText(label).closest("button");
    if (!btn) throw new Error(`sin botón de cabecera para ${label}`);
    fireEvent.click(btn);
  };

  it("ciclo asc→desc→default por cabecera cubre los getValue de las columnas", () => {
    const { container } = mount();
    // [cabecera, primera fila en asc, primera fila en desc]. Los valores vacíos
    // quedan SIEMPRE al final, así que en desc sube el mayor NO vacío.
    const casos: Array<[string, string, string]> = [
      ["attendance.tableName", "Ana", "Carla"],
      ["attendance.tableAccompanies", "Carla", "Carla"],
      ["attendance.tableMenu", "Ana", "Beto"],
      ["attendance.tableDiet", "Ana", "Beto"],
      ["attendance.tableContact", "Ana", "Beto"],
      ["attendance.tableDate", "Beto", "Carla"],
    ];
    for (const [label, primeroAsc, primeroDesc] of casos) {
      clickHeader(label);
      expect(rowNames(container)[0], `asc ${label}`).toContain(primeroAsc);
      clickHeader(label);
      expect(rowNames(container)[0], `desc ${label}`).toContain(primeroDesc);
      // Tercer clic: sin orden → vuelve el orden de entrada (estable).
      clickHeader(label);
      expect(rowNames(container)[0], `default ${label}`).toContain("Ana");
    }
    // Asistencia idéntica en las tres filas: la ordenación es estable y no
    // altera el orden original en ninguna dirección.
    clickHeader("attendance.tableAttendance");
    expect(rowNames(container)[0]).toContain("Ana");
    expect(rowNames(container)).toHaveLength(3);
  });

  it("transporte ordena con el guion de sin-transporte primero (no es vacío)", () => {
    const { container } = mount();
    clickHeader("attendance.tableTransport");
    // resolveTransportLabel devuelve "—" cuando no hay modo/elección/hora:
    // ese guion es un string no vacío y se ordena antes que las etiquetas.
    let rows = rowNames(container);
    expect(rows[0]).toContain("Carla");
    expect(rows[rows.length - 1]).toContain("Ana");
    clickHeader("attendance.tableTransport");
    rows = rowNames(container);
    // Desc: se invierten los no vacíos.
    expect(rows[0]).toContain("Ana");
    expect(rows[rows.length - 1]).toContain("Carla");
  });

  it("la columna ¿niño? ordena booleanos asc y desc", () => {
    const { container } = mount();
    clickHeader("attendance.tableChild");
    // asc: falsos primero, el niño (Beto) último.
    expect(rowNames(container)[rowNames(container).length - 1]).toContain("Beto");
    clickHeader("attendance.tableChild");
    // desc: el niño primero.
    expect(rowNames(container)[0]).toContain("Beto");
  });

  it("consentimientos ordena poniendo el único consentimiento al final en asc", () => {
    const { container } = mount();
    clickHeader("attendance.tableConsents");
    expect(rowNames(container)[rowNames(container).length - 1]).toContain("Beto");
    clickHeader("attendance.tableConsents");
    expect(rowNames(container)[0]).toContain("Beto");
  });
});
