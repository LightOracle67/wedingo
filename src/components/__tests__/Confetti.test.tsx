/**
 * Tests de Confetti — Lluvia de confeti decorativa (48 piezas CSS puras).
 *
 * Verifica: número de piezas, aria-hidden, distribución determinista
 * (left/delay/duración/color/tamaño) y la constante exportada CONF_TOTAL_MS.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Confetti, { CONF_TOTAL_MS } from "../Confetti";

describe("Confetti", () => {
  it("exporta CONF_TOTAL_MS = caída 2200ms + margen 900ms", () => {
    expect(CONF_TOTAL_MS).toBe(3100);
  });

  it("renderiza exactamente 48 piezas dentro de un contenedor decorativo", () => {
    const { container } = render(<Confetti />);
    const wrapper = container.querySelector(".confetti");
    expect(wrapper).not.toBeNull();
    // El confeti es puramente decorativo: oculto a lectores de pantalla.
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".confetti__piece")).toHaveLength(48);
  });

  it("distribuye las piezas de forma determinista sin aleatoriedad", () => {
    const { container } = render(<Confetti />);
    const pieces = Array.from(container.querySelectorAll<HTMLElement>(".confetti__piece"));
    // Primera pieza: left 0%, delay 0s.
    expect(pieces[0]?.style.left).toBe("0%");
    expect(pieces[0]?.style.animationDelay).toBe("0s");
    // La duración de caída es uniforme para las 48.
    for (const p of pieces) expect(p.style.animationDuration).toBe("2200ms");
    // Los colores rotan sobre una paleta fija de 5 tonos (jsdom normaliza
    // el hex a rgb()).
    expect(pieces[0]?.style.background).toBe("rgb(216, 178, 74)");
    expect(pieces[5]?.style.background).toBe("rgb(216, 178, 74)");
    expect(pieces[1]?.style.background).toBe("rgb(232, 208, 216)");
    // El tamaño cicla en 3 variantes (7/10/13px).
    expect(pieces[0]?.style.width).toBe("7px");
    expect(pieces[1]?.style.width).toBe("10px");
    expect(pieces[2]?.style.width).toBe("13px");
  });
});
