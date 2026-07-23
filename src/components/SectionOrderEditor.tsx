import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseSectionOrder as parseOrder, parseHidden } from "../lib/section-utils";

export default function SectionOrderEditor({ value, onChange, hiddenValue, onHiddenChange }: {
  value: string;
  onChange: (key: string, val: string) => void;
  hiddenValue: string;
  onHiddenChange: (key: string, val: string) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => parseOrder(value));
  const [hidden, setHidden] = useState(() => parseHidden(hiddenValue));

  useEffect(() => { setItems(parseOrder(value)); }, [value]);
  useEffect(() => { setHidden(parseHidden(hiddenValue)); }, [hiddenValue]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const sync = useCallback((next: string[]) => {
    setItems(next);
    onChange("sectionOrder", next.join(","));
  }, [onChange]);

  const syncHidden = useCallback((next: Set<string>) => {
    setHidden(next);
    onHiddenChange("hiddenSections", [...next].join(","));
  }, [onHiddenChange]);

  const toggleVisibility = useCallback((key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    syncHidden(next);
  }, [hidden, syncHidden]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    const isHero = items[index] === "hero";
    if (isHero) return;
    setDragIndex(index);
    setOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, [items]);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  }, [overIndex]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
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

  const moveUp = useCallback((index: number) => {
    if (index <= 1) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    sync(next);
  }, [items, sync]);

  const moveDown = useCallback((index: number) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    sync(next);
  }, [items, sync]);

  const getDropIndicator = (index: number) => {
    if (index === 0) return null;
    if (dragIndex === null || overIndex === null) return null;
    if (dragIndex === overIndex) return null;
    return overIndex === index ? "section-order-item--drop-target" : "";
  };

  return (
    <div className="setup-token-card">
      <p className="setup-label setup-label--tight">{t("sectionOrder.title")}</p>
      <p className="setup-help setup-help--tight">{t("sectionOrder.help")}</p>
      <div className="section-order-list">
        {items.filter((s: string) => s !== "godparents").map((sectionKey: string, index: number) => {
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
                {t(sectionKey + ".sectionLabel")}
                {isHidden && <span className="section-order-item__badge">{t("setup.hiddenSectionBadge")}</span>}
              </span>
              {!isHero && (
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
                    disabled={index === items.length - 1}
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
    </div>
  );
}
