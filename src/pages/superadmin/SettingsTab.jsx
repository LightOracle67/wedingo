import { useSuperAdmin } from "../../contexts/SuperAdminContext";
import { SUPERADMIN_EMAIL } from "../../lib/superadmin";

export default function SettingsTab() {
  const { user, logout } = useSuperAdmin();

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.95rem" }}>
          <strong>Email:</strong> {SUPERADMIN_EMAIL}
        </p>
        <p style={{ margin: "0.3rem 0 0", color: "var(--setup-muted)", fontSize: "0.85rem" }}>
          UID: {user?.uid || "—"}
        </p>
      </div>

      <div className="setup-actions">
        <button className="setup-button" type="button" onClick={logout}>
          Cerrar sesión
        </button>
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
