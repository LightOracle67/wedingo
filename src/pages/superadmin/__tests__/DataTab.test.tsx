import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ data: () => ({}), exists: () => false })),
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn(() => "collection-ref"),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "invitations-collection-ref",
  RSVP_COLLECTION_REF: "rsvp-collection-ref",
  rsvpByInviteRef: vi.fn(() => "rsvp-query-ref"),
}));

vi.mock("../../../lib/file-utils", () => ({
  downloadJson: vi.fn(),
}));

import DataTab from "../DataTab";

describe("DataTab", () => {
  it("renders loading state initially", () => {
    render(<DataTab />);
    expect(screen.getByText("common.loading")).toBeDefined();
  });
});
