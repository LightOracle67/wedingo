import { useEffect, useState } from "react";
import { getDocs } from "firebase/firestore";
import { INVITATIONS_COLLECTION_REF } from "../../lib/firebase";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function InvitationsTab() {
  const [count, setCount] = useState(null);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(INVITATIONS_COLLECTION_REF);
        setCount(snap.size);
        const bytes = snap.docs.reduce((acc, d) => acc + new Blob([JSON.stringify(d.data())]).size, 0);
        setTotalBytes(bytes);
      } catch {
        setError("No se pudieron cargar las invitaciones.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando...</p>;
  }

  return (
    <div>
      {error ? (
        <p className="setup-error">{error}</p>
      ) : count === 0 ? (
        <div className="setup-token-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--setup-muted)", margin: 0 }}>
            No hay ninguna invitación configurada todavía.
          </p>
        </div>
      ) : (
        <div className="admin-stats-grid">
          <div className="setup-token-card" style={{ textAlign: "center", padding: "1rem" }}>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>{count}</p>
            <p style={{ margin: "0.25rem 0 0", color: "var(--setup-muted)", fontSize: "0.85rem" }}>Invitaciones creadas</p>
          </div>
          <div className="setup-token-card" style={{ textAlign: "center", padding: "1rem" }}>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>{formatBytes(totalBytes)}</p>
            <p style={{ margin: "0.25rem 0 0", color: "var(--setup-muted)", fontSize: "0.85rem" }}>Disco total utilizado</p>
          </div>
        </div>
      )}
    </div>
  );
}
