import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT, i18n: { language: "es" } }),
}));

const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn(() => "collection-ref"),
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
      Promise.resolve(
        ref === "query-ref" ? { docs: [invitationDoc()], empty: false } : { docs: [] },
      ),
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
              docs: [{ id: "a1", data: () => ({ action: "reset_token", detail: "TOK1", createdAt: { seconds: 1750000000 } }) }],
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
          docs: [{ id: "abandon1", data: () => ({ firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2099", _visits: 60, adminUsername: "x" }) }],
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
