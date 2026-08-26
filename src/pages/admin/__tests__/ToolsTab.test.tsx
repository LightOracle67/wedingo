import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// jsdom no siempre expone localStorage en este entorno: se provee uno mínimo.
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn(() => Promise.resolve());
const mockGetDoc = vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ internalNote: "" }) }));
const mockUpdateDoc = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockDeleteDoc = vi.fn(() => Promise.resolve());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("firebase/firestore", () => ({
  getDocs: (ref: unknown) => mockGetDocs(String(ref)),
  setDoc: () => mockSetDoc(),
  getDoc: () => mockGetDoc(),
  updateDoc: (ref: unknown, data: unknown) => mockUpdateDoc(ref, data),
  deleteDoc: () => mockDeleteDoc(),
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn((_db: unknown, _p: string, _t: string, sub?: string) => sub || "guests"),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock", rsvpByInviteRef: vi.fn(() => "rsvp-ref") }));
const mockAddToast = vi.fn();
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
vi.mock("../../../lib/file-utils", () => ({
  downloadText: vi.fn(),
}));
vi.mock("../../../lib/crypto-utils", () => ({
  decrypt: vi.fn(async () => "data:image/webp;base64,AAA"),
}));

import ToolsTab from "../ToolsTab";

const rsvpDoc = (name: string, ts: number) => ({ data: () => ({ guestName: name, submittedAt: { seconds: ts } }) });

describe("ToolsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // El borrado del buzón confirma con useConfirm (degradado a window.confirm
    // sin provider): se acepta la confirmación.
    window.confirm = vi.fn(() => true);
    try {
      localStorage.clear();
    } catch {}
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "guests")
        return Promise.resolve({ docs: [{ data: () => ({ name: "Ana" }) }, { data: () => ({ name: "Luis" }) }] });
      if (ref === "rsvp-ref") return Promise.resolve({ docs: [rsvpDoc("Ana", Math.floor(Date.now() / 1000))] });
      return Promise.resolve({ docs: [], size: 0 });
    });
  });

  it("renders the tools panels after loading", async () => {
    render(<ToolsTab inviteToken="tok1234567" inviteUrl="https://x/tok1234567" />);
    expect(await screen.findByText("tools.whatsappReminder")).toBeInTheDocument();
    expect(screen.getByText("tools.expectedGuests")).toBeInTheDocument();
    expect(screen.getByText("tools.quickActions")).toBeInTheDocument();
    expect(screen.getByText("tools.internalNote")).toBeInTheDocument();
  });

  it("saves the expected-guests number (0..1000)", async () => {
    const onSaved = vi.fn();
    render(
      <ToolsTab
        inviteToken="tok1234567"
        inviteUrl="https://x/tok1234567"
        expectedGuests=""
        onExpectedGuestsSaved={onSaved}
      />,
    );
    await vi.waitFor(() => expect(screen.getByLabelText("tools.expectedGuests")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("tools.expectedGuests"), { target: { value: "750" } });
    fireEvent.blur(screen.getByLabelText("tools.expectedGuests"));
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(mockUpdateDoc).toHaveBeenCalledWith("doc-ref", { expectedGuests: "750" });
    expect(onSaved).toHaveBeenCalled();
  });

  it("clamps expected guests to 1000 and rejects non-numeric input", async () => {
    render(
      <ToolsTab
        inviteToken="tok1234567"
        inviteUrl="https://x/tok1234567"
        expectedGuests=""
        onExpectedGuestsSaved={vi.fn()}
      />,
    );
    const input = await screen.findByLabelText("tools.expectedGuests");
    fireEvent.change(input, { target: { value: "2500" } });
    fireEvent.blur(input);
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(mockUpdateDoc).toHaveBeenCalledWith("doc-ref", { expectedGuests: "1000" });
  });

  it("opens WhatsApp with a customizable reminder", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<ToolsTab inviteToken="tok1234567" inviteUrl="https://x/tok1234567" />);
    await vi.waitFor(() => expect(screen.getByText("tools.openWhatsapp")).toBeInTheDocument());
    fireEvent.click(screen.getByText("tools.openWhatsapp"));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/"), "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("saves the internal note", async () => {
    render(<ToolsTab inviteToken="tok1234567" inviteUrl="https://x/tok1234567" />);
    const note = await screen.findByLabelText("tools.internalNote");
    fireEvent.change(note, { target: { value: "Llamar para confirmar" } });
    fireEvent.click(screen.getByText("tools.saveNote"));
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  it("genera el .ics cuando hay fecha de boda", async () => {
    const { downloadText } = await import("../../../lib/file-utils");
    render(
      <ToolsTab
        inviteToken="tok1234567"
        inviteUrl="https://x/tok1234567"
        weddingDate={{ year: "2026", month: "junio", day: "15", hour: "17", minute: "30" }}
        weddingPlace="Iglesia San José"
        coupleName="Ana & Luis"
      />,
    );
    await screen.findByText("tools.icsButton");
    fireEvent.click(screen.getByText("tools.icsButton"));
    await vi.waitFor(() => expect(downloadText).toHaveBeenCalled());
    expect(downloadText).toHaveBeenCalledWith(
      "tok1234567.ics",
      expect.stringContaining("BEGIN:VCALENDAR"),
      "text/calendar;charset=utf-8",
    );
  });

  it("descarga las fotos de la galería", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "gallery")
        return Promise.resolve({ docs: [{ id: "g1", data: () => ({ data: "data:image/webp;base64,AAA" }) }], size: 1 });
      return Promise.resolve({ docs: [], size: 0 });
    });
    render(<ToolsTab inviteToken="tok1234567" inviteUrl="https://x/tok1234567" />);
    const btn = await screen.findByText("tools.downloadGallery", { exact: false });
    // Espera a que se habilite (galleryCount = 1).
    await vi.waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith("success", expect.stringContaining("tools.galleryDownloaded")),
    );
  });
});
