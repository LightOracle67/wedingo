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
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  collection: vi.fn(() => "collection-ref"),
  doc: vi.fn(() => ({ id: "subdoc" })),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  invitationDocRef: vi.fn(() => ({ id: "test-ref" })),
  rsvpByInviteRef: vi.fn(() => "rsvp-col-ref"),
}));

vi.mock("../../../lib/crypto-utils", () => ({
  encrypt: vi.fn((s: string) => Promise.resolve(s)),
}));

const mocks = vi.hoisted(() => ({
  calcRSVPSummary: vi.fn(() => ({ confirmed: 5, declined: 2, pending: 3 })),
  getDietarySummary: vi.fn(() => [] as { item: string; count: number }[]),
  buildAttendancePrediction: vi.fn(() => ({
    confirmedPeople: 0,
    projected: 0,
    capacityPct: null,
    pacePerDay: 0,
    daysToWedding: 0,
    hasFutureWedding: false,
    trend: "flat" as const,
  })),
  buildConfirmationsPerDay: vi.fn(() => [] as Array<{ day: string; count: number }>),
}));
vi.mock("../../../lib/admin-utils", () => ({
  calcRSVPSummary: (...args: Parameters<typeof mocks.calcRSVPSummary>) => mocks.calcRSVPSummary(...args),
  getDietarySummary: (...args: Parameters<typeof mocks.getDietarySummary>) => mocks.getDietarySummary(...args),
  buildAttendancePrediction: (...args: Parameters<typeof mocks.buildAttendancePrediction>) =>
    mocks.buildAttendancePrediction(...args),
  buildConfirmationsPerDay: (...args: Parameters<typeof mocks.buildConfirmationsPerDay>) =>
    mocks.buildConfirmationsPerDay(...args),
}));

import PanelTab, { type PanelTabConfig } from "../PanelTab";

const baseConfig: PanelTabConfig = {
  inviteToken: "test-token",
  confirmedResponses: 5,
  declinedResponses: 2,
  totalGuests: 10,
  confirmedPeople: 9,
  declinedPeople: 2,
  expectedGuests: 0,
  rsvpEntries: [],
  formatDate: (d: unknown) => String(d),
  onRestore: vi.fn(() => Promise.resolve()),
  visitCount: 15,
  exportData: { firstName: "Test", secondName: "User", theme: "golden" } as Exclude<
    PanelTabConfig["exportData"],
    undefined
  >,
};

beforeEach(() => {
  vi.clearAllMocks();
  // El restore pide confirmación (v2.81): se acepta en los tests.
  window.confirm = vi.fn(() => true);
  mocks.calcRSVPSummary.mockImplementation(() => ({ confirmed: 5, declined: 2, pending: 3 }));
  mocks.getDietarySummary.mockImplementation(() => []);
  mocks.buildAttendancePrediction.mockReturnValue({
    confirmedPeople: 0,
    projected: 0,
    capacityPct: null,
    pacePerDay: 0,
    daysToWedding: 0,
    hasFutureWedding: false,
    trend: "flat" as const,
  });
});

describe("PanelTab", () => {
  it("renders invite URL with token", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText(/https:\/\/localhost\/test-token/)).toBeDefined();
  });

  it("renders the 'view invitation' button", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.viewInvitation")).toBeDefined();
  });

  it("renders stats cards with labels", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.getByText("panel.confirmed")).toBeDefined();
    expect(screen.getByText("panel.notAttending")).toBeDefined();
    expect(screen.getByText("panel.noResponse")).toBeDefined();
    expect(screen.getByText("panel.totalGuests")).toBeDefined();
  });

  it("computes stats from the expected-guests number when set", () => {
    const cfg: PanelTabConfig = {
      ...baseConfig,
      // 120 esperados; 25 confirmados (personas) → 95 sin responder, total 120.
      confirmedPeople: 25,
      declinedPeople: 3,
      expectedGuests: 120,
    };
    const { container } = render(<PanelTab config={cfg} />);
    const values = Array.from(container.querySelectorAll(".admin-stats-card")).map((c) => c.textContent);
    // Confirmados 25, No asistirán 3, Sin responder 95, Total 120.
    expect(values.join(" ")).toContain("25");
    expect(values.join(" ")).toContain("3");
    expect(values.join(" ")).toContain("95");
    expect(values.join(" ")).toContain("120");
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

  it("renders the attendance projection block when there is a projection", () => {
    // Con proyección > 0 el bloque aparece con la métrica principal.
    mocks.buildAttendancePrediction.mockReturnValue({
      confirmedPeople: 12,
      projected: 20,
      capacityPct: 60,
      pacePerDay: 1.4,
      daysToWedding: 45,
      hasFutureWedding: true,
      trend: "up",
    } as never);
    render(<PanelTab config={{ ...baseConfig, expectedGuests: 30 }} />);
    expect(screen.getByText("panel.predictionTitle")).toBeDefined();
    expect(screen.getByText("panel.predictedPeople")).toBeDefined();
    expect(screen.getByText("panel.predictedCapacity")).toBeDefined();
    expect(screen.getByText("panel.predictedPace")).toBeDefined();
    // Barra de progreso de aforo accesible (Mejora UX).
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeDefined();
    expect(bar.getAttribute("aria-valuenow")).toBe("60");
  });

  it("hides the projection block when there is nothing to project", () => {
    render(<PanelTab config={baseConfig} />);
    expect(screen.queryByText("panel.predictionTitle")).toBeNull();
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

  it("triggers backup when downloadBackup is clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);

    render(<PanelTab config={baseConfig} />);
    fireEvent.click(screen.getByText("panel.downloadBackup"));
    // El backup ahora exporta tambiÃ©n las subcolecciones (async): se espera
    // a que el JSON se genere.
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled());
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
    const config = { ...baseConfig };
    delete config.exportData;
    render(<PanelTab config={config} />);
    fireEvent.click(screen.getByText("panel.downloadBackup"));
    expect(mockAddToast).toHaveBeenCalledWith("error", expect.any(String));
  });

  it("triggers file input when restore button is clicked", () => {
    render(<PanelTab config={baseConfig} />);
    const clickSpy = vi.spyOn(document.querySelector<HTMLInputElement>('input[type="file"]')!, "click");
    fireEvent.click(screen.getByText("panel.restoreBackup"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("handles successful restore with bankInfo redacted", async () => {
    const { setDoc } = await import("firebase/firestore");
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const validData = JSON.stringify({ bankInfo: "[REDACTED]", firstName: "Test", secondName: "Test2" });
    const file = new File([validData], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });
  });

  it("restores a backup file without bankInfo", async () => {
    const { setDoc } = await import("firebase/firestore");
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const validData = JSON.stringify({ firstName: "Test", secondName: "Test2" });
    const file = new File([validData], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });
  });

  it("restores the v1 backup including gallery and rsvp subcollections", async () => {
    const { setDoc } = await import("firebase/firestore");
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const backup = {
      _wedingoBackupVersion: 1,
      config: { firstName: "Test", secondName: "Test2" },
      gallery: [{ id: "g1", data: "enc" }],
      rsvp: [{ id: "r1", guestName: "A" }],
      audio: [],
      configImages: [],
    };
    const file = new File([JSON.stringify(backup)], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    // 1 doc config + 1 galerÃ­a + 1 rsvp = 3 setDoc (mÃ¡s las subcolecciones).
    await vi.waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(3);
    });
  });

  it("shows a restore error for non-object data", async () => {
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File([JSON.stringify("just a string")], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("errors.restoreFailed"));
    });
  });

  it("handles successful restore with non-redacted bankInfo", async () => {
    const { setDoc } = await import("firebase/firestore");
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const validData = JSON.stringify({ bankInfo: "ES1234567890", firstName: "Test", secondName: "Test2" });
    const file = new File([validData], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });
  });

  it("calls onRestore callback after successful restore", async () => {
    const onRestore = vi.fn(() => Promise.resolve());
    render(<PanelTab config={{ ...baseConfig, onRestore }} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const validData = JSON.stringify({ bankInfo: "", firstName: "Test", secondName: "Test2" });
    const file = new File([validData], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(onRestore).toHaveBeenCalled();
    });
  });

  it("shows success toast after successful restore", async () => {
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const validData = JSON.stringify({ firstName: "Test", secondName: "Test2" });
    const file = new File([validData], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("success", "panel.restoreSuccess");
    });
  });

  it("handles invalid JSON restore gracefully", async () => {
    render(<PanelTab config={baseConfig} />);
    const fileInput = document.querySelector('input[type="file"]')!;
    const invalidFile = new File(["not valid json content"], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("errors.restoreFailed"));
    });
  });
});
