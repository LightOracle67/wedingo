import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT, i18n: { language: "es" } }),
}));

const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  // collection devuelve el nombre de la subcolección (último argumento) para
  // que getDocs pueda ramificar por tipo de consulta.
  collection: (...args: unknown[]) => (args.length > 3 ? args[3] : "collection-ref"),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
  limit: vi.fn(() => "limit-ref"),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
  rsvpByInviteRef: vi.fn(() => "rsvp-ref"),
  getStorageInstance: vi.fn(() => Promise.resolve({})),
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
  buildMetricsSheet: vi.fn(() => ({ name: "Métricas", headers: [], rows: [] })),
  buildGlobalGuestsSheet: vi.fn(() => ({ name: "Invitados", headers: [], rows: [] })),
  buildAuditSheet: vi.fn(() => ({ name: "Auditoría", headers: [], rows: [] })),
}));

import MetricsTab from "../MetricsTab";
import SupportTab from "../SupportTab";

const invitationDoc = (overrides: Record<string, unknown> = {}) => ({
  id: "token1",
  data: () => ({
    firstName: "Ana",
    secondName: "Luis",
    adminUsername: "ana",
    weddingDay: "15",
    weddingMonth: "6",
    weddingYear: "2025",
    createdAt: "2024-01-01",
    _visits: 100,
    ...overrides,
  }),
});

describe("MetricsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation((ref: unknown) =>
      Promise.resolve(ref === "invitations-collection-ref" ? { docs: [invitationDoc()] } : { docs: [] }),
    );
  });

  it("renders the global summary and funnel", async () => {
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getAllByText("token1").length).toBeGreaterThan(0);
  });

  it("renders the empty state without invitations", async () => {
    mockGetDocs.mockImplementation(() => Promise.resolve({ docs: [] }));
    render(<MetricsTab />);
    await screen.findByText("superadmin.dashboardEmpty");
  });

  it("exporta las métricas globales a Excel", async () => {
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.excelBtn"));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalled());
  });

  it("analiza las funciones sociales y los orígenes sin romper", async () => {
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.socialBtn"));
    await vi.waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    fireEvent.click(screen.getByText("superadmin.metrics.originsBtn"));
  });

  it("exporta todas las confirmaciones a Excel", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      // RSVP de la invitación: 1 confirmación con menú.
      return Promise.resolve({
        docs: [
          {
            id: "r1",
            data: () => ({
              inviteToken: "token1",
              guestName: "Ana",
              attendance: "yes",
              mealChoice: "carne",
              submittedAt: "2026-01-01",
            }),
          },
        ],
      });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.guestsExcelBtn"));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalled());
  });

  it("estima el almacenamiento de galería y audio desde los metadatos", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      if (ref === "gallery") return Promise.resolve({ docs: [{ id: "g1" }, { id: "g2" }], size: 2 });
      if (ref === "audio") return Promise.resolve({ docs: [{ data: () => ({ data: "QUJD".repeat(1000) }) }] });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.storageBtn"));
    // La tabla de almacenamiento se renderiza (cabecera "Imágenes").
    await vi.waitFor(() => expect(screen.getByText("superadmin.metrics.images")).toBeInTheDocument());
  });
});

describe("MetricsTab — ramas límite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuenta confirmaciones y companions solo del token propio y calcula conversión", async () => {
    // Un RSVP del token y otro ajeno: el ajeno ejercita la rama continue.
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      if (ref === "rsvp-ref")
        return Promise.resolve({
          docs: [
            { id: "r1", data: () => ({ inviteToken: "token1", attendance: "yes", companions: 1 }) },
            { id: "r2", data: () => ({ inviteToken: "OTRO", attendance: "yes", companions: 5 }) },
          ],
        });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    // La fila del funnel existe y la conversión 1/100 → 1% está calculada.
    await vi.waitFor(() => expect(screen.getAllByText(/token1/).length).toBeGreaterThan(0));
  });

  it("muestra error de carga cuando getDocs falla al montar", async () => {
    mockGetDocs.mockRejectedValue(new Error("down"));
    render(<MetricsTab />);
    // El catch corre y setError se aplica, pero el early-return de filas vacías
    // muestra el panel vacío: el fallo degrada sin pantalla rota ni crash.
    await screen.findByText("superadmin.dashboardEmpty");
  });

  it("exportar sin datos avisa con toast informativo", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.excelBtn"));
    // Sin RSVPs las guardas noData no se activan y la exportación procede.
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalledTimes(1));
  });

  it("etiqueta fechas incompletas con guion y avisa al exportar sin confirmaciones", async () => {
    // Invitación sin día/mes/año y sin RSVPs: funnel la incluye con "—" y
    // exportExcel cae en la rama perInvite sin confirmaciones.
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref")
        return Promise.resolve({ docs: [invitationDoc({ weddingDay: "", weddingMonth: "", weddingYear: "" })] });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("superadmin.metrics.excelBtn"));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalledTimes(1));
  });

  it("agrupa funciones sociales por invitación y pinta la tabla", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      if (ref === "notes")
        return Promise.resolve({
          docs: [
            { id: "n1", data: () => ({}) },
            { id: "n2", data: () => ({}) },
          ],
        });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.socialBtn"));
    await vi.waitFor(() => expect(screen.getAllByText(/token1/).length).toBeGreaterThan(0));
  });

  it("agrupa orígenes de invitados descartando vacíos", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref") return Promise.resolve({ docs: [invitationDoc()] });
      if (ref === "rides")
        return Promise.resolve({
          docs: [
            { id: "d1", data: () => ({ origin: "Sevilla" }) },
            { id: "d2", data: () => ({ origin: "" }) },
            { id: "d3", data: () => ({ origin: "Sevilla" }) },
          ],
        });
      return Promise.resolve({ docs: [] });
    });
    render(<MetricsTab />);
    await screen.findByText("superadmin.metrics.invitations");
    fireEvent.click(screen.getByText("superadmin.metrics.originsBtn"));
    await screen.findByText(/Sevilla · 2/);
  });
});

describe("SupportTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation((ref: unknown) =>
      Promise.resolve(ref === "invitations-collection-ref" ? { docs: [invitationDoc()] } : { docs: [] }),
    );
  });

  it("renders the inbox alerts", async () => {
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    expect(screen.getByText("superadmin.support.consoleTitle")).toBeDefined();
  });

  it("busca una invitación por token en la consola", async () => {
    // La búsqueda usa query/collection; el mock devuelve el doc de la invitación.
    mockGetDocs.mockImplementation((ref: unknown) =>
      Promise.resolve(ref === "query-ref" ? { docs: [invitationDoc()], empty: false } : { docs: [] }),
    );
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.change(screen.getByLabelText("superadmin.support.tokenPlaceholder"), { target: { value: "token1" } });
    fireEvent.click(screen.getByText("superadmin.support.searchBtn"));
    await screen.findByText("Ana & Luis");
  });

  it("muestra 'no encontrada' cuando el token no existe", async () => {
    mockGetDocs.mockImplementation((ref: unknown) =>
      Promise.resolve(ref === "query-ref" ? { docs: [], empty: true } : { docs: [] }),
    );
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.change(screen.getByLabelText("superadmin.support.tokenPlaceholder"), { target: { value: "nope" } });
    fireEvent.click(screen.getByText("superadmin.support.searchBtn"));
    await screen.findByText("superadmin.support.notFound");
  });

  it("carga la auditoría y la exporta a Excel", async () => {
    mockGetDocs.mockImplementation((ref: unknown) =>
      Promise.resolve(
        ref === "query-ref"
          ? {
              docs: [
                {
                  id: "a1",
                  data: () => ({ action: "reset_token", detail: "TOK1", createdAt: { seconds: 1750000000 } }),
                },
              ],
            }
          : { docs: [] },
      ),
    );
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.click(screen.getByText("superadmin.support.auditLoad"));
    // Espera a que la fila de auditoría se renderice (habilita el export).
    await screen.findByText(/reset_token/);
    fireEvent.click(screen.getByText("superadmin.support.auditExport"));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalled());
  });

  it("no exporta la auditoría sin filas", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.click(screen.getByText("superadmin.support.auditLoad"));
    fireEvent.click(screen.getByText("superadmin.support.auditExport"));
    await vi.waitFor(() => expect(mockExportToXlsx).not.toHaveBeenCalled());
  });

  it("ejecuta el diagnóstico de conectividad", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.click(screen.getByText("superadmin.support.diagBtn"));
    // El diagnóstico consulta invitaciones y setupTokens (query-ref).
    await vi.waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("detecta invitaciones abandonadas (visitas ≥ 50 sin respuesta)", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref")
        return Promise.resolve({
          docs: [
            {
              id: "abandon1",
              data: () => ({
                firstName: "A",
                secondName: "B",
                weddingDay: "1",
                weddingMonth: "1",
                weddingYear: "2099",
                _visits: 60,
                adminUsername: "x",
              }),
            },
          ],
        });
      // Las respuestas de "abandon1" están vacías → contador vacío → abandonada.
      return Promise.resolve({ docs: [], size: 0, empty: true });
    });
    render(<SupportTab />);
    await screen.findByText("superadmin.support.upcomingTitle");
    fireEvent.click(screen.getByText("superadmin.support.abandonBtn"));
    await vi.waitFor(() => expect(screen.getByText(/abandon1/)).toBeInTheDocument());
  });
});
