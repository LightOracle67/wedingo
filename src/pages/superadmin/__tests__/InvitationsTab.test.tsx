import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../lib/image-store", () => ({
  deleteGallery: vi.fn(() => Promise.resolve()),
  deleteAllConfigImages: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../../lib/music-store", () => ({
  deleteAudio: vi.fn(() => Promise.resolve()),
}));
const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  doc: vi.fn(() => "doc-ref"),
  deleteDoc: vi.fn(() => Promise.resolve()),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  collection: vi.fn(() => "collection-ref"),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
  rsvpByInviteRef: vi.fn(() => "rsvp-ref"),
}));

vi.mock("../../../lib/superadmin-utils", () => ({
  searchInvitations: (invitations: unknown[], _search: string) => invitations,
  formatBytes: (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`,
}));

import InvitationsTab from "../InvitationsTab";

async function getFirestore() {
  return import("firebase/firestore");
}

describe("InvitationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<InvitationsTab />);
    expect(screen.getByText("common.loading")).toBeDefined();
  });

  it("renders invitations list", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [
        { id: "inv1", data: () => ({ theme: "golden", weddingDay: "15", weddingMonth: "June", weddingYear: "2025" }) },
        { id: "inv2", data: () => ({}) },
      ],
    });
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeDefined());
    expect(screen.getByText("inv2")).toBeDefined();
  });

  it("shows error when load fails", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
    render(<InvitationsTab />);
    await vi.waitFor(() => {
      expect(screen.getByText("superadmin.invitationLoadError")).toBeDefined();
    });
  });

  it("shows no invitations message when list is empty", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] });
    render(<InvitationsTab />);
    await vi.waitFor(() => {
      expect(screen.getByText("superadmin.noInvitations")).toBeDefined();
    });
  });

  it("renders the bulk delete action in the actions bar", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [
        { id: "inv1", data: () => ({ theme: "golden", weddingDay: "15", weddingMonth: "June", weddingYear: "2025" }) },
      ],
    });
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.deleteSelected")).toBeDefined());
  });

  it("does not delete when confirm is cancelled", async () => {
    const { getDocs, writeBatch } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ theme: "golden" }) }],
    });
    window.confirm = vi.fn(() => false);
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeDefined());
    // Selecciona la fila y pulsa eliminar; al cancelar el confirm no borra.
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.deleteSelected"));
    expect(window.confirm).toHaveBeenCalled();
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it("deletes the selected invitations in bulk", async () => {
    const { getDocs, writeBatch } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ theme: "golden" }) }],
    });
    window.confirm = vi.fn(() => true);
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByText("inv1")).toBeDefined());
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    fireEvent.click(screen.getByText("superadmin.deleteSelected"));
    await vi.waitFor(() => expect(writeBatch).toHaveBeenCalled());
  });

  it("calls handleExportAll when export button clicked", async () => {
    const { getDocs } = await getFirestore();
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [{ id: "inv1", data: () => ({ theme: "golden" }) }],
    });
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByText("superadmin.data.exportAllBtn")).toBeDefined());
    const createObjectURL = vi.fn(() => "blob:test");
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    fireEvent.click(screen.getByText("superadmin.data.exportAllBtn"));
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it("renders search input", async () => {
    render(<InvitationsTab />);
    await vi.waitFor(() => expect(screen.getByPlaceholderText("superadmin.searchTokenPlaceholder")).toBeDefined());
  });
});
