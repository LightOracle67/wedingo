import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetDocs = vi.fn();
const mockDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockWriteBatch = vi.fn();
const mockDeleteDoc = vi.fn();
const mockHashSetupToken = vi.fn((t: string) => Promise.resolve(`hash-${t}`));

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(() => "delete-field"),
  collection: vi.fn(() => "collection-ref"),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
}));

vi.mock("../../../lib/setup-token", () => ({
  hashSetupToken: (...args: Parameters<typeof mockHashSetupToken>) => mockHashSetupToken(...args),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
}));

const mockConfirm = vi.fn();
window.confirm = mockConfirm;

import TokensTab from "../TokensTab";

/** Mock de getDocs que distingue las dos consultas de la pestaña:
 *  la de invitaciones legacy (query-ref) devuelve `legacyDocs` y la de
 *  setupTokens (collection-ref) vacía, salvo que se indique lo contrario. */
const mockTokenSnapshots = (
  legacyDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
  hashedDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [],
) => {
  mockGetDocs.mockImplementation((ref: unknown) =>
    Promise.resolve(
      ref === "query-ref"
        ? { docs: legacyDocs, size: legacyDocs.length, empty: legacyDocs.length === 0 }
        : { docs: hashedDocs, size: hashedDocs.length, empty: hashedDocs.length === 0 },
    ),
  );
};

describe("TokensTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    mockWriteBatch.mockReturnValue({ update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) });
  });

  it("renders loading state initially", () => {
    mockGetDocs.mockImplementation(() => new Promise(() => {}));
    render(<TokensTab />);
    expect(screen.getByText("superadmin.tokensLoading")).toBeInTheDocument();
  });

  it("renders tokens after loading", async () => {
    mockTokenSnapshots([
      { id: "inv1", data: () => ({ _activeSetupToken: "token1" }) },
      { id: "inv2", data: () => ({ _activeSetupToken: "token2" }) },
    ]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    expect(screen.getByText("inv2")).toBeInTheDocument();
    expect(screen.getAllByText("superadmin.statusLegacy").length).toBe(2);
  });

  it("shows no tokens message when list is empty", async () => {
    mockTokenSnapshots([]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.noTokens")).toBeInTheDocument());
  });

  it("shows tokens stats", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText(/superadmin\.tokensStats/)).toBeInTheDocument());
  });

  it("displays error on load failure", async () => {
    mockGetDocs.mockRejectedValue(new Error("fail"));
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenLoadError")).toBeInTheDocument());
  });

  it("calls handleRevoke on revoke button click", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    mockDoc.mockReturnValue("doc-ref");
    mockUpdateDoc.mockResolvedValue(undefined);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    // Selecciona la fila y revoca los seleccionados.
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.revokeSelected"));
    expect(mockConfirm).toHaveBeenCalled();
    await vi.waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledWith("doc-ref", { _activeSetupToken: "" }));
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenRevoked")).toBeInTheDocument());
    // La revocación también elimina el registro setupTokens/{hash} (token migrado).
    expect(mockHashSetupToken).toHaveBeenCalledWith("token1");
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it("does not revoke if confirm is cancelled", async () => {
    mockConfirm.mockReturnValue(false);
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.revokeSelected"));
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("migrates selected legacy tokens in bulk", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    mockDoc.mockReturnValue("doc-ref");
    mockUpdateDoc.mockResolvedValue(undefined);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.migrateSelected"));
    expect(mockConfirm).toHaveBeenCalled();
    await vi.waitFor(() => expect(mockHashSetupToken).toHaveBeenCalledWith("token1"));
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenMigrated")).toBeInTheDocument());
  });

  it("selects all tokens via the bar checkbox", async () => {
    mockTokenSnapshots([
      { id: "inv1", data: () => ({ _activeSetupToken: "token1" }) },
      { id: "inv2", data: () => ({ _activeSetupToken: "token2" }) },
    ]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    const checkboxes = screen.getAllByRole("checkbox");
    // El primero es el "seleccionar todas" de la barra.
    fireEvent.click(checkboxes[0]!);
    expect((screen.getAllByRole("checkbox")[1]! as HTMLInputElement).checked).toBe(true);
    expect((screen.getAllByRole("checkbox")[2]! as HTMLInputElement).checked).toBe(true);
  });

  it("calls handleCleanup on cleanup button click", async () => {
    mockGetDocs.mockImplementation(() =>
      Promise.resolve({
        docs: [{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }],
        size: 1,
        empty: false,
      }),
    );
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    expect(mockConfirm).toHaveBeenCalled();
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokensCleaned")).toBeInTheDocument());
  });

  it("shows no tokens to clean when empty", async () => {
    mockTokenSnapshots([]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    await vi.waitFor(() => expect(screen.getByText("superadmin.noTokensToClean")).toBeInTheDocument());
  });

  it("displays error on revoke failure", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    mockDoc.mockReturnValue("doc-ref");
    mockUpdateDoc.mockRejectedValue(new Error("fail"));
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.revokeSelected"));
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenRevokeError")).toBeInTheDocument());
  });

  it("renders clean unused button and confirms dialog", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    expect(mockConfirm).toHaveBeenCalled();
  });

  it("limpia SOLO los tokens nunca usados (conserva los de sesión activa)", async () => {
    const batchUpdates: unknown[][] = [];
    mockWriteBatch.mockImplementation(() => {
      const b = { update: (...a: unknown[]) => batchUpdates.push(a), commit: vi.fn().mockResolvedValue(undefined) };
      return b;
    });
    mockGetDocs.mockImplementation((ref: unknown) => {
      // La consulta del cleanup devuelve ambas invitaciones con token.
      if (ref === "query-ref") {
        return Promise.resolve({
          docs: [
            { id: "inv1", ref: "r1", data: () => ({ _activeSetupToken: "t1", activeSession: new Date() }) },
            { id: "inv2", ref: "r2", data: () => ({ _activeSetupToken: "t2" }) },
          ],
          size: 2,
          empty: false,
        });
      }
      return Promise.resolve({ docs: [], size: 0, empty: true });
    });
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    // Solo inv2 (sin sesión) entra en el batch; inv1 con sesión se preserva.
    await vi.waitFor(() =>
      expect(screen.getByText("superadmin.tokensCleaned", { exact: false })).toBeInTheDocument(),
    );
    expect(batchUpdates.length).toBe(1);
    expect(batchUpdates[0]?.[0]).toBe("r2");
  });

  it("no limpia nada si se cancela la confirmación", async () => {
    mockConfirm.mockReturnValue(false);
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("muestra error si falla la limpieza", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "query-ref") return Promise.reject(new Error("boom"));
      return Promise.resolve({ docs: [], size: 0, empty: true });
    });
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.cleanUnused")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.cleanUnused"));
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenCleanError")).toBeInTheDocument());
  });

  it("muestra error si falla la migración en lote", async () => {
    mockTokenSnapshots([{ id: "inv1", data: () => ({ _activeSetupToken: "token1" }) }]);
    mockUpdateDoc.mockRejectedValue(new Error("migrate fail"));
    render(<TokensTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.migrateSelected"));
    await vi.waitFor(() => expect(screen.getByText("superadmin.tokenMigrateError")).toBeInTheDocument());
  });
});
