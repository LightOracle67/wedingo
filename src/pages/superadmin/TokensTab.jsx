import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatDate } from "../../lib/superadmin";
import { generateSetupToken, normalizeTokenValue } from "../../lib/token-utils";

export default function TokensTab() {
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
      setError("No se pudieron cargar los tokens.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setMessage(`Token creado: ${rawToken}`);
      await loadTokens();
    } catch {
      setError("No se pudo crear el token.");
    }
  }, [loadTokens]);

  const handleRevoke = useCallback(async (tokenId) => {
    setError("");
    setMessage("");
    try {
      await deleteDoc(doc(db, "setupTokens", tokenId));
      setMessage("Token revocado.");
      await loadTokens();
    } catch {
      setError("No se pudo revocar el token.");
    }
  }, [loadTokens]);

  const handleCleanup = useCallback(async () => {
    setError("");
    setMessage("");
    try {
      const q = query(collection(db, "setupTokens"), where("used", "==", false));
      const snap = await getDocs(q);
      if (snap.empty) {
        setMessage("No hay tokens no usados que limpiar.");
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setMessage(`Se eliminaron ${snap.size} tokens no usados.`);
      await loadTokens();
    } catch {
      setError("No se pudieron limpiar los tokens.");
    }
  }, [loadTokens]);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando tokens...</p>;
  }

  const usedCount = tokens.filter((t) => t.used).length;

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          <strong>{tokens.length}</strong> tokens · <strong>{usedCount}</strong> usados · <strong>{tokens.length - usedCount}</strong> disponibles
        </p>
      </div>

      <div className="setup-actions" style={{ marginBottom: "1rem" }}>
        <button className="setup-button" type="button" onClick={handleCreate}>
          Generar nuevo token
        </button>
        <button className="setup-button setup-button--ghost" type="button" onClick={handleCleanup}>
          Limpiar no usados
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="setup-token-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--setup-muted)", margin: 0 }}>No hay tokens todavía.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {tokens.map((t) => (
            <div
              key={t.id}
              className="setup-token-card"
              style={{
                padding: "0.6rem 0.85rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                opacity: t.used ? 0.6 : 1,
              }}
            >
              <div>
                <p style={{ margin: 0, color: "var(--setup-title)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                  {t.id}
                </p>
                <p style={{ margin: "0.2rem 0 0", color: "var(--setup-muted)", fontSize: "0.8rem" }}>
                  {t.used ? "Usado" : "Disponible"}
                  {t.createdAtDate ? ` · Creado: ${formatDate(t.createdAtDate.toISOString())}` : ""}
                  {t.usedAtDate ? ` · Usado: ${formatDate(t.usedAtDate.toISOString())}` : ""}
                </p>
              </div>
              {!t.used && (
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  style={{ padding: "0.3rem 0.7rem", fontSize: "0.8rem", borderColor: "#f6c7c7", color: "#f6c7c7" }}
                  onClick={() => handleRevoke(t.id)}
                >
                  Revocar
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
