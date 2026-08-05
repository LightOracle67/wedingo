import { useApp } from "../contexts";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { db, invitationDocRef } from "../lib/firebase";
import { normalizeTokenValue, generateSetupToken } from "../lib/token-utils";
import { generateInviteToken } from "../lib/utils";
import { createSetupTokenRecord, findInviteBySetupToken, hashSetupToken } from "../lib/setup-token";
import { normalizeConfig } from "../lib/normalize-config";
import { defaultConfig } from "../lib/constants";
import { safeSetItem } from "../lib/storage";
import { clearExpiredCache } from "../lib/storage-utils";
import { saveSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { useFocusTrap, useEscapeKey } from "../hooks/useFocusTrap";
import "../styles/landing.css";
import "../styles/admin.css";
import "../styles/modals.css";

export default function LandingPage() {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIsTokenVerified, setTokenLoginUsername } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useFocusTrap(showModal);
  useEscapeKey(() => setShowModal(false), showModal);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const loginAttemptsRef = useRef(0);
  const loginBlockedUntilRef = useRef(0);

  const handleCreate = async () => {
    setError("");

    const token = generateInviteToken();
    // Token de setup generado y registrado (hash) antes de que exista la
    // invitación, de modo que la activación de sesión pueda verificarse.
    const setupToken = normalizeTokenValue(generateSetupToken());

    safeSetItem(STORAGE_KEYS.inviteToken, token, sessionStorage);
    safeSetItem(STORAGE_KEYS.setupToken(token), setupToken, sessionStorage);

    try {
      await createSetupTokenRecord(token, setupToken);
    } catch (err) {
      console.error("[app]", "[LandingPage]", "create setup token failed", { error: err });
      setError(t("landing.errorCreateFailed"));
      return;
    }

    navigate(`/${token}/setup`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Date.now() < loginBlockedUntilRef.current) {
      const waitSec = Math.ceil((loginBlockedUntilRef.current - Date.now()) / 1000);

      setError(t("landing.errorTooManyAttempts", { seconds: waitSec }));
      return;
    }
    const username = (usernameInput || "").trim();
    const raw = (tokenInput || "").trim();
    if (!username || !raw) {

      setError(t("landing.errorEmpty"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;

      }
      return;
    }

    setIsLoading(true);
    setError("");

    const normalized = normalizeTokenValue(raw);
    if (normalized.length < 20) {

      setError(t("landing.errorInvalidToken"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;

      }
      setIsLoading(false);
      return;
    }

    try {

      // Localiza la invitación por el hash del token (sin enumerar la colección).
      const target = await findInviteBySetupToken(normalized);
      if (!target) {

        setError(t("landing.errorTokenNotFound"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;

        }
        setIsLoading(false);
        return;
      }

      const inviteRef = invitationDocRef(target);
      const inviteSnap = await getDoc(inviteRef);
      const matchedData = inviteSnap.exists() ? inviteSnap.data() : null;

      if (matchedData?.adminUsername && matchedData.adminUsername.toLowerCase() !== username.toLowerCase()) {

        setError(t("landing.errorUsernameMismatch"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;

        }
        setIsLoading(false);
        return;
      }

      if (matchedData) {
        try {
          const parsed = normalizeConfig(matchedData);
          const hydrated = { ...defaultConfig, ...parsed };
          safeSetItem(STORAGE_KEYS.inviteCache(target), JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        } catch {}
      }

      if (matchedData?.activeSession) {

        setIsLoading(false);
        if (!window.confirm(t("landing.sessionExists"))) {

          return;
        }

        setIsLoading(true);
      }

      // Prueba de conocimiento del token para activar la sesión.
      const tokenHash = await hashSetupToken(normalized);

      try {

        await runTransaction(db, async (transaction) => {
          const inviteRefInTx = invitationDocRef(target);
          const inviteSnapInTx = await transaction.get(inviteRefInTx);
          if (!inviteSnapInTx.exists()) {
            transaction.set(inviteRefInTx, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry(), setupTokenHash: tokenHash });
          } else {
            transaction.update(inviteRefInTx, {
              activeSession: serverTimestamp(),
              sessionExpiresAt: firestoreSessionExpiry(),
              setupTokenHash: tokenHash,
            });
          }
        });

      } catch (err) {
        console.error("[app]", "[LandingPage]", "transaction failed", { error: err });
        setError(t("landing.errorTransactionFailed"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;

        }
        setIsLoading(false);
        return;
      }

      safeSetItem(STORAGE_KEYS.inviteToken, target, sessionStorage);
      safeSetItem(STORAGE_KEYS.setupToken(target), normalized, sessionStorage);
      clearExpiredCache();
      saveSession("admin", username);
      setTokenLoginUsername(username);
      setIsTokenVerified(true);

      // NOTA: el token de setup NO se guarda en el Credential Manager del
      // navegador: es una credencial de tipo bearer que concede sesión de
      // admin y no debe replicarse/sincronizarse por el sistema operativo.
      navigate(`/${target}`);
    } catch (err) {
      console.error("[app]", "[LandingPage]", "login verify failed", { error: err });
      setError(t("landing.errorVerifyFailed"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;

      }
    }

    setIsLoading(false);
  };

  const openModal = () => {

    setUsernameInput("");
    setTokenInput("");
    setError("");
    setShowModal(true);
  };

  return (
    <div className="app-scene">
      <section className="story-section story-section--is-active landing-bg flex min-h-screen items-center justify-center px-4">
        <div className="story-panel story-panel--hero w-full max-w-md text-center">
          <h1 className="hero-title invite-title text-[clamp(2.5rem,8vw,4.5rem)] leading-tight font-serif text-boda-texto">
            {t("landing.title")}
          </h1>
          <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
            {t("landing.subtitle")}
          </p>
          <div className="story-divider my-6" />
          <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
            {t("landing.description")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" className="setup-button text-sm" onClick={handleCreate}>
              {t("landing.createInvitation")}
            </button>
            <button type="button" className="setup-button setup-button--ghost text-sm" onClick={openModal}>
              {t("landing.haveInvitation")}
            </button>
          </div>
        </div>
      </section>
      {showModal && (
        <div className="modal-overlay" onClick={() => { ; setShowModal(false); }} role="dialog" aria-modal="true" aria-label={t("landing.modalTitle")}>
          <div className="modal-card" ref={modalRef as React.RefObject<HTMLDivElement>} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" ref={closeButtonRef} onClick={() => { ; setShowModal(false); }} aria-label={t("common.close")}>
              &times;
            </button>
            <form action="#" onSubmit={handleLogin}>
              <p className="modal-title">{t("landing.modalTitle")}</p>
              <label className="setup-label" htmlFor="loginUsernameInput">
                {t("landing.usernameLabel")}
              </label>
              <input
                id="loginUsernameInput"
                name="username"
                className="setup-input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]/g, "").slice(0, 50))}
                placeholder={t("landing.usernamePlaceholder")}
                autoComplete="username"
                spellCheck="false"
                autoFocus
              />
              <label className="setup-label" htmlFor="loginTokenInput" style={{ marginTop: "0.75rem" }}>
                {t("landing.tokenLabel")}
              </label>
              <input
                id="loginTokenInput"
                name="password"
                className="setup-input"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.replace(/[^a-zA-Z0-9/:.?=&-]/g, "").slice(0, 80))}
                placeholder={t("landing.tokenPlaceholder")}
                autoComplete="current-password"
                spellCheck="false"
              />
              {error && <p className="setup-error" role="alert">{error}</p>}
              <div className="setup-actions">
                <button className="setup-button" type="submit" disabled={isLoading || usernameInput.trim().length < 1 || tokenInput.trim().length < 20}>
                  {isLoading ? t("landing.loginLoading") : t("landing.loginButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
