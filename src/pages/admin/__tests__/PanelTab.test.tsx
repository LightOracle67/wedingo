import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
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
});
