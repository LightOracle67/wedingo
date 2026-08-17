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
 * Incluye un CHECKBOX MAESTRO «Desactivar todas las animaciones» (clave `all`):
 * al activarlo, la invitación se muestra sin ninguna animación y se saltan los
 * comportamientos completos (el sobre no aparece). Al desactivarlo se recuperan
 * las preferencias individuales previas.
 *
 * NOTA: la casilla marcada = animación ACTIVA; desmarcar la añade a la lista
 * de desactivadas (semántica invertida a propósito para que "marcado" siempre
 * signifique "sí, quiero ver esto").
 */

import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useConfigActions, useFormField } from "../../contexts";
import AnimationChecklist from "../AnimationChecklist";
import {
  ANIMATIONS,
  parseDisabledAnimations,
  serializeDisabledAnimations,
  toggleAllDisabled,
  toggleDisabledAnimations,
  ALL_ANIMATIONS_KEY,
} from "../../lib/animations";

const AnimationsSectionForm = memo(function AnimationsSectionForm({ prefix = "" }: { prefix?: string }) {
  const { t } = useTranslation();
  const { updateFormField } = useConfigActions();
  const disabledAnimations = useFormField("disabledAnimations");

  // Conjunto de ids desactivados por la pareja (derivado reactivo de la tienda).
  const disabledSet = useMemo(() => parseDisabledAnimations(disabledAnimations), [disabledAnimations]);

  /** «Desactivar todas» activo si la clave reservada `all` está presente. */
  const allOff = disabledSet.has(ALL_ANIMATIONS_KEY);

  /** ¿Está la animación activa? (marcada = activa; con `all` todo apagado). */
  const isEnabled = useCallback((id: string) => !allOff && !disabledSet.has(id), [allOff, disabledSet]);

  /** Alterna una animación: desmarcar la añade a la lista de desactivadas. */
  const onToggle = useCallback(
    (id: string, enabled: boolean) => {
      updateFormField("disabledAnimations", toggleDisabledAnimations(disabledAnimations, id, enabled));
    },
    [disabledAnimations, updateFormField],
  );

  /** Checkbox de SECCIÓN: activa/desactiva todos los ids del grupo a la vez. */
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

  /** Checkbox maestro: activa/desactiva TODAS conservando las individuales. */
  const onToggleAll = useCallback(
    (enabled: boolean) => {
      updateFormField("disabledAnimations", toggleAllDisabled(disabledAnimations, enabled));
    },
    [disabledAnimations, updateFormField],
  );

  return (
    <>
      <fieldset className="setup-fieldset">
        <legend className="setup-label">{t("animations.sectionTitle")}</legend>
        <p className="setup-help">{t("animations.sectionHint")}</p>

        <AnimationChecklist
          checked={isEnabled}
          onToggle={onToggle}
          idPrefix={prefix}
          allOff={allOff}
          onToggleAll={onToggleAll}
          onGroupToggle={onGroupToggle}
        />
      </fieldset>
    </>
  );
});

export default AnimationsSectionForm;
