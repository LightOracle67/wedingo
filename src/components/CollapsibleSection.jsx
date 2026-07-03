import { useCallback, useRef, useState } from "react";

export default function CollapsibleSection({
  title, hint, defaultOpen = false, children,
  sectionKey, isHidden, onToggleVisibility,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [maxHeight, setMaxHeight] = useState(defaultOpen ? undefined : 0);
  const contentRef = useRef(null);
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

  const handleTransitionEnd = (e) => {
    if (e.propertyName === "max-height" && isOpen) {
      setMaxHeight(undefined);
    }
  };

  const handleVisibilityClick = useCallback((e) => {
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
            {isHidden ? <span className="setup-collapsible__hidden-badge">Oculta</span> : null}
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
            aria-label={`${isHidden ? "Mostrar" : "Ocultar"} sección`}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleVisibilityClick(e); }}
          >
            {isHidden ? "Mostrar" : "Visible"}
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
