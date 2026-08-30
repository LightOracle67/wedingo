/**
 * useAppUI.test.tsx — Contextos de UI separados (v2.191): useAppUI (modales/
 * mapa) y useUIMessages (mensajes frecuentes). Verifica el error sin provider
 * de ambos, los valores con provider y el reseteo de mensajes al cambiar de
 * ruta en el UIProvider real.
 */
import { describe, it, expect } from "vitest";
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { useAppUI, useUIMessages, UIContext, UIMessagesContext, type UIValue, type UIMessagesValue } from "../useAppUI";
import { UIProvider } from "../UIContext";

describe("useAppUI", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useAppUI())).toThrow("useAppUI debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UIContext.Provider value={{ test: true } as unknown as UIValue}>{children}</UIContext.Provider>
    );
    const { result } = renderHook(() => useAppUI(), { wrapper });
    expect(result.current).toEqual({ test: true });
  });
});

describe("useUIMessages", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useUIMessages())).toThrow("useUIMessages debe usarse dentro de AppProvider");
  });

  it("returns messages value when provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UIMessagesContext.Provider value={{ saveMessage: "x" } as unknown as UIMessagesValue}>
        {children}
      </UIMessagesContext.Provider>
    );
    const { result } = renderHook(() => useUIMessages(), { wrapper });
    expect(result.current).toEqual({ saveMessage: "x" });
  });
});

describe("UIProvider (real)", () => {
  it("resetea saveMessage al cambiar de ruta (navegación interna)", () => {
    function PathProbe() {
      const ui = useUIMessages();
      const navigate = useNavigate();
      return (
        <div>
          <button onClick={() => ui.setSaveMessage("saved")}>set</button>
          <span data-testid="msg">{ui.saveMessage}</span>
          <button onClick={() => navigate("/b")}>go</button>
        </div>
      );
    }
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <UIProvider>
          <PathProbe />
        </UIProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("set"));
    expect(screen.getByTestId("msg").textContent).toBe("saved");
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByTestId("msg").textContent).toBe("");
  });

  it("mantiene los modales (useAppUI) fuera del value de mensajes y viceversa", () => {
    const { result } = renderHook(
      () => ({ app: useAppUI(), msgs: useUIMessages() }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={["/"]}>
            <UIProvider>{children}</UIProvider>
          </MemoryRouter>
        ),
      },
    );
    expect(result.current.app).not.toHaveProperty("saveMessage");
    expect(result.current.msgs).not.toHaveProperty("legalModal");
    expect(result.current.msgs.saveMessage).toBe("");
    expect(result.current.app.legalModal).toBe("");
  });
});
