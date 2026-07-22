import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../hooks/useToast";
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
    saveMessage, config, setupToken,
  } = useApp();

  const { addToast } = useToast();

  useEffect(() => {
    if (authMessage) {
      addToast(authMessageType === "success" ? "success" : "error", authMessage);
    }
  }, [authMessage, authMessageType, addToast]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (showSuccess && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const timer = setTimeout(() => {
        navigate(`/${inviteToken}/admin`, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, navigate, inviteToken]);

  useEffect(() => {
    if (saveMessage && hasStoredConfig) {
      setIsTransitioning(true);
      setShowTokenModal(true);
      setIsTransitioning(false);
    }
  }, [saveMessage, hasStoredConfig]);

  const handleTokenModalClose = () => {
    setShowTokenModal(false);
    setShowSuccess(true);
    try {
      const username = config.adminUsername;
      if (username && setupToken) {
        const cred = new PasswordCredential({ id: username, password: setupToken, name: username });
        navigator.credentials.store(cred);
      }
    } catch {}
  };

  const handleCopyToken = () => {
    if (setupToken) {
      navigator.clipboard.writeText(setupToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

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
      {config.musicFile || config.musicUrl ? <MusicPlayer musicUrl={config.musicFile || config.musicUrl} /> : null}
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

        <div className={`setup-page-transition ${isTransitioning ? "setup-page-fade-out" : ""} ${showSuccess ? "setup-page-hidden" : ""}`}>
          <div className="setup-form">
            <SetupForm prefix="setup" />
          </div>
        </div>

        {showTokenModal ? (
          <div className="modal-overlay" onClick={() => {}} role="dialog" aria-modal="true" aria-label={t("setup.tokenModalTitle")}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <p className="modal-title">{t("setup.tokenModalTitle")}</p>
              <p className="setup-help">{t("setup.tokenModalText")}</p>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem" }}>
                <input
                  className="setup-input"
                  value={setupToken || ""}
                  readOnly
                  style={{ flex: 1, fontFamily: "monospace", fontSize: "0.85rem", textAlign: "center" }}
                  onFocus={(e) => e.target.select()}
                />
                <button className="setup-button setup-button--compact" type="button" onClick={handleCopyToken} style={{ flexShrink: 0 }}>
                  {tokenCopied ? t("common.copied") : t("common.copy")}
                </button>
              </div>
              <div className="setup-actions" style={{ marginTop: "1rem" }}>
                <button className="setup-button" type="button" onClick={handleTokenModalClose}>
                  {t("setup.tokenModalContinue")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSuccess ? (
          <div className="setup-success-card animate-card-reveal">
            <div className="setup-success-card__icon">✓</div>
            <p className="setup-success-card__title">{t("setup.successTitle")}</p>
            <p className="setup-success-card__names">{coupleName}</p>
            <p className="setup-success-card__text">
              {t("setup.successText")}
            </p>
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
