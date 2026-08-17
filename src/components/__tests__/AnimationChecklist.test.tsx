import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import AnimationChecklist from "../AnimationChecklist";
import { ANIMATION_GROUPS, ANIMATIONS } from "../../lib/animations";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

/** Ids del grupo "envelope" (7). */
const envelopeIds = ANIMATIONS.filter((a) => a.groupId === "envelope").map((a) => a.id);

describe("AnimationChecklist", () => {
  it("muestra el checkbox maestro y desactiva todo al marcarlo", () => {
    const onToggleAll = vi.fn();
    render(
      <AnimationChecklist
        checked={() => true}
        onToggle={() => {}}
        allOff={false}
        onToggleAll={onToggleAll}
        onGroupToggle={() => {}}
      />,
    );
    const master = document.getElementById("anim-all") as HTMLInputElement;
    fireEvent.click(master);
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });

  it("marca el checkbox de la sección cuando todos sus ids están activos", () => {
    const active = new Set(envelopeIds);
    render(
      <AnimationChecklist
        checked={(id) => active.has(id)}
        onToggle={() => {}}
        onGroupToggle={() => {}}
      />,
    );
    const group = document.getElementById("group-envelope") as HTMLInputElement;
    expect(group).toBeDefined();
    expect(group.checked).toBe(true);
    expect(group.indeterminate).toBe(false);
  });

  it("desmarca el checkbox de la sección cuando TODOS sus ids están desactivados y deshabilita las filas", () => {
    const checkedAll = new Set(envelopeIds);
    render(
      <AnimationChecklist
        checked={(id) => !checkedAll.has(id)}
        onToggle={() => {}}
        onGroupToggle={() => {}}
      />,
    );
    const group = document.getElementById("group-envelope") as HTMLInputElement;
    expect(group.checked).toBe(false);
    // Las filas individuales del grupo quedan deshabilitadas.
    const first = document.getElementById(`anim-${envelopeIds[0]}`) as HTMLInputElement;
    expect(first.disabled).toBe(true);
  });

  it("llama a onGroupToggle al marcar/desmarcar la sección", () => {
    const onGroupToggle = vi.fn();
    render(
      <AnimationChecklist
        checked={() => true}
        onToggle={() => {}}
        onGroupToggle={onGroupToggle}
      />,
    );
    fireEvent.click(document.getElementById("group-envelope") as HTMLInputElement);
    expect(onGroupToggle).toHaveBeenCalledWith("envelope", false);
  });

  it("muestra estado intermedio (indeterminate) cuando solo algunos ids están desactivados", () => {
    // Desactiva solo el primer id del grupo → estado mixto.
    const disabledOne = new Set([envelopeIds[0]]);
    render(
      <AnimationChecklist
        checked={(id) => !disabledOne.has(id)}
        onToggle={() => {}}
        onGroupToggle={() => {}}
      />,
    );
    const group = document.getElementById("group-envelope") as HTMLInputElement;
    expect(group.checked).toBe(false);
    expect(group.indeterminate).toBe(true);
  });

  it("existe un grupo por cada sección del registro", () => {
    expect(ANIMATION_GROUPS.length).toBe(12);
  });
});
