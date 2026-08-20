import React, { useCallback, useRef, useState, type TransitionEvent } from "react";
import { useTranslation } from "react-i18next";

interface CollapsibleSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  sectionKey?: string;
  isHidden?: boolean;
  onToggleVisibility?: (key: string) => void;
}

export default function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
  sectionKey,
  isHidden,
  onToggleVisibility,
}: CollapsibleSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [maxHeight, setMaxHeight] = useState(defaultOpen ? undefined : 0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const toggle = () => {
    if (isOpen) {
      if (contentRef.current) {
        setMaxHeight(contentRef.current.scrollHeight);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMaxHeight(0);
        });
      });
      setIsOpen(false);
    } else {
      if (contentRef.current) {
        setMaxHeight(contentRef.current.scrollHeight);
      }
      setIsOpen(true);
    }
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.propertyName === "max-height" && isOpen) {
      setMaxHeight(undefined);
    }
  };

  const handleVisibilityClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (sectionKey && onToggleVisibility) {
        onToggleVisibility(sectionKey);
      }
    },
    [sectionKey, onToggleVisibility],
  );

  return (
    <div className="setup-collapsible" data-open={isOpen}>
      <div className="setup-collapsible__summary">
        <button type="button" className="setup-collapsible__summary-btn" onClick={toggle} aria-expanded={isOpen}>
          <span className="setup-collapsible__summary-text">
            {isHidden ? <span className="setup-collapsible__hidden-badge">{t("common.hidden")}</span> : null}
            {/* El título va en un <span> (no <h2>): un <button> solo admite
                phrasing content y un heading anidado rompía la semántica
                (WCAG 4.1.1). El texto compone el nombre accesible del botón. */}
            <span className="setup-collapsible__title">{title}</span>
          </span>
          {hint ? <span className="setup-collapsible__hint">{hint}</span> : null}
        </button>
        {sectionKey && onToggleVisibility ? (
          <span
            className={`setup-collapsible__vis-toggle ${isHidden ? "setup-collapsible__vis-toggle--off" : ""}`}
            onClick={handleVisibilityClick}
            role="switch"
            aria-checked={!isHidden}
            aria-label={`${isHidden ? t("common.show") : t("common.hide")} ${t("common.section")}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleVisibilityClick(e);
            }}
          >
            {isHidden ? t("common.show") : t("common.visible")}
          </span>
        ) : null}
      </div>
      <div
        className="setup-collapsible__wrap"
        style={{ maxHeight: maxHeight === undefined ? "none" : `${maxHeight}px` }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div ref={contentRef} className="setup-collapsible__content">
          {children}
        </div>
      </div>
    </div>
  );
}
