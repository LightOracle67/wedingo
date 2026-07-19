import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseSectionOrder as parseOrder, parseHidden } from "../lib/section-utils";

export default function SectionOrderEditor({ value, onChange, hiddenValue, onHiddenChange }: any) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => parseOrder(value));
  const [hidden, setHidden] = useState(() => parseHidden(hiddenValue));

  useEffect(() => { setItems(parseOrder(value)); }, [value]);
  useEffect(() => { setHidden(parseHidden(hiddenValue)); }, [hiddenValue]);
  const [dragIndex, setDragIndex] = useState<any>(null);
  const [overIndex, setOverIndex] = useState<any>(null);

  const sync = useCallback((next: any) => {
    setItems(next);
    onChange("sectionOrder", next.join(","));
  }, [onChange]);

  const syncHidden = useCallback((next: any) => {
    setHidden(next);
    onHiddenChange("hiddenSections", [...next].join(","));
  }, [onHiddenChange]);

  const toggleVisibility = useCallback((key: any) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    syncHidden(next);
  }, [hidden, syncHidden]);

  const handleDragStart = useCallback((e: any, index: any) => {
    const isHero = items[index] === "hero";
    if (isHero) return;
    setDragIndex(index);
    setOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, [items]);

  const handleDragEnter = useCallback((e: any, index: any) => {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  }, [overIndex]);

  const handleDragOver = useCallback((e: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: any) => {
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

  const moveUp = useCallback((index: any) => {
    if (index <= 1) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    sync(next);
  }, [items, sync]);

  const moveDown = useCallback((index: any) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    sync(next);
  }, [items, sync]);

  const getDropIndicator = (index: any) => {
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
        {items.filter((s: any) => s !== "godparents").map((sectionKey: any, index: any) => {
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
