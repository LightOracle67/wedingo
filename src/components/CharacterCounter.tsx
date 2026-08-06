import { memo } from "react";

const CharacterCounter = memo(function CharacterCounter({ value, max }: { value: string; max: number }) {
  // Cuenta code points (no unidades UTF-16) para que los emojis valgan 1.
  const current = [...(value ?? "")].length;
  const remaining = Math.max(0, max - current);
  return (
    <span className="character-counter" aria-live="polite" title={`${current}/${max}`}>
      {current}/{max}
      <span className="sr-only"> ({remaining} restantes)</span>
    </span>
  );
});

export default CharacterCounter;
