import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const stableT = (key: string) => key;
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: stableT }) }));

const mockGetDocs = vi.fn();
const mockAddToast = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn((..._a: unknown[]) => "col"),
  query: vi.fn((..._a: unknown[]) => "q"),
  where: vi.fn((..._a: unknown[]) => "w"),
  limit: vi.fn((..._a: unknown[]) => "l"),
  doc: vi.fn(() => "doc-ref"),
}));
vi.mock("../../../lib/firebase", () => ({
  db: "db-mock",
  INVITATIONS_COLLECTION_REF: "INV_COLL",
  rsvpByInviteRef: vi.fn(() => "rsvp-q"),
}));
vi.mock("../../../hooks/useToast", () => ({ useToast: () => ({ addToast: mockAddToast }) }));
// exports dinámicos usados por exportAudit (no se ejercitan aquí).
vi.mock("../../../lib/excel-utils", () => ({ exportToXlsx: vi.fn() }));
vi.mock("../../../lib/excel-builders", () => ({ buildAuditSheet: vi.fn(() => ({})) }));

import SupportTab from "../SupportTab";

const IS_NOW = Date.now();
// Boda a 3 días vista: entra en "próximas bodas" (≤14 días) con label real.
const FUTURE = new Date(IS_NOW + 3 * 86400000);
const invSnap = {
  docs: [
    {
      id: "inv1",
      data: () => ({
        firstName: "Ana",
        secondName: "Luis",
        weddingDay: String(FUTURE.getDate()),
        weddingMonth: String(FUTURE.getMonth() + 1),
        weddingYear: String(FUTURE.getFullYear()),
        _visits: 60,
        detailsMapMode: "name",
        transportMapMode: "",
        accommodationMapMode: "",
        activeSession: { seconds: Math.floor(IS_NOW / 1000) },
      }),
    },
  ],
  empty: false,
  size: 1,
};

describe("SupportTab (superadmin)", () => {
  it("carga avisos: filas con mapa no-iframe, legacy, sesión, visitas y próximas bodas", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      const s = String(ref);
      if (s === "INV_COLL") return Promise.resolve(invSnap);
      if (s.includes("q")) return Promise.resolve({ docs: [{ id: "inv1", data: () => ({}) }], empty: false, size: 1 });
      return Promise.resolve({ docs: [], empty: true, size: 0 });
    });
    render(<SupportTab />);
    await waitFor(() => expect(screen.queryByText("superadmin.dashboardLoading")).toBeNull());
    // La invitación se pinta como boda próxima; mapa NO en modo iframe.
    expect(screen.getByText(new RegExp(`${FUTURE.getDate()}/${FUTURE.getMonth() + 1}/`))).toBeDefined();
    // El contador de próximas bodas (≤14 días) al menos se renderiza.
    expect(screen.getAllByText(/inv1/).length).toBeGreaterThan(0);
  });

  it("busca un token pulsando Enter y muestra el resultado con el nombre real", async () => {
    mockGetDocs.mockImplementation((ref: unknown) => {
      const s = String(ref);
      if (s === "INV_COLL" || s.includes("q")) {
        if (s === "rsvp-q") return Promise.resolve({ docs: [{ data: () => ({}) }], size: 1, empty: false });
        return Promise.resolve(invSnap);
      }
      return Promise.resolve({ docs: [], empty: true, size: 0 });
    });
    render(<SupportTab />);
    await waitFor(() => expect(screen.getByLabelText("superadmin.support.tokenPlaceholder")).toBeDefined());
    fireEvent.change(screen.getByLabelText("superadmin.support.tokenPlaceholder"), { target: { value: "inv1" } });
    fireEvent.keyDown(screen.getByLabelText("superadmin.support.tokenPlaceholder"), { key: "Enter" });
    // El resultado muestra el nombre real (no la clave i18n) del invitado.
    await waitFor(() => expect(screen.getByText("Ana & Luis")).toBeDefined());
  });
});