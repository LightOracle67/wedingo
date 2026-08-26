import { memo } from "react";
import { extractPlaceNameFromUrl } from "../../../lib/geo-utils";
import type { Translate } from "./derive";

interface TransportPickerProps {
  /** "main" escribe transportMode/…; número = índice de acompañante (companionTransportModes[i]/…). */
  group: "main" | number;
  mode: string;
  choice: string;
  modes: { value: string; label: string }[];
  departures: { type?: "bus" | "taxi"; time: string; url: string }[];
  onModeChange: (mode: string) => void;
  /** Recibe el índice de la salida seleccionada como string ("", "0", "1"...). */
  onDepartureChange: (choiceIndex: string) => void;
  frozen: boolean;
  compact?: boolean;
  t: Translate;
}

/**
 * Selector de transporte reutilizable (titular y acompañantes): radios de modo
 * + select condicional de salida cuando se elige bus/taxi. El relleno
 * automático de hora/lugar lo hace el handler del orquestador.
 */
const TransportPicker = memo(function TransportPicker({
  group,
  mode,
  choice,
  modes,
  departures,
  onModeChange,
  onDepartureChange,
  frozen,
  compact,
  t,
}: TransportPickerProps) {
  // Sufijos de id/label únicos por grupo para accesibilidad.
  const suffix = group === "main" ? "" : `-${group}`;
  const labelId = `rv2TransportLabel${suffix}`;

  return (
    <div className={"rv2-transport" + (compact ? " rv2-compact" : "")}>
      <p className="setup-label rv2-sublabel" id={labelId}>
        {t("rsvp.transportLabel")}
      </p>
      <div className="rv2-chiprow" role="radiogroup" aria-labelledby={labelId}>
        {modes.map((opt) => (
          // Chip-radio: etiqueta envolvente con estilo de píldora seleccionable.
          <label key={opt.value} className={"rv2-chip" + (mode === opt.value ? " rv2-chip--on" : "")}>
            <input
              type="radio"
              name={`rv2Mode${suffix}`}
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => onModeChange(opt.value)}
              disabled={frozen}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* La salida solo aplica a bus/taxi */}
      {mode === "bus" || mode === "taxi" ? (
        <>
          <label className="setup-label rv2-sublabel" htmlFor={`rsvpDeparture${suffix}`}>
            {t("rsvp.transportDepartureLabel")}
          </label>
          <select
            id={`rsvpDeparture${suffix}`}
            className="setup-input rv2-select"
            value={choice}
            onChange={(e) => onDepartureChange(e.target.value)}
            disabled={frozen}
          >
            {/* Solo las salidas del modo elegido */}
            {departures.map((dep, i) =>
              (dep.type || "bus") === mode ? (
                <option key={`${i}-${dep.time}`} value={String(i)}>
                  {departureText(dep, t)}
                </option>
              ) : null,
            )}
          </select>
        </>
      ) : null}
    </div>
  );
});

/** Etiqueta legible de la salida (duplicada aquí para mantener el picker autocontenido). */
function departureText(dep: { type?: "bus" | "taxi"; time: string; url: string }, t: Translate): string {
  const typeLabel = t(dep.type === "taxi" ? "transport.typeTaxi" : "transport.typeBus");
  const placeName = dep.url ? extractPlaceNameFromUrl(dep.url) : "";
  if (placeName && dep.time) return `${placeName} (${dep.time})`;
  if (placeName) return placeName;
  return dep.time ? `${dep.time} (${typeLabel})` : typeLabel;
}

export default TransportPicker;
