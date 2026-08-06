import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoryNavigation } from "../useStoryNavigation";

const SAMPLE_ORDER = ["hero", "details", "info", "story", "gifts", "rsvp"];

describe("useStoryNavigation", () => {
  it("returns expected object shape", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current).toHaveProperty("activeSection");
    expect(result.current).toHaveProperty("transition");
    expect(result.current).toHaveProperty("isTransitioning");
    expect(result.current).toHaveProperty("getSectionStyle");
    expect(result.current).toHaveProperty("getSectionClassName");
    expect(result.current).toHaveProperty("startTransition");
  });

  it("sets activeSection to the first item in visibleOrder", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.activeSection).toBe("hero");
  });

  it("falls back to 'hero' when visibleOrder is empty", () => {
    const { result } = renderHook(() => useStoryNavigation([]));
    expect(result.current.activeSection).toBe("hero");
  });

  it("handles a single section", () => {
    const { result } = renderHook(() => useStoryNavigation(["rsvp"]));
    expect(result.current.activeSection).toBe("rsvp");
    expect(result.current.getSectionClassName("rsvp")).toContain("story-section--rsvp");
  });

  it("is not transitioning initially", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.transition.toIndex).toBeNull();
    expect(result.current.transition.fromIndex).toBe(0);
    expect(result.current.transition.direction).toBe(1);
  });

  it("getSectionStyle returns empty object for any key", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.getSectionStyle("hero")).toEqual({});
    expect(result.current.getSectionStyle("details")).toEqual({});
    expect(result.current.getSectionStyle("unknown")).toEqual({});
    expect(result.current.getSectionStyle()).toEqual({});
  });

  it("getSectionClassName returns story-section and story-section--{key}", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    const cls = result.current.getSectionClassName("hero");
    expect(cls).toContain("story-section");
    expect(cls).toContain("story-section--hero");
  });

  it("getSectionClassName handles empty key gracefully", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    const cls = result.current.getSectionClassName("");
    expect(cls).toContain("story-section");
    expect(cls).toContain("story-section--");
  });

  it("startTransition is a no-op", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    result.current.startTransition(1);
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.activeSection).toBe("hero");
  });

  it("startTransition ignores undefined index", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    result.current.startTransition();
    expect(result.current.isTransitioning).toBe(false);
  });

  it("marks the active section with --is-active via IntersectionObserver", async () => {
    // Simula un IntersectionObserver que reporta la sección "details" visible.
    let observerCallback: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "details");
    document.body.appendChild(el);

    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    await vi.waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });
    // Dispara el callback con "details" visible.
    act(() => {
      observerCallback!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(result.current.activeSection).toBe("details");
    expect(result.current.getSectionClassName("details")).toContain("story-section--is-active");
    el.remove();
  });

  it("does nothing when IntersectionObserver is unavailable", () => {
    // Sin IO (SSR/agentes antiguos) el hook no crashea y no observa nada.
    const original = (globalThis as Record<string, unknown>).IntersectionObserver;
    Object.defineProperty(globalThis, "IntersectionObserver", { value: undefined, configurable: true });
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.activeSection).toBe(SAMPLE_ORDER[0]);
    if (original !== undefined) {
      Object.defineProperty(globalThis, "IntersectionObserver", { value: original, configurable: true });
    }
  });

  it("does nothing when there are no story sections in the DOM", () => {
    class FakeIO {
      constructor() {}
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    // Sin elementos [data-story-section] el hook no crashea; el MutationObserver
    // sigue activo para observar las secciones lazy que monten después.
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.activeSection).toBe(SAMPLE_ORDER[0]);
    expect(() => renderHook(() => useStoryNavigation(SAMPLE_ORDER))).not.toThrow();
  });

  it("boot does not animate the section visible on first paint (anti-parpadeo)", async () => {
    // Primer arranque: la sección ya visible se marca "active" SIN la clase
    // de entrada, para que recargar o restaurar el scroll no parpadee.
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "details");
    document.body.appendChild(el);

    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    await vi.waitFor(() => { expect(cb).not.toBeNull(); });
    act(() => { cb!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("details")).toContain("story-section--is-active");
    expect(result.current.getSectionClassName("details")).not.toContain("story-section--is-enter");
    el.remove();
  });

  it("animates the entry when a section becomes visible by scroll", async () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "gifts");
    document.body.appendChild(el);

    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    await vi.waitFor(() => { expect(cb).not.toBeNull(); });
    // Primer callback (boot): no visible → hidden.
    act(() => { cb!([{ isIntersecting: false, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    // Segundo callback (scroll): visible → entering.
    act(() => { cb!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("gifts")).toContain("story-section--is-enter");
    // Al terminar la entrada (900ms) pasa a active.
    await act(async () => { await new Promise((r) => setTimeout(r, 1500)); });
    expect(result.current.getSectionClassName("gifts")).toContain("story-section--is-active");
    expect(result.current.getSectionClassName("gifts")).not.toContain("story-section--is-enter");
    el.remove();
  });

  it("animates the exit when a section leaves the viewport", async () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "info");
    document.body.appendChild(el);

    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    await vi.waitFor(() => { expect(cb).not.toBeNull(); });
    // Boot: visible → active.
    act(() => { cb!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("info")).toContain("story-section--is-active");
    // Sale del viewport → leaving.
    act(() => { cb!([{ isIntersecting: false, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("info")).toContain("story-section--is-leave");
    // Tras la salida (560ms) vuelve a hidden.
    await act(async () => { await new Promise((r) => setTimeout(r, 800)); });
    expect(result.current.getSectionClassName("info")).not.toContain("story-section--is-leave");
    el.remove();
  });

  it("skips intermediate stages with reduced motion", async () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "hero");
    document.body.appendChild(el);

    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER, { reducedMotion: true }));
    await vi.waitFor(() => { expect(cb).not.toBeNull(); });
    act(() => { cb!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-active");
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-enter");
    act(() => { cb!([{ isIntersecting: false, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-leave");
    el.remove();
  });

  it("does not observe while disabled (envelope closed) and reveals on enable", async () => {
    // Con enabled=false no se crea el observer: el contenido queda quieto
    // detrás del sobre. Al habilitarse (sobre abierto) la sección visible
    // hace su ENTRADA animada (modo reveal), no un boot estático.
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "hero");
    document.body.appendChild(el);

    const { result, rerender } = renderHook(
      ({ enabled }) => useStoryNavigation(SAMPLE_ORDER, { enabled }),
      { initialProps: { enabled: false } },
    );
    // Con el sobre cerrado (enabled=false) no hay observer ni animaciones.
    expect(cb).toBeNull();
    rerender({ enabled: true });
    // El hook recrea el observer; el primer callback usa el modo reveal.
    await vi.waitFor(() => { expect(cb).not.toBeNull(); });
    await act(async () => {
      cb!([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
    el.remove();
  });

  it("observes lazy sections added to the DOM after mount", async () => {
    // El MutationObserver re-observa las secciones que montan después (lazy).
    const observed: Element[] = [];
    class FakeIO {
      constructor(cb: IntersectionObserverCallback) {
        // Se guarda el callback para dispararlo manualmente.
        (FakeIO as unknown as { cb: IntersectionObserverCallback }).cb = cb;
      }
      observe(el: Element) { observed.push(el); }
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    // Se añade una sección tras el montaje (simula el Suspense lazy).
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "gallery");
    document.body.appendChild(el);
    await vi.waitFor(() => {
      expect(observed.some((o) => o === el)).toBe(true);
    });
    el.remove();
  });

  it("still observes initial sections when MutationObserver is unavailable", () => {
    const originalMO = (globalThis as Record<string, unknown>).MutationObserver;
    Object.defineProperty(globalThis, "MutationObserver", { value: undefined, configurable: true });
    const observed: Element[] = [];
    class FakeIO {
      observe(el: Element) { observed.push(el); }
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", { value: FakeIO, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-story-section", "hero");
    document.body.appendChild(el);

    renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(observed.some((o) => o === el)).toBe(true);
    el.remove();
    if (originalMO !== undefined) {
      Object.defineProperty(globalThis, "MutationObserver", { value: originalMO, configurable: true });
    }
  });
});
