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
}));

vi.mock("firebase/storage", () => ({
  ref: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn(() => Promise.resolve({ items: [], prefixes: [] })),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  storage: "storage-mock",
  RSVP_RESPONSES_GROUP: "rsvp-responses-group",
  rsvpByInviteRef: vi.fn(() => "rsvp-query-ref"),
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
}));

vi.mock("../../../lib/constants", () => ({
  MONTH_VALUE_TO_NUMBER: { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 },
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
  formatBytes: (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`,
}));

import DashboardTab from "../DashboardTab";

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
        { id: "inv2", data: () => ({ weddingYear: String(now.getFullYear()), weddingMonth: "diciembre", weddingDay: "31" }) },
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
        { id: "inv1", data: () => ({ weddingYear: String(now.getFullYear()), weddingMonth: "diciembre", weddingDay: "31" }) },
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
      docs: [
        { id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "enero", weddingDay: "1" }) },
      ],
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
      docs: [
        { id: "inv1", data: () => ({ weddingYear: String(year), weddingMonth: "enero", weddingDay: "1" }) },
      ],
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
      docs: [
        { id: "inv1", data: () => ({ weddingYear: "", weddingMonth: "enero", weddingDay: "1" }) },
      ],
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
});
