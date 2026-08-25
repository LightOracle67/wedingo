import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWriteBatch = vi.fn();
const mockDownloadJson = vi.fn();
const mockAddToast = vi.fn();

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

const mockDeleteDoc = vi.fn(() => Promise.resolve());
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
  collectionGroup: vi.fn(() => "cg-ref"),
  deleteDoc: () => mockDeleteDoc(),
  listCollections: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
  RSVP_COLLECTION_REF: "rsvp-collection-ref",
  RSVP_RESPONSES_GROUP: "rsvp-responses-group",
  rsvpByInviteRef: vi.fn(() => "rsvp-query-ref"),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("../../../lib/file-utils", () => ({
  downloadJson: (...args: unknown[]) => mockDownloadJson(...args),
  downloadText: vi.fn(),
}));
const mockExportToXlsx = vi.fn();
vi.mock("../../../lib/excel-utils", () => ({
  exportToXlsx: (...a: unknown[]) => mockExportToXlsx(...a),
}));
vi.mock("../../../lib/excel-builders", () => ({
  buildRsvpSheet: vi.fn(() => ({ name: "RSVP", headers: [], rows: [] })),
}));
vi.mock("../InvitationDetailModal", () => ({
  default: () => <div data-testid="detail-modal" />,
}));

import DataTab from "../DataTab";

const docData = (overrides: Record<string, unknown> = {}) => ({
  data: () => overrides,
  id: String(overrides.id || "token1"),
});

describe("DataTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteBatch.mockReturnValue({ delete: vi.fn(), update: vi.fn(), set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) });
  });

  it("renders loading state initially", () => {
    mockGetDocs.mockImplementation(() => new Promise(() => {}));
    render(<DataTab />);
    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("renders table with invitations after loading", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "token1",
              firstName: "John",
              secondName: "Jane",
              adminUsername: "jj",
              weddingDay: "15",
              weddingMonth: "6",
              weddingYear: "2025",
            }),
            docData({ id: "token2", firstName: "Alice", secondName: "Bob", adminUsername: "ab" }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("token1")).toBeInTheDocument());
    expect(screen.getByText("token2")).toBeInTheDocument();
    expect(screen.getByText("John & Jane")).toBeInTheDocument();
    expect(screen.getByText("@jj")).toBeInTheDocument();
    expect(screen.getByText("15/6/2025")).toBeInTheDocument();
  });

  it("shows empty invitation placeholder when no names", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({ docs: [docData({ id: "emptytoken" })] });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.emptyInvitation")).toBeInTheDocument());
  });

  it("shows no invitations message when list is empty", async () => {
    mockGetDocs.mockImplementation(() => Promise.resolve({ docs: [] }));
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.noInvitations")).toBeInTheDocument());
  });

  it("handles select all and deselect all", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
            docData({
              id: "t2",
              firstName: "C",
              secondName: "D",
              weddingDay: "2",
              weddingMonth: "2",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => {
      expect(screen.getByText("superadmin.data.selectAll")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    expect(screen.getByText("superadmin.data.exportSelectedBtn")).toBeInTheDocument();
    fireEvent.click(screen.getByText("superadmin.data.deselectAll"));
    expect(screen.queryByText("superadmin.data.exportSelectedBtn")).not.toBeInTheDocument();
  });

  it("shows select empty button when empty invitations exist", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({ id: "emptytoken" }),
            docData({
              id: "fulltoken",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.selectEmpty")).toBeInTheDocument());
  });

  it("exports the selected invitations", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      if (ref === "rsvp-collection-ref") {
        return Promise.resolve({ docs: [] });
      }
      if (ref === "rsvp-query-ref") {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({ docs: [] });
    });
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ firstName: "A" }) });
    mockDoc.mockReturnValue("doc-ref");
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("t1")).toBeInTheDocument());
    // Selecciona la fila y exporta la selección (las acciones están fuera de la tabla).
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText((text) => text.includes("superadmin.data.exportSelectedBtn")));
    await vi.waitFor(() => expect(mockDownloadJson).toHaveBeenCalled());
    expect(mockAddToast).toHaveBeenCalledWith("success", expect.any(String));
  });

  it("calls exportAll when export all button clicked", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref" || ref === "rsvp-collection-ref") {
        return Promise.resolve({ docs: [{ id: "t1", data: () => ({ firstName: "A" }) }], size: 1 });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() =>
      expect(screen.getByText((text) => text.includes("superadmin.data.exportAllBtn"))).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText((text) => text.includes("superadmin.data.exportAllBtn")));
    await vi.waitFor(() =>
      expect(mockDownloadJson).toHaveBeenCalledWith(
        expect.stringMatching(/^wedingo_full_export_\d{4}-\d{2}-\d{2}\.json$/),
        expect.any(Object),
      ),
    );
    expect(mockAddToast).toHaveBeenCalledWith("success", expect.any(String));
  });

  it("requires confirmation text before deleting", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("t1")).toBeInTheDocument());
    expect(screen.getByText("superadmin.data.deleteAllBtn")).toBeDisabled();
  });

  it("deletes one invitation with correct confirmation", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      if (ref === "rsvp-collection-ref") {
        return Promise.resolve({ docs: [] });
      }
      if (ref === "rsvp-query-ref") {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({ docs: [] });
    });
    mockCollection.mockReturnValue("subcollection-ref");
    mockDoc.mockReturnValue({ id: "t1" });
    mockWriteBatch.mockReturnValue({ delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("t1")).toBeInTheDocument());
    // Selecciona la fila, escribe la confirmación y elimina la selección.
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    const input = screen.getByPlaceholderText("superadmin.data.confirmPlaceholder");
    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    const delBtn = screen.getByText((text) => text.includes("superadmin.data.deleteSelectedBtn"));
    expect(delBtn).not.toBeDisabled();
    fireEvent.click(delBtn);
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("success", expect.any(String)));
  });

  it("shows error toast when data load fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("fail"));
    render(<DataTab />);
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "errors.dataLoadFailed"));
  });

  it("toggles checkbox on click", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            {
              id: "t1",
              data: () => ({
                id: "t1",
                firstName: "A",
                secondName: "B",
                weddingDay: "1",
                weddingMonth: "1",
                weddingYear: "2025",
              }),
            },
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => {
      expect(screen.getByText("t1")).toBeInTheDocument();
    });
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox!);
  });

  it("copies token on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            {
              id: "token-abc",
              data: () => ({
                id: "token-abc",
                firstName: "A",
                secondName: "B",
                weddingDay: "1",
                weddingMonth: "1",
                weddingYear: "2025",
              }),
            },
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => {
      expect(screen.getByText("token-abc")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("token-abc"));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("token-abc");
    });
  });

  it("exports selected invitations", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            {
              id: "t1",
              data: () => ({
                firstName: "A",
                secondName: "B",
                weddingDay: "1",
                weddingMonth: "1",
                weddingYear: "2025",
              }),
            },
          ],
        });
      }
      if (ref === "rsvp-collection-ref") {
        return Promise.resolve({ docs: [] });
      }
      if (ref === "rsvp-query-ref") {
        return Promise.resolve({ docs: [] });
      }
      return Promise.resolve({ docs: [] });
    });
    mockDownloadJson.mockImplementation(() => {});
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.selectAll")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    await vi.waitFor(() => {
      const exportBtn = screen.queryByText((text) => text.includes("superadmin.data.exportSelectedBtn"));
      if (exportBtn) fireEvent.click(exportBtn);
    });
    await vi.waitFor(() => expect(mockDownloadJson).toHaveBeenCalled());
  });

  it("deleteSelected is disabled without the confirm word", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.selectAll")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    const btn = screen.getByText((text) => text.includes("superadmin.data.deleteSelectedBtn"));
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("deleteAll is cancelled when the user declines", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    window.confirm = vi.fn(() => false);
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.deleteAllBtn")).toBeInTheDocument());
    const input = screen.getByPlaceholderText("superadmin.data.confirmPlaceholder");
    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    fireEvent.click(screen.getByText("superadmin.data.deleteAllBtn"));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockAddToast).not.toHaveBeenCalledWith("success", expect.any(String));
  });

  it("deleteAll proceeds when confirmation is accepted", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    window.confirm = vi.fn(() => true);
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.deleteAllBtn")).toBeInTheDocument());
    const input = screen.getByPlaceholderText("superadmin.data.confirmPlaceholder");
    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    fireEvent.click(screen.getByText("superadmin.data.deleteAllBtn"));
    await vi.waitFor(() => {
      expect(mockWriteBatch).toHaveBeenCalled();
    });
  });

  it("computes rsvp counts from the responses group", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      if (ref === "rsvp-responses-group") {
        return Promise.resolve({
          docs: [
            { id: "r1", data: () => ({ inviteToken: "t1", attendance: "yes" }) },
            { id: "r2", data: () => ({ inviteToken: "t1", attendance: "no" }) },
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("t1")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeDefined();
  });

  it("counts only rsvp docs that carry an invite token", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      if (ref === "rsvp-responses-group") {
        return Promise.resolve({
          docs: [
            { id: "r1", data: () => ({ inviteToken: "t1" }) },
            { id: "r2", data: () => ({ attendance: "yes" }) },
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("t1")).toBeInTheDocument());
    expect(screen.getByText("1")).toBeDefined();
  });

  it("exports an invitation whose document does not exist", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({
              id: "t1",
              firstName: "A",
              secondName: "B",
              weddingDay: "1",
              weddingMonth: "1",
              weddingYear: "2025",
            }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    mockGetDoc.mockImplementation(() => Promise.resolve({ exists: () => false }));
    mockDownloadJson.mockImplementation(() => {});
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.selectAll")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    await vi.waitFor(() => {
      const exportBtn = screen.queryByText((text) => text.includes("superadmin.data.exportSelectedBtn"));
      if (exportBtn) fireEvent.click(exportBtn);
    });
    await vi.waitFor(() => {
      expect(mockDownloadJson).toHaveBeenCalled();
    });
  });
});

describe("DataTab avanzadas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({ docs: [docData({ id: "tok1234567", firstName: "Ana", secondName: "Luis", visits: 42, _visits: 42 })] });
      }
      return Promise.resolve({ docs: [] });
    });
  });

  it("opens the invitation detail modal", async () => {
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("tok1234567")).toBeInTheDocument());
    // El detalle se abre desde la barra con UNA invitación seleccionada.
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.data.detailBtn"));
    expect(screen.getByTestId("detail-modal")).toBeInTheDocument();
  });

  it("searches a guest by name (PII) via collectionGroup", async () => {
    mockGetDocs.mockImplementation((ref: unknown) =>
      ref === "invitations-collection-ref"
        ? Promise.resolve({ docs: [docData({ id: "tok1234567", firstName: "Ana", secondName: "Luis" })] })
        : Promise.resolve({
            docs: [{ data: () => ({ inviteToken: "tok1234567", guestName: "Ana García", attendance: "yes" }) }],
            size: 1,
          }),
    );
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByLabelText("superadmin.data.piiPlaceholder")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("superadmin.data.piiPlaceholder"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("superadmin.data.piiSearch"));
    await vi.waitFor(() => expect(screen.getByText(/Ana García/)).toBeInTheDocument());
  });

  it("applies a bulk theme to selected invitations", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    // Selecciona la única invitación mediante el checkbox de cabecera.
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.change(screen.getByLabelText("superadmin.data.bulkTheme"), { target: { value: "forest" } });
    fireEvent.click(screen.getByText("superadmin.data.bulkTheme", { exact: false }));
    await vi.waitFor(() => expect(mockWriteBatch).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("exporta el RSVP de una invitación seleccionada a Excel", async () => {
    mockGetDocs.mockImplementation((ref: unknown) =>
      ref === "invitations-collection-ref"
        ? Promise.resolve({ docs: [docData({ id: "tok1234567", firstName: "Ana", secondName: "Luis" })] })
        : Promise.resolve({ docs: [{ data: () => ({ guestName: "Ana García", attendance: "yes", companionCount: 1 }) }] }),
    );
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("superadmin.data.excelBtn", { exact: false }));
    await vi.waitFor(() => expect(mockExportToXlsx).toHaveBeenCalled());
  });

  it("resume los menús de las invitaciones seleccionadas", async () => {
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("superadmin.data.menusBtn", { exact: false }));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("info", expect.any(String)));
  });

  it("aplica expiración masiva a las seleccionadas (prompt + batch)", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("2026-12-31");
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("superadmin.data.bulkExpiryBtn", { exact: false }));
    await vi.waitFor(() => expect(mockWriteBatch).toHaveBeenCalled());
  });

  it("sella masivamente las invitaciones seleccionadas (confirm + batch)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("superadmin.data.bulkSealBtn", { exact: false }));
    await vi.waitFor(() => expect(mockWriteBatch).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("exporta por rango de fechas (prompts + invitación en rango)", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce("2025-01-01").mockReturnValueOnce("2025-12-31");
    mockGetDocs.mockImplementation((ref: unknown) =>
      ref === "invitations-collection-ref"
        ? Promise.resolve({
            docs: [
              docData({
                id: "tok1234567",
                firstName: "Ana",
                secondName: "Luis",
                createdAt: "2025-06-15T10:00:00.000Z",
              }),
            ],
          })
        : Promise.resolve({ docs: [] }),
    );
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.rangeBtn")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.rangeBtn"));
    await vi.waitFor(() => expect(mockDownloadJson).toHaveBeenCalled());
  });

  it("imprime las confirmaciones de la selección", async () => {
    mockGetDocs.mockImplementation((ref: unknown) =>
      ref === "invitations-collection-ref"
        ? Promise.resolve({ docs: [docData({ id: "tok1234567", firstName: "Ana", secondName: "Luis" })] })
        : Promise.resolve({
            docs: [{ data: () => ({ guestName: "Ana García", attendance: "yes", companionCount: 1 }) }],
          }),
    );
    const createObjectURL = vi.fn(() => "blob:print");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    const win = { addEventListener: vi.fn(), print: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => win));
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.click(screen.getByText("superadmin.data.printBtn", { exact: false }));
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(win.addEventListener).toHaveBeenCalled();
  });

  it("purga invitaciones con boda antigua (prompt + confirm + cascadeDelete)", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("12");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGetDocs.mockImplementation((ref: unknown) => {
      if (ref === "invitations-collection-ref")
        return Promise.resolve({
          docs: [
            docData({ id: "old1", firstName: "A", secondName: "B", weddingDay: "01", weddingMonth: "01", weddingYear: "2020" }),
          ],
        });
      // cascadeDelete consulta subcolecciones: se devuelven vacías.
      return Promise.resolve({ docs: [], size: 0 });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("old1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.purgeBtn"));
    // Se elimina la invitación antigua (cascadeDelete con batches).
    await vi.waitFor(() => expect(mockWriteBatch).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("no purga nada sin invitaciones antiguas", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("12");
    mockGetDocs.mockImplementation((ref: unknown) =>
      ref === "invitations-collection-ref"
        ? Promise.resolve({
            docs: [
              docData({ id: "fut1", firstName: "A", secondName: "B", weddingDay: "01", weddingMonth: "01", weddingYear: "2099" }),
            ],
          })
        : Promise.resolve({ docs: [] }),
    );
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("fut1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.purgeBtn"));
    await vi.waitFor(() => expect(mockDeleteDoc).not.toHaveBeenCalled());
  });

  // ── Ramas límite: errores y cortocircuitos de los handlers masivos ──

  /** Monta la pestaña con dos invitaciones (una con boda antigua para purga). */
  async function mountTwo() {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({ id: "old1", firstName: "Old", secondName: "One", weddingDay: "1", weddingMonth: "1", weddingYear: "2020" }),
            docData({ id: "new1", firstName: "New", secondName: "One", weddingDay: "1", weddingMonth: "1", weddingYear: "2030" }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("old1")).toBeInTheDocument());
  }

  it("PII: exige mínimo de caracteres antes de consultar", async () => {
    await mountTwo();
    fireEvent.change(screen.getByLabelText("superadmin.data.piiPlaceholder"), { target: { value: "ab" } });
    fireEvent.click(screen.getByText("superadmin.data.piiSearch"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("info", "superadmin.data.piiMinChars"));
  });

  it("PII: avisa cuando no hay resultados", async () => {
    await mountTwo();
    fireEvent.change(screen.getByLabelText("superadmin.data.piiPlaceholder"), { target: { value: "Zzz" } });
    fireEvent.click(screen.getByText("superadmin.data.piiSearch"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("info", "superadmin.data.piiNone"));
  });

  it("PII: convierte fallos de consulta en toast de error", async () => {
    await mountTwo();
    mockGetDocs.mockRejectedValueOnce(new Error("cg down"));
    fireEvent.change(screen.getByLabelText("superadmin.data.piiPlaceholder"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("superadmin.data.piiSearch"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("error", "errors.dataLoadFailed"));
  });

  it("tema masivo: sin selección no abre confirmación", async () => {
    await mountTwo();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    // Sin selección el handler cortocircuita antes de pedir confirmación.
    fireEvent.click(screen.getByText("superadmin.data.bulkTheme", { exact: false }));
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("expiración masiva: prompt cancelado no escribe nada", async () => {
    await mountTwo();
    vi.spyOn(window, "prompt").mockReturnValue("");
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    fireEvent.click(screen.getByText("superadmin.data.bulkExpiryBtn", { exact: false }));
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("sello masivo: confirmación denegada no aplica el lote", async () => {
    await mountTwo();
    window.confirm = vi.fn(() => false);
    fireEvent.click(screen.getByText("superadmin.data.selectAll"));
    fireEvent.click(screen.getByText("superadmin.data.bulkSealBtn", { exact: false }));
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("purga: meses inválidos cortocircuitan sin borrar", async () => {
    await mountTwo();
    vi.spyOn(window, "prompt").mockReturnValue("0");
    fireEvent.click(screen.getByText("superadmin.data.purgeBtn"));
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it("purga: solo elimina las bodas anteriores al corte y avisa", async () => {
    await mountTwo();
    vi.spyOn(window, "prompt").mockReturnValue("12");
    window.confirm = vi.fn(() => true);
    fireEvent.click(screen.getByText("superadmin.data.purgeBtn"));
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith("success", expect.stringContaining("purgeDone")));
  });

  it("filtro de actividad: sesión activa oculta las demás filas", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            docData({ id: "ses1", firstName: "S", secondName: "A", activeSession: { user: "jj" } }),
            docData({ id: "nos1", firstName: "N", secondName: "B" }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("nos1")).toBeInTheDocument());
    // El filtro es único en la pestaña; el cambio debe ocultar las filas sin sesión.
    const filter = screen.getByLabelText("superadmin.data.activityFilter") as HTMLSelectElement;
    fireEvent.change(filter, { target: { value: "sesion" } });
    await vi.waitFor(() => expect(screen.queryByText("nos1")).not.toBeInTheDocument());
    expect(screen.getByText("ses1")).toBeInTheDocument();
  });
});
