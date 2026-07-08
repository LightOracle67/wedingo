import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import SetupForm from "../components/SetupForm";

export default function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { inviteToken } = useParams();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    authMessage, authMessageType,
    saveMessage, config,
  } = useApp();

  const { addToast } = useToast();

  useEffect(() => {
    if (authMessage) {
      addToast(authMessageType === "success" ? "success" : "error", authMessage);
    }
  }, [authMessage, authMessageType, addToast]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (saveMessage && hasStoredConfig && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const timer = setTimeout(() => {
        navigate(`/${inviteToken}/admin`, { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage, hasStoredConfig, navigate, inviteToken]);

  useEffect(() => {
    if (saveMessage && hasStoredConfig) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setShowSuccess(true);
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [saveMessage, hasStoredConfig]);

  if (isConfigLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label={t("setup:loadingTitle")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("setup:configTitle")}</p>
              <h1 className="setup-title">{t("setup:loadingTitle")}</h1>
              <p className="setup-subtitle">{t("setup:loadingText")}</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label={t("setup:errorTitle")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("common:error")}</p>
              <h1 className="setup-title">{t("setup:errorTitle")}</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              {t("common:retry")}
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
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label={t("setup:configTitle")}>
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">{t("setup:configTitle")}</p>
            <h1 className="setup-title">{t("setup:configSubtitle")}</h1>
            <p className="setup-subtitle">
              {showSuccess ? t("setup:readyText") : t("setup:configText")}
            </p>
          </div>
        </header>

        <div className={`setup-page-transition ${isTransitioning ? "setup-page-fade-out" : ""} ${showSuccess ? "setup-page-hidden" : ""}`}>
          <div className="setup-form">
            <SetupForm prefix="setup" />
          </div>
        </div>

        {showSuccess ? (
          <div className="setup-success-card animate-card-reveal">
            <div className="setup-success-card__icon">✓</div>
            <p className="setup-success-card__title">{t("setup:successTitle")}</p>
            <p className="setup-success-card__names">{coupleName}</p>
            <p className="setup-success-card__text">
              {t("setup:successText")}
            </p>
            <div className="setup-actions" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
              <button className="setup-button" type="button" onClick={() => navigate(`/${inviteToken}/admin`)}>
                {t("setup:goToPanel")}
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={() => navigate(`/${inviteToken}`)}>
                {t("setup:viewCover")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
