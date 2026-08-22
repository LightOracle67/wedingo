import { useCallback, useMemo } from "react";

/**
 * useJsonArrayField — Encapsula el patrón de los editores de arrays JSON
 * (platos de menú, eventos de agenda, salidas de transporte, listas de
 * regalos/trivia): parseo tolerante del JSON, normalización de cada elemento,
 * y operaciones add/remove/update con límite de longitud y serialización.
 *
 * Elimina la lógica duplicada que antes vivía en MenuDishEditor,
 * DateSectionForm (agenda), TransportSectionForm (salidas) y
 * ExtrasSectionForm (giftList/trivia).
 *
 * @param raw  Valor crudo del campo (string JSON o "").
 * @param normalize  Función que normaliza un elemento crudo (recibe un item
 *                   desconocido y devuelve el item tipado). Devuelve null para
 *                   descartarlo.
 * @param max  Longitud máxima del array.
 * @returns    { items, parseError, setItems, addItem, removeItem, updateItem }
 */
export function useJsonArrayField<T>(raw: string | undefined, normalize: (item: unknown) => T | null, max: number) {
  const { items, parseError } = useMemo(() => {
    // Un `raw` que llegue como objeto/booleano (dato legacy corrupto) no tiene
    // .trim y antes rompía el useMemo; se descarta si no es string.
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "") return { items: [] as T[], parseError: false };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { items: [] as T[], parseError: true };
    }
    if (!Array.isArray(parsed)) return { items: [] as T[], parseError: true };
    const normalized: T[] = [];
    for (const item of parsed) {
      // Un normalize futuro no-robusto no debe tumbar el editor.
      try {
        const n = normalize(item);
        if (n !== null) {
          normalized.push(n);
          if (normalized.length >= max) break;
        }
      } catch {
        // ítem corrupto: se descarta y se sigue con el resto.
      }
    }
    return { items: normalized, parseError: false };
  }, [raw, normalize, max]);

  /** Reemplaza la lista completa (recortada al máximo) y serializa a JSON. */
  const setItems = useCallback(
    (next: T[]) => {
      return JSON.stringify(next.slice(0, max));
    },
    [max],
  );

  /** Añade un elemento al final si hay hueco. */
  const addItem = useCallback(
    (item: T, onChange: (json: string) => void, current: T[] = items) => {
      if (current.length >= max) return;
      onChange(setItems([...current, item]));
    },
    [items, max, setItems],
  );

  /** Elimina el elemento en el índice dado. */
  const removeItem = useCallback(
    (index: number, onChange: (json: string) => void, current: T[] = items) => {
      onChange(setItems(current.filter((_, i) => i !== index)));
    },
    [items, setItems],
  );

  /** Actualiza el elemento en el índice dado. */
  const updateItem = useCallback(
    (index: number, next: T, onChange: (json: string) => void, current: T[] = items) => {
      const copy = [...current];
      if (index < 0 || index >= copy.length) return;
      copy[index] = next;
      onChange(setItems(copy));
    },
    [items, setItems],
  );

  return { items, parseError, setItems, addItem, removeItem, updateItem };
}
