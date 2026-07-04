import { useState, useCallback } from "react";
import { useSuperAdmin } from "../../contexts/SuperAdminContext";
import { SUPERADMIN_EMAIL } from "../../lib/superadmin";
import { getSession, clearSession } from "../../lib/sessionVars";

export default function SettingsTab() {
  const { user, logout } = useSuperAdmin();
  const [session, setSession] = useState(() => getSession());

  const handleClear = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.95rem" }}>
          <strong>Email:</strong> {SUPERADMIN_EMAIL}
        </p>
        <p style={{ margin: "0.3rem 0 0", color: "var(--setup-muted)", fontSize: "0.85rem" }}>
          UID: {user?.uid || "—"}
        </p>
        <hr style={{ margin: "0.75rem 0", border: "none", borderTop: "1px solid var(--setup-border)" }} />
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          Sesión local:{" "}
          {session ? (
            <strong style={{ color: "var(--accent)" }}>Activa</strong>
          ) : (
            <strong>Inactiva</strong>
          )}
        </p>
        {session && (
          <div style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
            <div style={{ color: "var(--setup-title)", fontWeight: 700, fontSize: "0.9rem" }}>
              {session.identifier}
            </div>
            <div style={{ color: "var(--setup-muted)", fontSize: "0.8rem" }}>
              {session.type === "superadmin" ? "Superadmin" : session.type === "setup" ? "Setup" : "Admin"}
            </div>
            <div style={{ color: "var(--setup-muted)", fontSize: "0.75rem" }}>
              Expira: {new Date(session.expiresAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
        )}
        <div className="setup-actions" style={{ marginTop: "0.75rem" }}>
          <button className="setup-button" type="button" onClick={() => { handleClear(); logout(); }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ marginTop: "2rem", borderTop: "1px solid var(--setup-border)", paddingTop: "1rem" }}>
        <p className="setup-label" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          Para gestionar tu cuenta de superadmin, usa la consola de Firebase:
        </p>
        <a
          href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/users`}
          target="_blank"
          rel="noreferrer"
          className="setup-button"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          Ir a Firebase Auth
        </a>
      </div>
    </div>
  );
}
