import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockDeleteDoc = vi.fn(() => Promise.resolve());
const mockDoc = vi.fn(() => "doc-ref");

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("firebase/firestore", () => ({
  // collection devuelve el nombre de la subcolección (último argumento) para
  // que getDocs pueda ramificar por tipo de consulta.
  collection: (_db: unknown, _path: string, _token: string, sub?: string) => sub || "responses",
  getDocs: (ref: unknown) => mockGetDocs(String(ref)),
  deleteDoc: () => mockDeleteDoc(),
  doc: () => mockDoc(),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
const mockDownloadJson = vi.fn();
vi.mock("../../../lib/file-utils", () => ({
  downloadJson: (...args: unknown[]) => mockDownloadJson(...args),
  downloadText: vi.fn(),
}));
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock("../../../components/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));

import InvitationDetailModal from "../InvitationDetailModal";

const snap = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => ({
  docs,
  reduce: (fn: (acc: number, d: { data: () => Record<string, unknown> }) => number, init: number) =>
    docs.reduce(fn, init),
  forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => docs.forEach(fn),
  size: docs.length,
});

const rsvpSnap = snap([{ id: "r1", data: () => ({ guestName: "Ana", attendance: "yes", companionCount: 1, mealChoice: "carne" }) }]);
const gallerySnap = snap([{ id: "g1", data: () => ({ description: "Foto", data: "aGVsbG8=" }) }]);
const logSnap = snap([{ id: "c1", data: () => ({ fields: "firstName, theme" }) }]);
const socialSnap = snap([{ id: "n1", data: () => ({ message: "Felicidades" }) }]);

// Mock determinista por subcolección (robusto ante doble mount de StrictMode).
const mockGetDocs = vi.fn((ref: string) => {
  if (ref === "gallery") return Promise.resolve(gallerySnap);
  if (ref === "configLog") return Promise.resolve(logSnap);
  if (ref === "responses") return Promise.resolve(rsvpSnap);
  return Promise.resolve(socialSnap);
});

describe("InvitationDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders RSVP list, social contributions, gallery and config log", async () => {
    render(<InvitationDetailModal token="tok1234567" onClose={() => {}} />);
    await screen.findAllByText(/Ana/);
    expect(screen.getAllByText(/Felicidades/).length).toBeGreaterThan(0);
    expect(screen.getByText(/firstName, theme/)).toBeInTheDocument();
    expect(screen.getByText(/manage.detailMedia/)).toBeInTheDocument();
  });

  it("deletes a social contribution after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<InvitationDetailModal token="tok1234567" onClose={() => {}} />);
    await screen.findAllByText(/Felicidades/);
    fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent === "✕")!);
    await vi.waitFor(() => expect(mockDeleteDoc).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("exports social contributions as JSON", async () => {
    render(<InvitationDetailModal token="tok1234567" onClose={() => {}} />);
    await screen.findAllByText(/Felicidades/);
    fireEvent.click(screen.getByText("manage.detailExportSocial"));
    expect(mockDownloadJson).toHaveBeenCalled();
  });
});
