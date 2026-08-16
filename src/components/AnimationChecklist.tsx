/**
 * AnimationChecklist — Lista de animaciones con checkboxes, nombre y hint.
 *
 * Componente REUTILIZABLE que renderiza el catálogo completo de animaciones
 * agrupado por categoría (registro: src/lib/animations.ts). Se usa en:
 *  - El panel del admin (AnimationsSectionForm): la pareja elige la BASE.
 *  - El panel de accesibilidad (AccessibilityPanel): cada invitado elige sus
 *    preferencias adicionales (ids bloqueados por la base del admin).
 *
 * Cada fila muestra el nombre informativo y un hint que explica exactamente
 * qué se desactiva. Los ids bloqueados (`locked`) se muestran deshabilitados
 * con una nota explicativa.
 */

import { useTranslation } from "react-i18next";
import { ANIMATION_GROUPS, ANIMATIONS, EMPTY_ANIMATION_SET } from "../lib/animations";

interface AnimationChecklistProps {
  /** Devuelve `true` si la animación está ACTIVA (visible) en este contexto. */
  checked: (id: string) => boolean;
  /** Callback al alternar una animación (ignora los ids bloqueados). */
  onToggle: (id: string, enabled: boolean) => void;
  /** Ids que no se pueden cambiar (p. ej. base del admin en el panel del
   *  invitado). Por defecto ninguno. */
  locked?: ReadonlySet<string>;
  /** Prefijo de los id de los inputs (evita colisiones entre paneles). */
  idPrefix?: string;
  /** Layout compacto (panel de accesibilidad, ancho limitado). */
  compact?: boolean;
  /** Muestra botones «todas/ninguna» por grupo (config del admin). */
  showGroupActions?: boolean;
  /** Callback para el botón «todas/ninguna» de un grupo. */
  onGroupToggle?: (groupId: string, enabled: boolean) => void;
}

export default function AnimationChecklist({
  checked,
  onToggle,
  locked = EMPTY_ANIMATION_SET,
  idPrefix = "",
  compact = false,
  showGroupActions = false,
  onGroupToggle,
}: AnimationChecklistProps) {
  const { t } = useTranslation();

  return (
    <div className={`anim-checklist ${compact ? "anim-checklist--compact" : ""}`}>
      {ANIMATION_GROUPS.map((group) => {
        const animations = ANIMATIONS.filter((a) => a.groupId === group.id);
        if (animations.length === 0) return null;
        return (
          <fieldset key={group.id} className="anim-checklist__group">
            <legend className="anim-checklist__group-title">
              <span>{t(`animations.groups.${group.id}`)}</span>
              {showGroupActions && onGroupToggle ? (
                <span className="anim-checklist__group-actions">
                  <button
                    type="button"
                    className="anim-checklist__group-btn"
                    onClick={() => onGroupToggle(group.id, true)}
                  >
                    {t("animations.groupAll")}
                  </button>
                  <span aria-hidden="true" className="anim-checklist__group-sep">
                    ·
                  </span>
                  <button
                    type="button"
                    className="anim-checklist__group-btn"
                    onClick={() => onGroupToggle(group.id, false)}
                  >
                    {t("animations.groupNone")}
                  </button>
                </span>
              ) : null}
            </legend>
            <div className="anim-checklist__items">
              {animations.map((anim) => {
                const isChecked = checked(anim.id);
                const isLocked = locked.has(anim.id);
                const inputId = `${idPrefix}anim-${anim.id}`;
                return (
                  <div className="anim-checklist__row" key={anim.id}>
                    <input
                      type="checkbox"
                      className="anim-checklist__checkbox"
                      id={inputId}
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => {
                        if (!isLocked) onToggle(anim.id, !isChecked);
                      }}
                    />
                    <div className="anim-checklist__text">
                      <label className="anim-checklist__name" htmlFor={inputId}>
                        {t(`animations.items.${anim.id}.name`)}
                      </label>
                      <p className="anim-checklist__hint">{t(`animations.items.${anim.id}.hint`)}</p>
                      {isLocked && !isChecked ? (
                        <p className="anim-checklist__locked-note">{t("animations.lockedByAdmin")}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
