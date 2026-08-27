import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Modal from "../Modal";

describe("Modal (a11y)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renderiza un diálogo accesible con aria-modal y el título", () => {
    render(
      <Modal title="Mi diálogo" onClose={() => {}} closeLabel="Cerrar">
        <p>contenido</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Mi diálogo" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("contenido")).toBeTruthy();
  });

  it("el botón de cierre llama a onClose tras la animación", () => {
    const onClose = vi.fn();
    render(
      <Modal title="T" onClose={onClose} closeLabel="Cerrar">
        x
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    // La animación de salida dura 200ms antes de llamar a onClose.
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra el modal", () => {
    const onClose = vi.fn();
    render(
      <Modal title="T" onClose={onClose} closeLabel="Cerrar">
        x
      </Modal>,
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    act(() => vi.advanceTimersByTime(200));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focaliza el primer elemento enfocable al abrir (focus trap)", () => {
    render(
      <Modal title="T" onClose={() => {}} closeLabel="Cerrar">
        <button>OK</button>
      </Modal>,
    );
    // El botón de cierre es el primer elemento enfocable del panel.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" }));
  });

  it("expone el cuerpo como región scrolleable enfocable por teclado", () => {
    render(
      <Modal title="Región" onClose={() => {}} closeLabel="Cerrar">
        <p>contenido largo</p>
      </Modal>,
    );
    // La región envuelve el contenido (WCAG 2.1.1: scroll operativo por teclado).
    const region = screen.getByRole("region", { name: "Región" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByText("contenido largo"));
    // El botón de cierre queda fuera de la región scrolleable (no se desplaza).
    expect(region).not.toContainElement(screen.getByRole("button", { name: "Cerrar" }));
  });

  it("envuelve los hijos en la región scrolleable (los modales derivados no la duplican)", () => {
    render(
      <Modal title="Anidado" onClose={() => {}} closeLabel="Cerrar">
        <div className="cookie-consent-body">
          <p>hijo</p>
        </div>
      </Modal>,
    );
    const region = screen.getByRole("region", { name: "Anidado" });
    expect(region).toContainElement(screen.getByText("hijo"));
  });
});
