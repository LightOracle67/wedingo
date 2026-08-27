import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { parseHidden } from "../../lib/section-utils";
import { useConfig, useConfigActions, useFormField } from "../../contexts";
import SetupToggleRow from "../SetupToggleRow";

/**
 * VenueSectionForm — Configuración del recinto en la invitación pública:
 * mapa del recinto (venuemap) y distribución de mesas (tables). Ambas son
 * secciones públicas propias; aquí solo vive su visibilidad.
 */
const VenueSectionForm = memo(function VenueSectionForm({ prefix = "" }: { prefix?: string }) {
  const { t } = useTranslation();
  const { updateFormField } = useConfigActions();
  // El token de la invitación se lee del contexto de configuración: identifica
  // la subcolección de secciones/mesas que el responsable crea en la pestaña
  // Distribución (es solo lectura informativa).
  const { inviteToken } = useConfig();
  const id = (name: string) => `${prefix}${name}`;
  // Lectura REACTIVA de cada toggle: useFormField se suscribe al campo y
  // re-renderiza esta sección cuando cambia. Antes se leía con getField() de
  // useFormStore() (objeto estable del contexto, sin suscripción) y el
  // checkbox nunca reflejaba el nuevo estado al pulsarlo: parecía que los
  // toggles no se activaban nunca. Cada toggle necesita su propia llamada
  // porque los hooks no pueden declararse dentro del render auxiliar.
  const venueMapEnabled = useFormField("venueMapEnabled");
  const tablesEnabled = useFormField("tablesEnabled");
  // Secciones marcadas como ocultas en el editor de orden: si una de ellas es
  // venuemap o tables, su toggle queda deshabilitado (no tiene sentido
  // activar visibilidad de una sección que el responsable ocultó).
  const hiddenSections = useFormField("hiddenSections");
  const hiddenSet = useMemo(() => parseHidden(hiddenSections || ""), [hiddenSections]);

  // Conteo real de la pestaña Distribución: secciones con al menos una mesa y
  // mesas totales. Es INFORMATIVO (decisión del usuario): la visibilidad de
  // las secciones públicas sigue mandada por los toggles; este contador solo
  // ayuda al responsable a saber qué aparecerá en la invitación.
  const [seating, setSeating] = useState<{ sections: number; tables: number } | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const sectionsSnap = await getDocs(collection(db, "invitations", inviteToken, "sections"));
        let sections = 0;
        let tables = 0;
        // Misma estructura que la invitación pública (secciones/{id}/tables):
        // solo cuentan las secciones que tienen al menos una mesa dibujada.
        for (const sec of sectionsSnap.docs) {
          const tablesSnap = await getDocs(
            collection(db, "invitations", inviteToken, "sections", sec.id, "tables"),
          );
          if (tablesSnap.docs.length > 0) sections += 1;
          tables += tablesSnap.docs.length;
        }
        if (!cancelled) setSeating({ sections, tables });
      } catch {
        // Sin permiso o fuera de línea no se muestra el contador: es
        // informativo y nunca debe bloquear el formulario del recinto.
        if (!cancelled) setSeating({ sections: 0, tables: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const renderToggleRow = (field: string, label: string, hint: string, checked: boolean, sectionHidden: boolean) => (
    <SetupToggleRow
      field={field}
      label={label}
      hint={sectionHidden ? t("setup.hiddenSectionToggleHint") : hint}
      checked={checked}
      disabled={sectionHidden}
      onToggle={() => updateFormField(`${field}Enabled`, checked ? "false" : "true")}
      id={id}
    />
  );

  return (
    <fieldset className="setup-fieldset">
      <legend className="setup-label">{t("setup.venueLegend")}</legend>
      <p className="setup-help">{t("setup.venueHint")}</p>

      {/* Estado real de la pestaña Distribución: contador o aviso si vacía */}
      {seating ? (
        seating.tables > 0 ? (
          <p className="setup-help" role="status">
            {t("setup.venueTablesInfo", { sections: seating.sections, tables: seating.tables })}
          </p>
        ) : (
          <p className="setup-help" role="status">
            {t("setup.venueNoTablesHint")}
          </p>
        )
      ) : null}

      {/* Mapa del recinto (sección propia v2.109) */}
      {renderToggleRow("venueMap", t("setup.venueMapLabel"), t("setup.venueMapHint"), venueMapEnabled === "true", hiddenSet.has("venuemap"))}

      {/* Distribución de mesas en la invitación pública */}
      {renderToggleRow("tables", t("setup.tablesLabel"), t("setup.tablesHint"), tablesEnabled === "true", hiddenSet.has("tables"))}
    </fieldset>
  );
});

export default VenueSectionForm;
