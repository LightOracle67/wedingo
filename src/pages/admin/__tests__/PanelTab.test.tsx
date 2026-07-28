import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const mockAddToast = vi.hoisted(() => vi.fn());
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast, startUploadToast: vi.fn() }),
}));

vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../lib/firebase", () => ({
  invitationDocRef: vi.fn(() => ({ id: "test-ref" })),
}));

vi.mock("../../../lib/crypto-utils", () => ({
  encrypt: vi.fn((s: string) => Promise.resolve(s)),
}));

const mocks = vi.hoisted(() => ({
  calcRSVPSummary: vi.fn(() => ({ confirmed: 5, declined: 2, pending: 3 })),
  getDietarySummary: vi.fn(() => []),
}));
vi.mock("../../../lib/admin-utils", () => ({
  calcRSVPSummary: (...args: unknown[]) => mocks.calcRSVPSummary(...args),
  getDietarySummary: (...args: unknown[]) => mocks.getDietarySummary(...args),
}));

import PanelTab from "../PanelTab";

const baseConfig = {
  inviteToken: "test-token",
  confirmedResponses: 5,
  declinedResponses: 2,
  totalGuests: 10,
  rsvpEntries: [],
  formatDate: (d: unknown) => String(d),
  onRestore: vi.fn(),
  visitCount: 15,
  exportData: { firstName: "Test", secondName: "User", theme: "golden" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calcRSVPSummary.mockImplementation(() => ({ confirmed: 5, declined: 2, pending: 3 }));
  mocks.getDietarySummary.mockImplementation(() => []);
});

describe("PanelTab", () => {
  it("renders invite URL with token", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText(/https:\/\/localhost\/test-token/)).toBeDefined();
  });

  it("renders stats cards with labels", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.confirmed")).toBeDefined();
    expect(screen.getByText("panel.notAttending")).toBeDefined();
    expect(screen.getByText("panel.noResponse")).toBeDefined();
    expect(screen.getByText("panel.totalGuests")).toBeDefined();
  });

  it("shows visit count", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText(/panel\.visits/)).toBeDefined();
  });

  it("shows no visits when count is zero", () => {
    render(<PanelTab config={{ ...baseConfig, visitCount: 0 }} />);
    expect(screen.getByText("panel.noVisits")).toBeDefined();
  });

  it("renders backup and restore buttons", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.downloadBackup")).toBeDefined();
    expect(screen.getByText("panel.restoreBackup")).toBeDefined();
  });

  it("shows no responses message when rsvpEntries is empty", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.noResponses")).toBeDefined();
  });

  it("renders recent responses when rsvpEntries exist", () => {
    const entries = [
      { id: "1", guestName: "Alice", attendance: "yes", companions: 2, submittedAt: "2025-01-01" },
      { id: "2", guestName: "Bob", attendance: "no", companions: 0, submittedAt: "2025-01-02" },
    ];
    render(<PanelTab config={{ ...baseConfig, rsvpEntries: entries }} />);
    expect(screen.getByText("panel.latestResponses")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("renders donut chart when entries exist", () => {
    render(<PanelTab config={baseConfig} />);
    expect(mocks.calcRSVPSummary).toHaveBeenCalled();
    expect(screen.getByText((text: string) => text.includes("panel.confirms"))).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("panel.declines"))).toBeDefined();
    expect(screen.getByText((text: string) => text.includes("panel.pending"))).toBeDefined();
  });

  it("renders dietary preferences when dietary data exists", () => {
    mocks.getDietarySummary.mockReturnValue([{ item: "gluten free", count: 3 }]);
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.dietaryPreferences")).toBeDefined();
    expect(screen.getByText("gluten free")).toBeDefined();
  });

  it("renders publishedAt card with invite URL", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.publishedAt")).toBeDefined();
  });

  it("triggers backup when downloadBackup is clicked", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);

    render(<PanelTab config={baseConfig} />);
    fireEvent.click(screen.getByText("panel.downloadBackup"));
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("shows restore error on invalid file", async () => {
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const invalidFile = new File(["not json"], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("errors.restoreFailed"));
    });
  });

  it("shows restore error on file too large", async () => {
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    await vi.waitFor(() => {
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  it("handles backup without exportData gracefully", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    render(<PanelTab config={{ ...baseConfig, exportData: undefined }} />);
    fireEvent.click(screen.getByText("panel.downloadBackup"));
    expect(mockAddToast).toHaveBeenCalledWith("error", expect.any(String));
  });
});
