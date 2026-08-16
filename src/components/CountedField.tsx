/**
 * CountedField — Input/textarea con contador de caracteres y límite máximo.
 *
 * Centraliza el patrón `CharacterCounter + control acotado` que se repetía en
 * CoverSectionForm (inviteMessage), GiftsSectionForm (giftsInfo/bankInfo) y
 * StorySectionForm (storyText). El contador se muestra ANTES del control
 * (misma posición que antes) y el cambio se recorta a `max` caracteres.
 */

import { memo } from "react";
import CharacterCounter from "./CharacterCounter";

/** Input de una línea con contador. */
interface CountedInputProps {
  id: string;
  value: string;
  /** Recibe el valor recortado a `max`. */
  onChange: (value: string) => void;
  /** Límite de caracteres (también maxLength). */
  max: number;
  placeholder?: string;
  /** Clase del control (por defecto "setup-input"). */
  className?: string;
  /** Id del hint para aria-describedby. */
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  autoComplete?: string;
}

const CountedInput = memo(function CountedInput({
  id,
  value,
  onChange,
  max,
  placeholder,
  className = "setup-input",
  ariaDescribedBy,
  ariaInvalid,
  autoComplete,
}: CountedInputProps) {
  return (
    <>
      <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
        <CharacterCounter value={value || ""} max={max} />
      </p>
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        maxLength={max}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        autoComplete={autoComplete}
      />
    </>
  );
});

/** Textarea multilínea con contador. */
interface CountedTextareaProps {
  id: string;
  value: string;
  /** Recibe el valor recortado a `max`. */
  onChange: (value: string) => void;
  /** Límite de caracteres (también maxLength). */
  max: number;
  placeholder?: string;
  rows?: number;
  /** Clase del control (por defecto "setup-textarea"). */
  className?: string;
  /** Id del hint para aria-describedby. */
  ariaDescribedBy?: string;
}

const CountedTextarea = memo(function CountedTextarea({
  id,
  value,
  onChange,
  max,
  placeholder,
  rows = 4,
  className = "setup-textarea",
  ariaDescribedBy,
}: CountedTextareaProps) {
  return (
    <>
      <p className="setup-help setup-help--tight" style={{ textAlign: "right" }}>
        <CharacterCounter value={value || ""} max={max} />
      </p>
      <textarea
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        rows={rows}
        maxLength={max}
        aria-describedby={ariaDescribedBy}
      />
    </>
  );
});

export { CountedInput, CountedTextarea };
