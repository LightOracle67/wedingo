import { memo, useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTranslation } from "react-i18next";

const TokensTab = memo(function TokensTab() {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      const q = query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""));
      const snap = await getDocs(q);
      const list = snap.docs.map((d: any) => ({
        id: d.id,
        activeToken: d.data()._activeSetupToken || "",
      }));
      setTokens(list);
    } catch {
      setError(t("superadmin.tokenLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleRevoke = useCallback(async (invId: any) => {
    if (!window.confirm(t("superadmin.revokeConfirm"))) return;
    setError("");
    setMessage("");
    try {
      await updateDoc(doc(db, "invitations", invId), { _activeSetupToken: "" });
      setMessage(t("superadmin.tokenRevoked"));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenRevokeError"));
    }
  }, [loadTokens, t]);

  const handleCleanup = useCallback(async () => {
    if (!window.confirm(t("superadmin.cleanupConfirm"))) return;
    setError("");
    setMessage("");
    try {
      const q = query(collection(db, "invitations"), where("_activeSetupToken", "!=", ""));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMessage(t("superadmin.noTokensToClean"));
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d: any) => batch.update(d.ref, { _activeSetupToken: "" }));
      await batch.commit();
      setMessage(t("superadmin.tokensCleaned", { count: snap.size }));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenCleanError"));
    }
  }, [loadTokens, t]);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>{t("superadmin.tokensLoading")}</p>;
  }

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          {t("superadmin.tokensStats", { total: tokens.length, used: 0, available: tokens.length })}
        </p>
      </div>

      <div className="setup-actions" style={{ marginBottom: "1rem" }}>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          {t("superadmin.cleanUnused")}
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="setup-token-card admin-center">
          <p className="setup-help" style={{ margin: 0 }}>{t("superadmin.noTokens")}</p>
        </div>
      ) : (
        <div className="admin-grid">
          {tokens.map((token: any) => (
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
                  {t("superadmin.statusAvailable")}
                </p>
              </div>
              <button
                className="setup-button setup-button--ghost"
                type="button"
                style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", borderColor: "#f6c7c7", color: "#f6c7c7" }}
                onClick={() => handleRevoke(token.id)}
              >
                {t("superadmin.revokeButton")}
              </button>
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
