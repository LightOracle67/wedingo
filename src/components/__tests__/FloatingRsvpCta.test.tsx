/**
 * Tests del botón flotante de RSVP: visibilidad según IntersectionObserver,
 * ocultamiento por prop y navegación suave al ancla al pulsarlo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FloatingRsvpCta from "../FloatingRsvpCta";

// i18n crudo: el mock devuelve la clave tal cual (convención del proyecto).
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// Captura global del último callback entregado por IntersectionObserver para
// poder simular cambios de visibilidad desde cada test.
let fireIntersect: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
let scrollSpy: ReturnType<typeof vi.fn>;

describe("FloatingRsvpCta", () => {
  beforeEach(() => {
    // Ancla que el componente observa.
    document.body.innerHTML = '<section id="rsvp"></section>';
    // jsdom no implementa IntersectionObserver: stub mínimo con callback capturado.
    class FakeObserver {
      constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
        fireIntersect = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    // jsdom no implementa scrollIntoView: sustitución directa con espía propio.
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Devuelve prototype a su estado sin implementación (como lo dejó jsdom).
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    document.body.innerHTML = "";
    fireIntersect = null;
  });

  it("no aparece hasta que el observer confirma que la sección está fuera de vista", () => {
    render(<FloatingRsvpCta />);
    expect(screen.queryByText("rsvp.floatingCta")).toBeNull();
    // Sección visible → sigue oculto.
    act(() => fireIntersect?.([{ isIntersecting: true }]));
    expect(screen.queryByText("rsvp.floatingCta")).toBeNull();
    // Sección fuera de pantalla → aparece (act para vaciar el setState).
    act(() => fireIntersect?.([{ isIntersecting: false }]));
    expect(screen.getByText("rsvp.floatingCta")).toBeTruthy();
  });

  it("al pulsarlo hace scrollIntoView suave hacia la sección objetivo", () => {
    render(<FloatingRsvpCta />);
    act(() => fireIntersect?.([{ isIntersecting: false }]));
    fireEvent.click(screen.getByText("rsvp.floatingCta"));
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("la prop hidden lo mantiene oculto aunque la sección no esté en vista", () => {
    render(<FloatingRsvpCta hidden />);
    act(() => fireIntersect?.([{ isIntersecting: false }]));
    expect(screen.queryByText("rsvp.floatingCta")).toBeNull();
  });

  it("respeta prefers-reduced-motion con salto instantáneo", () => {
    // Stub de matchMedia: jsdom no lo implementa; matches=true pide menos animación.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    try {
      render(<FloatingRsvpCta />);
      act(() => fireIntersect?.([{ isIntersecting: false }]));
      fireEvent.click(screen.getByText("rsvp.floatingCta"));
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto" });
    } finally {
      // @ts-expect-error limpieza deliberada del stub en jsdom
      delete window.matchMedia;
    }
  });
});
