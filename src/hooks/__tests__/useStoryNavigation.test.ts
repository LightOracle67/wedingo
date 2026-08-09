import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoryNavigation } from "../useStoryNavigation";

const SAMPLE_ORDER = ["hero", "details", "info", "story", "gifts", "rsvp"];
const VH = 800;

function defineViewport(h = VH) {
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
}

// Crea el DOM: `.app-scene` + secciones con rects mutables (simulan el scroll).
function setupScene(order: string[], initial: Record<string, number> = {}) {
  const scene = document.createElement("div");
  scene.className = "app-scene";
  document.body.appendChild(scene);
  const els: Record<string, HTMLElement> = {};
  const rects: Record<string, { top: number; height: number }> = {};
  for (const key of order) {
    const el = document.createElement("section");
    el.setAttribute("data-story-section", key);
    const wrap = document.createElement("div");
    wrap.className = "story-card-wrap";
    el.appendChild(wrap);
    rects[key] = { top: initial[key] ?? order.indexOf(key) * VH, height: VH };
    el.getBoundingClientRect = () =>
      ({ top: rects[key]!.top, height: rects[key]!.height, bottom: rects[key]!.top + rects[key]!.height } as DOMRect);
    scene.appendChild(el);
    els[key] = el;
  }
  // Simula scroll: actualiza scrollTop y dispara el listener (rAF síncrono).
  const scrollTo = (top: number) => {
    scene.scrollTop = top;
    act(() => {
      scene.dispatchEvent(new Event("scroll"));
    });
  };
  return { scene, els, rects, scrollTo };
}

describe("useStoryNavigation", () => {
  beforeEach(() => {
    defineViewport();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    // El stub devuelve 0: tras cada onScroll, `raf` vuelve a 0 y el siguiente
    // evento de scroll vuelve a recalcular el progreso.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("returns expected object shape", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current).toHaveProperty("getSectionStyle");
    expect(result.current).toHaveProperty("getSectionClassName");
  });

  it("handles a single section", () => {
    const { result } = renderHook(() => useStoryNavigation(["rsvp"]));
    expect(result.current.getSectionClassName("rsvp")).toContain("story-section--rsvp");
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

  it("marks centered and active the section at the exact center (reveal)", () => {
    // El hero ocupa el viewport completo y está centrado desde el inicio.
    setupScene(SAMPLE_ORDER);
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-active");
  });

  it("fades a section proportionally to its distance from the center", () => {
    const { els, rects, scrollTo } = setupScene(["hero"]);
    const { result } = renderHook(() => useStoryNavigation(["hero"]));
    const wrap = els["hero"]!.querySelector<HTMLElement>(".story-card-wrap")!;
    // Centrada → opacidad 1.
    expect(parseFloat(wrap.style.opacity)).toBe(1);
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
    // A media pantalla del centro (dist = VH/2) → 50% de opacidad.
    rects["hero"]!.top = VH / 2;
    scrollTo(0);
    expect(parseFloat(wrap.style.opacity)).toBeCloseTo(0.5, 1);
    // A una pantalla del centro → invisible y no enfocable (visibility hidden).
    rects["hero"]!.top = VH;
    scrollTo(0);
    expect(parseFloat(wrap.style.opacity)).toBe(0);
    expect(els["hero"]!.style.visibility).toBe("hidden");
  });

  it("runs the element stagger ONCE when crossing the exact center", () => {
    const { els, rects, scrollTo } = setupScene(["hero", "details"]);
    const { result } = renderHook(() => useStoryNavigation(["hero", "details"]));
    // "details" fuera (una pantalla abajo) → no centrada.
    rects["details"]!.top = VH;
    scrollTo(0);
    expect(result.current.getSectionClassName("details")).not.toContain("story-section--is-enter");
    // Cruza el centro (de abajo hacia arriba) → stagger.
    rects["details"]!.top = 0;
    scrollTo(0);
    expect(result.current.getSectionClassName("details")).toContain("story-section--is-enter");
    // Oscilación: se va por encima del centro y vuelve → NO se re-ejecuta.
    rects["details"]!.top = -VH;
    scrollTo(0);
    rects["details"]!.top = 0;
    scrollTo(0);
    expect(result.current.getSectionClassName("details")).toContain("story-section--is-enter");
    expect(els["details"]!).toBeDefined();
  });

  it("reveal mode enters the first section (is-enter + is-reveal) when enabled", async () => {
    setupScene(SAMPLE_ORDER);
    const { result, rerender } = renderHook(({ enabled }) => useStoryNavigation(SAMPLE_ORDER, { enabled }), {
      initialProps: { enabled: false },
    });
    // Con el sobre cerrado no hay animación de entrada.
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-enter");
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-reveal");
    rerender({ enabled: true });
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-reveal");
    // La entrada 3D es transitoria: se quita tras REVEAL_MS (1500ms).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1550));
    });
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-reveal");
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
  });

  it("reduced motion shows everything centered without reveal", () => {
    const { els } = setupScene(SAMPLE_ORDER);
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER, { reducedMotion: true }));
    const wrap = els["hero"]!.querySelector<HTMLElement>(".story-card-wrap")!;
    expect(wrap.style.opacity).toBe("1");
    expect(wrap.style.transform).toBe("none");
    expect(result.current.getSectionClassName("hero")).toContain("story-section--is-enter");
    expect(result.current.getSectionClassName("hero")).not.toContain("story-section--is-reveal");
  });

  it("does nothing when there are no story sections in the DOM", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.getSectionClassName(SAMPLE_ORDER[0]!)).toContain("story-section--is-active");
    expect(() => renderHook(() => useStoryNavigation(SAMPLE_ORDER))).not.toThrow();
  });

  it("caches lazy sections added to the DOM after mount", async () => {
    const { scene, els, rects, scrollTo } = setupScene(["hero"]);
    const { result } = renderHook(() => useStoryNavigation(["hero", "gallery"]));
    // Se añade la sección lazy "gallery" tras el montaje.
    const g = document.createElement("section");
    g.setAttribute("data-story-section", "gallery");
    const wrap = document.createElement("div");
    wrap.className = "story-card-wrap";
    g.appendChild(wrap);
    rects["gallery"]! = { top: VH, height: VH };
    const galleryRect = rects["gallery"]!;
    g.getBoundingClientRect = () =>
      ({ top: galleryRect.top, height: galleryRect.height, bottom: galleryRect.top + galleryRect.height } as DOMRect);
    scene.appendChild(g);
    els["gallery"]! = g;
    // Espera a que el MutationObserver la cachee, luego un scroll la evalúa.
    await new Promise((r) => setTimeout(r, 0));
    scrollTo(0);
    expect(els["gallery"]!.style.visibility).toBe("hidden");
    expect(result.current.getSectionClassName("gallery")).toContain("story-section");
  });

  it("deja el scroll libre (no intercepta rueda ni teclado)", () => {
    setupScene(SAMPLE_ORDER);
    renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    act(() => {
      const e = new WheelEvent("wheel", { deltaY: 120, cancelable: true });
      Object.defineProperty(e, "preventDefault", { value: vi.fn(), configurable: true });
      window.dispatchEvent(e);
    });
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", cancelable: true }));
    });
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("encaja suavemente al centro la sección cercana tras el silencio de scroll", () => {
    vi.useFakeTimers();
    const { scene, rects } = setupScene(["hero", "details"]);
    renderHook(() => useStoryNavigation(["hero", "details"]));
    // El hero queda 80px por debajo del centro (centro en 480, viewport en 400):
    // dentro del radio de encaje (0.4 * 800 = 320).
    rects["hero"]!.top = 80;
    act(() => {
      scene.dispatchEvent(new Event("scroll"));
    });
    // Tras el debounce (350ms) se llama a scrollTo para centrar el hero.
    vi.advanceTimersByTime(400);
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ top: 80, behavior: "smooth" });
  });

  it("no encaja si la sección más cercana está fuera del radio", () => {
    vi.useFakeTimers();
    const { scene, rects } = setupScene(["hero", "details"]);
    renderHook(() => useStoryNavigation(["hero", "details"]));
    // El hero está a 500px del centro: fuera del radio de encaje (320px).
    rects["hero"]!.top = 500;
    act(() => {
      scene.dispatchEvent(new Event("scroll"));
    });
    vi.advanceTimersByTime(400);
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it("no encaja si el scroll sigue activo (el debounce se reprograma)", () => {
    vi.useFakeTimers();
    const { scene, rects } = setupScene(["hero", "details"]);
    renderHook(() => useStoryNavigation(["hero", "details"]));
    rects["hero"]!.top = 80;
    act(() => {
      scene.dispatchEvent(new Event("scroll"));
    });
    // Un nuevo scroll antes del debounce reinicia el temporizador.
    act(() => {
      scene.dispatchEvent(new Event("scroll"));
    });
    vi.advanceTimersByTime(400);
    // Aunque hayan pasado 400ms, el segundo evento se produjo 0ms después del
    // primero: el debounce se reprogramó y solo han pasado 400ms desde entonces.
    expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(1);
  });
});
