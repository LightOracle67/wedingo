import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SetupArrayEditor from "../SetupArrayEditor";
import { CountedTextarea, CountedInput } from "../CountedField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SetupArrayEditor", () => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();

  it("renderiza las filas y llama a onRemove", () => {
    render(
      <SetupArrayEditor
        count={2}
        max={4}
        addLabel="Añadir"
        removeLabel="Quitar"
        maxLabel="Máximo"
        onAdd={onAdd}
        onRemove={onRemove}
        renderRow={(i) => <span>fila-{i}</span>}
      />,
    );
    expect(screen.getByText("fila-0")).toBeDefined();
    expect(screen.getByText("fila-1")).toBeDefined();
    const removes = screen.getAllByLabelText("Quitar");
    fireEvent.click(removes[0]!);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("oculta el botón añadir al alcanzar el máximo y muestra el aviso", () => {
    render(
      <SetupArrayEditor
        count={4}
        max={4}
        addLabel="Añadir"
        removeLabel="Quitar"
        maxLabel="Máximo"
        onAdd={onAdd}
        onRemove={onRemove}
        renderRow={() => <span>x</span>}
      />,
    );
    expect(screen.queryByText("+ Añadir")).toBeNull();
    expect(screen.getByText("Máximo")).toBeDefined();
  });

  it("llama a onAdd desde el botón añadir", () => {
    render(
      <SetupArrayEditor
        count={0}
        max={4}
        addLabel="Añadir"
        removeLabel="Quitar"
        maxLabel="Máximo"
        onAdd={onAdd}
        onRemove={onRemove}
        renderRow={() => null}
      />,
    );
    fireEvent.click(screen.getByText("+ Añadir"));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe("CountedField", () => {
  it("CountedTextarea recorta el valor a max y muestra el contador", () => {
    const onChange = vi.fn();
    render(<CountedTextarea id="t" value="abc" max={3} onChange={onChange} />);
    const ta = document.getElementById("t") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "abcdef" } });
    expect(onChange).toHaveBeenCalledWith("abc");
    expect(screen.getByText("3/3")).toBeDefined();
  });

  it("CountedInput recorta el valor a max", () => {
    const onChange = vi.fn();
    render(<CountedInput id="i" value="" max={2} onChange={onChange} />);
    fireEvent.change(document.getElementById("i") as HTMLInputElement, { target: { value: "xyz" } });
    expect(onChange).toHaveBeenCalledWith("xy");
  });
});
