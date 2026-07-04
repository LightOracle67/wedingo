import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import SetupForm from "../components/SetupForm";

export default function SetupPage() {
  const navigate = useNavigate();
  const { inviteToken } = useParams();
  const {
    hasStoredConfig, isConfigLoading, configLoadError,
    setupToken, setupTokenInput, setSetupTokenInput,
    isTokenVerifying, isTokenVerified,
    authMessage, authMessageType,
    handleTokenLogin, handleResetSetupToken,
    saveMessage, config,
    confirmTokenInput, setConfirmTokenInput,
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
        navigate(`/${inviteToken}`, { replace: true });
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
        <section className="setup-card allow-select" aria-label="Cargando configuración">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Configuración</p>
              <h1 className="setup-title">Cargando invitación</h1>
              <p className="setup-subtitle">Estamos cargando los datos guardados.</p>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (configLoadError) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Error de carga">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Error de conexión</p>
              <h1 className="setup-title">No pudimos cargar la invitación</h1>
              <p className="setup-subtitle">{configLoadError}</p>
            </div>
          </header>
          <div className="setup-actions">
            <button className="setup-button" type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (hasStoredConfig && !showSuccess && !saveMessage) {
    return <Navigate to={`/${inviteToken}/admin`} replace />;
  }

  if (!isTokenVerified) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Acceso con código">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Primeros pasos</p>
              <h1 className="setup-title">Accede con tu código</h1>
              <p className="setup-subtitle">
                Introduce tu usuario y el código de acceso para gestionar la invitación.
              </p>
            </div>
          </header>

          <form className="setup-form" onSubmit={(e) => { e.preventDefault(); handleTokenLogin(); }}>
            <label className="setup-label" htmlFor="setupTokenLoginCode">
              Código de acceso
            </label>
            <p className="setup-help setup-help--tight">
              Cópialo tal como aparece. Si no lo tienes, genera uno nuevo.
            </p>
            <input
              id="setupTokenLoginCode"
              className="setup-input setup-token-input"
              type="password"
              value={setupTokenInput}
              onChange={(e) => setSetupTokenInput(e.target.value.toUpperCase())}
              placeholder="Pega aquí el código de acceso"
              maxLength={47}
              autoComplete="current-password"
              spellCheck="false"
            />
            {setupToken ? <p className="setup-token-display">Código activo (solo tú lo ves).</p> : null}

            <label className="setup-label" htmlFor="setupConfirmReset">
              Confirmar
            </label>
            <p className="setup-help setup-help--tight">
              Para generar un código nuevo, escribe el código de acceso actual.
            </p>
            <input
              id="setupConfirmReset"
              className="setup-input"
              value={confirmTokenInput}
              onChange={(e) => setConfirmTokenInput(e.target.value)}
              placeholder="Pega aquí el código actual"
              autoComplete="off"
              spellCheck="false"
            />

            <div className="setup-actions">
              <button className="setup-button" type="submit" disabled={isTokenVerifying}>
                {isTokenVerifying ? "Comprobando..." : "Entrar"}
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={handleResetSetupToken}>
                Generar nuevo código
              </button>
            </div>

          </form>
        </section>
      </div>
    );
  }

  const coupleName = `${config.firstName} & ${config.secondName}`;

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label="Configuración inicial">
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">Configuración inicial</p>
            <h1 className="setup-title">Preparamos tu invitación</h1>
            <p className="setup-subtitle">
              {showSuccess ? "Tu invitación está lista" : "Completa los datos de la invitación."}
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
            <p className="setup-success-card__title">Invitación creada</p>
            <p className="setup-success-card__names">{coupleName}</p>
            <p className="setup-success-card__text">
              Los datos están guardados y la invitación ya está disponible.
            </p>
            <div className="setup-actions" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
              <button className="setup-button" type="button" onClick={() => navigate(`/${inviteToken}/admin`)}>
                Ir al panel
              </button>
              <button className="setup-button setup-button--ghost" type="button" onClick={() => navigate(`/${inviteToken}`)}>
                Ver portada
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
