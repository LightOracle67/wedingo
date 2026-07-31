import { useApp } from "../contexts";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocs, query, where, serverTimestamp, runTransaction } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db, invitationDocRef, INVITATIONS_COLLECTION_REF } from "../lib/firebase";
import { normalizeTokenValue } from "../lib/token-utils";
import { generateInviteToken } from "../lib/utils";
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
  console.log("[app]", "[LandingPage]", "mount", {});
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

  const handleCreate = () => {
    console.log("[app]", "[LandingPage]", "handleCreate - generate invite token", {});
    const token = generateInviteToken();
    console.log("[app]", "[LandingPage]", "new token generated, navigating to setup", { token });
    safeSetItem("wedin_invite_token", token, sessionStorage);
    navigate(`/${token}/setup`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[app]", "[LandingPage]", "handleLogin start", { attempts: loginAttemptsRef.current, blocked: loginBlockedUntilRef.current > Date.now() });
    if (Date.now() < loginBlockedUntilRef.current) {
      const waitSec = Math.ceil((loginBlockedUntilRef.current - Date.now()) / 1000);
      console.log("[app]", "[LandingPage]", "rate limited", { waitSec });
      setError(t("landing.errorTooManyAttempts", { seconds: waitSec }));
      return;
    }
    const username = (usernameInput || "").trim();
    const raw = (tokenInput || "").trim();
    if (!username || !raw) {
      console.log("[app]", "[LandingPage]", "empty fields", {});
      setError(t("landing.errorEmpty"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;
        console.log("[app]", "[LandingPage]", "rate limit activated (empty fields)", { blockedUntil: loginBlockedUntilRef.current });
      }
      return;
    }

    setIsLoading(true);
    setError("");

    const normalized = normalizeTokenValue(raw);
    if (normalized.length < 20) {
      console.log("[app]", "[LandingPage]", "token too short", { length: normalized.length });
      setError(t("landing.errorInvalidToken"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;
        console.log("[app]", "[LandingPage]", "rate limit activated (short token)", { blockedUntil: loginBlockedUntilRef.current });
      }
      setIsLoading(false);
      return;
    }

    try {
      console.log("[app]", "[LandingPage]", "querying Firestore for token", {});
      const invQuery = query(INVITATIONS_COLLECTION_REF, where("_activeSetupToken", "==", normalized));
      const invSnap = await getDocs(invQuery);
      if (invSnap.empty) {
        console.log("[app]", "[LandingPage]", "token not found", {});
        setError(t("landing.errorTokenNotFound"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;
          console.log("[app]", "[LandingPage]", "rate limit activated (token not found)", { blockedUntil: loginBlockedUntilRef.current });
        }
        setIsLoading(false);
        return;
      }
      const matchedInv = invSnap.docs[0]!;
      const target = matchedInv.id;
      const matchedData = matchedInv.data();
      console.log("[app]", "[LandingPage]", "invitation found", { target, hasAdminUsername: !!matchedData.adminUsername });

      if (matchedData.adminUsername && matchedData.adminUsername.toLowerCase() !== username.toLowerCase()) {
        console.log("[app]", "[LandingPage]", "username mismatch", { expected: matchedData.adminUsername, got: username });
        setError(t("landing.errorUsernameMismatch"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;
          console.log("[app]", "[LandingPage]", "rate limit activated (username mismatch)", { blockedUntil: loginBlockedUntilRef.current });
        }
        setIsLoading(false);
        return;
      }

      try {
        const parsed = normalizeConfig(matchedData);
        const hydrated = { ...defaultConfig, ...parsed };
        safeSetItem(`wedin_invite_cache_${target}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
      } catch {}

      if (matchedData.activeSession) {
        console.log("[app]", "[LandingPage]", "active session exists, asking user", {});
        setIsLoading(false);
        if (!window.confirm(t("landing.sessionExists"))) {
          console.log("[app]", "[LandingPage]", "user declined to override session", {});
          return;
        }
        console.log("[app]", "[LandingPage]", "user confirmed session override", {});
        setIsLoading(true);
      }

      try {
        console.log("[app]", "[LandingPage]", "running transaction to set session", {});
        await runTransaction(db, async (transaction) => {
          const inviteRef = invitationDocRef(target);
          const inviteSnapInTx = await transaction.get(inviteRef);
          if (!inviteSnapInTx.exists()) {
            transaction.set(inviteRef, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
          } else {
            transaction.update(inviteRef, { activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
          }
        });
        console.log("[app]", "[LandingPage]", "transaction success", {});
      } catch (err) {
        console.error("[app]", "[LandingPage]", "transaction failed", { error: err });
        setError(t("landing.errorTransactionFailed"));
        loginAttemptsRef.current++;
        if (loginAttemptsRef.current >= 3) {
          loginBlockedUntilRef.current = Date.now() + 30000;
          loginAttemptsRef.current = 0;
          console.log("[app]", "[LandingPage]", "rate limit activated (transaction failed)", { blockedUntil: loginBlockedUntilRef.current });
        }
        setIsLoading(false);
        return;
      }

      safeSetItem("wedin_invite_token", target, sessionStorage);
      clearExpiredCache();
      saveSession("admin", username);
      setTokenLoginUsername(username);
      setIsTokenVerified(true);
      console.log("[app]", "[LandingPage]", "login success, redirecting", { target });
      try {
        const cred = new PasswordCredential({ id: username, password: normalized, name: username });
        navigator.credentials.store(cred);
      } catch {}
      navigate(`/${target}`);
    } catch (err) {
      console.error("[app]", "[LandingPage]", "login verify failed", { error: err });
      setError(t("landing.errorVerifyFailed"));
      loginAttemptsRef.current++;
      if (loginAttemptsRef.current >= 3) {
        loginBlockedUntilRef.current = Date.now() + 30000;
        loginAttemptsRef.current = 0;
        console.log("[app]", "[LandingPage]", "rate limit activated (verify failed)", { blockedUntil: loginBlockedUntilRef.current });
      }
    }

    setIsLoading(false);
  };

  const openModal = () => {
    console.log("[app]", "[LandingPage]", "openModal", {});
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
        <div className="modal-overlay" onClick={() => { console.log("[app]", "[LandingPage]", "modal closed (overlay)", {}); setShowModal(false); }} role="dialog" aria-modal="true" aria-label={t("landing.modalTitle")}>
          <div className="modal-card" ref={modalRef as React.RefObject<HTMLDivElement>} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" ref={closeButtonRef} onClick={() => { console.log("[app]", "[LandingPage]", "modal closed (close btn)", {}); setShowModal(false); }} aria-label={t("common.close")}>
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
              {error && <p className="setup-error">{error}</p>}
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
