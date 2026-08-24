/**
 * Tests de AnimationPrefsApplier — Diff de clases `wed-no-anim-*` en <html>.
 *
 * Verifica que el componente añade las clases del conjunto EFECTIVO, elimina
 * las obsoletas y es idempotente (no duplica ni toca clases ajenas).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import AnimationPrefsApplier from "../AnimationPrefsApplier";

/** Set efectivo controlable desde cada test (re-mockeado por caso). */
const mockUseAnimations = vi.hoisted(() => vi.fn(() => ({ effectiveDisabled: new Set<string>() })));

// El componente lee el hook combinado desde el barrel de contexts.
vi.mock("../../contexts", () => ({
  useAnimations: mockUseAnimations,
}));

describe("AnimationPrefsApplier", () => {
  beforeEach(() => {
    // Limpia clases residuales del <html> entre tests.
    document.documentElement.className = "";
    mockUseAnimations.mockClear();
  });

  it("añade una clase wed-no-anim-<id> por cada animación efectiva", () => {
    mockUseAnimations.mockReturnValue({ effectiveDisabled: new Set(["confetti-fall", "fireflies"]) });
    render(<AnimationPrefsApplier />);
    const root = document.documentElement;
    expect(root.classList.contains("wed-no-anim-confetti-fall")).toBe(true);
    expect(root.classList.contains("wed-no-anim-fireflies")).toBe(true);
  });

  it("elimina clases que ya no aplican y conserva las vigentes", () => {
    // Estado previo: dos clases aplicadas; ahora solo queda vigente 'fireflies'.
    document.documentElement.classList.add("wed-no-anim-confetti-fall");
    document.documentElement.classList.add("wed-no-anim-fireflies");
    mockUseAnimations.mockReturnValue({ effectiveDisabled: new Set(["fireflies"]) });
    render(<AnimationPrefsApplier />);
    const root = document.documentElement;
    expect(root.classList.contains("wed-no-anim-confetti-fall")).toBe(false);
    expect(root.classList.contains("wed-no-anim-fireflies")).toBe(true);
  });

  it("es idempotente: re-render con el mismo set no duplica clases", () => {
    mockUseAnimations.mockReturnValue({ effectiveDisabled: new Set(["confetti-fall"]) });
    const { rerender } = render(<AnimationPrefsApplier />);
    rerender(<AnimationPrefsApplier />);
    const matches = Array.from(document.documentElement.classList).filter((c) => c === "wed-no-anim-confetti-fall");
    expect(matches).toHaveLength(1);
  });

  it("no toca clases sin el prefijo wed-no-anim-", () => {
    document.documentElement.classList.add("otra-clase");
    mockUseAnimations.mockReturnValue({ effectiveDisabled: new Set(["confetti-fall"]) });
    render(<AnimationPrefsApplier />);
    expect(document.documentElement.classList.contains("otra-clase")).toBe(true);
  });

  it("con el set vacío limpia todas sus clases anteriores", () => {
    document.documentElement.classList.add("wed-no-anim-confetti-fall");
    mockUseAnimations.mockReturnValue({ effectiveDisabled: new Set<string>() });
    render(<AnimationPrefsApplier />);
    const residual = Array.from(document.documentElement.classList).filter((c) => c.startsWith("wed-no-anim-"));
    expect(residual).toHaveLength(0);
  });
});
