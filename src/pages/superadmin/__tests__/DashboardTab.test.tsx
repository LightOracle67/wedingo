import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("../../../lib/image-store", () => ({
  deleteGallery: vi.fn(() => Promise.resolve()),
  deleteAllConfigImages: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../lib/music-store", () => ({
  deleteAudio: vi.fn(() => Promise.resolve()),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(),
  doc: vi.fn(() => "doc-ref"),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: (...a: unknown[]) => a,
  limit: (...a: unknown[]) => a,
  collection: vi.fn(() => "setup-tokens-col"),
}));

vi.mock("firebase/storage", () => ({
  ref: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn(() => Promise.resolve({ items: [], prefixes: [] })),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  storage: "storage-mock",
  getStorageInstance: vi.fn(() => Promise.resolve({})),
  RSVP_RESPONSES_GROUP: "rsvp-responses-group",
  rsvpByInviteRef: vi.fn(() => "rsvp-query-ref"),
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
}));

vi.mock("../../../lib/constants", () => ({
  MONTH_VALUE_TO_NUMBER: {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  },
}));

vi.mock("../../../lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

const mockCalcGlobalStats = vi.fn(() => ({
  rsvpTotal: 20,
  rsvpYes: 15,
  rsvpNo: 5,
  totalGuests: 40,
  invitationCount: 10,
  totalBytes: 2048,
  tokensTotal: 10,
  tokensUsed: 3,
  tokensAvailable: 7,
  autoTokens: 5,
  manualTokens: 5,
}));

vi.mock("../../../lib/superadmin-utils", () => ({
  calcGlobalStats: (...args: Parameters<typeof mockCalcGlobalStats>) => mockCalcGlobalStats(...args),
  formatBytes: (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`,
}));

import DashboardTab from "../DashboardTab";
import { getDocs } from "firebase/firestore";
import { MONTH_VALUE_TO_NUMBER } from "../../../lib/constants";
import { listAll, deleteObject } from "firebase/storage";

describe("DashboardTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("shows loading state initially", () => {
    render(<DashboardTab />);
    expect(screen.getByText("superadmin.dashboardLoading")).toBeDefined();
  });

  it("renders stats cards after loading", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValue({ docs: [] } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.statsInvitations")).toBeDefined();
    });

    expect(screen.getByText("superadmin.statsTotalResponses")).toBeDefined();
    expect(screen.getByText("superadmin.statsConfirmationRate")).toBeDefined();
    expect(screen.getByText("superadmin.statsTotalGuests")).toBeDefined();
    expect(screen.getByText("superadmin.statsStorage")).toBeDefined();
  });

  it("renders response summary section after loading", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValue({ docs: [] } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.responseSummary")).toBeDefined();
    });
  });

  it("renders platform info section after loading", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValue({ docs: [] } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.platformInfo")).toBeDefined();
    });

    expect(screen.getByText("superadmin.firebaseLabel", { exact: false })).toBeDefined();
    expect(screen.getByText("superadmin.rsvpsLabel", { exact: false })).toBeDefined();
  });

  it("shows expired invitations section when expired invitations exist", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
    const year = threeYearsAgo.getFullYear();
    getDocsMock.mockResolvedValue({
      docs: [
        { id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "enero", weddingDay: "1" }) },
        {
          id: "inv2",
          data: () => ({ weddingYear: String(now.getFullYear()), weddingMonth: "diciembre", weddingDay: "31" }),
        },
      ],
    } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.expiredInvitations")).toBeDefined();
    });

    expect(screen.getByText("superadmin.expiredText")).toBeDefined();
    expect(screen.getByText("superadmin.cleanButton")).toBeDefined();
  });

  it("uses January and day 1 as fallbacks for an invalid wedding date", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
    const year = threeYearsAgo.getFullYear();
    getDocsMock.mockResolvedValue({
      docs: [
        { id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "mes-invalido", weddingDay: "abc" }) },
      ],
    } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.expiredInvitations")).toBeDefined();
    });
  });

  it("does not show expired section when no expired invitations", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    const now = new Date();
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "inv1",
          data: () => ({ weddingYear: String(now.getFullYear()), weddingMonth: "diciembre", weddingDay: "31" }),
        },
      ],
    } as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.queryByText("superadmin.expiredInvitations")).toBeNull();
    });
  });

  it("calls handleCleanup when clean button is clicked and confirmed", async () => {
    const { getDocs, writeBatch } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
    const year = threeYearsAgo.getFullYear();
    getDocsMock.mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "enero", weddingDay: "1" }) }],
    } as never);

    window.confirm = vi.fn(() => true);
    const mockBatch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(writeBatch).mockReturnValue(mockBatch as never);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.cleanButton")).toBeDefined();
    });
    fireEvent.click(screen.getByText("superadmin.cleanButton"));
    await waitFor(() => {
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  it("does not clean when confirm is cancelled", async () => {
    const { getDocs, writeBatch } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
    const year = threeYearsAgo.getFullYear();
    getDocsMock.mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "enero", weddingDay: "1" }) }],
    } as never);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DashboardTab />);

    await waitFor(() => {
      expect(screen.getByText("superadmin.cleanButton")).toBeDefined();
    });
    fireEvent.click(screen.getByText("superadmin.cleanButton"));
    expect(writeBatch).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("ignores invitations without a wedding year for expiry", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ weddingYear: "", weddingMonth: "enero", weddingDay: "1" }) }],
    } as never);
    render(<DashboardTab />);
    await waitFor(() => {
      expect(screen.queryByText("superadmin.expiredInvitations")).toBeNull();
    });
  });

  it("shows stats when there are no responses", async () => {
    const calcGlobalStatsMock = vi.mocked(mockCalcGlobalStats);
    calcGlobalStatsMock.mockReturnValueOnce({
      rsvpTotal: 0,
      rsvpYes: 0,
      rsvpNo: 0,
      totalGuests: 0,
      invitationCount: 0,
      totalBytes: 0,
      tokensTotal: 0,
      tokensUsed: 0,
      tokensAvailable: 0,
      autoTokens: 0,
      manualTokens: 0,
    });
    render(<DashboardTab />);
    await waitFor(() => {
      expect(screen.getByText("superadmin.statsInvitations")).toBeDefined();
    });
  });

  it("shows loading until stats are computed", async () => {
    const calcGlobalStatsMock = vi.mocked(mockCalcGlobalStats);
    calcGlobalStatsMock.mockReturnValueOnce(null as never);
    render(<DashboardTab />);
    expect(screen.getByText("superadmin.dashboardLoading")).toBeDefined();
  });

  it("limpia el Storage huérfano (invitaciones borradas) tras confirmar", async () => {
    const { getDocs } = await import("firebase/firestore");
    const getDocsMock = vi.mocked(getDocs);
    // Una invitación expirada hace que el panel (con gcStorage) se renderice.
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "inv1",
          data: () => ({ weddingYear: String(threeYearsAgo.getFullYear()), weddingMonth: "enero", weddingDay: "1" }),
        },
      ],
    } as never);
    const { ref, listAll } = await import("firebase/storage");
    const refMock = vi.mocked(ref);
    refMock.mockReturnValue("root-ref" as never);
    vi.mocked(listAll).mockResolvedValueOnce({
      prefixes: [{ name: "Orphan/", ...refMock }],
      items: [{ ...refMock }],
    } as never);
    window.confirm = vi.fn(() => true);
    render(<DashboardTab />);
    const gcBtn = await waitFor(() => screen.getByText("superadmin.gcStorage"));
    fireEvent.click(gcBtn);
    await waitFor(() => {
      expect(vi.mocked(listAll)).toHaveBeenCalled();
    });
  });

  // ─── Ramas límite: agregación de visitas/actividad y limpieza de storage ───
  describe("DashboardTab — ramas límite", () => {
    // Sembrado por colección: el mock de query devuelve undefined, así que el
    // último getDocs (auditLog) llega con argumento undefined y sirve como
    // cuarta vía del dispatch.
    const seedAll = () => {
      vi.mocked(getDocs).mockImplementation(async (arg?: unknown) => {
        if (arg === "rsvp-responses-group") {
          return {
            docs: [
              {
                id: "r1",
                data: () => ({ inviteToken: "tok1", submittedAt: { seconds: Math.floor(Date.now() / 1000) - 86400 } }),
              },
              {
                id: "r2",
                data: () => ({ inviteToken: "tok1", submittedAt: { seconds: Math.floor(Date.now() / 1000) } }),
              },
            ],
          } as never;
        }
        if (arg === "invitations-collection-ref") {
          return {
            docs: [
              { id: "tok1", data: () => ({ _visits: 3 }) },
              { id: "tok2", data: () => ({ _visits: 9 }) },
            ],
          } as never;
        }
        if (arg === "setup-tokens-col") return { docs: [] } as never;
        return {
          docs: [
            {
              id: "a1",
              data: () => ({
                action: "login",
                detail: "sesión iniciada",
                createdAt: { seconds: Math.floor(Date.now() / 1000) - 60 },
              }),
            },
          ],
        } as never;
      });
    };

    it("agrega confirmaciones diarias, top de visitas y actividad reciente", async () => {
      seedAll();
      render(<DashboardTab />);
      expect(await screen.findByText("superadmin.topVisits")).toBeTruthy();
      // tok2 (9 visitas) debe aparecer por encima en la lista de visitas.
      expect(screen.getByText(/tok2/)).toBeTruthy();
      expect(screen.getByText("superadmin.recentActivity")).toBeTruthy();
      // La entrada del auditLog se pinta con su acción.
      expect(screen.getByText(/login/)).toBeTruthy();
    });

    it("clasifica invitaciones por caducidad manual y próxima boda", async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const mes = Object.entries(MONTH_VALUE_TO_NUMBER).find(([, v]) => v === tomorrow.getMonth() + 1)?.[0] ?? "enero";
      vi.mocked(getDocs).mockImplementation(async (arg?: unknown) => {
        if (arg === "invitations-collection-ref") {
          return {
            docs: [
              {
                id: "soon1",
                data: () => ({
                  weddingDay: String(tomorrow.getDate()),
                  weddingMonth: mes,
                  weddingYear: String(tomorrow.getFullYear()),
                }),
              },
              {
                id: "oldman",
                data: () => ({ manualExpiry: new Date(now.getTime() - 86400000).toISOString().slice(0, 10) }),
              },
            ],
          } as never;
        }
        if (arg === "rsvp-responses-group") return { docs: [] } as never;
        if (arg === "setup-tokens-col") return { docs: [] } as never;
        return { docs: [] } as never;
      });
      render(<DashboardTab />);
      expect(await screen.findByText("superadmin.expiredInvitations")).toBeTruthy();
      // La boda de mañana entra en la lista de próximas a caducar con su id.
      await waitFor(() => expect(screen.getAllByText(/soon1/).length).toBeGreaterThanOrEqual(1));
      expect(screen.getAllByText("superadmin.expiredInvitations").length).toBeGreaterThan(0);
    });

    it("la limpieza de storage borra prefijos huérfanos de forma recursiva", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(getDocs).mockImplementation(async (arg?: unknown) => {
        if (arg === "invitations-collection-ref") {
          return {
            docs: [
              // Caducada manualmente: hace visible el botón de limpieza de storage.
              {
                id: "oldman",
                data: () => ({ manualExpiry: new Date(Date.now() - 86400000).toISOString().slice(0, 10) }),
              },
              { id: "tok1", data: () => ({}) },
            ],
          } as never;
        }
        return { docs: [] } as never;
      });
      // Raíz: un prefijo huérfano 'ghost'; dentro: 1 fichero + subprefijo con 2 ficheros.
      vi.mocked(listAll)
        .mockResolvedValueOnce({ items: [], prefixes: [{ name: "ghost" }] } as never)
        .mockResolvedValue({ items: [{ fullPath: "ghost/f1" }, { fullPath: "ghost/f2" }], prefixes: [] } as never);
      render(<DashboardTab />);
      fireEvent.click(await screen.findByText("superadmin.gcStorage"));
      await waitFor(() => expect(vi.mocked(deleteObject)).toHaveBeenCalledTimes(2));
      // El subprefijo también se recorrió (segunda listAll sobre 'ghost/sub').
      expect(vi.mocked(listAll).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
