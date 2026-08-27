import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField } from "../../contexts";
import SetupToggleRow from "../SetupToggleRow";

/**
 * VenueSectionForm — Configuración del recinto en la invitación pública:
 * mapa del recinto (venuemap) y distribución de mesas (tables). Ambas son
 * secciones públicas propias; aquí solo vive su visibilidad.
 */
const VenueSectionForm = memo(function VenueSectionForm({ prefix = "" }: { prefix?: string }) {
  const { t } = useTranslation();
  const { updateFormField } = useConfigActions();
  const id = (name: string) => `${prefix}${name}`;
  // Lectura REACTIVA de cada toggle: useFormField se suscribe al campo y
  // re-renderiza esta sección cuando cambia. Antes se leía con getField() de
  // useFormStore() (objeto estable del contexto, sin suscripción) y el
  // checkbox nunca reflejaba el nuevo estado al pulsarlo: parecía que los
  // toggles no se activaban nunca. Cada toggle necesita su propia llamada
  // porque los hooks no pueden declararse dentro del render auxiliar.
  const venueMapEnabled = useFormField("venueMapEnabled");
  const tablesEnabled = useFormField("tablesEnabled");

  const renderToggleRow = (field: string, label: string, hint: string, checked: boolean) => (
    <SetupToggleRow
      field={field}
      label={label}
      hint={hint}
      checked={checked}
      onToggle={() => updateFormField(`${field}Enabled`, checked ? "false" : "true")}
      id={id}
    />
  );

  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-label">{t("setup.venueLegend")}</legend>
      <p className="setup-help">{t("setup.venueHint")}</p>

      {/* Mapa del recinto (sección propia v2.109) */}
      {renderToggleRow("venueMap", t("setup.venueMapLabel"), t("setup.venueMapHint"), venueMapEnabled === "true")}

      {/* Distribución de mesas en la invitación pública */}
      {renderToggleRow("tables", t("setup.tablesLabel"), t("setup.tablesHint"), tablesEnabled === "true")}
    </fieldset>
  );
});

export default VenueSectionForm;
