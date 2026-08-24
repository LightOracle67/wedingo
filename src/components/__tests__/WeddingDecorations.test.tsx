/**
 * Tests de WeddingDecorations — Decoraciones laterales (eucalipto).
 *
 * Verifica: dos imágenes fijas (izquierda/derecha), decorativas
 * (aria-hidden + alt vacío), lazy y con dimensiones reservadas anti-CLS.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WeddingDecorations from "../WeddingDecorations";

describe("WeddingDecorations", () => {
  it("renderiza exactamente dos decoraciones laterales", () => {
    const { container } = render(<WeddingDecorations />);
    expect(container.querySelectorAll(".wedding-decoration")).toHaveLength(2);
    // Posicionamiento fijo sin capturar interacciones (pointer-events none).
    expect(container.querySelector(".wedding-decoration--left")).not.toBeNull();
    expect(container.querySelector(".wedding-decoration--right")).not.toBeNull();
  });

  it("las imágenes son puramente decorativas y no desplazan el layout", () => {
    const { container } = render(<WeddingDecorations />);
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      // Accesibilidad: alt vacío + aria-hidden (sin significado para AT).
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("aria-hidden", "true");
      // Rendimiento: carga diferida y dimensiones explícitas (CLS == 0).
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("width", "2000");
      expect(img).toHaveAttribute("height", "2000");
      expect(img.className).toContain("wedding-decoration__image");
    }
  });
});
