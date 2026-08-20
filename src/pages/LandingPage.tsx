import { useAuth } from "../contexts";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { STORAGE_KEYS } from "../lib/storage-keys";
import { invitationDocRef } from "../lib/firebase";
import { normalizeTokenValue, generateSetupToken } from "../lib/token-utils";
import { usePlatformSettings } from "../lib/platform-settings";
import { generateInviteToken } from "../lib/utils";
import { createSetupTokenRecord, findInviteBySetupToken, hashSetupToken } from "../lib/setup-token";
import { trackEvent } from "../lib/analytics";
import { normalizeConfig } from "../lib/normalize-config";
import { defaultConfig } from "../lib/constants";
import { safeSetItem } from "../lib/storage";
import { clearExpiredCache } from "../lib/storage-utils";
import { saveSession, firestoreSessionExpiry } from "../lib/sessionVars";
import { useFocusTrap, useEscapeKey } from "../hooks/useFocusTrap";
import { useConfirm } from "../contexts/ConfirmContext";
import "../styles/landing.css";
import "../styles/admin.css";
import "../styles/modals.css";
import { safeLogError } from "../lib/safe-error";

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIsTokenVerified, setTokenLoginUsername } = useAuth();
  // F3-4: modo mantenimiento global (la creación se desactiva).
  const { settings: platform } = usePlatformSettings();
  const { confirm } = useConfirm();
  const maintenance = platform.maintenance === "true";
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
  const [creating, setCreating] = useState(false);
  /** Error de la creaciÃ³n de invitaciÃ³n (visible en la vista principal,
   *  no en el modal de login). */
  const [createError, setCreateError] = useState("");

  const handleCreate = async () => {
    if (creating || maintenance) return;
    setCreateError("");
    setCreating(true);

    // Si ya hay una invitaciÃ³n en curso (recarga de la landing), se retoma en
    // lugar de crear otra con un token nuevo (evita registros setupTokens
    // huÃ©rfanos y pÃ©rdida del acceso previo).
    const existing = (() => {
      try {
        return sessionStorage.getItem(STORAGE_KEYS.inviteToken);
      } catch {
        return null;
      }
    })();
    if (existing && /^[A-Za-z0-9]{10}$/.test(existing)) {
      navigate(`/${existing}/setup`);
      setCreating(false);
      return;
    }

    const token = generateInviteToken();
    // Token de setup generado y registrado (hash) antes de que exista la
    // invitaciÃ³n, de modo que la activaciÃ³n de sesiÃ³n pueda verificarse.
    const setupToken = normalizeTokenValue(generateSetupToken());

    safeSetItem(STORAGE_KEYS.inviteToken, token, sessionStorage);
    safeSetItem(STORAGE_KEYS.setupToken(token), setupToken, sessionStorage);

    try {
      await createSetupTokenRecord(token, setupToken);
    } catch (err) {
      safeLogError(["[app]", "[LandingPage]", "create setup token failed"], err);
      setCreateError(t("landing.errorCreateFailed"));
      setCreating(false);
      return;
    }

    trackEvent("create_invitation", { method: "landing" });
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
      // Localiza la invitaciÃ³n por el hash del token (sin enumerar la colecciÃ³n).
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
        if (!(await confirm({ message: t("landing.sessionExists") }))) {
          return;
        }

        setIsLoading(true);
      }

      // Prueba de conocimiento del token para activar la sesión.
      const tokenHash = await hashSetupToken(normalized);

      try {
        // Escritura directa con updateDoc (NO transacción): una sesión ya
        // existente se rechaza en producción si se escribe vía runTransaction
        // con currentDocument.updateTime (el emulador sí la acepta). updateDoc
        // funciona sobre sesión existente o inexistente por igual.
        const inviteRef = invitationDocRef(target);
        const inviteSnap = await getDoc(inviteRef);
        // La sesión solo se renueva sobre una invitación que ya existe: si el
        // documento aún no se ha guardado (token huérfano), la sesión se
        // activará en el primer guardado del setup. Crear aquí la invitación
        // con campos de sesión está prohibido por las reglas (no se puede
        // auto-provisionar una sesión en el create).
        if (inviteSnap.exists()) {
          await updateDoc(inviteRef, {
            // Timestamp explícito del cliente: la regla de sesión exige
            // `activeSession is timestamp` y serverTimestamp() (REQUEST_TIME)
            // no lo satisface en el runtime real de producción.
            activeSession: new Date(),
            sessionExpiresAt: firestoreSessionExpiry(),
            setupTokenHash: tokenHash,
          });
        }
      } catch (err) {
        safeLogError(["[app]", "[LandingPage]", "session activation failed"], err);
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
      saveSession("admin", username, { inviteToken: target });
      setTokenLoginUsername(username);
      setIsTokenVerified(true);

      // NOTA: el token de setup NO se guarda en el Credential Manager del
      // navegador: es una credencial de tipo bearer que concede sesiÃ³n de
      // admin y no debe replicarse/sincronizarse por el sistema operativo.
      navigate(`/${target}`);
    } catch (err) {
      safeLogError(["[app]", "[LandingPage]", "login verify failed"], err);
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
          <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">{t("landing.description")}</p>
          {maintenance ? (
            <p className="setup-help" style={{ marginTop: "0.6rem" }} role="status">
              {t("platform.maintenanceNotice")}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="setup-button text-sm"
              onClick={handleCreate}
              disabled={creating || maintenance}
              aria-busy={creating}
              data-testid="create-invitation-btn"
            >
              {creating ? t("common.loading") : t("landing.createInvitation")}
            </button>
            <button
              type="button"
              className="setup-button setup-button--ghost text-sm"
              onClick={openModal}
              data-testid="have-invitation-btn"
            >
              {t("landing.haveInvitation")}
            </button>
          </div>
          {createError ? (
            <p className="setup-error" style={{ marginTop: "1rem" }} role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      </section>
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("landing.modalTitle")}
        >
          <div
            className="modal-card"
            ref={modalRef as React.RefObject<HTMLDivElement>}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              ref={closeButtonRef}
              onClick={() => {
                setShowModal(false);
              }}
              aria-label={t("common.close")}
            >
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
                onChange={(e) =>
                  setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9\sÃ¡Ã©Ã­Ã³ÃºÃ±ÃÃ‰ÃÃ“ÃšÃ‘]/g, "").slice(0, 50))
                }
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
                data-testid="login-token-input"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.replace(/[^a-zA-Z0-9/:.?=&-]/g, "").slice(0, 80))}
                placeholder={t("landing.tokenPlaceholder")}
                autoComplete="current-password"
                spellCheck="false"
              />
              {error && (
                <p className="setup-error" role="alert">
                  {error}
                </p>
              )}
              <div className="setup-actions">
                <button
                  className="setup-button"
                  type="submit"
                  data-testid="login-submit-btn"
                  aria-busy={isLoading}
                  disabled={isLoading || usernameInput.trim().length < 1 || tokenInput.trim().length < 20}
                >
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
