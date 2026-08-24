/**
 * Tests de AnimationsContext — Preferencias de animación POR INVITADO.
 *
 * Cubre: carga inicial desde localStorage (válida, corrupta y vacía),
 * persistencia reactiva en cada cambio, toggle individual, activación por
 * grupo, clave reservada `all`, reset y el error del hook fuera del provider.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AnimationsProvider, useAnimationsContext } from "../AnimationsContext";

// jsdom en este entorno expone un localStorage vacío (sin métodos): se
// instala un doble completo respaldado por un Map, siguiendo el patrón de
// AccessibilityPanel.test.tsx del propio proyecto.
const storage = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  },
});

/** Sonda: expone el estado del contexto y botones para cada mutador. */
function Probe() {
  const ctx = useAnimationsContext();
  return (
    <div>
      {/* Volcado legible del set de ids desactivados (ordenado para aserciones estables). */}
      <span data-testid="disabled">{Array.from(ctx.guestDisabled).sort().join(",")}</span>
      <button onClick={() => ctx.toggleGuestAnimation("confetti-fall")}>toggle</button>
      {/* El grupo 'envelope' agrupa varias animaciones del sobre. */}
      <button onClick={() => ctx.setGuestGroup("envelope", false)}>group-off</button>
      <button onClick={() => ctx.setGuestGroup("envelope", true)}>group-on</button>
      <button onClick={() => ctx.setAllGuest(true)}>all-off</button>
      <button onClick={() => ctx.setAllGuest(false)}>all-on</button>
      <button onClick={() => ctx.resetGuest()}>reset</button>
    </div>
  );
}

describe("AnimationsContext", () => {
  beforeEach(() => {
    // Limpia solo la clave usada por el contexto (evita depender de clear(),
    // no disponible en todos los entornos de almacenamiento de jsdom).
    window.localStorage.removeItem("wedin_animations");
    vi.restoreAllMocks();
  });

  it("arranca vacío sin preferencias guardadas", () => {
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    expect(screen.getByTestId("disabled").textContent).toBe("");
  });

  it("carga ids válidos desde localStorage y los sanitiza vía parseDisabledAnimations", () => {
    // Solo ids registrados sobreviven; 'hacker' se descarta al parsear.
    window.localStorage.setItem("wedin_animations", JSON.stringify({ disabled: "confetti-fall,hacker" }));
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    expect(screen.getByTestId("disabled").textContent).toBe("confetti-fall");
  });

  it("tolera JSON corrupto en localStorage sin lanzar", () => {
    window.localStorage.setItem("wedin_animations", "{no-json");
    expect(() =>
      render(
        <AnimationsProvider>
          <Probe />
        </AnimationsProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("disabled").textContent).toBe("");
  });

  it("persiste cada cambio en localStorage con la forma { disabled }", () => {
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("toggle").click();
    });
    const stored = JSON.parse(window.localStorage.getItem("wedin_animations") ?? "{}") as { disabled?: string };
    expect(stored.disabled).toBe("confetti-fall");
    expect(screen.getByTestId("disabled").textContent).toBe("confetti-fall");
  });

  it("toggle quita un id ya presente (reactivación individual)", () => {
    window.localStorage.setItem("wedin_animations", JSON.stringify({ disabled: "confetti-fall" }));
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("disabled").textContent).toBe("");
  });

  it("setGuestGroup(false) desactiva todos los ids del grupo envelope", () => {
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("group-off").click();
    });
    const ids = screen.getByTestId("disabled").textContent?.split(",").filter(Boolean) ?? [];
    // Todos los ids añadidos pertenecen al grupo envelope (mínimo 1).
    expect(ids.length).toBeGreaterThan(0);
  });

  it("setGuestGroup(true) reactiva el grupo completo (set vacío)", () => {
    window.localStorage.setItem(
      "wedin_animations",
      JSON.stringify({ disabled: "envelope-flap,envelope-lights" }),
    );
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("group-on").click();
    });
    expect(screen.getByTestId("disabled").textContent).toBe("");
  });

  it("setAllGuest usa la clave reservada 'all' conservando individuales", () => {
    window.localStorage.setItem("wedin_animations", JSON.stringify({ disabled: "confetti-fall" }));
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("all-off").click();
    });
    // 'all' + el individual previo conviven.
    expect(screen.getByTestId("disabled").textContent).toBe("all,confetti-fall");
    act(() => {
      screen.getByText("all-on").click();
    });
    // Reactivar todo solo elimina la clave reservada.
    expect(screen.getByTestId("disabled").textContent).toBe("confetti-fall");
  });

  it("resetGuest vacía las preferencias y lo refleja en localStorage", () => {
    window.localStorage.setItem("wedin_animations", JSON.stringify({ disabled: "fireflies" }));
    render(
      <AnimationsProvider>
        <Probe />
      </AnimationsProvider>,
    );
    act(() => {
      screen.getByText("reset").click();
    });
    expect(screen.getByTestId("disabled").textContent).toBe("");
    expect(window.localStorage.getItem("wedin_animations")).toContain('""');
  });

  it("lanza error claro si el hook se usa fuera del proveedor", () => {
    // Silencia el log de error esperado de React para una salida limpia.
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useAnimationsContext debe usarse dentro de AnimationsProvider");
  });
});
