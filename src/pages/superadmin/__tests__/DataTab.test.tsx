import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWriteBatch = vi.fn();
const mockDownloadJson = vi.fn();
const mockAddToast = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
  RSVP_COLLECTION_REF: "rsvp-collection-ref",
  rsvpByInviteRef: vi.fn(() => "rsvp-query-ref"),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("../../../lib/file-utils", () => ({
  downloadJson: (...args: unknown[]) => mockDownloadJson(...args),
}));

import DataTab from "../DataTab";

const docData = (overrides: Record<string, unknown> = {}) => ({
  data: () => overrides,
  id: String(overrides.id || "token1"),
});

describe("DataTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteBatch.mockReturnValue({ delete: vi.fn(), commit: vi.fn() });
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
            docData({ id: "token1", firstName: "John", secondName: "Jane", adminUsername: "jj", weddingDay: "15", weddingMonth: "6", weddingYear: "2025" }),
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
            docData({ id: "t1", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" }),
            docData({ id: "t2", firstName: "C", secondName: "D", weddingDay: "2", weddingMonth: "2", weddingYear: "2025" }),
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
            docData({ id: "fulltoken", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" }),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.selectEmpty")).toBeInTheDocument());
  });

  it("calls exportOne when export button clicked", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({ docs: [docData({ id: "t1", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" })] });
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
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.exportBtn")).toBeInTheDocument());
    fireEvent.click(screen.getByText("superadmin.data.exportBtn"));
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
    await vi.waitFor(() => expect(screen.getByText((text) => text.includes("superadmin.data.exportAllBtn"))).toBeInTheDocument());
    fireEvent.click(screen.getByText((text) => text.includes("superadmin.data.exportAllBtn")));
    await vi.waitFor(() => expect(mockDownloadJson).toHaveBeenCalledWith("wedingo_full_export.json", expect.any(Object)));
    expect(mockAddToast).toHaveBeenCalledWith("success", expect.any(String));
  });

  it("requires confirmation text before deleting", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({ docs: [docData({ id: "t1", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" })] });
      }
      return Promise.resolve({ docs: [] });
    });
    render(<DataTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.exportBtn")).toBeInTheDocument());
    expect(screen.getByText("superadmin.data.deleteAllBtn")).toBeDisabled();
  });

  it("deletes one invitation with correct confirmation", async () => {
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({ docs: [docData({ id: "t1", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" })] });
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
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.exportBtn")).toBeInTheDocument());
    const input = screen.getByPlaceholderText("superadmin.data.confirmPlaceholder");
    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    expect(screen.getByText("superadmin.data.delete")).not.toBeDisabled();
    fireEvent.click(screen.getByText("superadmin.data.delete"));
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
            { id: "t1", data: () => ({ id: "t1", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" }) },
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
    fireEvent.click(checkbox);
  });

  it("copies token on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockGetDocs.mockImplementation((ref: string) => {
      if (ref === "invitations-collection-ref") {
        return Promise.resolve({
          docs: [
            { id: "token-abc", data: () => ({ id: "token-abc", firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" }) },
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
            { id: "t1", data: () => ({ firstName: "A", secondName: "B", weddingDay: "1", weddingMonth: "1", weddingYear: "2025" }) },
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
});
