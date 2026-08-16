import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SetupField from "../SetupField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SetupField", () => {
  it("asocia el label con el control y renderiza el hint con su id", () => {
    render(
      <SetupField id="campo" label="Mi campo" hint="Ayuda" hintId="campoHint">
        <input id="campo" value="" onChange={() => {}} />
      </SetupField>,
    );
    const input = screen.getByLabelText("Mi campo") as HTMLInputElement;
    expect(input).toBeDefined();
    const hint = document.getElementById("campoHint");
    expect(hint?.textContent).toBe("Ayuda");
  });

  it("marca el label como requerido", () => {
    render(
      <SetupField id="campo" label="Campo" required>
        <input id="campo" value="" onChange={() => {}} />
      </SetupField>,
    );
    expect(screen.getByText("Campo").className).toContain("setup-label--required");
  });

  it("muestra el error con role=alert", () => {
    render(
      <SetupField id="campo" label="Campo" error="Algo falló">
        <input id="campo" value="" onChange={() => {}} />
      </SetupField>,
    );
    const err = screen.getByRole("alert");
    expect(err.textContent).toBe("Algo falló");
  });

  it("coloca el hint antes del control con hintPosition=before", () => {
    const { container } = render(
      <SetupField id="campo" label="Campo" hint="Antes" hintId="h" hintPosition="before">
        <input id="campo" value="" onChange={() => {}} />
      </SetupField>,
    );
    const hint = document.getElementById("h")!;
    const input = document.getElementById("campo")!;
    // El hint precede al control (compareDocumentPosition devuelve FOLLOWING=4).
    expect(hint.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container).toBeDefined();
  });
});
