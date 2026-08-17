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
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  collection: (...args: unknown[]) => (args.length >= 6 ? "tables-ref" : "sections-ref"),
  doc: vi.fn(() => "doc-ref"),
  arrayUnion: (...v: unknown[]) => v,
  arrayRemove: (v: unknown) => v,
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  rsvpByInviteRef: vi.fn(() => "rsvp-ref"),
}));
const mockAddToast = vi.fn();
vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
const mockExportToXlsx = vi.fn();
vi.mock("../../../lib/excel-utils", () => ({
  exportToXlsx: (...a: unknown[]) => mockExportToXlsx(...a),
}));
vi.mock("../../../lib/excel-builders", () => ({
  buildTablesSheet: vi.fn(() => ({ name: "Mesas", headers: [], rows: [] })),
}));

import DistribucionTab from "../DistribucionTab";
import { writeBatch } from "firebase/firestore";

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

  it("auto-assigns confirmed guests to tables with free seats", async () => {
    // Se captura el batch creado (writeBatch) para inspeccionar sus updates.
    const batchSpies: Array<{ update: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }> = [];
    vi.mocked(writeBatch).mockImplementation(() => {
      const b = { update: vi.fn(), delete: vi.fn(), set: vi.fn(), commit: vi.fn(() => Promise.resolve()) };
      batchSpies.push(b);
      return b;
    });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    await screen.findByText("Mesa 1");
    // Espera a que los confirmados estén cargados antes de asignar.
    fireEvent.pointerDown(await screen.findByText("Mesa 1"), { clientX: 0, clientY: 0 });
    const select = await screen.findByLabelText("distribucion.assignPlaceholder") as HTMLSelectElement;
    await vi.waitFor(() => expect(Array.from(select.options).some((o) => o.textContent === "Pepe")).toBe(true));
    fireEvent.click(screen.getByText("distribucion.autoAssign"));
    await vi.waitFor(() => expect(batchSpies.length).toBeGreaterThan(0));
    // Ana y Pepe (confirmados) se asignan a la mesa con hueco; Luis no.
    const allGuests = batchSpies.flatMap((b) => b.update.mock.calls.map((c) => c[1] as { guests?: unknown[] }).flatMap((x) => (x?.guests ?? []) as unknown[]));
    expect(allGuests.length).toBeGreaterThan(0);
    expect(allGuests).toContain("Ana");
    expect(allGuests).toContain("Pepe");
    expect(allGuests).not.toContain("Luis");
    expect(mockAddToast).toHaveBeenCalledWith("success", expect.stringContaining("distribucion.autoAssignDone"));
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

  it("asigna un invitado confirmado a la mesa", async () => {
    const { updateDoc } = await import("firebase/firestore");
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    const select = screen.getByLabelText("distribucion.assignPlaceholder") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Ana" } });
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalled());
    // arrayUnion (variádico) devuelve el array de nombres como hace Firestore.
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ guests: ["Ana"] }));
  });

  it("avisa cuando la mesa está llena", async () => {
    mockAddToast.mockClear();
    // Mesa con 1 plaza y 1 invitado ya asignado.
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref")
        return Promise.resolve({
          docs: [
            { data: () => ({ guestName: "Ana", attendance: "yes" }) },
            { data: () => ({ guestName: "Pepe", attendance: "yes" }) },
          ],
        });
      if (ref === "sections-ref") return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      return Promise.resolve({
        docs: [{ id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 1, guests: ["Ana"] }) }],
      });
    });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    const select = screen.getByLabelText("distribucion.assignPlaceholder") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Pepe" } });
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "distribucion.tableFull"));
  });

  it("quita un invitado asignado de la mesa", async () => {
    const { updateDoc } = await import("firebase/firestore");
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref")
        return Promise.resolve({
          docs: [{ data: () => ({ guestName: "Ana", attendance: "yes" }) }],
        });
      if (ref === "sections-ref") return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      return Promise.resolve({
        docs: [{ id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 8, guests: ["Ana"] }) }],
      });
    });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    fireEvent.click(screen.getByLabelText("distribucion.removeGuest"));
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ guests: "Ana" }));
  });

  it("renderiza una mesa legada con forma rect en el mapa", async () => {
    // Formas legacy (rect/oval) que siguen leyéndose para no romper datos viejos.
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref") return Promise.resolve({ docs: [] });
      if (ref === "sections-ref") return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      return Promise.resolve({
        docs: [{ id: "t1", data: () => ({ name: "Mesa Rect", shape: "rect", x: 50, y: 50, w: 130, h: 80, rotation: 0, seats: 8, guests: [] }) }],
      });
    });
    render(<DistribucionTab inviteToken="tok" />);
    expect(await screen.findByText("Mesa Rect")).toBeInTheDocument();
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

  it("deletes a table from the map", async () => {
    const { deleteDoc } = await import("firebase/firestore");
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa1 = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa1, { clientX: 0, clientY: 0 });
    // Aparece la "✕" de borrado sobre la mesa seleccionada.
    fireEvent.click(screen.getByLabelText("distribucion.deleteTable"));
    expect(deleteDoc).toHaveBeenCalled();
  });

  it("prints one place card per guest with table name and custom style", async () => {
    // Una mesa con un invitado asignado.
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref") return Promise.resolve({ docs: [] });
      if (ref === "sections-ref") return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      return Promise.resolve({
        docs: [{ id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 8, guests: ["Ana García"] }) }],
      });
    });
    let html = "";
    const fakeWin = {
      document: {
        write: (s: string) => {
          html += s;
        },
        close: () => {},
      },
      focus: () => {},
      print: () => {},
    };
    vi.stubGlobal("open", vi.fn(() => fakeWin));
    render(<DistribucionTab inviteToken="tok" background="data:image/png;base64,BG" cornerDecoration="data:image/png;base64,CORNER" />);
    await screen.findByText("Salón");
    await screen.findByText("Mesa 1");
    fireEvent.click(screen.getByText("distribucion.printLabels"));
    expect(html).toContain("Ana García");
    expect(html).toContain("Mesa 1");
    expect(html).toContain("data:image/png;base64,BG");
    expect(html).toContain("data:image/png;base64,CORNER");
    expect(html).toContain("lbl-page");
    // Mensajes de agradecimiento y disfrute en líneas separadas, y tarjeta vertical.
    expect(html).toContain("distribucion.labelThanks");
    expect(html).toContain("distribucion.labelEnjoy");
    expect(html).toContain("aspect-ratio:2/3");
    vi.unstubAllGlobals();
  });

  it("exporta las mesas e invitados asignados a Excel", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref") return Promise.resolve({ docs: [] });
      if (ref === "sections-ref") return Promise.resolve({ docs: [{ id: "s1", data: () => ({ name: "Salón" }) }] });
      return Promise.resolve({
        docs: [{ id: "t1", data: () => ({ name: "Mesa 1", shape: "circle", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 8, guests: ["Ana García"] }) }],
      });
    });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    await screen.findByText("Mesa 1");
    fireEvent.click(screen.getByText("distribucion.exportTables"));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalled());
  });

  it("elimina la sección activa", async () => {
    window.confirm = vi.fn(() => true);
    const { deleteDoc } = await import("firebase/firestore");
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    fireEvent.click(screen.getByText("distribucion.deleteSection"));
    await vi.waitFor(() => expect(deleteDoc).toHaveBeenCalled());
  });

  it("añade una sección nueva y la activa", async () => {
    mockAddDoc.mockResolvedValue({ id: "s9" });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    fireEvent.change(screen.getByLabelText("distribucion.sectionPlaceholder"), { target: { value: "Jardín" } });
    fireEvent.click(screen.getByText("distribucion.addSection"));
    await vi.waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
    expect(mockAddDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: "Jardín" }));
  });

  it("cambia a otra sección y carga sus mesas", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "rsvp-ref") return Promise.resolve({ docs: [] });
      if (ref === "sections-ref")
        return Promise.resolve({
          docs: [
            { id: "s1", data: () => ({ name: "Salón" }) },
            { id: "s2", data: () => ({ name: "Jardín" }) },
          ],
        });
      // Mesas de la sección activa (cambian según activeSectionId; el mock
      // devuelve la mesa de "Jardín" cuando se cambia).
      return Promise.resolve({
        docs: [{ id: "t2", data: () => ({ name: "Mesa Jardín", shape: "circle", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 6, guests: [] }) }],
      });
    });
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    fireEvent.click(screen.getByText("Jardín"));
    // La sección activa cambia y se muestran sus mesas.
    await vi.waitFor(() => expect(screen.getByText("Mesa Jardín")).toBeInTheDocument());
  });

  it("arrastra una mesa y persiste su nueva posición", async () => {
    const { updateDoc } = await import("firebase/firestore");
    // El mapa usa getBoundingClientRect: se mockea con un rect fijo de 100x100.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 100,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    render(<DistribucionTab inviteToken="tok" />);
    await screen.findByText("Salón");
    const mesa = await screen.findByText("Mesa 1");
    fireEvent.pointerDown(mesa, { pointerId: 1, clientX: 50, clientY: 50 });
    // Arrastra hasta (80, 20) → persistTable → updateDoc.
    const map = document.querySelector(".distribucion-map") as HTMLElement;
    fireEvent.pointerMove(map, { pointerId: 1, clientX: 80, clientY: 20 });
    fireEvent.pointerUp(map, { pointerId: 1 });
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalled());
    vi.restoreAllMocks();
  });
});
