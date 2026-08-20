import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "../lib/storage-keys";
import Modal from "./Modal";
import AnimationChecklist from "./AnimationChecklist";
import { useAnimations } from "../contexts";
import "../styles/a11y.css";
import "../styles/modals.css";

const STORAGE_KEY = STORAGE_KEYS.a11y;

interface A11yPrefs {
  highContrast?: boolean;
  reducedMotion?: boolean;
  dyslexiaFont?: boolean;
  moreSpacing?: boolean;
  underlineLinks?: boolean;
  bigCursor?: boolean;
  desaturate?: boolean;
  strongFocus?: boolean;
  fontSize?: string;
  lineSpacing?: string;
}

function loadPrefs(): A11yPrefs {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: A11yPrefs) {
  // Acceso directo con tolerancia: las preferencias de accesibilidad son
  // almacenamiento técnicamente NECESARIO (no sujeto al consentimiento de
  // cookies, igual que la caché de invitación), así que no se pasa por
  // safeSetItem (que lo bloquearía sin consentimiento). El try/catch cubre
  // el modo privado y la cuota llena.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Valores permitidos para --a11y-font-scale (whitelist: un localStorage
 *  manipulado no puede inyectar CSS arbitrario en las custom properties). */
const FONT_SCALES = new Set(["1", "1.15", "1.3", "1.5"]);
/** Valores permitidos para --a11y-line-spacing. */
const LINE_SPACINGS = new Set(["0", "0.4"]);

function applyPrefs(prefs: A11yPrefs) {
  const root = document.documentElement;
  root.classList.toggle("a11y-high-contrast", !!prefs.highContrast);
  root.classList.toggle("a11y-reduced-motion", !!prefs.reducedMotion);
  root.classList.toggle("a11y-dyslexia-font", !!prefs.dyslexiaFont);
  root.classList.toggle("a11y-more-spacing", !!prefs.moreSpacing);
  root.classList.toggle("a11y-underline-links", !!prefs.underlineLinks);
  root.classList.toggle("a11y-big-cursor", !!prefs.bigCursor);
  root.classList.toggle("a11y-desaturate", !!prefs.desaturate);
  root.classList.toggle("a11y-strong-focus", !!prefs.strongFocus);
  // Solo se aplican valores de la whitelist; cualquier otro (incluido un
  // valor corrupto/inyectado en localStorage) se ignora.
  const fontScale = prefs.fontSize && FONT_SCALES.has(prefs.fontSize) ? prefs.fontSize : "1";
  if (fontScale !== "1") {
    root.style.setProperty("--a11y-font-scale", fontScale);
    root.classList.add("a11y-font-scale");
  } else {
    root.style.removeProperty("--a11y-font-scale");
    root.classList.remove("a11y-font-scale");
  }
  const lineSpacing = prefs.lineSpacing && LINE_SPACINGS.has(prefs.lineSpacing) ? prefs.lineSpacing : "0";
  if (lineSpacing !== "0") {
    root.style.setProperty("--a11y-line-spacing", lineSpacing);
    root.classList.add("a11y-line-spacing");
  } else {
    root.style.removeProperty("--a11y-line-spacing");
    root.classList.remove("a11y-line-spacing");
  }
}

export default function AccessibilityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  // Idioma para la voz (puede faltar en tests/mocks: se degrada a español).
  const lang = (i18n?.language || "es").slice(0, 2);
  // Preferencias de animación del invitado (combina la base del admin con lo
  // que este invitado desactiva en su dispositivo). Requiere AnimationsProvider.
  const { isDisabled, adminDisabled, toggleGuestAnimation, setGuestGroup, setAllGuest, allOff } = useAnimations();
  const [prefs, setPrefs] = useState(() => {
    const loaded = loadPrefs();

    return loaded;
  });
  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);
  const toggle = (key: keyof A11yPrefs) => {
    setPrefs((prev: A11yPrefs) => {
      const next = { ...prev, [key]: !prev[key] };

      savePrefs(next);
      return next;
    });
  };

  const setFontSize = (size: string) => {
    setPrefs((prev: A11yPrefs) => {
      const next = { ...prev, fontSize: size };

      savePrefs(next);
      return next;
    });
  };

  const setLineSpacing = (value: string) => {
    setPrefs((prev: A11yPrefs) => {
      const next = { ...prev, lineSpacing: value };

      savePrefs(next);
      return next;
    });
  };

  // ── Narración por voz (Web Speech API) para invitados senior/ciegos ──
  // CUIDADO: speechSynthesis puede no existir (navegadores antiguos o
  // headless); en ese caso el control no se muestra (no es un fallo).
  const [narrationOn, setNarrationOn] = useState(false);
  // Se guarda el texto a leer en un ref para no cancelar la voz si el idioma
  // cambia a mitad de lectura (el aria-live de estado no debe interrumpir).
  const narrationTextRef = useRef("");
  const narrationOnRef = useRef(false);

  /** Monta el texto de la invitación para leerlo (todas las secciones del
   *  story). Se recorta a 2400 caracteres: narraciones completas más largas
   *  no mejoran la accesibilidad y saturan la cola del lector. */
  const buildNarrationText = () => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-story-section]"));
    const raw = sections
      .map((s) => s.innerText || s.textContent || "")
      .join(". ")
      .replace(/\s+/g, " ")
      .trim();
    return raw.slice(0, 2400);
  };

  const stopNarration = useCallback(() => {
    narrationOnRef.current = false;
    setNarrationOn(false);
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* voz no disponible */
    }
  }, []);

  const startNarration = () => {
    const text = buildNarrationText();
    if (!text) return;
    narrationTextRef.current = text;
    narrationOnRef.current = true;
    setNarrationOn(true);
  };

  // Arranca/para la lectura cuando el texto listo cambia (efecto dedicado,
  // aislado de los re-renders del panel).
  useEffect(() => {
    if (!narrationOn) return;
    const synth = window.speechSynthesis;
    if (!synth || !narrationTextRef.current) {
      setNarrationOn(false);
      return;
    }
    // La voz del idioma activo (si hay voces cargadas); sin voz específica
    // se usa la del sistema (calidad igualmente aceptable).
    const utterance = new SpeechSynthesisUtterance(narrationTextRef.current);
    const voices = synth.getVoices();
    const preferred = voices.find((v) => v.lang && v.lang.startsWith(lang));
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    // Al terminar (natural o por cancel), se limpia el estado si nadie lo
    // está reiniciando (evita que un segundo clic "parar" no haga nada).
    utterance.onend = () => {
      setNarrationOn(false);
    };
    utterance.onerror = () => {
      setNarrationOn(false);
    };
    try {
      synth.speak(utterance);
    } catch {
      setNarrationOn(false);
    }
    return () => {
      try {
        synth.cancel();
      } catch {
        /* noop */
      }
    };
  }, [narrationOn, lang]);

  // Al cerrar el panel se detiene la narración (no sigue leyendo en segundo
  // plano) y al desmontar se cancela todo.
  useEffect(() => {
    if (!open) stopNarration();
  }, [open, stopNarration]);
  useEffect(
    () => () => {
      narrationOnRef.current = false;
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    },
    [],
  );

  const supportsSpeech =
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";

  if (!open) return null;

  return (
    <Modal
      title={t("a11y.title")}
      closeLabel={t("a11y.close")}
      onClose={onClose}
      style={{ maxWidth: "400px", padding: "1.2rem 1rem 1rem" }}
    >
      <div className="a11y-section">
        <p className="a11y-label">{t("a11y.fontSize")}</p>
        <div className="a11y-btn-row">
          {[
            { val: "1", key: "fontNormal" },
            { val: "1.15", key: "fontLarge" },
            { val: "1.3", key: "fontExtraLarge" },
            { val: "1.5", key: "fontHuge" },
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

      {/* Narración por voz: opción senior/lectura en voz alta. Solo se muestra
          si el navegador la soporta; si no, el control no aparece (el resto
          del panel funciona igual). */}
      {supportsSpeech ? (
        <div className="a11y-section">
          <p className="a11y-label">{t("a11y.narrationTitle")}</p>
          <button
            type="button"
            className={`a11y-btn ${narrationOn ? "a11y-btn--active" : ""}`}
            onClick={narrationOn ? stopNarration : startNarration}
          >
            {narrationOn ? t("a11y.stopNarrate") : t("a11y.narrate")}
          </button>
          <p className="a11y-animations-hint" aria-live="polite">
            {narrationOn ? t("a11y.narrating") : t("a11y.animationsHint")}
          </p>
        </div>
      ) : (
        <div className="a11y-section">
          <p className="a11y-animations-hint">{t("a11y.narrationUnsupported")}</p>
        </div>
      )}

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

      {/* ── Animaciones: desactivar individualmente (del sobre al confeti) ── */}
      <div className="a11y-section">
        <p className="a11y-label">{t("a11y.animationsTitle")}</p>
        <p className="a11y-animations-hint">{t("a11y.animationsHint")}</p>
        <div className="a11y-animations-scroll">
          <AnimationChecklist
            checked={(id) => !isDisabled(id)}
            onToggle={toggleGuestAnimation}
            locked={adminDisabled}
            idPrefix="guest-"
            compact
            allOff={allOff}
            onToggleAll={setAllGuest}
            onGroupToggle={setGuestGroup}
          />
        </div>
      </div>
    </Modal>
  );
}
