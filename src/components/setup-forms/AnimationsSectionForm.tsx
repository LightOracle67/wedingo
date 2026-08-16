/**
 * AnimationsSectionForm — Configura las animaciones de la invitación (base).
 *
 * La pareja decide, con checkboxes, qué animaciones se reproducen en la
 * invitación (del sobre a las más insignificantes). Cada checkbox tiene un
 * nombre informativo y un hint que explica qué se desactiva. El resultado se
 * guarda en `config.disabledAnimations` (ids separados por comas): lo que la
 * pareja desactiva aquí es la BASE para todos los invitados, y ningún
 * invitado puede reactivarlo desde su panel de accesibilidad.
 *
 * NOTA: la casilla marcada = animación ACTIVA; desmarcar la añade a la lista
 * de desactivadas (semántica invertida a propósito para que "marcado" siempre
 * signifique "sí, quiero ver esto").
 */

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConfig, useFormField } from "../../contexts";
import AnimationChecklist from "../AnimationChecklist";
import {
  ANIMATIONS,
  parseDisabledAnimations,
  serializeDisabledAnimations,
  toggleDisabledAnimations,
} from "../../lib/animations";

export default function AnimationsSectionForm({ prefix = "" }: { prefix?: string }) {
  const { t } = useTranslation();
  const { updateFormField } = useConfig();
  const disabledAnimations = useFormField("disabledAnimations");

  // Conjunto de ids desactivados por la pareja (derivado reactivo de la tienda).
  const disabledSet = useMemo(() => parseDisabledAnimations(disabledAnimations), [disabledAnimations]);

  /** ¿Está la animación activa? (marcada = activa, la base por defecto). */
  const isEnabled = useCallback((id: string) => !disabledSet.has(id), [disabledSet]);

  /** Alterna una animación: desmarcar la añade a la lista de desactivadas. */
  const onToggle = useCallback(
    (id: string, enabled: boolean) => {
      updateFormField("disabledAnimations", toggleDisabledAnimations(disabledAnimations, id, enabled));
    },
    [disabledAnimations, updateFormField],
  );

  /** Activa/desactiva todas las animaciones de un grupo a la vez. */
  const onGroupToggle = useCallback(
    (groupId: string, enabled: boolean) => {
      const next = new Set(disabledSet);
      for (const anim of ANIMATIONS) {
        if (anim.groupId !== groupId) continue;
        if (enabled) next.delete(anim.id);
        else next.add(anim.id);
      }
      updateFormField("disabledAnimations", serializeDisabledAnimations(next));
    },
    [disabledSet, updateFormField],
  );

  /** Activa/desactiva TODAS las animaciones de la invitación. */
  const onAllToggle = useCallback(
    (enabled: boolean) => {
      const next = new Set(disabledSet);
      for (const anim of ANIMATIONS) {
        if (enabled) next.delete(anim.id);
        else next.add(anim.id);
      }
      updateFormField("disabledAnimations", serializeDisabledAnimations(next));
    },
    [disabledSet, updateFormField],
  );

  return (
    <>
      <fieldset className="setup-fieldset">
        <legend className="setup-label">{t("animations.sectionTitle")}</legend>
        <p className="setup-help">{t("animations.sectionHint")}</p>

        {/* Acciones globales: activar o desactivar todas a la vez. */}
        <div className="anim-checklist__group-actions anim-checklist__group-actions--global">
          <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => onAllToggle(true)}>
            {t("animations.allOn")}
          </button>
          <button type="button" className="setup-button setup-button--ghost setup-button--compact" onClick={() => onAllToggle(false)}>
            {t("animations.allOff")}
          </button>
        </div>

        <AnimationChecklist
          checked={isEnabled}
          onToggle={onToggle}
          idPrefix={prefix}
          showGroupActions
          onGroupToggle={onGroupToggle}
        />
      </fieldset>
    </>
  );
}
