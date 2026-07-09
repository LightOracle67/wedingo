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
    root.style.setProperty("--a11y-line-spacing", `${prefs.lineSpacing}rem`);
    root.classList.add("a11y-line-spacing");
  } else {
    root.style.removeProperty("--a11y-line-spacing");
    root.classList.remove("a11y-line-spacing");
  }
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

  const setLineSpacing = (value) => {
    setPrefs((prev) => {
      const next = { ...prev, lineSpacing: value };
      savePrefs(next);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Accesibilidad">
      <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px", padding: "1.2rem 1rem 1rem" }}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        <p className="modal-title">Accesibilidad</p>

        {/* Tamaño de fuente */}
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

        {/* Espaciado de línea */}
        <div className="a11y-section">
          <p className="a11y-label">Espaciado entre líneas</p>
          <div className="a11y-btn-row">
            {[
              { val: "0", label: "Normal" },
              { val: "0.4", label: "Amplio" },
              { val: "0.8", label: "Muy amplio" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`a11y-btn ${(prefs.lineSpacing || "0") === opt.val ? "a11y-btn--active" : ""}`}
                onClick={() => setLineSpacing(opt.val)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alto contraste */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.highContrast} onChange={() => toggle("highContrast")} />
            <span className="a11y-toggle__track" />
            <span>Alto contraste</span>
          </label>
        </div>

        {/* Reducir animaciones */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.reducedMotion} onChange={() => toggle("reducedMotion")} />
            <span className="a11y-toggle__track" />
            <span>Reducir animaciones</span>
          </label>
        </div>

        {/* Fuente dislexia */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.dyslexiaFont} onChange={() => toggle("dyslexiaFont")} />
            <span className="a11y-toggle__track" />
            <span>Fuente OpenDyslexic</span>
          </label>
        </div>

        {/* Espaciado mejorado */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.moreSpacing} onChange={() => toggle("moreSpacing")} />
            <span className="a11y-toggle__track" />
            <span>Mayor espaciado de letras</span>
          </label>
        </div>

        {/* Subrayar enlaces */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.underlineLinks} onChange={() => toggle("underlineLinks")} />
            <span className="a11y-toggle__track" />
            <span>Subrayar todos los enlaces</span>
          </label>
        </div>

        {/* Cursor grande */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.bigCursor} onChange={() => toggle("bigCursor")} />
            <span className="a11y-toggle__track" />
            <span>Cursor grande</span>
          </label>
        </div>

        {/* Desaturar */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.desaturate} onChange={() => toggle("desaturate")} />
            <span className="a11y-toggle__track" />
            <span>Escala de grises</span>
          </label>
        </div>

        {/* Foco mejorado */}
        <div className="a11y-section">
          <label className="a11y-toggle">
            <input type="checkbox" checked={!!prefs.strongFocus} onChange={() => toggle("strongFocus")} />
            <span className="a11y-toggle__track" />
            <span>Indicadores de foco visibles</span>
          </label>
        </div>
      </div>
    </div>
  );
}
