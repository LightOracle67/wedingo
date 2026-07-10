/**
 * useStoryNavigation.test.js
 * ─────────────────────────────────────────────────────────────
 * Tests para el hook de navegación entre secciones de historia.
 * Cubre: estado inicial, transiciones, estilos, clases CSS,
 * navegación por teclado/rueda y casos límite.
 *
 * @module useStoryNavigation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoryNavigation } from "../useStoryNavigation";

/** Orden de secciones de ejemplo usado en todos los tests. */
const SAMPLE_ORDER = ["hero", "details", "info", "story", "gifts", "rsvp"];

describe("useStoryNavigation", () => {
  // ── Setup / teardown ──────────────────────────────────

  beforeEach(() => {
    vi.useFakeTimers();
    // Restaura el overflow del body antes de cada test
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.style.overflow = "";
  });

  // ═══════════════════════════════════════════════════════
  // ESTADO INICIAL
  // ═══════════════════════════════════════════════════════

  describe("estado inicial", () => {
    it("activa la primera sección del orden visible", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      expect(result.current.activeSection).toBe("hero");
    });

    it("usa 'hero' como fallback si el orden está vacío", () => {
      const { result } = renderHook(() => useStoryNavigation([]));
      expect(result.current.activeSection).toBe("hero");
    });

    it("no está en transición al inicio", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.transition.toIndex).toBeNull();
    });

    it("marca la transición con fromIndex 0 inicialmente", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      expect(result.current.transition.fromIndex).toBe(0);
      expect(result.current.transition.direction).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getSectionStyle — ESTILOS DE SECCIÓN
  // ═══════════════════════════════════════════════════════

  describe("getSectionStyle", () => {
    it("devuelve visibilidad completa para la sección activa", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const style = result.current.getSectionStyle("hero");
      expect(style.opacity).toBe(1);
      expect(style.transform).toBe("translateY(0) scale(1)");
      expect(style.pointerEvents).toBe("auto");
      expect(style.zIndex).toBe(2);
    });

    it("oculta secciones inactivas con desplazamiento hacia abajo", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const style = result.current.getSectionStyle("details");
      expect(style.opacity).toBe(0);
      expect(style.transform).toBe("translateY(36px) scale(0.985)");
      expect(style.pointerEvents).toBe("none");
      expect(style.zIndex).toBe(1);
    });

    it("devuelve estilo de salida durante la transición", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      const style = result.current.getSectionStyle("hero");
      expect(style.opacity).toBe(0);
      expect(style.transform).toBe("translateY(-32px) scale(0.985)");
      expect(style.pointerEvents).toBe("auto");
      expect(style.zIndex).toBe(3);
    });

    it("devuelve estilo de entrada durante la transición", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      const style = result.current.getSectionStyle("details");
      expect(style.opacity).toBe(1);
      expect(style.transform).toBe("translateY(0) scale(1)");
      expect(style.pointerEvents).toBe("auto");
      expect(style.zIndex).toBe(4);
    });

    it("invierte la dirección al navegar hacia arriba", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      vi.advanceTimersByTime(650);
      act(() => { result.current.startTransition(-1); });
      const style = result.current.getSectionStyle("details");
      expect(style.opacity).toBe(0);
      expect(style.transform).toBe("translateY(32px) scale(0.985)");
    });

    it("devuelve estilo oculto para secciones no involucradas en la transición", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      const style = result.current.getSectionStyle("info");
      expect(style.opacity).toBe(0);
      expect(style.transform).toBe("translateY(44px) scale(0.97)");
      expect(style.pointerEvents).toBe("none");
      expect(style.zIndex).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════
  // getSectionClassName — CLASES CSS
  // ═══════════════════════════════════════════════════════

  describe("getSectionClassName", () => {
    it("incluye story-section y story-section--{key} para todas las secciones", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const cls = result.current.getSectionClassName("hero");
      expect(cls).toContain("story-section");
      expect(cls).toContain("story-section--hero");
    });

    it("añade story-section--is-active solo a la sección activa", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const activeCls = result.current.getSectionClassName("hero");
      const inactiveCls = result.current.getSectionClassName("details");
      expect(activeCls).toContain("story-section--is-active");
      expect(inactiveCls).not.toContain("story-section--is-active");
    });

    it("marca ambas secciones como activas durante la transición", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      expect(result.current.getSectionClassName("hero")).toContain("story-section--is-active");
      expect(result.current.getSectionClassName("details")).toContain("story-section--is-active");
      expect(result.current.getSectionClassName("info")).not.toContain("story-section--is-active");
    });
  });

  // ═══════════════════════════════════════════════════════
  // startTransition — NAVEGACIÓN
  // ═══════════════════════════════════════════════════════

  describe("startTransition", () => {
    it("inicia una transición hacia la siguiente sección", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      expect(result.current.isTransitioning).toBe(true);
      expect(result.current.transition.fromIndex).toBe(0);
      expect(result.current.transition.toIndex).toBe(1);
      expect(result.current.transition.direction).toBe(1);
    });

    it("completa la transición tras 650ms y actualiza la sección activa", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      act(() => {
        vi.advanceTimersByTime(650);
      });
      expect(result.current.activeSection).toBe("details");
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.transition.toIndex).toBeNull();
    });

    it("ignora una nueva transición si ya hay una en curso", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(1);
      });
      act(() => {
        result.current.startTransition(1);
      });
      expect(result.current.transition.toIndex).toBe(1);
    });

    it("permite nueva transición tras completar la anterior", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      act(() => { result.current.startTransition(1); });
      expect(result.current.transition.toIndex).toBe(2);
    });

    it("no navega más allá del final de la lista", () => {
      const { result } = renderHook(() => useStoryNavigation(["only"]));
      act(() => {
        result.current.startTransition(1);
      });
      expect(result.current.isTransitioning).toBe(false);
    });

    it("no navega más allá del principio de la lista", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        result.current.startTransition(-1);
      });
      expect(result.current.isTransitioning).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // CAMBIOS EN visibleOrder
  // ═══════════════════════════════════════════════════════

  describe("cambios en visibleOrder", () => {
    it("resetea a la primera sección si la activa deja de ser visible", () => {
      const { result, rerender } = renderHook(
        ({ order }) => useStoryNavigation(order),
        { initialProps: { order: SAMPLE_ORDER } },
      );
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      expect(result.current.activeSection).toBe("details");
      rerender({ order: ["hero", "info", "story"] });
      expect(result.current.activeSection).toBe("hero");
    });

    it("no lanza error con visibleOrder vacío", () => {
      const { result } = renderHook(() => useStoryNavigation([]));
      expect(result.current.activeSection).toBe("hero");
      expect(() => result.current.getSectionStyle("anything")).not.toThrow();
      expect(() => result.current.getSectionClassName("anything")).not.toThrow();
      expect(() => result.current.startTransition(1)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════
  // EVENT LISTENERS — WHEEL / KEYBOARD
  // ═══════════════════════════════════════════════════════

  describe("event listeners", () => {
    it("establece overflow hidden en el body al montar", () => {
      renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restaura overflow al desmontar", () => {
      const { unmount } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      unmount();
      expect(document.body.style.overflow).toBe("");
    });

    it("navega hacia abajo con rueda del ratón (deltaY positivo)", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(1);
      act(() => { vi.advanceTimersByTime(650); });
    });

    it("navega hacia arriba con rueda del ratón (deltaY negativo)", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      act(() => {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(0);
    });

    it("no navega con wheel si deltaY es 0", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: 0, bubbles: true }));
      });
      expect(result.current.isTransitioning).toBe(false);
    });

    it("navega hacia abajo con ArrowDown", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(1);
      act(() => { vi.advanceTimersByTime(650); });
    });

    it("navega hacia arriba con ArrowUp", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(0);
    });

    it("navega hacia abajo con espacio", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(1);
    });

    it("navega hacia abajo con PageDown", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(1);
    });

    it("navega hacia arriba con PageUp", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
      });
      expect(result.current.transition.toIndex).toBe(0);
    });

    it("no navega con teclado si el foco está en un input", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      });
      expect(result.current.isTransitioning).toBe(false);
      document.body.removeChild(input);
    });

    it("no navega con wheel si el evento se origina en un textarea", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => {
        textarea.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true }));
      });
      expect(result.current.isTransitioning).toBe(false);
      document.body.removeChild(textarea);
    });
  });

  // ═══════════════════════════════════════════════════════
  // NAVEGACIÓN TÁCTIL (vía startTransition directo)
  // ═══════════════════════════════════════════════════════

  describe("navegación táctil (vía startTransition)", () => {
    it("startTransition con dirección positiva navega hacia abajo", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      expect(result.current.activeSection).toBe("details");
    });

    it("startTransition con dirección negativa navega hacia arriba", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(1); });
      act(() => { vi.advanceTimersByTime(650); });
      act(() => { result.current.startTransition(-1); });
      act(() => { vi.advanceTimersByTime(650); });
      expect(result.current.activeSection).toBe("hero");
    });

    it("no navega si ya está en la primera sección con dirección -1", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      act(() => { result.current.startTransition(-1); });
      expect(result.current.isTransitioning).toBe(false);
    });

    it("no navega si ya está en la última sección con dirección +1", () => {
      const { result } = renderHook(() => useStoryNavigation(["only"]));
      act(() => { result.current.startTransition(1); });
      expect(result.current.isTransitioning).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // CASOS LÍMITE
  // ═══════════════════════════════════════════════════════

  describe("casos límite", () => {
    it("maneja visibleOrder con una sola sección", () => {
      const { result } = renderHook(() => useStoryNavigation(["hero"]));
      expect(result.current.activeSection).toBe("hero");
      act(() => { result.current.startTransition(1); });
      expect(result.current.isTransitioning).toBe(false);
    });

    it("getSectionStyle maneja clave no presente en el orden", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const style = result.current.getSectionStyle("unknown");
      expect(style.opacity).toBe(0);
      expect(style.pointerEvents).toBe("none");
    });

    it("getSectionClassName maneja clave no presente", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const cls = result.current.getSectionClassName("unknown");
      expect(cls).toContain("story-section");
      expect(cls).toContain("story-section--unknown");
      expect(cls).not.toContain("story-section--is-active");
    });

    it("navegación completa por todas las secciones sin errores", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      for (let i = 0; i < SAMPLE_ORDER.length - 1; i++) {
        act(() => { result.current.startTransition(1); });
        act(() => { vi.advanceTimersByTime(650); });
      }
      expect(result.current.activeSection).toBe("rsvp");
      act(() => { result.current.startTransition(1); });
      expect(result.current.isTransitioning).toBe(false);
      for (let i = 0; i < SAMPLE_ORDER.length - 1; i++) {
        act(() => { result.current.startTransition(-1); });
        act(() => { vi.advanceTimersByTime(650); });
      }
      expect(result.current.activeSection).toBe("hero");
    });
  });
});
