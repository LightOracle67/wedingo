import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT, i18n: { language: "es" } }),
}));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => "collection-ref"),
  doc: vi.fn(() => "doc-ref"),
  arrayUnion: (v: unknown) => v,
  arrayRemove: (v: unknown) => v,
}));

vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

import DistribucionTab from "../DistribucionTab";

describe("DistribucionTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation(() =>
      Promise.resolve({
        docs: [
          { id: "z1", data: () => ({ name: "Pista", color: "#d8b24a" }) },
          { id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 12, h: 12, rotation: 0, zoneId: "z1", seats: 8, guests: [] }) },
        ],
      }),
    );
  });

  it("renders zones and shaped tables", async () => {
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("distribucion.addTable");
    expect(screen.getAllByText("Pista").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mesa 1").length).toBeGreaterThan(0);
  });

  it("adds a table with the selected shape", async () => {
    mockAddDoc.mockResolvedValue({ id: "new1" });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("distribucion.addTable");
    fireEvent.click(screen.getByText("distribucion.addTable"));
    expect(mockAddDoc).toHaveBeenCalled();
  });
});
