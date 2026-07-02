import { useRef, useState } from "react";

export default function CollapsibleSection({ title, hint, defaultOpen = false, children }) {
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

  return (
    <div className="setup-collapsible" data-open={isOpen}>
      <button
        type="button"
        className="setup-collapsible__summary"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <span className="setup-collapsible__title">{title}</span>
        {hint ? <span className="setup-collapsible__hint">{hint}</span> : null}
      </button>
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
