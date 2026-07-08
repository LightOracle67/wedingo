import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatDate } from "../../lib/superadmin";
import { generateSetupToken, normalizeTokenValue } from "../../lib/token-utils";
import { useTranslation } from "react-i18next";

export default function TokensTab() {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      const q = query(collection(db, "setupTokens"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        used: d.data().used === true,
        createdAtDate: d.data().createdAt?.toDate?.() || null,
        usedAtDate: d.data().usedAt?.toDate?.() || null,
      }));
      setTokens(list);
    } catch {
      setError(t("superadmin.tokenLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleCreate = useCallback(async () => {
    setError("");
    setMessage("");
    const rawToken = generateSetupToken();
    const normalizedToken = normalizeTokenValue(rawToken);
    try {
      await setDoc(doc(db, "setupTokens", normalizedToken), {
        used: false,
        autoGen: true,
        createdAt: serverTimestamp(),
      });
      setMessage(t("superadmin.tokenCreated", { token: rawToken }));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenCreateError"));
    }
  }, [loadTokens, t]);

  const handleRevoke = useCallback(async (tokenId) => {
    setError("");
    setMessage("");
    try {
      await deleteDoc(doc(db, "setupTokens", tokenId));
      setMessage(t("superadmin.tokenRevoked"));
      await loadTokens();
    } catch {
      setError(t("superadmin.tokenRevokeError"));
    }
  }, [loadTokens, t]);

  const handleCleanup = useCallback(async () => {
    setError("");
    setMessage("");
    try {
      const q = query(collection(db, "setupTokens"), where("used", "==", false));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMessage(t("superadmin.noTokensToClean"));
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
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

  const usedCount = tokens.filter((tt) => tt.used).length;

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          {t("superadmin.tokensStats", { total: tokens.length, used: usedCount, available: tokens.length - usedCount })}
        </p>
      </div>

      <div className="setup-actions" style={{ marginBottom: "1rem" }}>
        <button className="setup-button" type="button" onClick={handleCreate}>
          {t("superadmin.generateToken")}
        </button>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          {t("superadmin.cleanUnused")}
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="setup-token-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--setup-muted)", margin: 0 }}>{t("superadmin.noTokens")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {tokens.map((tt) => (
            <div
              key={tt.id}
              className="setup-token-card"
              style={{
                padding: "0.6rem 0.85rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                opacity: tt.used ? 0.6 : 1,
              }}
            >
              <div>
                <p style={{ margin: 0, color: "var(--setup-title)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                  {tt.id}
                </p>
                <p style={{ margin: "0.2rem 0 0", color: "var(--setup-muted)", fontSize: "0.8rem" }}>
                  {tt.used ? t("superadmin.statusUsed") : t("superadmin.statusAvailable")}
                  {tt.createdAtDate ? ` · ${t("superadmin.createdLabel", { date: formatDate(tt.createdAtDate.toISOString()) })}` : ""}
                  {tt.usedAtDate ? ` · ${t("superadmin.usedLabel", { date: formatDate(tt.usedAtDate.toISOString()) })}` : ""}
                </p>
              </div>
              {!tt.used && (
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", borderColor: "#f6c7c7", color: "#f6c7c7" }}
                  onClick={() => handleRevoke(tt.id)}
                >
                  {t("superadmin.revokeButton")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {message ? <p className="setup-success">{message}</p> : null}
      {error ? <p className="setup-error">{error}</p> : null}
    </div>
  );
}
