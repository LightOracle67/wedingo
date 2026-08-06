import { memo } from "react";

const CharacterCounter = memo(function CharacterCounter({ value, max }: { value: string; max: number }) {
  // Cuenta grafemas visibles: un emoji ZWJ (👨👩👧👦) o una bandera valen 1.
  // El spread de code points los contaba como 7/2 y el límite se alcanzaba
  // antes de lo esperado.
  const current = (() => {
    const text = value ?? "";
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      try {
        return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length;
      } catch { /* fallback abajo */ }
    }
    return [...text].length;
  })();
  const remaining = Math.max(0, max - current);
  return (
    <span className="character-counter" aria-live="polite" title={`${current}/${max}`}>
      {current}/{max}
      <span className="sr-only"> ({remaining} restantes)</span>
    </span>
  );
});

export default CharacterCounter;
