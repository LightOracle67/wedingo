import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isValidGoogleMapsUrl, extractPlaceNameFromUrl } from "../lib/geo-utils";

interface MapUrlFieldProps {
  /** ID del input (con el prefijo del paso del setup). */
  id: string;
  /** Valor actual de la URL del mapa. */
  value: string;
  /** Cambia la URL del mapa. */
  onChange: (url: string) => void;
  /** Placeholder del input (traducido). */
  placeholder: string;
  /** ID del hint con el nombre del lugar extraído (aria-describedby). */
  placeHintId?: string;
  /** Añade la clase de error al input (por defecto true). */
  errorClass?: boolean;
  /** Etiqueta opcional que precede al nombre del lugar (p. ej. "Lugar:"). */
  placeLabel?: string;
  /** Oculta el nombre del lugar (si el padre ya lo muestra por su cuenta). */
  hidePlaceName?: boolean;
}

/**
 * MapUrlField — Input de URL de Google Maps con validación en vivo:
 * borde verde/rojo, mensaje "URL válida/inválida" y extracción del nombre
 * del lugar (que se muestra bajo el input). Centraliza el patrón que se
 * duplicaba en DateSectionForm (lugar de la boda), TransportSectionForm
 * (salidas) y GuestsSectionForm (alojamiento).
 */
const MapUrlField = memo(function MapUrlField({
  id,
  value,
  onChange,
  placeholder,
  placeHintId,
  errorClass = true,
  placeLabel,
  hidePlaceName = false,
}: MapUrlFieldProps) {
  const { t } = useTranslation();
  const url = value.trim();
  const isValid = url ? isValidGoogleMapsUrl(url) : false;

  const placeName = useMemo(() => (isValid ? extractPlaceNameFromUrl(url) || "" : ""), [url, isValid]);

  return (
    <>
      <input
        id={id}
        className={errorClass && url && !isValid ? "setup-input setup-input--error" : "setup-input"}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 1000))}
        placeholder={placeholder}
        autoComplete="off"
        inputMode="url"
        maxLength={1000}
        aria-describedby={isValid && placeHintId ? placeHintId : undefined}
        aria-invalid={url && !isValid ? true : undefined}
      />
      {url ? (
        <p
          className="setup-help"
          style={!isValid ? { color: "#ef4444" } : { color: "#22c55e" }}
          role={!isValid ? "alert" : undefined}
        >
          {isValid ? `${t("setup.mapUrlOk")}` : `${t("setup.mapUrlInvalid")}`}
        </p>
      ) : null}
      {!hidePlaceName && placeName ? (
        <p
          className="setup-help"
          id={placeHintId}
          style={{ marginTop: "0.15rem", color: "var(--setup-accent)", fontWeight: 600 }}
        >
          {placeLabel ? `${placeLabel}: ${placeName}` : placeName}
        </p>
      ) : null}
    </>
  );
});

export default MapUrlField;
