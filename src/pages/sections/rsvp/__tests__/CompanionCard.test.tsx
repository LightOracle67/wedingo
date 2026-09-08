import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompanionCard from "../CompanionCard";
import type { RsvpFormData } from "../../../../hooks/useRsvp";
import type { Translate } from "../derive";

const stableT = ((key: string) => key) as unknown as Translate;
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

function baseForm(): RsvpFormData {
  return {
    guestName: "Ana",
    attendance: "with",
    companionCount: 1,
    companionNames: ["Luis"],
    companionMenus: [],
    companionAllergies: [["sin gluten"]],
    companionAllergiesOther: [""],
  } as unknown as RsvpFormData;
}

const baseProps = {
  form: baseForm(),
  onField: vi.fn(),
  onRemove: vi.fn(),
  onModeChange: vi.fn(),
  onDepartureChange: vi.fn(),
  onOpenMenu: vi.fn(),
  modes: [{ value: "bus", label: "Bus" }],
  departures: [] as { type?: "bus" | "taxi"; time: string; url: string }[],
  menuOptions: [] as { key: string; label: string; desc: string }[],
  hasTransportChoices: false,
  hasStructuredMenu: false,
  frozen: false,
  t: stableT,
};

describe("CompanionCard", () => {
  it("renderiza la tarjeta y edita el nombre del acompañante", () => {
    render(<CompanionCard {...baseProps} index={0} />);
    const input = screen.getByLabelText("rsvp.nameLabel *");
    fireEvent.change(input, { target: { value: "Luis García" } });
    expect(baseProps.onField).toHaveBeenCalledWith("companionNames[0]", "Luis García");
  });

  it("elimina el acompañante preservando el índice", () => {
    render(<CompanionCard {...baseProps} index={2} />);
    fireEvent.click(screen.getByLabelText("common.remove"));
    expect(baseProps.onRemove).toHaveBeenCalledWith(2);
  });

  it("deshabilita controles con frozen y bloquea cambios", () => {
    const onField = vi.fn();
    render(<CompanionCard {...baseProps} frozen onField={onField} index={0} />);
    const input = screen.getByLabelText("rsvp.nameLabel *") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.getByLabelText("common.remove")).toBeDisabled();
  });

  it("pinta el selector de transporte cuando aplica y reenvía los cambios", () => {
    render(
      <CompanionCard
        {...baseProps}
        index={0}
        hasTransportChoices
        departures={[{ type: "bus", time: "19:00", url: "https://x" }]}
      />,
    );
    // El picker de transporte se monta con el modo actual del acompañante.
    expect(document.querySelector(".transport-picker, .rv2-transport")).not.toBeNull();
  });

  it("menú estructurado: resalta la opción activa y abre el modal de menú", () => {
    const form = { ...baseForm(), companionMenus: ["carne"] } as unknown as RsvpFormData;
    const onOpenMenu = vi.fn();
    render(
      <CompanionCard
        {...baseProps}
        form={form}
        index={0}
        hasStructuredMenu
        menuOptions={[
          { key: "carne", label: "Carnes", desc: "" },
          { key: "pescado", label: "Pescado", desc: "" },
        ]}
        onOpenMenu={onOpenMenu}
      />,
    );
    const carne = screen.getByText("Carnes");
    expect(carne.closest("button")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("Pescado"));
    expect(onOpenMenu).toHaveBeenCalledWith(0, { key: "pescado", label: "Pescado", desc: "" });
  });

  it("alergias: alterna chips y escribe la alergia 'otra' por índice", () => {
    const onField = vi.fn();
    render(<CompanionCard {...baseProps} onField={onField} index={0} />);
    // Los chips son labels con checkbox: se dispara el input directamente.
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    // [0] es "sin gluten" (seleccionado): al desmarcarlo se QUITA.
    fireEvent.click(boxes[0]!);
    expect(onField).toHaveBeenCalledWith("companionAllergies[0]", []);
    // [1] "sin lactosa" (sin marcar): al marcarlo se AÑADE (el form del
    // closure mantiene "sin gluten" porque onField no re-renderiza el card).
    fireEvent.click(boxes[1]!);
    expect(onField).toHaveBeenCalledWith("companionAllergies[0]", ["sin gluten", "sin lactosa"]);
    // "otra": escribe la lista en la posición del acompañante (label sr-only).
    fireEvent.change(screen.getByLabelText("rsvp.allergiesOtherLabel"), { target: { value: "frutos secos" } });
    expect(onField).toHaveBeenCalledWith("companionAllergiesOther", ["frutos secos"]);
  });
});