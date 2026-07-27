import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("firebase/firestore", () => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  doc: vi.fn(() => "doc-ref"),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => "collection-ref"),
  query: vi.fn(() => "query-ref"),
  where: vi.fn(() => "where-ref"),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
}));

vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
}));

import TokensTab from "../TokensTab";

describe("TokensTab", () => {
  it("renders loading state initially", () => {
    render(<TokensTab />);
    expect(screen.getByText("superadmin.tokensLoading")).toBeDefined();
  });
});
