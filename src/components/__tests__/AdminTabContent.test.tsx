import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Suspense } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() })),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  invitationDocRef: vi.fn(),
}));

import AdminTabContent from "../AdminTabContent";

afterEach(cleanup);

describe("AdminTabContent", () => {
  it("returns null for unknown tab", () => {
    const { container } = render(<AdminTabContent activeTab="unknown" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders panel tab for 'panel'", async () => {
    const mockConfig = {
      inviteToken: "test",
      confirmedResponses: 0,
      declinedResponses: 0,
      totalGuests: 0,
      rsvpEntries: [],
      formatDate: (d: unknown) => String(d),
      visitCount: 0,
    };
    render(
      <Suspense fallback={<div>loading...</div>}>
        <AdminTabContent activeTab="panel" config={mockConfig} />
      </Suspense>
    );
    expect(await screen.findByText("panel.confirmed")).toBeDefined();
  });

  it("renders attendance tab for 'asistencia'", async () => {
    render(
      <Suspense fallback={<div>loading...</div>}>
        <AdminTabContent activeTab="asistencia" inviteToken="test" />
      </Suspense>
    );
    expect(await screen.findByText("attendance.searchLabel")).toBeDefined();
  });

  it("renders share tab for 'compartir'", async () => {
    render(
      <Suspense fallback={<div>loading...</div>}>
        <AdminTabContent activeTab="compartir" inviteToken="test" />
      </Suspense>
    );
    expect(await screen.findByText("share.publishedAt")).toBeDefined();
  });

  it("renders access tab for 'acceso'", async () => {
    render(
      <Suspense fallback={<div>loading...</div>}>
        <AdminTabContent activeTab="acceso" inviteToken="test" />
      </Suspense>
    );
    expect(await screen.findByText("access.description")).toBeDefined();
  });

  it("renders support tab for 'soporte'", async () => {
    render(
      <Suspense fallback={<div>loading...</div>}>
        <AdminTabContent activeTab="soporte" inviteToken="test" />
      </Suspense>
    );
    expect(await screen.findByText("support.title")).toBeDefined();
  });
});
