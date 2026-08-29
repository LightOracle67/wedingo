import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { TFunction } from "i18next";
import { TableCanvas, type CanvasTable } from "../table-canvas";

/** Traductor que devuelve la clave (y opciones) para poder asertar llamadas. */
// El traductor de pruebas solo necesita resolver la clave usada; el cast a
// TFunction cubre la marca de marca de i18next (no se usa en jsdom).
const t = ((key: string, options?: Record<string, unknown>) =>
  options && options.name ? `tableAccessible:${options.name}` : key) as TFunction;

const table = (overrides: Partial<CanvasTable> = {}): CanvasTable => ({
  id: "t1",
  name: "Mesa 1",
  shape: "circle",
  x: 50,
  y: 50,
  w: 12,
  h: 12,
  rotation: 0,
  seats: 8,
  guests: ["Ana", "Beto"],
  ...overrides,
});

describe("TableCanvas", () => {
  beforeEach(() => {
    // Limpia los spy de llamadas entre tests.
    vi.clearAllMocks();
  });

  it("dibuja cada mesa con su accesibilidad y la etiqueta de sillas", () => {
    render(
      <TableCanvas
        tables={[table(), table({ id: "t2", name: "Mesa 2", shape: "rect", x: 80, y: 80, guests: [] })]}
        selectedId={null}
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onDeleteTable={vi.fn()}
        onMoveSelectedByKey={vi.fn()}
        emptyMapLabel="distribucion.emptySections"
        t={t}
      />,
    );
    // Una mesa por cada elemento role=button orientado a teclado.
    const mesas = screen.getAllByRole("button");
    expect(mesas).toHaveLength(2);
    expect(mesas[0]).toHaveAttribute("aria-label", "tableAccessible:Mesa 1");
    expect(mesas[1]).toHaveAttribute("aria-label", "tableAccessible:Mesa 2");
    // La mesa 1 tiene 8 sillas (aria-hidden, no cuentan como role).
    expect(screen.getByText("Mesa 1")).toBeInTheDocument();
    expect(screen.getByText("2/8")).toBeInTheDocument();
  });

  it("no pinta el marcador vacío cuando hay mesas", () => {
    render(
      <TableCanvas
        tables={[table()]}
        selectedId={null}
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onDeleteTable={vi.fn()}
        onMoveSelectedByKey={vi.fn()}
        emptyMapLabel="distribucion.emptySections"
        t={t}
      />,
    );
    expect(screen.queryByText("distribucion.emptySections")).toBeNull();
  });

  it("pinta el mensaje vacío cuando no hay mesas", () => {
    render(
      <TableCanvas
        tables={[]}
        selectedId={null}
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onDeleteTable={vi.fn()}
        onMoveSelectedByKey={vi.fn()}
        emptyMapLabel="distribucion.emptySections"
        t={t}
      />,
    );
    expect(screen.getByText("distribucion.emptySections")).toBeInTheDocument();
  });

  it("muestra el borrador y borra la mesa al seleccionarla", () => {
    const onDeleteTable = vi.fn();
    render(
      <TableCanvas
        tables={[table()]}
        selectedId="t1"
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onDeleteTable={onDeleteTable}
        onMoveSelectedByKey={vi.fn()}
        emptyMapLabel="distribucion.emptySections"
        t={t}
      />,
    );
    // El botón de borrar solo aparece con la mesa seleccionada.
    const deleteBtn = screen.getByRole("button", { name: "distribucion.deleteTable" });
    fireEvent.click(deleteBtn);
    expect(onDeleteTable).toHaveBeenCalledWith("t1");
  });

  it("notifica el arrastre con puntero y el movimiento por teclado", () => {
    const onPointerDown = vi.fn();
    const onMoveSelectedByKey = vi.fn();
    render(
      <TableCanvas
        tables={[table()]}
        selectedId={null}
        onPointerDown={onPointerDown}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onDeleteTable={vi.fn()}
        onMoveSelectedByKey={onMoveSelectedByKey}
        emptyMapLabel="distribucion.emptySections"
        t={t}
      />,
    );
    const mesa = screen.getByRole("button", { name: "tableAccessible:Mesa 1" });
    fireEvent.pointerDown(mesa, { pointerId: 1 });
    expect(onPointerDown).toHaveBeenCalledWith(expect.objectContaining({ pointerId: 1 }), "t1");
    fireEvent.keyDown(mesa, { key: "ArrowUp" });
    expect(onMoveSelectedByKey).toHaveBeenCalledWith(expect.objectContaining({ key: "ArrowUp" }), "t1");
  });
});
