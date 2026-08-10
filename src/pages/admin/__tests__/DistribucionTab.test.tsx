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
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  collection: (...args: unknown[]) => (args.length >= 6 ? "tables-ref" : "sections-ref"),
  doc: vi.fn(() => "doc-ref"),
  arrayUnion: (v: unknown) => v,
  arrayRemove: (v: unknown) => v,
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  rsvpByInviteRef: vi.fn(() => "rsvp-ref"),
}));
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

import DistribucionTab from "../DistribucionTab";

describe("DistribucionTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref") {
        return Promise.resolve({
          docs: [
            { data: () => ({ guestName: "Ana", attendance: "yes" }) },
            { data: () => ({ guestName: "Luis", attendance: "no" }) },
            { data: () => ({ guestName: "Pepe", attendance: "yes" }) },
          ],
        });
      }
      if (ref === "sections-ref") {
        return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      }
      // mesas de la sección activa
      return Promise.resolve({
        docs: [
          { id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 12, h: 12, rotation: 0, seats: 8, guests: [] }) },
        ],
      });
    });
  });

  it("renders sections menu and shaped tables", async () => {
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    expect((await screen.findAllByText("Mesa 1")).length).toBeGreaterThan(0);
  });

  it("adds a table", async () => {
    mockAddDoc.mockResolvedValue({ id: "new1" });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    fireEvent.click(screen.getByText("distribucion.addTable"));
    expect(mockAddDoc).toHaveBeenCalled();
  });

  it("only lists confirmed guests in the assign dropdown", async () => {
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    // selecciona la mesa
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    // el select de asignación solo incluye confirmados (Ana y Pepe, no Luis)
    const select = screen.getByLabelText("distribucion.assignPlaceholder") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toContain("Ana");
    expect(options).toContain("Pepe");
    expect(options).not.toContain("Luis");
  });

  it("locks width and height to the same value on circle/square", async () => {
    const { updateDoc } = await import("firebase/firestore");
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    // La mesa del mock es círculo (w:12,h:12) → un único control de tamaño.
    const size = screen.getByLabelText("distribucion.sizePx") as HTMLInputElement;
    fireEvent.change(size, { target: { value: "120" } });
    expect((updateDoc as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ w: 120, h: 120 }));
  });
});
