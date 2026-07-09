import { useEffect, useRef, useState } from "react";

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
  root.style.setProperty("--a11y-font-scale", prefs.fontSize || "1");
}

export default function AccessibilityPanel({ open, onClose }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const modalRef = useRef(null);

  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!open) return;
    modalRef.current?.focus();
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Accesibilidad">
      <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "380px", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        <p className="modal-title">Accesibilidad</p>

        <div className="a11y-section">
          <p className="a11y-label">Tamaño de texto</p>
          <div className="a11y-btn-row">
            {[
              { val: "1", label: "Normal" },
              { val: "1.15", label: "Grande" },
              { val: "1.3", label: "Extra grande" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`a11y-btn ${prefs.fontSize === opt.val || (!prefs.fontSize && opt.val === "1") ? "a11y-btn--active" : ""}`}
                onClick={() => setFontSize(opt.val)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.highContrast} onChange={() => toggle("highContrast")} />
            <span className="a11y-toggle__track" />
            <span>Alto contraste</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.reducedMotion} onChange={() => toggle("reducedMotion")} />
            <span className="a11y-toggle__track" />
            <span>Reducir animaciones</span>
          </label>
        </div>

        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.dyslexiaFont} onChange={() => toggle("dyslexiaFont")} />
            <span className="a11y-toggle__track" />
            <span>Fuente para dislexia</span>
          </label>
        </div>
      </div>
    </div>
  );
}
