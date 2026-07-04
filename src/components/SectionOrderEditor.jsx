import { useCallback, useEffect, useState } from "react";
import { SECTION_LABELS, STORY_SECTION_ORDER } from "../lib/constants";

function parseOrder(raw) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  const valid = new Set(STORY_SECTION_ORDER);
  return order.filter((s) => valid.has(s));
}

function parseHidden(raw) {
  return new Set((raw || "").split(",").filter(Boolean));
}

export default function SectionOrderEditor({ value, onChange, hiddenValue, onHiddenChange }) {
  const [items, setItems] = useState(() => parseOrder(value));
  const [hidden, setHidden] = useState(() => parseHidden(hiddenValue));

  useEffect(() => { setItems(parseOrder(value)); }, [value]);
  useEffect(() => { setHidden(parseHidden(hiddenValue)); }, [hiddenValue]);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const sync = useCallback((next) => {
    setItems(next);
    onChange("sectionOrder", next.join(","));
  }, [onChange]);

  const syncHidden = useCallback((next) => {
    setHidden(next);
    onHiddenChange("hiddenSections", [...next].join(","));
  }, [onHiddenChange]);

  const toggleVisibility = useCallback((key) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    syncHidden(next);
  }, [hidden, syncHidden]);

  const handleDragStart = useCallback((e, index) => {
    const isHero = items[index] === "hero";
    if (isHero) return;
    setDragIndex(index);
    setOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, [items]);

  const handleDragEnter = useCallback((e, index) => {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  }, [overIndex]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const from = dragIndex;
    const to = overIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || to === null || from === to) return;
    if (to === 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    sync(next);
  }, [dragIndex, overIndex, items, sync]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const moveUp = useCallback((index) => {
    if (index <= 1) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    sync(next);
  }, [items, sync]);

  const moveDown = useCallback((index) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    sync(next);
  }, [items, sync]);

  const getDropIndicator = (index) => {
    if (index === 0) return null;
    if (dragIndex === null || overIndex === null) return null;
    if (dragIndex === overIndex) return null;
    return overIndex === index ? "section-order-item--drop-target" : "";
  };

  return (
    <div className="setup-token-card">
      <p className="setup-label setup-label--tight">Orden y visibilidad</p>
      <p className="setup-help setup-help--tight">
        Arrastra para reordenar, usa los botones para mover, y activa o desactiva cada sección.
      </p>
      <div className="section-order-list">
        {items.map((sectionKey, index) => {
          const isHero = sectionKey === "hero";
          const isDragging = dragIndex === index;
          const isHidden = hidden.has(sectionKey);
          return (
            <div
              key={sectionKey}
              className={`section-order-item ${isDragging ? "section-order-item--dragging" : ""} ${isHero ? "section-order-item--fixed" : ""} ${getDropIndicator(index)} ${isHidden ? "section-order-item--hidden" : ""}`}
              draggable={!isHero}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              <span className="section-order-item__grip" aria-hidden="true">
                {isHero ? "🔒" : "⠿"}
              </span>
              <span className={`section-order-item__label ${isHidden ? "section-order-item__label--hidden" : ""}`}>
                {SECTION_LABELS[sectionKey] || sectionKey}
                {isHidden && <span className="section-order-item__badge">oculta</span>}
              </span>
              {!isHero && (
                <span className="section-order-item__actions">
                  <button
                    type="button"
                    className={`section-order-item__toggle ${isHidden ? "" : "section-order-item__toggle--on"}`}
                    onClick={() => toggleVisibility(sectionKey)}
                    aria-label={`${isHidden ? "Mostrar" : "Ocultar"} ${SECTION_LABELS[sectionKey]}`}
                  >
                    {isHidden ? "✕" : "✓"}
                  </button>
                  <button
                    type="button"
                    className="section-order-item__btn"
                    onClick={() => moveUp(index)}
                    disabled={index <= 1 && items[0] === "hero"}
                    aria-label={`Mover ${SECTION_LABELS[sectionKey]} hacia arriba`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="section-order-item__btn"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                    aria-label={`Mover ${SECTION_LABELS[sectionKey]} hacia abajo`}
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
    </div>
  );
}
