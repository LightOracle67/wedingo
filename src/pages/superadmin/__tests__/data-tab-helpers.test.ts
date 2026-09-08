import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildInvitationData,
  filterByActivity,
  sanitizeInvitationForExport,
  menuSummary,
  loadMediaForToken,
  type InvitationData,
} from "../data-tab-helpers";

// Los helpers de Firestore (getDocs, collection) se importan por los
// arrays/snapshots; para menuSummary simulamos un snapshot con docs.
const mockGetDocs = vi.hoisted(() => vi.fn());
vi.mock("firebase/firestore", () => ({
  getDocs: mockGetDocs,
  collection: (a: unknown, b: string) => `${String(a)}/${b}`,
}));
vi.mock("../../../lib/firebase", () => ({
  db: {},
  rsvpByInviteRef: (token: string) => ({ id: token }),
}));

describe("buildInvitationData", () => {
  it("construye la lista de filas desde docs Firestore, ordenada por fecha de boda desc", () => {
    const docs = [
      {
        id: "inv2",
        data: () => ({
          firstName: "Maria",
          secondName: "Lopez",
          weddingDay: "15",
          weddingMonth: "junio",
          weddingYear: "2031",
          _visits: 3,
          activeSession: { seconds: Math.floor(Date.now() / 1000) },
          adminUsername: "maria",
        }),
      },
      {
        id: "inv1",
        data: () => ({
          firstName: "Ana",
          secondName: "Garcia",
          weddingDay: "10",
          weddingMonth: "enero",
          weddingYear: "2030",
          _visits: 9,
          adminUsername: "ana",
        }),
      },
    ];
    const result = buildInvitationData(docs as Array<{ id: string; data: () => Record<string, unknown> }>, { inv1: 5 });
    expect(result).toHaveLength(2);
    // La más próxima en el tiempo va primero (2031 > 2030).
    expect(result[0]!.id).toBe("inv2");
    expect(result[1]!.id).toBe("inv1");
    // Campos derivados del doc.
    expect(result[1]!.rsvpCount).toBe(5);
    expect(result[1]!.visits).toBe(9);
    expect(result[0]!.hasSession).toBe(true);
    expect(result[0]!.lastActivity).toBeTruthy();
    // Fila sin sesión activa no trae lastActivity.
    expect(result[1]!.hasSession).toBe(false);
    expect(result[1]!.lastActivity).toBe("");
  });

  it("aplica valores por defecto cuando el doc no trae visitas ni sesión", () => {
    const result = buildInvitationData(
      [{ id: "x", data: () => ({ firstName: "", secondName: "" }) }] as Array<{
        id: string;
        data: () => Record<string, unknown>;
      }>,
      {},
    );
    expect(result[0]!.visits).toBe(0);
    expect(result[0]!.hasSession).toBe(false);
    expect(result[0]!.createdAt).toBeDefined();
  });
});

describe("filterByActivity", () => {
  // Fechas relativas a ahora para que el test pase cualquier día del año
  // (antes usaban fechas hardcodeadas de agosto 2026 y quedaban fuera de la
  // ventana "últimos 7 días" de la fecha del sistema).
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const base: InvitationData[] = [
    // 'a' y 'b' dentro de la última semana; 'c' hace 10 días (fuera).
    { id: "a", firstName: "A", secondName: "A", adminUsername: "", rsvpCount: 0, tokenCount: 0, weddingDate: "2030-01-01", hasSession: true, visits: 1, lastActivity: iso(2 * 86400000), createdAt: "" },
    { id: "b", firstName: "B", secondName: "B", adminUsername: "", rsvpCount: 0, tokenCount: 0, weddingDate: "2030-02-02", hasSession: false, visits: 2, lastActivity: iso(3 * 86400000), createdAt: "" },
    { id: "c", firstName: "C", secondName: "C", adminUsername: "", rsvpCount: 0, tokenCount: 0, weddingDate: "2030-03-03", hasSession: false, visits: 3, lastActivity: iso(10 * 86400000), createdAt: "" },
  ];

  it("devuelve todas si el filtro es 'todas'", () => {
    expect(filterByActivity(base, "todas")).toHaveLength(3);
  });

  it("filtra por sesión activa si el filtro es 'sesion'", () => {
    const result = filterByActivity(base, "sesion");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("a");
  });

  it("filtra por actividad reciente (últimos 7 días) si el filtro es 'semana'", () => {
    const result = filterByActivity(base, "semana");
    // 'a' y 'b' están dentro de los últimos 7 días respecto a 'c'.
    expect(result.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("filtra por actividad de hoy si el filtro es 'hoy' (excluye ayer y sin fecha)", () => {
    const hoy = base.map((i) => ({
      ...i,
      lastActivity:
        i.id === "a"
          ? new Date().toISOString() // hoy → incluida
          : i.id === "b"
            ? iso(2 * 86400000) // antier → excluida (Date.parse válido pero fuera)
            : "", // sin fecha → excluida
    }));
    const result = filterByActivity(hoy, "hoy");
    expect(result.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("sanitizeInvitationForExport", () => {
  it("elimina los tokens y la sesión antes de exportar", () => {
    const doc = {
      _activeSetupToken: "tok",
      legacyToken: "leg",
      activeSession: "s1",
      setupTokenHash: "h",
      firstName: "Ana",
      _visits: 3,
    };
    const out = sanitizeInvitationForExport(doc);
    expect(out.firstName).toBe("Ana");
    expect(out._activeSetupToken).toBeUndefined();
    expect(out.legacyToken).toBeUndefined();
    expect(out.activeSession).toBeUndefined();
    expect(out.setupTokenHash).toBeUndefined();
  });
});

describe("menuSummary", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cuenta solo las respuestas con plato elegido", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ mealChoice: "carne" }) },
        { data: () => ({ mealChoice: "pescado" }) },
        { data: () => ({ mealChoice: "carne" }) },
        { data: () => ({ mealChoice: "" }) },
      ],
    });
    const result = await menuSummary("tok");
    expect(result).toEqual({ carne: 2, pescado: 1 });
  });
});

describe("loadMediaForToken", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carga galería y audio con id + datos completos", async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          { id: "foto1", data: () => ({ url: "https://x/f1.jpg" }) },
          { id: "foto2", data: () => ({ url: "https://x/f2.jpg" }) },
        ],
      })
      .mockResolvedValueOnce({
        docs: [{ id: "song1", data: () => ({ url: "https://x/s1.mp3", name: "canción" }) }],
      });
    const result = await loadMediaForToken("tok");
    expect(result.gallery).toHaveLength(2);
    expect(result.gallery[0]).toMatchObject({ id: "foto1", url: "https://x/f1.jpg" });
    expect(result.audio).toHaveLength(1);
    expect(result.audio[0]).toMatchObject({ id: "song1", url: "https://x/s1.mp3", name: "canción" });
  });

  it("devuelve listas vacías cuando no hay media", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await loadMediaForToken("tok");
    expect(result.gallery).toEqual([]);
    expect(result.audio).toEqual([]);
  });
});
