import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Suspense } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock("../../lib/firebase", () => ({
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
});
