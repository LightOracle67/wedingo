import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function CollapsibleSection({
  title, hint, defaultOpen = false, children,
  sectionKey, isHidden, onToggleVisibility,
}: any) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [maxHeight, setMaxHeight] = useState(defaultOpen ? undefined : 0);
  const contentRef = useRef<any>(null);
  const hasMeasured = useRef(defaultOpen);

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
      hasMeasured.current = false;
      if (contentRef.current) {
        setMaxHeight(contentRef.current.scrollHeight);
        hasMeasured.current = true;
      }
      setIsOpen(true);
    }
  };

  const handleTransitionEnd = (e: any) => {
    if (e.propertyName === "max-height" && isOpen) {
      setMaxHeight(undefined);
    }
  };

  const handleVisibilityClick = useCallback((e: any) => {
    e.stopPropagation();
    if (sectionKey && onToggleVisibility) {
      onToggleVisibility(sectionKey);
    }
  }, [sectionKey, onToggleVisibility]);

  return (
    <div className="setup-collapsible" data-open={isOpen}>
      <div className="setup-collapsible__summary">
        <button
          type="button"
          className="setup-collapsible__summary-btn"
          onClick={toggle}
          aria-expanded={isOpen}
        >
          <span className="setup-collapsible__summary-text">
            {isHidden ? <span className="setup-collapsible__hidden-badge">{t("common.hidden")}</span> : null}
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
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleVisibilityClick(e); }}
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
