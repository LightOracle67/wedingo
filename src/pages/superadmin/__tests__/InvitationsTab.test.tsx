import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  doc: vi.fn(() => "doc-ref"),
  deleteDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../lib/firebase", () => ({
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
}));

vi.mock("../../../lib/superadmin-utils", () => ({
  searchInvitations: (invitations: unknown[], _search: string) => invitations,
  formatBytes: (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`,
}));

import InvitationsTab from "../InvitationsTab";

describe("InvitationsTab", () => {
  it("renders loading state initially", () => {
    render(<InvitationsTab />);
    expect(screen.getByText("common.loading")).toBeDefined();
  });
});
