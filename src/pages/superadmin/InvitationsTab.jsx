import { useCallback, useEffect, useState } from "react";
import { getDoc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { INVITATION_DOC_REF } from "../../lib/firebase";

export default function InvitationsTab() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(INVITATION_DOC_REF);
        if (snap.exists()) {
          setConfig({ id: snap.id, ...snap.data() });
        }
      } catch {
        setError("No se pudo cargar la invitación.");
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
      await deleteDoc(INVITATION_DOC_REF);
      setConfig(null);
      setMessage("Invitación eliminada correctamente.");
      setShowConfirm(false);
    } catch {
      setError("No se pudo eliminar la invitación.");
    }
  }, []);

  if (loading) {
    return <p className="setup-subtitle" style={{ textAlign: "center" }}>Cargando...</p>;
  }

  const fields = config ? [
    { label: "Nombre 1", value: config.firstName },
    { label: "Nombre 2", value: config.secondName },
    { label: "Usuario admin", value: config.adminUsername },
    { label: "Mensaje", value: config.inviteMessage },
    { label: "Lugar", value: config.weddingPlace },
    { label: "Tema", value: config.theme },
    { label: "Fecha", value: [config.weddingDay, config.weddingMonth, config.weddingYear].filter(Boolean).join(" ") },
    { label: "Hora", value: [config.weddingHour, config.weddingMinute].filter(Boolean).join(":") },
  ] : [];

  return (
    <div>
      {!config ? (
        <div className="setup-token-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--setup-muted)", margin: 0 }}>
            No hay ninguna invitación configurada todavía.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {fields.map((f) => (
              f.value ? (
                <div key={f.label} className="setup-token-card" style={{ padding: "0.6rem 0.85rem" }}>
                  <p style={{ margin: 0, color: "var(--setup-accent)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {f.label}
                  </p>
                  <p style={{ margin: "0.15rem 0 0", color: "var(--setup-title)", wordBreak: "break-word" }}>
                    {f.value}
                  </p>
                </div>
              ) : null
            ))}
          </div>

          <div className="setup-actions" style={{ marginTop: "1rem" }}>
            <button
              className="setup-button"
              type="button"
              onClick={() => navigate("/")}
            >
              Ver invitación
            </button>
            <button
              className="setup-button setup-button--ghost"
              type="button"
              onClick={() => navigate("/setup")}
            >
              Editar
            </button>
          </div>

          <div style={{ marginTop: "2rem", borderTop: "1px solid var(--setup-border)", paddingTop: "1rem" }}>
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
