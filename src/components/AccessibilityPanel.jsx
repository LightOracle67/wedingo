import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap, useEscapeKey } from "../hooks/useFocusTrap";

const STORAGE_KEY = "wedin_a11y";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs) {
  const root = document.documentElement;
  root.classList.toggle("a11y-high-contrast", !!prefs.highContrast);
  root.classList.toggle("a11y-reduced-motion", !!prefs.reducedMotion);
  root.classList.toggle("a11y-dyslexia-font", !!prefs.dyslexiaFont);
  root.classList.toggle("a11y-more-spacing", !!prefs.moreSpacing);
  root.classList.toggle("a11y-underline-links", !!prefs.underlineLinks);
  root.classList.toggle("a11y-big-cursor", !!prefs.bigCursor);
  root.classList.toggle("a11y-desaturate", !!prefs.desaturate);
  root.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);
  if (prefs.fontSize && prefs.fontSize !== "1") {
    root.style.setProperty("--a11y-font-scale", prefs.fontSize);
    root.classList.add("a11y-font-scale");
  } else {
    root.style.removeProperty("--a11y-font-scale");
    root.classList.remove("a11y-font-scale");
  }
  if (prefs.lineSpacing && prefs.lineSpacing !== "0") {
    root.style.setProperty("--a11y-line-spacing", prefs.lineSpacing);
    root.classList.add("a11y-line-spacing");
  } else {
    root.style.removeProperty("--a11y-line-spacing");
    root.classList.remove("a11y-line-spacing");
  }
}

export default function AccessibilityPanel({ open, onClose }) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(loadPrefs);
  const modalRef = useFocusTrap(open);
  useEscapeKey(onClose, open);

  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  const toggle = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  };

  const setFontSize = (size) => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: size };
      savePrefs(next);
      return next;
    });
  };

  const setLineSpacing = (value) => {
    setPrefs((prev) => {
      const next = { ...prev, lineSpacing: value };
      savePrefs(next);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t("a11y.title")}>
      <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={onClose} aria-label={t("a11y.close")}>&times;</button>
        <p className="modal-title">{t("a11y.title")}</p>

        <div className="a11y-section">
          <p className="a11y-label">{t("a11y.fontSize")}</p>
          <div className="a11y-btn-row">
            {[
              { val: "1", key: "fontNormal" },
              { val: "1.15", key: "fontLarge" },
              { val: "1.3", key: "fontExtraLarge" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`a11y-btn ${prefs.fontSize === opt.val || (!prefs.fontSize && opt.val === "1") ? "a11y-btn--active" : ""}`}
                onClick={() => setFontSize(opt.val)}
              >
                {t(`a11y.${opt.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="a11y-section">
          <p className="a11y-label">{t("a11y.lineSpacing")}</p>
          <div className="a11y-btn-row">
            {[
              { val: "0", key: "lineNormal" },
              { val: "0.4", key: "lineWide" },
              { val: "0.8", key: "lineVeryWide" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`a11y-btn ${(prefs.lineSpacing || "0") === opt.val ? "a11y-btn--active" : ""}`}
                onClick={() => setLineSpacing(opt.val)}
              >
                {t(`a11y.${opt.key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.highContrast} onChange={() => toggle("highContrast")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.highContrast")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.reducedMotion} onChange={() => toggle("reducedMotion")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.reducedMotion")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.dyslexiaFont} onChange={() => toggle("dyslexiaFont")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.dyslexiaFont")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.moreSpacing} onChange={() => toggle("moreSpacing")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.moreSpacing")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.underlineLinks} onChange={() => toggle("underlineLinks")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.underlineLinks")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.bigCursor} onChange={() => toggle("bigCursor")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.bigCursor")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.desaturate} onChange={() => toggle("desaturate")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.desaturate")}</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.strongFocus} onChange={() => toggle("strongFocus")} />
            <span className="a11y-toggle__track" />
            <span>{t("a11y.strongFocus")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
