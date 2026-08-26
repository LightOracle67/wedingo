import { memo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAppUI, useConfig } from "../contexts";
import Modal from "./Modal";
import { INVITE_CACHE_PREFIX, AUDIO_PREFIX, STORAGE_KEYS } from "../lib/storage-keys";
import { PRIVACY_POLICY_VERSION } from "../lib/constants";
import { grantAnalyticsConsent } from "../lib/analytics";
import "../styles/modals.css";

const STORAGE_KEY = STORAGE_KEYS.cookieConsent;
const PREF_STORAGE_KEY = STORAGE_KEYS.cookiePrefs;

/**
 * Acceso directo a localStorage con tolerancia (modo privado, cuota llena).
 * NO usa safeSetItem/safeGetItem de storage.ts a propósito: esas helpers
 * exigen hasStorageConsent(), y este banner es precisamente el que OTORGA el
 * consentimiento (escribirlo a través de ellas sería un rechazo circular).
 */
const ls = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* almacenamiento no disponible */
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

/** Otorga el consentimiento de analítica. El módulo analytics ya está en el
 *  grafo (importado estáticamente por LandingPage/PublicInvitation); el SDK
 *  pesado de firebase/analytics se importa dinámicamente DENTRO de él. Sentry
 *  sí se carga lazy (idle + consentimiento). */
function grantAnalytics() {
  grantAnalyticsConsent();
  import("../lib/sentry").then(({ enableSentryTracking }) => enableSentryTracking());
}

/** Retira el consentimiento de analítica: frena Sentry (replay + close). */
function revokeAnalytics() {
  import("../lib/sentry").then(({ disableSentryTracking }) => disableSentryTracking());
}

/** Registro de consentimiento persistido: estado + timestamp + versión de la
 *  política (GDPR art. 7.1, consentimiento demostrable). */
function saveConsent(status: "accepted" | "rejected", analytics: boolean) {
  ls.set(STORAGE_KEY, JSON.stringify({ status, ts: Date.now(), version: PRIVACY_POLICY_VERSION }));
  ls.set(PREF_STORAGE_KEY, JSON.stringify({ necessary: true, analytics }));
}

function acceptCookies() {
  saveConsent("accepted", true);
  grantAnalytics();
}

function rejectCookies() {
  saveConsent("rejected", false);
  ls.remove(PREF_STORAGE_KEY);
}

/**
 * Registro del consentimiento en el SERVIDOR (GDPR art. 7.1, consentimiento
 * demostrable): cada decisión del banner (aceptar/rechazar/preferencias) se
 * guarda en invitations/{token}/consentLog con estado + versión + timestamp.
 * Sin datos personales del visitante; best-effort (no bloquea la UI).
 */
function logServerConsent(inviteToken: string | undefined, status: "accepted" | "rejected") {
  if (!inviteToken) return;
  addDoc(collection(db, "invitations", inviteToken, "consentLog"), {
    status,
    version: PRIVACY_POLICY_VERSION,
    ts: serverTimestamp(),
  }).catch(() => {
    /* el registro de consentimiento es best-effort */
  });
}

/** Parsea el registro con tolerancia al formato legacy (valor plano). Se exige
 *  `ts` numérico, igual que storage.ts: un registro sin timestamp no es un
 *  consentimiento demostrable (GDPR art. 7.1) y obliga a re-preguntar. */
function parseConsent(raw: string | null): { status: "accepted" | "rejected"; version: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { status?: string; version?: string; ts?: unknown };
    if (
      parsed &&
      (parsed.status === "accepted" || parsed.status === "rejected") &&
      typeof parsed.version === "string" &&
      typeof parsed.ts === "number"
    ) {
      return { status: parsed.status, version: parsed.version };
    }
  } catch {
    /* formato legacy */
  }
  return null;
}

const CookieConsent = memo(function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Sección del accordion de preferencias abierta ("" = ninguna).
  const [openSection, setOpenSection] = useState("necessary");
  const [preferences, setPreferences] = useState({ necessary: true, analytics: false });
  // El banner debe dar acceso directo a la política de privacidad (GDPR
  // art. 7.2). Al abrirla se CIERRA este modal (evita que ambos modales se
  // solapen) y se reabre cuando se cierra la política, sin decidir aún.
  const { legalModal, setLegalModal, cookiePrefsOpen, setCookiePrefsOpen } = useAppUI();
  // inviteToken (si hay invitación): para registrar la decisión en el servidor.
  const { inviteToken } = useConfig();
  const wasHiddenForPolicyRef = useRef(false);

  useEffect(() => {
    // Se muestra el banner si NO hay decisión o si la política cambió de
    // versión (re-consentimiento, GDPR art. 7.2): el consentimiento anterior
    // deja de ser demostrable/pertinente.
    const record = parseConsent(ls.get(STORAGE_KEY));
    if (!record || record.version !== PRIVACY_POLICY_VERSION) {
      setVisible(true);
    }
  }, []);

  // Apertura forzada desde el footer ("Preferencias de cookies"): retirar o
  // cambiar el consentimiento es tan fácil como otorgarlo (GDPR art. 7.3).
  useEffect(() => {
    if (cookiePrefsOpen) {
      setShowSettings(true);
      setVisible(true);
      setCookiePrefsOpen(false);
    }
  }, [cookiePrefsOpen, setCookiePrefsOpen]);

  const handleAccept = () => {
    acceptCookies();
    logServerConsent(inviteToken, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    rejectCookies();
    logServerConsent(inviteToken, "rejected");
    // Sin consentimiento no puede quedar Sentry recogiendo datos (replay).
    revokeAnalytics();
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(INVITE_CACHE_PREFIX) || k.startsWith(AUDIO_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    // ePrivacy art. 5.3: al rechazar no debe quedar la caché offline de
    // Firestore (IndexedDB) de la invitación, solo se limpia la del proyecto.
    import("../lib/data-request").then(({ eraseFirestoreIndexedDB }) => eraseFirestoreIndexedDB());
    setVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent("accepted", preferences.analytics);
    logServerConsent(inviteToken, "accepted");
    if (preferences.analytics) {
      grantAnalytics();
    } else {
      // Se desmarcó analítica: Sentry/GA deben detenerse (GDPR 7.3).
      revokeAnalytics();
      ls.remove(STORAGE_KEYS.inviteCacheLegacy);
    }
    setVisible(false);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === "necessary") return;
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrivacyClick = () => {
    wasHiddenForPolicyRef.current = true;
    setVisible(false);
    setLegalModal("privacy");
  };

  useEffect(() => {
    // Al cerrar la política sin decidir, el banner reaparece.
    if (wasHiddenForPolicyRef.current && !legalModal) {
      wasHiddenForPolicyRef.current = false;
      setVisible(true);
    }
  }, [legalModal]);

  if (!visible) return null;

  // Mismo modal compartido que usa LegalModal: mismo estilo, foco, Escape y
  // animaciones de entrada/salida. El cuerpo es la zona con scroll interior.
  return (
    <Modal
      title={t("cookie.title")}
      closeLabel={t("common.close")}
      onClose={handleReject}
      style={{
        width: 480,
        maxWidth: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        padding: "1.2rem 1rem 1rem",
      }}
    >
      <div className="cookie-consent-body">
        {!showSettings ? (
          <>
            {/* El texto del consentimiento se presenta por puntos clave,
                manteniendo íntegro el contenido de cada sección. */}
            <div className="cookie-consent-points">
              {[1, 2, 3, 4].map((n) => (
                <p className="cookie-consent-point" key={n}>
                  <span className="cookie-consent-point__icon" aria-hidden="true">
                    ✦
                  </span>
                  {t(`cookie.point${n}`)}
                </p>
              ))}
            </div>
            <button type="button" className="cookie-consent-policy" onClick={handlePrivacyClick}>
              {t("cookie.policyLink")}
            </button>
          </>
        ) : (
          <>
            <p className="cookie-consent-text cookie-consent-text--sub">{t("cookie.settingsTitle")}</p>
            {/* Preferencias en secciones accordion (patrón del modal legal):
                cada categoría se despliega para mostrar su descripción y su
                control, evitando un modal demasiado largo. */}
            <div className="cookie-settings-list">
              {[
                {
                  id: "necessary" as const,
                  label: t("cookie.necessary"),
                  desc: t("cookie.necessaryDesc"),
                  control: (
                    <label className="cookie-settings-item">
                      <input type="checkbox" checked disabled onChange={() => {}} />
                      <span>{t("cookie.necessary")}</span>
                    </label>
                  ),
                },
                {
                  id: "analytics" as const,
                  label: t("cookie.analytics"),
                  desc: t("cookie.analyticsDesc"),
                  control: (
                    <label className="cookie-settings-item">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => togglePreference("analytics")}
                      />
                      <span>{t("cookie.analytics")}</span>
                    </label>
                  ),
                },
              ].map((s) => (
                <div key={s.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSection((prev) => (prev === s.id ? "" : s.id))}
                    aria-expanded={openSection === s.id ? "true" : "false"}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.7rem 0",
                      border: "none",
                      borderBottom: "1px solid var(--setup-border)",
                      background: "transparent",
                      color: "var(--setup-title)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Label con flex:1 + minWidth:0: ocupa el espacio disponible y
                      envuelve si es largo (sin empujar el ancho del modal). */}
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>{s.label}</span>
                    <span
                      style={{
                        transform: openSection === s.id ? "rotate(135deg)" : "rotate(0deg)",
                        transition: "transform 300ms ease",
                        fontSize: "1rem",
                        opacity: 0.5,
                        flexShrink: 0,
                        marginLeft: "0.5rem",
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: openSection === s.id ? "400px" : "0px",
                      overflow: "hidden",
                      transition: "max-height 400ms ease, opacity 300ms ease",
                      opacity: openSection === s.id ? 1 : 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.5rem 0 0.8rem",
                        color: "var(--setup-subtitle)",
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <p style={{ margin: "0 0 0.6rem" }}>{s.desc}</p>
                      {s.control}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="cookie-consent-footer">
        {!showSettings ? (
          <>
            <button className="setup-button setup-button--primary" onClick={handleAccept}>
              {t("cookie.accept")}
            </button>
            <button className="setup-button" onClick={handleReject}>
              {t("cookie.reject")}
            </button>
            <button className="setup-button" onClick={() => setShowSettings(true)}>
              {t("cookie.configure")}
            </button>
          </>
        ) : (
          <>
            <button className="setup-button setup-button--primary" onClick={handleSavePreferences}>
              {t("cookie.savePreferences")}
            </button>
            <button className="setup-button" onClick={() => setShowSettings(false)}>
              {t("common.back")}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
});

export default CookieConsent;
