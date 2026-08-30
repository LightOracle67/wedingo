/**
 * data-tab-row.test.tsx — Fila de la tabla de invitaciones del superadmin
 * (v2.190): presentación pura memoizada; cubre selección, copia de token
 * (clic + teclado), filas fantasma, nombres vacíos y sesión activa.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTabRow } from "../data-tab-row";

const baseInv = {
  id: "TOK1",
  firstName: "Ana",
  secondName: "Luis",
  adminUsername: "adrian",
  rsvpCount: 12,
  weddingDate: "12/09/2026",
  hasSession: false,
  visits: 3,
  lastActivity: "2026-08-30T10:00:00Z",
};

const t = ((key: string) => key) as never;

function setup(overrides: Record<string, unknown> = {}) {
  const onToggle = vi.fn();
  const onCopyToken = vi.fn();
  const props = {
    inv: baseInv,
    isSelected: false,
    isGhost: false,
    disabled: false,
    onToggle,
    onCopyToken,
    t,
    ...overrides,
  };
  const view = render(<DataTabRow {...(props as Parameters<typeof DataTabRow>[0])} />);
  return { ...view, onToggle, onCopyToken, props };
}

describe("DataTabRow", () => {
  it("selecciona la fila con el checkbox", () => {
    const { onToggle } = setup();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("TOK1");
  });

  it("copia el token con clic y con teclado (Enter y espacio)", () => {
    const { onCopyToken } = setup();
    const code = screen.getByRole("button", { name: /copyToken/ });
    fireEvent.click(code);
    expect(onCopyToken).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(code, { key: "Enter" });
    expect(onCopyToken).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(code, { key: " " });
    expect(onCopyToken).toHaveBeenCalledTimes(3);
  });

  it("muestra pareja, usuario, fecha, RSVP y visitas", () => {
    setup();
    expect(screen.getByText("Ana & Luis")).toBeDefined();
    expect(screen.getByText("@adrian")).toBeDefined();
    expect(screen.getByText("12/09/2026")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("fila fantasma con opacidad 0.7 y fila normal sin ella", () => {
    const { container: ghost } = setup({ isGhost: true });
    expect((ghost.querySelector("tr") as HTMLTableRowElement).style.opacity).toBe("0.7");
    const { container: normal } = setup({ isGhost: false });
    expect((normal.querySelector("tr") as HTMLTableRowElement).style.opacity).toBe("1");
  });

  it("checkbox deshabilitado cuando disabled", () => {
    setup({ disabled: true });
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
  });

  it("invitación sin nombres muestra el placeholder", () => {
    setup({ inv: { ...baseInv, firstName: "", secondName: "" } });
    expect(screen.getByText("superadmin.data.emptyInvitation")).toBeDefined();
  });

  it("sesión activa muestra 🟢 y sin sesión em dash", () => {
    setup({ inv: { ...baseInv, hasSession: true } });
    expect(screen.getByText("🟢")).toBeDefined();
  });

  it("fecha de actividad formateada en la última columna", () => {
    const { container } = setup({ inv: { ...baseInv, lastActivity: "" } });
    // Última celda: fecha de actividad (con em dash cuando está vacía).
    const tds = container.querySelectorAll("td");
    expect(tds[tds.length - 1]!.textContent).toBe("—");
  });
});
