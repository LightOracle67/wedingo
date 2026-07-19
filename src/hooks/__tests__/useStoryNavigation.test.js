import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryNavigation } from "../useStoryNavigation";

const SAMPLE_ORDER = ["hero", "details", "info", "story", "gifts", "rsvp"];

describe("useStoryNavigation (simplified/stub)", () => {
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

  describe("getSectionStyle", () => {
    it("devuelve objeto vacío (sin estilos en línea)", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      expect(result.current.getSectionStyle("hero")).toEqual({});
      expect(result.current.getSectionStyle("details")).toEqual({});
      expect(result.current.getSectionStyle("unknown")).toEqual({});
    });
  });

  describe("getSectionClassName", () => {
    it("incluye story-section y story-section--{key}", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const cls = result.current.getSectionClassName("hero");
      expect(cls).toContain("story-section");
      expect(cls).toContain("story-section--hero");
    });

    it("no añade story-section--is-active (stub simplificado)", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const cls = result.current.getSectionClassName("hero");
      expect(cls).not.toContain("story-section--is-active");
    });

    it("maneja clave no presente", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      const cls = result.current.getSectionClassName("unknown");
      expect(cls).toContain("story-section--unknown");
    });
  });

  describe("startTransition", () => {
    it("es un no-op (stub simplificado)", () => {
      const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
      result.current.startTransition(1);
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.activeSection).toBe("hero");
    });
  });
});
