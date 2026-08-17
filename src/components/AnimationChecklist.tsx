/**
 * AnimationChecklist — Lista de animaciones con checkboxes, nombre y hint.
 *
 * Componente REUTILIZABLE que renderiza el catálogo completo de animaciones
 * agrupado por categoría (registro: src/lib/animations.ts). Se usa en:
 *  - El panel del admin (AnimationsSectionForm): la pareja elige la BASE.
 *  - El panel de accesibilidad (AccessibilityPanel): cada invitado elige sus
 *    preferencias adicionales (ids bloqueados por la base del admin).
 *
 * Incluye un CHECKBOX MAESTRO «Desactivar todas las animaciones»: al activarlo
 * todas las filas quedan desactivadas y los comportamientos completos (sobre,
 * confeti...) se saltan en la invitación. Cada fila muestra el nombre y un hint
 * que explica qué se desactiva; los ids bloqueados (`locked`) se muestran
 * deshabilitados con una nota explicativa.
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
  /** ¿Está activado «desactivar todas»? Deshabilita las filas individuales. */
  allOff?: boolean;
  /** Alterna el checkbox maestro (todas las animaciones). */
  onToggleAll?: (enabled: boolean) => void;
}

export default function AnimationChecklist({
  checked,
  onToggle,
  locked = EMPTY_ANIMATION_SET,
  idPrefix = "",
  compact = false,
  allOff = false,
  onToggleAll,
}: AnimationChecklistProps) {
  const { t } = useTranslation();
  const allInputId = `${idPrefix}anim-all`;

  return (
    <div className={`anim-checklist ${compact ? "anim-checklist--compact" : ""}`}>
      {/* Checkbox maestro: desactiva todas las animaciones de un vistazo. */}
      {onToggleAll ? (
        <div className="anim-checklist__all">
          <input
            type="checkbox"
            className="anim-checklist__checkbox"
            id={allInputId}
            checked={allOff}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
          <div className="anim-checklist__text">
            <label className="anim-checklist__name" htmlFor={allInputId}>
              {t("animations.allOffLabel")}
            </label>
            <p className="anim-checklist__hint">{t("animations.allOffHint")}</p>
          </div>
        </div>
      ) : null}

      {ANIMATION_GROUPS.map((group) => {
        const animations = ANIMATIONS.filter((a) => a.groupId === group.id);
        if (animations.length === 0) return null;
        return (
          <fieldset key={group.id} className="anim-checklist__group">
            <legend className="anim-checklist__group-title">
              <span>{t(`animations.groups.${group.id}`)}</span>
            </legend>
            <div className="anim-checklist__items">
              {animations.map((anim) => {
                // Con «desactivar todas» activo, cada animación está apagada y
                // no se puede tocar individualmente.
                const isChecked = allOff ? false : checked(anim.id);
                const isLocked = allOff || locked.has(anim.id);
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
                        <p className="anim-checklist__locked-note">
                          {allOff ? t("animations.allOffActive") : t("animations.lockedByAdmin")}
                        </p>
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
