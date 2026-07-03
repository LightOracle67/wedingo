import { useCallback, useEffect, useState } from "react";
import { getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, INVITATIONS_COLLECTION_REF } from "../../lib/firebase";

export default function InvitationsTab() {
  const navigate = useNavigate();
  const [exists, setExists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(INVITATIONS_COLLECTION_REF);
        setExists(snap.size > 0);
      } catch {
        setError("No se pudo comprobar el estado de las invitaciones.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = useCallback(async () => {
    setError("");
    setMessage("");
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "invitations", d.id))));
      setExists(false);
      setMessage("Invitaciones eliminadas correctamente.");
      setShowConfirm(false);
    } catch {
      setError("No se pudieron eliminar las invitaciones.");
    }
  }, []);

  const handleBackup = useCallback(async () => {
    try {
      const snap = await getDocs(INVITATIONS_COLLECTION_REF);
      if (snap.empty) {
        setError("No hay invitaciones que respaldar.");
        return;
      }
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedingo-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Copia de seguridad descargada.");
    } catch {
      setError("No se pudo generar la copia de seguridad.");
    }
  }, []);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando...</p>;
  }

  return (
    <div>
      {!exists ? (
        <div className="setup-token-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--setup-muted)", margin: 0 }}>
            No hay ninguna invitación configurada todavía.
          </p>
        </div>
      ) : (
        <>
          <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.95rem" }}>
              <strong>Estado:</strong> Invitaciones publicadas
            </p>
          </div>

          <div className="setup-actions" style={{ marginBottom: "1.5rem" }}>
            <button className="setup-button" type="button" onClick={() => navigate("/")}>
              Ver invitación
            </button>
            <button className="setup-button setup-button--ghost" type="button" onClick={handleBackup}>
              Descargar copia
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--setup-border)", paddingTop: "1rem" }}>
            <p className="setup-label" style={{ color: "#f6c7c7", fontWeight: 700, marginBottom: "0.5rem" }}>
              Zona de peligro
            </p>
            <p className="setup-subtitle" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Eliminar la invitación borrará todos los datos guardados. Esta acción no se puede deshacer.
            </p>

            {!showConfirm ? (
              <button
                className="setup-button setup-button--ghost"
                type="button"
                style={{ borderColor: "#f6c7c7", color: "#f6c7c7" }}
                onClick={() => setShowConfirm(true)}
              >
                Eliminar invitación
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  className="setup-button"
                  type="button"
                  style={{ background: "#c0392b", color: "#fff" }}
                  onClick={handleDelete}
                >
                  Confirmar eliminación
                </button>
                <button
                  className="setup-button setup-button--ghost"
                  type="button"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {message ? <p className="setup-success">{message}</p> : null}
      {error ? <p className="setup-error">{error}</p> : null}
    </div>
  );
}
