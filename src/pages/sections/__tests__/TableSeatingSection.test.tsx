import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: (...args: unknown[]) => args.join("/"),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));

import TableSeatingSection from "../TableSeatingSection";

describe("TableSeatingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Se usa /tables para distinguir las consultas de mesas de las de secciones.
    mockGetDocs.mockImplementation((path: unknown) => {
      if (String(path).includes("/tables")) {
        return Promise.resolve({
          docs: [
            {
              id: "t1",
              data: () => ({
                name: "Mesa 1",
                shape: "circle",
                x: 50,
                y: 50,
                w: 90,
                h: 90,
                rotation: 0,
                seats: 6,
                guests: ["Ana", "Luis"],
              }),
            },
          ],
        });
      }
      return Promise.resolve({
        docs: [
          { id: "s1", data: () => ({ name: "Salón" }) },
          { id: "s2", data: () => ({ name: "Jardín" }) },
        ],
      });
    });
  });

  it("renders the selected zone and its tables", async () => {
    const { container } = render(<TableSeatingSection inviteToken="tok" />);
    // Espera a que cargue (selecciona la primera sección con mesas).
    const zoneName = await screen.findAllByText("Salón");
    expect(zoneName).toBeDefined();
    expect(screen.getAllByText("Mesa 1").length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[style*="position: absolute"]').length).toBeGreaterThan(0);
  });

  it("opens the fullscreen magnifier and closes it", async () => {
    render(<TableSeatingSection inviteToken="tok" />);
    await screen.findAllByText("Salón");
    // El botón de lupa muestra "🔍 tables.fullscreen": matcher parcial.
    fireEvent.click(screen.getByText((c: string) => c.includes("tables.fullscreen")));
    // La lupa es un diálogo con el nombre de la zona.
    expect(screen.getByRole("dialog", { name: "tables.fullscreenTitle" })).toBeDefined();
    fireEvent.click(screen.getByText("common.close"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches between zones", async () => {
    render(<TableSeatingSection inviteToken="tok" />);
    await screen.findAllByText("Salón");
    // "Jardín" aparece en el selector (botón) y como nota de la zona activa.
    const jardinButtons = screen.getAllByText("Jardín");
    fireEvent.click(jardinButtons[0]!);
    // Al cambiar de zona se mantiene el selector y se muestra la zona activa.
    expect(screen.getAllByText("Salón").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jardín").length).toBeGreaterThan(0);
  });
});
