/**
 * FormStore.test.tsx — Cobertura de la tienda de campos del Setup:
 * createFormStore (set/setAll/getField/suscritores/reset con Object.is) y
 * useFormField (re-render acotado a un campo vía useSyncExternalStore).
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { createFormStore, FormStoreContext, useFormField } from "../FormStore";

describe("createFormStore", () => {
  it("guarda y lee campos; set no notifica si el valor no cambió", () => {
    const store = createFormStore();
    const listener = vi.fn();
    store.subscribeAll(listener);

    store.set("theme", "golden");
    expect(store.getField("theme")).toBe("golden");
    expect(listener).toHaveBeenCalledTimes(1);

    // Object.is sobre strings: mismo valor → no notifica.
    store.set("theme", "golden");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifica solo a los suscriptores del campo que cambió", () => {
    const store = createFormStore();
    const themeCb = vi.fn();
    const nameCb = vi.fn();
    store.subscribeField("theme", themeCb);
    store.subscribeField("name", nameCb);

    store.set("theme", "forest");
    expect(themeCb).toHaveBeenCalledTimes(1);
    expect(nameCb).not.toHaveBeenCalled();
  });

  it("desuscribe y limpia los mapas vacíos", () => {
    const store = createFormStore();
    const cb = vi.fn();
    const unsub = store.subscribeField("theme", cb);
    unsub();
    store.set("theme", "x");
    expect(cb).not.toHaveBeenCalled();
  });

  it("setAll aplica los valores y reset los elimina notificando", () => {
    const store = createFormStore();
    const listener = vi.fn();
    store.subscribeAll(listener);
    store.setAll({ a: "1", b: "" });
    expect(store.getField("a")).toBe("1");
    expect(store.getField("b")).toBe("");
    listener.mockClear();
    store.reset();
    expect(store.getField("a")).toBe("");
    expect(listener).toHaveBeenCalled();
  });
});

describe("useFormField", () => {
  it("lee el campo del contexto y re-renderiza al cambiar SOLO ese campo", () => {
    const store = createFormStore({ theme: "golden", name: "Ana" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStoreContext.Provider value={store}>{children}</FormStoreContext.Provider>
    );

    const { result } = renderHook(() => useFormField("theme"), { wrapper });
    expect(result.current).toBe("golden");

    act(() => store.set("theme", "forest"));
    expect(result.current).toBe("forest");

    // Cambiar OTRO campo no afecta al valor observado.
    act(() => store.set("name", "Luis"));
    expect(result.current).toBe("forest");
  });
});
