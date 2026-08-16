/**
 * MapModeSelect — Select del modo de visualización del mapa (iframe/nombre/
 * oculto) con label y hint. Centraliza el patrón que se repetía en
 * DateSectionForm (lugar de la boda), TransportSectionForm (transporte) y
 * GuestsSectionForm (alojamiento).
 */

import { memo } from "react";
import { useTranslation } from "react-i18next";

interface MapModeSelectProps {
  /** Id del select (con el prefijo del paso del setup). */
  id: string;
  /** Valor actual del modo ("iframe" | "name" | "hidden"). */
  value: string;
  /** Cambia el modo. */
  onChange: (value: string) => void;
  /** Id del hint (para aria-describedby del select). */
  hintId: string;
}

const MapModeSelect = memo(function MapModeSelect({ id, value, onChange, hintId }: MapModeSelectProps) {
  const { t } = useTranslation();
  return (
    <>
      <label className="setup-label" htmlFor={id}>
        {t("setup.mapModeLabel")}
      </label>
      <select
        id={id}
        className="setup-input"
        value={value || "iframe"}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hintId}
      >
        <option value="iframe">{t("setup.mapModeIframe")}</option>
        <option value="name">{t("setup.mapModeName")}</option>
        <option value="hidden">{t("setup.mapModeHidden")}</option>
      </select>
      <p className="setup-help" id={hintId}>
        {t("setup.mapModeHint")}
      </p>
    </>
  );
});

export default MapModeSelect;
