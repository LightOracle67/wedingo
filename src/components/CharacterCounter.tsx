import { memo } from "react";

// Segmenter de grafemas creado UNA vez a nivel de módulo: antes se
// instanciaba en cada render (coste innecesario en el editor con contador).
let graphemeSegmenter: Intl.Segmenter | null = null;
function getSegmenter(): Intl.Segmenter | null {
  if (graphemeSegmenter === null && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    } catch { /* no soportado: fallback a code points */ }
  }
  return graphemeSegmenter;
}

const CharacterCounter = memo(function CharacterCounter({ value, max }: { value: string; max: number }) {
  // Cuenta grafemas visibles: un emoji ZWJ (👨👩👧👦) o una bandera valen 1.
  // El spread de code points los contaba como 7/2 y el límite se alcanzaba
  // antes de lo esperado.
  const current = (() => {
    const text = value ?? "";
    const segmenter = getSegmenter();
    if (segmenter) {
      try {
        return Array.from(segmenter.segment(text)).length;
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
