import { memo, useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTranslation } from "react-i18next";
import { hashSetupToken } from "../../lib/setup-token";

const TokensTab = memo(function TokensTab() {
  const { t } = useTranslation();
  // Tokens LEGACY: invitaciones con el campo `_activeSetupToken` (formato
  // anterior a v2.95.22). Los nuevos viven en setupTokens/{hash}.
  const [tokens, setTokens] = useState<Array<{ id: string; activeToken: string }>>([]);
  // Tokens NUEVOS: registros setupTokens/{hash} → { inviteToken }.
  const [hashedTokens, setHashedTokens] = useState<Array<{ hash: string; inviteToken: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      const [legacySnap, hashSnap] = await Promise.all([
        getDocs(query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""))),
        // list en setupTokens es solo-superadmin (reglas): aquí se ejecuta con sesión.
        getDocs(collection(db, "setupTokens")),
      ]);
      const legacy = legacySnap.docs.map((d: { id: string; data: () => { _activeSetupToken?: string } }) => ({
        id: d.id,
        activeToken: d.data()._activeSetupToken || "",
      }));
      const hashed = hashSnap.docs.map((d) => ({
        hash: d.id,
        inviteToken: String(d.data().inviteToken || ""),
      }));
      setTokens(legacy);
      setHashedTokens(hashed);
    } catch {
      setError(t("superadmin.tokenLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleRevoke = useCallback(
    async (invId: string) => {
      if (!window.confirm(t("superadmin.revokeConfirm"))) return;
      setError("");
      setMessage("");
      try {
        await updateDoc(doc(db, "invitations", invId), { _activeSetupToken: "" });
        // Un token MIGRADO vive en setupTokens/{hash}: sin borrarlo, revocar el
        // campo legacy dejaba el token aún válido (no se podía revocar nunca).
        const activeToken = tokens.find((tk) => tk.id === invId)?.activeToken;
        if (activeToken) {
          const hash = await hashSetupToken(activeToken);
          await deleteDoc(doc(db, "setupTokens", hash));
        }
        setMessage(t("superadmin.tokenRevoked"));
        await loadTokens();
      } catch {
        setError(t("superadmin.tokenRevokeError"));
      }
    },
    [loadTokens, tokens, t],
  );

  const handleCleanup = useCallback(async () => {
    if (!window.confirm(t("superadmin.cleanupConfirm"))) return;
    setError("");
    setMessage("");
    try {
      const q = query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""));
      const snap = await getDocs(q);
      // Solo se limpian los tokens NUNCA usados: una invitación con sesión
      // activa (admin en pleno flujo) se conserva. Antes se revocaba TODO.
      const unused = snap.docs.filter((d) => !d.data().activeSession);
      if (unused.length === 0) {
        setMessage(t("superadmin.noTokensToClean"));
        return;
      }
      const batch = writeBatch(db);
      unused.forEach((d) => batch.update(d.ref, { _activeSetupToken: "" }));
      await batch.commit();
      setMessage(t("superadmin.tokensCleaned", { count: unused.length }));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenCleanError"));
    }
  }, [loadTokens, t]);

  /**
   * Migra un token legacy al esquema de hash: crea el registro setupTokens
   * (el token que ya conoce el admin sigue siendo válido) y retira el campo
   * legacy del documento público. Solo el superadmin puede ejecutarlo.
   */
  const handleMigrate = useCallback(
    async (invId: string, activeToken: string) => {
      if (!window.confirm(t("superadmin.migrateConfirm"))) return;
      setError("");
      setMessage("");
      try {
        const tokenHash = await hashSetupToken(activeToken);
        await setDoc(doc(db, "setupTokens", tokenHash), { inviteToken: invId, createdAt: new Date().toISOString() });
        await updateDoc(doc(db, "invitations", invId), {
          _activeSetupToken: deleteField(),
          legacyToken: deleteField(),
        });
        setMessage(t("superadmin.tokenMigrated"));
        await loadTokens();
      } catch {
        setError(t("superadmin.tokenMigrateError"));
      }
    },
    [loadTokens, t],
  );

  /** Revoca un token NUEVO (setupTokens/{hash}): al borrar el registro, la
   *  regla de sesión deja de aceptar ese hash (prueba de conocimiento). */
  const handleRevokeHashed = useCallback(
    async (hash: string) => {
      if (!window.confirm(t("superadmin.revokeConfirm"))) return;
      setError("");
      setMessage("");
      try {
        await deleteDoc(doc(db, "setupTokens", hash));
        setMessage(t("superadmin.tokenRevoked"));
        await loadTokens();
      } catch {
        setError(t("superadmin.tokenRevokeError"));
      }
    },
    [loadTokens, t],
  );

  if (loading) {
    return (
      <p className="setup-subtitle" style={{ textAlign: "center" }}>
        {t("superadmin.tokensLoading")}
      </p>
    );
  }

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          {t("superadmin.tokensStats", { total: tokens.length + hashedTokens.length, used: 0, available: tokens.length + hashedTokens.length })}
        </p>
      </div>

      <div className="setup-actions" style={{ marginBottom: "1rem" }}>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          {t("superadmin.cleanUnused")}
        </button>
      </div>

      {tokens.length === 0 && hashedTokens.length === 0 ? (
        <div className="setup-token-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p className="setup-help" style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("superadmin.noTokens")}
          </p>
        </div>
      ) : (
        <div className="admin-grid">
          {tokens.map((token: { id: string; activeToken: string }) => (
            <div
              key={token.id}
              className="setup-token-card admin-flex admin-flex--between admin-pad-sm"
              style={{ gap: "0.5rem" }}
            >
              <div className="admin-token-card-content">
                <p className="admin-text-mono" style={{ margin: 0, color: "var(--setup-title)" }}>
                  {token.id}
                </p>
                <p className="admin-text-sm" style={{ margin: "0.2rem 0 0", color: "var(--setup-muted)" }}>
                  {t("superadmin.statusLegacy")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem" }}
                  onClick={() => handleMigrate(token.id, token.activeToken)}
                >
                  {t("superadmin.migrateButton")}
                </button>
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", borderColor: "#f6c7c7", color: "#f6c7c7" }}
                  onClick={() => handleRevoke(token.id)}
                >
                  {t("superadmin.revokeButton")}
                </button>
              </div>
            </div>
          ))}

          {hashedTokens.map((tk: { hash: string; inviteToken: string }) => (
            <div
              key={tk.hash}
              className="setup-token-card admin-flex admin-flex--between admin-pad-sm"
              style={{ gap: "0.5rem" }}
            >
              <div className="admin-token-card-content">
                <p className="admin-text-mono" style={{ margin: 0, color: "var(--setup-title)" }}>
                  {tk.hash.slice(0, 12)}…
                </p>
                <p className="admin-text-sm" style={{ margin: "0.2rem 0 0", color: "var(--setup-muted)" }}>
                  {t("superadmin.hashForInvitation", { token: tk.inviteToken })}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", borderColor: "#f6c7c7", color: "#f6c7c7" }}
                  onClick={() => handleRevokeHashed(tk.hash)}
                >
                  {t("superadmin.revokeButton")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message ? <p className="setup-success">{message}</p> : null}
      {error ? <p className="setup-error">{error}</p> : null}
    </div>
  );
});

export default TokensTab;
