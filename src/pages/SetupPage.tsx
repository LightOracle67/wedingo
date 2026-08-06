import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useApp } from "../contexts";
import { normalizeConfig } from "../lib/normalize-config";
import { useToast } from "../hooks/useToast";
import { safeGetItem } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storage-keys";
import SetupForm from "../components/SetupForm";
import MusicPlayer from "../components/MusicPlayer";
import "../styles/admin.css";

export default function SetupPage() {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { inviteToken } = useParams();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    authMessage, authMessageType,
    saveMessage, config, formData, setupToken, generateNewToken,
  } = useApp();

  const { addToast } = useToast();
  // El token de acceso único, para recordarlo en la tarjeta de éxito (la
  // sección Acceso se oculta al verificar la sesión y era irrecuperable si no
  // se guardaba antes).
  const setupTokenValue = (() => {
    try { return safeGetItem(STORAGE_KEYS.setupToken(inviteToken || ""), sessionStorage) || setupToken || ""; } catch { return setupToken || ""; }
  })();

  useEffect(() => {
    if (authMessage) {

      addToast(authMessageType === "success" ? "success" : "error", authMessage);
    }
  }, [authMessage, authMessageType, addToast]);

  // Avisa antes de salir de la página si hay cambios sin guardar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        // Comparación normalizada: el autosave trimea, un espacio final ya
        // guardado no debe disparar el aviso.
        const norm = (v: typeof formData) => JSON.stringify(normalizeConfig(v));
        if (norm(formData) !== norm(config)) {
          e.preventDefault();
          e.returnValue = "";
        }
      } catch { /* comparación no disponible */ }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formData, config]);

  const [showSuccess, setShowSuccess] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Generación temprana del token de setup: se registra (hash) antes de que
  // exista la invitación para que la activación de sesión sea verificable.
  // Si ya hay un token en sessionStorage (p. ej. creado en la landing), no se
  // regenera: lo recupera AuthContext vía refreshSetupToken.
  useEffect(() => {
    if (!hasStoredConfig && !setupToken && inviteToken) {
      const stored = safeGetItem(STORAGE_KEYS.setupToken(inviteToken), sessionStorage);
      if (!stored) {
        (async () => { try { await generateNewToken(); } catch { } })();
      }
    }
  }, [hasStoredConfig, setupToken, inviteToken, generateNewToken]);

  // Tras guardar la primera vez, muestra la tarjeta de éxito (el token ya se
  // mostró en el formulario y se confirmó antes de guardar). El auto-login
  // utiliza las credenciales (token) previas vía onFirstSave.
  useEffect(() => {

    if (saveMessage && hasStoredConfig) {
      setShowSuccess(true);
    }
  }, [saveMessage, hasStoredConfig]);

  // Redirige al panel automáticamente tras el éxito.
  useEffect(() => {

    if (showSuccess && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const timer = setTimeout(() => {

        navigate(`/${inviteToken}/admin`, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, navigate, inviteToken]);

  if (isConfigLoading) {
    return (
      <div className="setup-layout setup-layout--full">
        <section className="setup-card setup-card--full allow-select" aria-label={t("setup.loadingTitle")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("setup.configTitle")}</p>
              <h1 className="setup-title">{t("setup.loadingTitle")}</h1>
              <p className="setup-subtitle">{t("setup.loadingText")}</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="setup-layout setup-layout--full">
        <section className="setup-card setup-card--full allow-select" aria-label={t("setup.errorTitle")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("common.error")}</p>
              <h1 className="setup-title">{t("setup.errorTitle")}</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              {t("common.retry")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (hasStoredConfig && !showSuccess && !saveMessage) {
    return <Navigate to={`/${inviteToken}/admin`} replace />;
  }



  const coupleName = `${config.firstName} & ${config.secondName}`;

  return (
    <div className="setup-layout setup-layout--full">
      {config.musicFile ? <MusicPlayer musicUrl={config.musicFile} /> : null}
      <section className="setup-card setup-card--full allow-select" aria-label={t("setup.configTitle")}>
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">{t("setup.configTitle")}</p>
            <h1 className="setup-title">{t("setup.configSubtitle")}</h1>
            <p className="setup-subtitle">
              {showSuccess ? t("setup.readyText") : t("setup.configText")}
            </p>
          </div>
        </header>

        <div className={`setup-page-transition ${showSuccess ? "setup-page-hidden" : ""}`}>
          <div className="setup-form">
            <SetupForm prefix="setup" />
          </div>
        </div>

        {showSuccess ? (
          <div className="setup-success-card animate-card-reveal">
            <div className="setup-success-card__icon">✓</div>
            <p className="setup-success-card__title">{t("setup.successTitle")}</p>
            <p className="setup-success-card__names">{coupleName}</p>
            <p className="setup-success-card__text">
              {t("setup.successText")}
            </p>
            <div className="setup-success-card__token" role="note">
              <p className="setup-help">{t("setup.successKeepToken")}</p>
              <code className="setup-success-card__code">{setupTokenValue}</code>
              <button className="setup-button setup-button--ghost setup-button--compact" type="button" onClick={() => {
                if (!setupTokenValue) return;
                navigator.clipboard?.writeText(setupTokenValue).catch(() => {});
                addToast("success", t("setup.tokenCopied"));
              }}>{t("setup.copyToken")}</button>
            </div>
            <div className="setup-actions" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
              <button className="setup-button" type="button" onClick={() => navigate(`/${inviteToken}/admin`)}>
                {t("setup.goToPanel")}
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={() => navigate(`/${inviteToken}`)}>
                {t("setup.viewCover")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
