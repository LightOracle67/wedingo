import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfigImageField from "../ConfigImageField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const base = {
  id: "img",
  src: "",
  uploadLabel: "Subir",
  uploadHint: "PNG o JPG",
  accept: "image/png",
  uploading: false,
  uploadingLabel: "Subiendo...",
  removeLabel: "Quitar",
  onUpload: vi.fn(),
  onRemove: vi.fn(),
};

describe("ConfigImageField", () => {
  it("sin imagen muestra el label de subida y dispara onUpload", () => {
    render(<ConfigImageField {...base} value="" />);
    fireEvent.change(document.getElementById("img") as HTMLInputElement, {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    expect(base.onUpload).toHaveBeenCalledWith(expect.any(File));
  });

  it("con imagen muestra la vista previa y el botón quitar", () => {
    render(<ConfigImageField {...base} value="__cfgimg:x" src="data:image/png;base64,xx" currentLabel="Actual" />);
    expect(screen.getByText("Actual")).toBeDefined();
    fireEvent.click(screen.getByText("Quitar"));
    expect(base.onRemove).toHaveBeenCalled();
  });

  it("en subida muestra 'Subiendo...' y deshabilita el input", () => {
    render(<ConfigImageField {...base} value="" uploading uploadingLabel="Subiendo..." />);
    expect(screen.getByText("Subiendo...")).toBeDefined();
    expect((document.getElementById("img") as HTMLInputElement).disabled).toBe(true);
  });

  it("con headerLabel muestra el encabezado con el botón quitar", () => {
    render(<ConfigImageField {...base} value="x" src="s" headerLabel="Esquinas" />);
    expect(screen.getByText("Esquinas")).toBeDefined();
    expect(screen.getByText("Quitar")).toBeDefined();
  });
});
