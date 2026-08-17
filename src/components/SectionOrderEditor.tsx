import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseSectionOrder as parseOrder, parseHidden } from "../lib/section-utils";

export default function SectionOrderEditor({
  value,
  onChange,
  hiddenValue,
  onHiddenChange,
  surpriseModeValue,
  onSurpriseModeChange,
  surpriseSectionsValue,
  onSurpriseSectionsChange,
}: {
  value: string;
  onChange: (key: string, val: string) => void;
  hiddenValue: string;
  onHiddenChange: (key: string, val: string) => void;
  surpriseModeValue: string;
  onSurpriseModeChange: (key: string, val: string) => void;
  surpriseSectionsValue: string;
  onSurpriseSectionsChange: (key: string, val: string) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => parseOrder(value));
  const [hidden, setHidden] = useState(() => parseHidden(hiddenValue));
  // Secciones sorpresa: set local sincronizado con el valor del formulario.
  const [surprise, setSurprise] = useState(() => parseHidden(surpriseSectionsValue));

  useEffect(() => {
    setItems(parseOrder(value));
  }, [value]);
  useEffect(() => {
    setHidden(parseHidden(hiddenValue));
  }, [hiddenValue]);
  useEffect(() => {
    setSurprise(parseHidden(surpriseSectionsValue));
  }, [surpriseSectionsValue]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const sync = useCallback(
    (next: string[]) => {
      setItems(next);
      onChange("sectionOrder", next.join(","));
    },
    [onChange],
  );

  const syncHidden = useCallback(
    (next: Set<string>) => {
      setHidden(next);
      onHiddenChange("hiddenSections", [...next].join(","));
    },
    [onHiddenChange],
  );

  const toggleVisibility = useCallback(
    (key: string) => {
      const next = new Set(hidden);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      syncHidden(next);
    },
    [hidden, syncHidden],
  );

  /** Marca/desmarca una sección como sorpresa (solo se revela el día del
   *  evento y solo si el modo sorpresa está activado). No puede coincidir
   *  con una sección oculta (ese estado ya la elimina siempre). */
  const toggleSurprise = useCallback(
    (key: string) => {
      const next = new Set(surprise);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSurprise(next);
      onSurpriseSectionsChange("surpriseSections", [...next].join(","));
    },
    [surprise, onSurpriseSectionsChange],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      const key = items[index];
      if (key === "hero" || key === "rsvp") return;
      setDragIndex(index);
      setOverIndex(null);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [items],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (index !== overIndex) setOverIndex(index);
    },
    [overIndex],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragIndex;
      const to = overIndex;
      setDragIndex(null);
      setOverIndex(null);
      if (from === null || to === null || from === to) return;
      // No se puede soltar sobre la portada (primera) ni sobre o más allá del
      // RSVP (último, siempre bloqueado al final).
      if (to === 0 || to >= items.length - 1) return;
      const next = [...items];
      const moved = next.splice(from, 1)[0]!;
      next.splice(to, 0, moved);
      sync(next);
    },
    [dragIndex, overIndex, items, sync],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 1) return;
      const next = [...items];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      sync(next);
    },
    [items, sync],
  );

  const moveDown = useCallback(
    (index: number) => {
      // No se puede mover por debajo del penúltimo: el RSVP (último) está fijo.
      if (index >= items.length - 2) return;
      const next = [...items];
      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      sync(next);
    },
    [items, sync],
  );

  const getDropIndicator = (index: number) => {
    if (index === 0 || index >= items.length - 1) return null;
    if (dragIndex === null || overIndex === null) return null;
    if (dragIndex === overIndex) return null;
    return overIndex === index ? "section-order-item--drop-target" : "";
  };

  return (
    <div className="setup-token-card">
      <p className="setup-label setup-label--tight">{t("sectionOrder.title")}</p>
      <p className="setup-help setup-help--tight">{t("sectionOrder.help")}</p>
      <div className="section-order-list" role="list">
        {items.map((sectionKey: string, index: number) => {
          // La portada (primera) y el RSVP (último) están fijos: no se
          // reordenan y se muestran bloqueados con su mismo estilo.
          const isFixed = sectionKey === "hero" || sectionKey === "rsvp";
          const isDragging = dragIndex === index;
          const isHidden = hidden.has(sectionKey);
          const isSurprise = surprise.has(sectionKey);
          return (
            <div
              key={sectionKey}
              role="listitem"
              className={`section-order-item ${isDragging ? "section-order-item--dragging" : ""} ${isFixed ? "section-order-item--fixed" : ""} ${getDropIndicator(index)} ${isHidden ? "section-order-item--hidden" : ""}`}
              draggable={!isFixed}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              <span className="section-order-item__grip" aria-hidden="true">
                {isFixed ? "🔒" : "⠿"}
              </span>
              <span className={`section-order-item__label ${isHidden ? "section-order-item__label--hidden" : ""}`}>
                {t(sectionKey + ".sectionLabel")}
                {isHidden && <span className="section-order-item__badge">{t("setup.hiddenSectionBadge")}</span>}
                {!isHidden && isSurprise && (
                  <span className="section-order-item__badge section-order-item__badge--surprise">
                    {t("setup.surpriseBadge")} 🎁
                  </span>
                )}
              </span>
              {!isFixed && (
                <span className="section-order-item__actions">
                  <button
                    type="button"
                    className={`section-order-item__toggle ${isHidden ? "" : "section-order-item__toggle--on"}`}
                    onClick={() => toggleVisibility(sectionKey)}
                    aria-label={`${isHidden ? t("common.show") : t("common.hide")} ${t(sectionKey + ".sectionLabel")}`}
                  >
                    {isHidden ? "✕" : "✓"}
                  </button>
                  <button
                    type="button"
                    className={`section-order-item__btn section-order-item__btn--surprise ${isSurprise ? "section-order-item__btn--surprise-active" : ""}`}
                    onClick={() => toggleSurprise(sectionKey)}
                    disabled={surpriseModeValue !== "true" || isHidden}
                    aria-pressed={isSurprise}
                    aria-label={`${isSurprise ? t("sectionOrder.surpriseRemove") : t("sectionOrder.surpriseAdd")} ${t(sectionKey + ".sectionLabel")}`}
                    title={surpriseModeValue !== "true" ? t("sectionOrder.surpriseDisabledHint") : undefined}
                  >
                    🎁
                  </button>
                  <button
                    type="button"
                    className="section-order-item__btn"
                    onClick={() => moveUp(index)}
                    disabled={index <= 1 && items[0] === "hero"}
                    aria-label={`${t("sectionOrder.moveUp")} ${t(sectionKey + ".sectionLabel")}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="section-order-item__btn"
                    onClick={() => moveDown(index)}
                    disabled={index >= items.length - 2}
                    aria-label={`${t("sectionOrder.moveDown")} ${t(sectionKey + ".sectionLabel")}`}
                  >
                    ↓
                  </button>
                  <span className="section-order-item__pos">{index + 1}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Modo sorpresa: activa las 🎁 de las secciones. Un checkbox independiente
          del orden para no complicar el drag & drop. */}
      <label className="a11y-toggle section-order-surprise-toggle">
        <input
          type="checkbox"
          checked={surpriseModeValue === "true"}
          onChange={() => onSurpriseModeChange("surpriseMode", surpriseModeValue === "true" ? "false" : "true")}
        />
        <span className="a11y-toggle__track" />
        <span>{t("sectionOrder.surpriseModeLabel")}</span>
      </label>
    </div>
  );
}
