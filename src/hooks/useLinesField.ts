/**
 * useLinesField — Convierte campos JSON (arrays) a/desde líneas "A | B".
 *
 * Centraliza el editor que se repetía en ExtrasSectionForm (giftList y
 * trivia): un textarea con una línea por elemento, donde cada línea separa
 * sus partes con " | ". Devuelve `toLines(json)` (JSON → texto del editor) y
 * `parseText(text)` (texto → JSON acotado a `maxLines`). Los parseadores se
 * pasan por ref: no invalidan la memoización aunque cambien en cada render.
 */

import { useCallback, useRef } from "react";

interface LinesFieldOptions<T> {
  /** Convierte una línea "A | B" en un elemento (o null para descartarla). */
  parseLine: (line: string) => T | null;
  /** Convierte un elemento en su línea "A | B". */
  itemToLine: (item: T) => string;
  /** Máximo de líneas aceptadas (evita que el JSON crezca sin límite). */
  maxLines?: number;
}

export function useLinesField<T>({ parseLine, itemToLine, maxLines = 50 }: LinesFieldOptions<T>) {
  // Refs para no depender de la identidad de las funciones (el padre las crea
  // en cada render; son puras y solo hay que leer la última versión).
  const parseLineRef = useRef(parseLine);
  parseLineRef.current = parseLine;
  const itemToLineRef = useRef(itemToLine);
  itemToLineRef.current = itemToLine;

  /** JSON (array) → texto del editor (una línea por elemento). */
  const toLines = useCallback((json: string): string => {
    try {
      const parsed = JSON.parse(json || "[]");
      if (!Array.isArray(parsed)) return "";
      return parsed.map((item: T) => itemToLineRef.current(item)).join("\n");
    } catch {
      return "";
    }
  }, []);

  /** Texto del editor → JSON acotado (líneas en blanco descartadas). */
  const parseText = useCallback(
    (text: string): string => {
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => parseLineRef.current(line))
        .filter((item): item is NonNullable<T> => item !== null)
        .slice(0, maxLines);
      return JSON.stringify(items);
    },
    [maxLines],
  );

  return { toLines, parseText };
}
