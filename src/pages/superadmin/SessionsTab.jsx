import { useState, useCallback } from "react";
import { getSession, clearSession } from "../../lib/sessionVars";

export default function SessionsTab() {
  const [session, setSession] = useState(() => getSession());

  const handleClear = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <div>
      <div className="setup-token-card" style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, color: "var(--setup-title)", fontSize: "0.9rem" }}>
          Estado: {session ? <strong style={{ color: "var(--accent)" }}>Sesión activa</strong> : <strong>Sin sesión</strong>}
        </p>
      </div>

      {session && (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <div className="setup-token-card" style={{ padding: "0.6rem 0.85rem" }}>
            <div style={{ color: "var(--setup-title)", fontWeight: 700, fontSize: "0.9rem" }}>
              {session.identifier}
            </div>
            <div style={{ color: "var(--setup-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {session.type === "superadmin" ? "Superadmin" : session.type === "setup" ? "Setup" : "Admin"}
            </div>
            <div style={{ color: "var(--setup-muted)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              Expira: {new Date(session.expiresAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              className="setup-button"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", background: "var(--setup-accent)", color: "var(--setup-accent-text)" }}
              onClick={handleClear}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
