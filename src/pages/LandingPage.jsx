import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDoc, doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db, invitationDocRef } from "../lib/firebase";
import { normalizeTokenValue } from "../lib/token-utils";
import { generateInviteToken } from "../lib/utils";
import { normalizeConfig } from "../lib/normalize-config";
import { defaultConfig } from "../lib/constants";
import { saveSession } from "../lib/sessionVars";
import { useApp } from "../contexts/AppContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { setIsTokenVerified, setTokenLoginUsername } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!showModal) return;
    const prev = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") setShowModal(false);
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      prev?.focus();
    };
  }, [showModal]);

  const handleCreate = () => {
    const token = generateInviteToken();
    sessionStorage.setItem("wedin_invite_token", token);
    navigate(`/${token}/setup`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = (usernameInput || "").trim();
    const raw = (tokenInput || "").trim();
    if (!username || !raw) {
      setError("Introduce tu nombre de usuario y el código de acceso.");
      return;
    }

    setIsLoading(true);
    setError("");

    const normalized = normalizeTokenValue(raw);
    if (normalized.length < 20) {
      setError("El código de acceso no es válido.");
      setIsLoading(false);
      return;
    }

    try {
      const snap = await getDoc(doc(db, "setupTokens", normalized));
      if (!snap.exists() || snap.data().used) {
        setError("El código no es válido o ya ha sido usado.");
        setIsLoading(false);
        return;
      }

      const tokenUsername = (snap.data().username || "").trim().toLowerCase();
      if (tokenUsername && tokenUsername !== username.trim().toLowerCase()) {
        setError("El código no corresponde a este usuario.");
        setIsLoading(false);
        return;
      }

      const target = snap.data().inviteToken;
      if (!target) {
        setError("El código no está asociado a ninguna invitación.");
        setIsLoading(false);
        return;
      }

      const inviteSnap = await getDoc(invitationDocRef(target));
      if (inviteSnap.exists()) {
        try {
          const parsed = normalizeConfig(inviteSnap.data());
          const hydrated = { ...defaultConfig, ...parsed };
          localStorage.setItem(`wedin_invite_cache_${target}`, JSON.stringify({ data: hydrated, cachedAt: Date.now() }));
        } catch {}
      }

      try {
        await runTransaction(db, async (transaction) => {
          const tokenDocRef = doc(db, "setupTokens", normalized);
          const tokenDoc = await transaction.get(tokenDocRef);
          if (!tokenDoc.exists || tokenDoc.data().used) throw new Error();
          transaction.update(tokenDocRef, { used: true, usedAt: serverTimestamp() });
          transaction.set(doc(db, "sessions", target), { createdAt: serverTimestamp() });
        });
      } catch {
        setError("No se pudo completar el acceso. Inténtalo de nuevo.");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("wedin_invite_token", target);
      saveSession("admin", username);
      setTokenLoginUsername(username);
      setIsTokenVerified(true);
      navigate(`/${target}`);
    } catch {
      setError("No se pudo verificar el código. Inténtalo de nuevo.");
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
            Wedingo - Invitaciones de boda
          </h1>
          <p className="mt-4 text-[clamp(1rem,3vw,1.35rem)] leading-relaxed font-serif text-boda-texto/80">
            Crea y comparte tu invitación de boda personalizada.
          </p>
          <div className="story-divider my-6" />
          <p className="text-[0.95rem] leading-relaxed text-boda-texto/60">
            Gestiona los datos de tu invitación, comparte un enlace único con tus invitados y recibe sus confirmaciones de asistencia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" className="setup-button text-sm" onClick={handleCreate}>
              Crear tu invitación
            </button>
            <button type="button" className="setup-button setup-button--ghost text-sm" onClick={openModal}>
              Ya tengo una invitación
            </button>
          </div>
          <div className="mt-6 text-center">
            <a href="/legal?s=privacy" className="text-[0.7rem] text-boda-texto/35 hover:text-boda-texto/55 transition-colors" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Política de Privacidad</a>
            <span className="text-[0.7rem] text-boda-texto/25 mx-1">·</span>
            <a href="/legal?s=terms" className="text-[0.7rem] text-boda-texto/35 hover:text-boda-texto/55 transition-colors" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Términos</a>
            <span className="text-[0.7rem] text-boda-texto/25 mx-1">·</span>
            <a href="/legal?s=legal" className="text-[0.7rem] text-boda-texto/35 hover:text-boda-texto/55 transition-colors" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Aviso Legal</a>
          </div>
        </div>
      </section>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-label="Acceder a tu invitación">
          <div className="modal-card" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" ref={closeButtonRef} onClick={() => setShowModal(false)} aria-label="Cerrar">
              &times;
            </button>
            <form onSubmit={handleLogin}>
              <p className="modal-title">Acceder a tu invitación</p>
              <label className="setup-label" htmlFor="loginUsernameInput">
                Nombre de usuario
              </label>
              <input
                id="loginUsernameInput"
                className="setup-input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]/g, "").slice(0, 50))}
                placeholder="Tu nombre de usuario"
                autoComplete="username"
                spellCheck="false"
                autoFocus
              />
              <label className="setup-label" htmlFor="loginTokenInput" style={{ marginTop: "0.75rem" }}>
                Código de acceso
              </label>
              <input
                id="loginTokenInput"
                className="setup-input"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.replace(/[^a-zA-Z0-9/:.?=&-]/g, "").slice(0, 80))}
                placeholder="Pega el código de acceso"
                autoComplete="current-password"
                spellCheck="false"
              />
              {error && <p className="setup-error">{error}</p>}
              <div className="setup-actions">
                <button className="setup-button" type="submit" disabled={isLoading || usernameInput.trim().length < 1 || tokenInput.trim().length < 20}>
                  {isLoading ? "Buscando..." : "Acceder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
