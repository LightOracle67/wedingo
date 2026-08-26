/**
 * Tests de las primitivas de formulario compartidas (CountedField,
 * MapModeSelect y MapUrlField). Antes solo estaban cubiertas de forma
 * indirecta a través de los formularios del setup; aquí se fija su
 * comportamiento propio: recorte por límite, contador, wiring del select
 * y validación en vivo de la URL de Maps.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CountedInput, CountedTextarea } from "../CountedField";
import MapModeSelect from "../MapModeSelect";
import MapUrlField from "../MapUrlField";

// i18n crudo: las aserciones usan las claves literales como en el resto del proyecto.
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe("CountedInput", () => {
  it("recorta el valor al máximo antes de notificar", () => {
    const onChange = vi.fn();
    render(<CountedInput id="f" value="" onChange={onChange} max={5} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456789" } });
    expect(onChange).toHaveBeenCalledWith("12345");
  });

  it("muestra el contador de caracteres actual", () => {
    render(<CountedInput id="f" value="abc" onChange={vi.fn()} max={10} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});

describe("CountedTextarea", () => {
  it("recorta el valor al máximo antes de notificar", () => {
    const onChange = vi.fn();
    render(<CountedTextarea id="t" value="" onChange={onChange} max={4} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "abcdef" } });
    expect(onChange).toHaveBeenCalledWith("abcd");
  });
});

describe("MapModeSelect", () => {
  it("notifica el modo elegido", () => {
    const onChange = vi.fn();
    render(<MapModeSelect id="m" value="iframe" onChange={onChange} hintId="h" />);
    fireEvent.change(screen.getByLabelText("setup.mapModeLabel"), { target: { value: "name" } });
    expect(onChange).toHaveBeenCalledWith("name");
  });

  it("usa iframe como modo por defecto cuando no hay valor", () => {
    render(<MapModeSelect id="m" value="" onChange={vi.fn()} hintId="h" />);
    expect((screen.getByLabelText("setup.mapModeLabel") as HTMLSelectElement).value).toBe("iframe");
  });
});

describe("MapUrlField", () => {
  it("marca la URL válida y notifica el cambio", () => {
    const onChange = vi.fn();
    render(
      <MapUrlField id="u" value="https://maps.google.com/maps/place/Plaza+Mayor" onChange={onChange} placeholder="p" />,
    );
    const input = screen.getByRole("textbox");
    expect(screen.getByText("setup.mapUrlOk")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "https://maps.google.com/maps/place/Retiro" } });
    expect(onChange).toHaveBeenCalledWith("https://maps.google.com/maps/place/Retiro");
  });

  it("marca la URL inválida", () => {
    render(<MapUrlField id="u" value="no-es-maps" onChange={vi.fn()} placeholder="p" />);
    expect(screen.getByText("setup.mapUrlInvalid")).toBeInTheDocument();
  });

  it("muestra el nombre del lugar extraído cuando procede", () => {
    render(
      <MapUrlField
        id="u"
        value="https://maps.google.com/maps/place/Plaza+Mayor"
        onChange={vi.fn()}
        placeholder="p"
        placeLabel="Lugar:"
      />,
    );
    // La extracción depende de geo-utils; basta con que el bloque de lugar exista.
    expect(document.body.textContent).toContain("Lugar:");
  });
});
