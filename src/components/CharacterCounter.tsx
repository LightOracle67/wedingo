import { memo } from "react";

const CharacterCounter = memo(function CharacterCounter({ current, max }: { current: number; max: number }) {
  return (
    <span className="character-counter" aria-hidden="true">
      {current}/{max}
    </span>
  );
});

export default CharacterCounter;
