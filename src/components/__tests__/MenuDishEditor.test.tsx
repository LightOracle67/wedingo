import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import MenuDishEditor from "../MenuDishEditor";

afterEach(cleanup);

describe("MenuDishEditor", () => {
  const dishJson = JSON.stringify([
    { order: "entrante", text: "Ensalada" },
    { order: "postre", text: "Tarta" },
  ]);

  it("renders one row per dish", () => {
    render(<MenuDishEditor value={dishJson} onChange={vi.fn()} idBase="menu" />);
    expect(screen.getByDisplayValue("Ensalada")).toBeDefined();
    expect(screen.getByDisplayValue("Tarta")).toBeDefined();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("renders only the add button when there are no dishes", () => {
    render(<MenuDishEditor value="" onChange={vi.fn()} idBase="menu" />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText(/menuAddDish/)).toBeDefined();
  });

  it("falls back to an empty list on invalid JSON", () => {
    render(<MenuDishEditor value="{broken" onChange={vi.fn()} idBase="menu" />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("shows a warning when the stored JSON is corrupt", () => {
    render(<MenuDishEditor value="{broken" onChange={vi.fn()} idBase="menu" />);
    expect(screen.getByText("errors.menuParseError")).toBeDefined();
  });

  it("does not warn when the JSON is valid", () => {
    render(<MenuDishEditor value='[{"order":"entrante","text":"Plato"}]' onChange={vi.fn()} idBase="menu" />);
    expect(screen.queryByText("errors.menuParseError")).toBeNull();
  });

  it("returns empty for JSON that is not an array", () => {
    render(<MenuDishEditor value='{"a":1}' onChange={vi.fn()} idBase="menu" />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("normalizes dishes with non-string text", () => {
    const onChange = vi.fn();
    render(
      <MenuDishEditor
        value='[{"order":"entrante","text":42},{"order":"primero","text":"Solomillo"}]'
        onChange={onChange}
        idBase="menu"
      />,
    );
    expect(screen.getByDisplayValue("Solomillo")).toBeDefined();
  });

  it("falls back to 'otro' for an unknown dish order", () => {
    const onChange = vi.fn();
    render(<MenuDishEditor value='[{"order":"desayuno","text":"Tostadas"}]' onChange={onChange} idBase="menu" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("otro");
  });

  it("calls onChange with updated JSON when editing text", () => {
    const onChange = vi.fn();
    render(<MenuDishEditor value={dishJson} onChange={onChange} idBase="menu" />);
    fireEvent.change(screen.getByDisplayValue("Ensalada"), { target: { value: "Croquetas" } });
    const sent = onChange.mock.calls[0]![0] as string;
    expect(JSON.parse(sent)).toEqual([
      { order: "entrante", text: "Croquetas" },
      { order: "postre", text: "Tarta" },
    ]);
  });

  it("calls onChange with updated JSON when changing the order", () => {
    const onChange = vi.fn();
    render(<MenuDishEditor value={dishJson} onChange={onChange} idBase="menu" />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "primero" } });
    const sent = onChange.mock.calls[0]![0] as string;
    expect(JSON.parse(sent)[0]!.order).toBe("primero");
  });

  it("adds a new dish when clicking the add button", () => {
    const onChange = vi.fn();
    render(<MenuDishEditor value="" onChange={onChange} idBase="menu" />);
    fireEvent.click(screen.getByText(/menuAddDish/));
    const sent = onChange.mock.calls[0]![0] as string;
    expect(JSON.parse(sent)).toEqual([{ order: "entrante", text: "" }]);
  });

  it("removes a dish when clicking its remove button", () => {
    const onChange = vi.fn();
    render(<MenuDishEditor value={dishJson} onChange={onChange} idBase="menu" />);
    const removeButtons = screen.getAllByLabelText("setup.menuRemoveDish");
    fireEvent.click(removeButtons[0]!);
    const sent = onChange.mock.calls[0]![0] as string;
    expect(JSON.parse(sent)).toEqual([{ order: "postre", text: "Tarta" }]);
  });

  it("hides the add button and shows the max hint at the limit", () => {
    const dishes = Array.from({ length: 20 }, (_, i) => ({ order: "otro", text: `Plato ${i}` }));
    render(<MenuDishEditor value={JSON.stringify(dishes)} onChange={vi.fn()} idBase="menu" />);
    expect(screen.queryByText(/menuAddDish/)).toBeNull();
    expect(screen.getByText(/menuMaxDishes/)).toBeDefined();
  });
});
