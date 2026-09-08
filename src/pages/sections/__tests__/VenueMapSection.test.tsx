import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: stableT }) }));

const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal()),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn(() => "venuepoint-col"),
}));
vi.mock("../../lib/firebase", () => ({ db: "db-mock" }));
vi.mock("../../components/CornerDecorations", () => ({
  default: ({ src }: { src?: string }) => <div data-testid="corner">{src || ""}</div>,
}));

import VenueMapSection from "../VenueMapSection";

const baseProps = { style: {}, className: "test", inviteToken: "tok1234567" };

describe("VenueMapSection", () => {
  it("sin puntos devuelve null (no renderiza la sección)", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    render(<VenueMapSection {...baseProps} />);
    // La carga es asíncrona: tras resolver a vacío, no hay sección.
    await waitFor(() => expect(document.querySelector('[data-story-section="venuemap"]')).toBeNull());
  });

  it("renderiza el mapa con los puntos y sus etiquetas", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "p1", data: () => ({ label: "Entrada", x: 25, y: 30, color: "#ffcc00" }) },
        { id: "p2", data: () => ({ label: "Bar", x: 60, y: 50 }) },
      ],
    });
    render(<VenueMapSection {...baseProps} background="https://x/plano.png" />);
    await waitFor(() => expect(screen.getByText("Bar")).toBeDefined());
    expect(screen.getByText("Entrada")).toBeDefined();
    expect(screen.getByRole("img", { name: "venueMap.aria" })).toBeDefined();
  });

  it("tolera el fallo de lectura (firestore caído) sin romper", async () => {
    mockGetDocs.mockRejectedValue(new Error("offline"));
    render(<VenueMapSection {...baseProps} />);
    await waitFor(() => expect(document.querySelector('[data-story-section="venuemap"]')).toBeNull());
  });
});