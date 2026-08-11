import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * FormStore — Tienda de selectores por campo para el Setup.
 *
 * El Setup guarda `formData` como UN solo objeto de estado; cada tecla recreaba
 * el objeto y re-renderizaba TODOS los consumidores de useConfig() (AppShell,
 * SetupPage, SetupForm, las 9 secciones y los ~19 toggles). Con esta tienda,
 * cada campo tiene su propio snapshot: `useFormField(field)` solo re-renderiza
 * el componente cuyo campo cambió (useSyncExternalStore + Object.is sobre un
 * primitivo string). `formData` se mantiene como fuente de verdad para el
 * guardado, y `setAll` sincroniza la tienda tras hydrate/reset/reload.
 *
 * Los campos son strings (types/index.ts), así que el snapshot por campo es un
 * primitivo → comparación barata y sin alocaciones por tecla.
 */

/** Suscriptores: listeners de campo (Map field → Set<cb>) + uno global. */
export interface FormStore {
  data: Record<string, string>;
  fieldListeners: Map<string, Set<() => void>>;
  allListeners: Set<() => void>;
  set: (field: string, value: string) => void;
  setAll: (data: Record<string, string>) => void;
  getField: (field: string) => string;
  subscribeField: (field: string, cb: () => void) => () => void;
  subscribeAll: (cb: () => void) => () => void;
  reset: () => void;
}

export function createFormStore(initial: Record<string, string> = {}): FormStore {
  const data: Record<string, string> = { ...initial };
  const fieldListeners = new Map<string, Set<() => void>>();
  const allListeners = new Set<() => void>();

  const notifyField = (field: string) => {
    const set = fieldListeners.get(field);
    if (set) for (const cb of set) cb();
  };
  const notifyAll = () => {
    for (const cb of allListeners) cb();
  };

  return {
    data,
    fieldListeners,
    allListeners,
    set: (field, value) => {
      // Object.is sobre strings: no notifica si el valor no cambió.
      if (data[field] === value) return;
      data[field] = value;
      notifyField(field);
      notifyAll();
    },
    setAll: (next) => {
      for (const key of Object.keys(next)) data[key] = next[key] ?? "";
      notifyAll();
    },
    getField: (field) => data[field] ?? "",
    subscribeField: (field, cb) => {
      let set = fieldListeners.get(field);
      if (!set) {
        set = new Set();
        fieldListeners.set(field, set);
      }
      set.add(cb);
      return () => {
        set!.delete(cb);
        if (set!.size === 0) fieldListeners.delete(field);
      };
    },
    subscribeAll: (cb) => {
      allListeners.add(cb);
      return () => allListeners.delete(cb);
    },
    reset: () => {
      for (const key of Object.keys(data)) delete data[key];
      notifyAll();
    },
  };
}

/** Contexto que provee la tienda del Setup (creada por ConfigProvider). */
export const FormStoreContext = createContext<FormStore | null>(null);

/** Devuelve la tienda del Setup (error si no hay provider). */
export function useFormStore(): FormStore {
  const ctx = useContext(FormStoreContext);
  if (!ctx) throw new Error("useFormStore debe usarse dentro de ConfigProvider");
  return ctx;
}

/**
 * useFormField — Lee UN campo del Setup con re-render acotado a este campo:
 * solo este componente se actualiza cuando cambia ese valor (no todo el árbol).
 * Devuelve el valor string actual del campo ("" si no está definido).
 */
export function useFormField(field: string): string {
  const store = useFormStore();
  const subscribe = useMemo(() => (cb: () => void) => store.subscribeField(field, cb), [store, field]);
  const getSnapshot = useMemo(() => () => store.getField(field), [store, field]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
