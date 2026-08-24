import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormStore } from "../../contexts";
import SetupToggleRow from "../SetupToggleRow";

/**
 * VenueSectionForm — Configuración del recinto en la invitación pública:
 * mapa del recinto (venuemap) y distribución de mesas (tables). Ambas son
 * secciones públicas propias; aquí solo vive su visibilidad.
 */
const VenueSectionForm = memo(function VenueSectionForm({ prefix = "" }: { prefix?: string }) {
  const { t } = useTranslation();
  const { updateFormField } = useConfigActions();
  const formStore = useFormStore();
  /** Genera el id único del input a partir del nombre base. */
  const id = (name: string) => `${prefix}${name}`;
  // Toggle genérico: lee el valor actual síncrono y lo invierte.
  const toggle = useCallback(
    (field: string) => () => {
      const current = formStore.getField(field);
      updateFormField(field, current === "true" ? "false" : "true");
    },
    [formStore, updateFormField],
  );
  // Fila estable con el ToggleRow común del módulo.
  const renderToggleRow = (field: string, label: string, hint?: string) => (
    <SetupToggleRow
      field={field}
      label={label}
      {...(hint !== undefined ? { hint } : {})}
      checked={formStore.getField(`${field}Enabled`) === "true"}
      onToggle={toggle(`${field}Enabled`)}
      id={id}
    />
  );

  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-label">{t("setup.venueLegend")}</legend>
      <p className="setup-help">{t("setup.venueHint")}</p>

      {/* Mapa del recinto (sección propia v2.109) */}
      {renderToggleRow("venueMap", t("setup.venueMapLabel"), t("setup.venueMapHint"))}

      {/* Distribución de mesas en la invitación pública */}
      {renderToggleRow("tables", t("setup.tablesLabel"), t("setup.tablesHint"))}
    </fieldset>
  );
});

export default VenueSectionForm;
