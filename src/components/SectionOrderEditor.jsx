import { useCallback, useState } from "react";
import { SECTION_LABELS, STORY_SECTION_ORDER } from "../lib/constants";

function parseOrder(raw) {
  const order = (raw || STORY_SECTION_ORDER.join(",")).split(",").filter(Boolean);
  return STORY_SECTION_ORDER.filter((s) => order.includes(s));
}

export default function SectionOrderEditor({ value, onChange }) {
  const [items, setItems] = useState(() => parseOrder(value));
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const sync = useCallback((next) => {
    setItems(next);
    onChange("sectionOrder", next.join(","));
  }, [onChange]);

  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    setOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

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

  const isFirstMovable = (index) => index === 1 && items[0] === "hero";

  const getDropIndicator = (index) => {
    if (index === 0) return null;
    if (dragIndex === null || overIndex === null) return null;
    if (dragIndex === overIndex) return null;
    return overIndex === index ? "section-order-item--drop-target" : "";
  };

  return (
    <div className="setup-token-card">
      <p className="setup-label setup-label--tight">Orden de las secciones</p>
      <p className="setup-help setup-help--tight">
        Arrastra o usa los botones para reordenar. La portada siempre va primero.
      </p>
      <div className="section-order-list">
        {items.map((sectionKey, index) => {
          const isHero = sectionKey === "hero";
          const isDragging = dragIndex === index;
          return (
            <div
              key={sectionKey}
              className={`section-order-item ${isDragging ? "section-order-item--dragging" : ""} ${isHero ? "section-order-item--fixed" : ""} ${getDropIndicator(index)}`}
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
              <span className="section-order-item__label">{SECTION_LABELS[sectionKey] || sectionKey}</span>
              {!isHero && (
                <span className="section-order-item__actions">
                  <button
                    type="button"
                    className="section-order-item__btn"
                    onClick={() => moveUp(index)}
                    disabled={isFirstMovable(index)}
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
