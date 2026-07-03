import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { useToast } from "../contexts/ToastContext";
import { SUPERADMIN_DASHBOARD } from "../lib/superadmin";

export default function SuperAdminLogin() {
  const { isSuperAdmin, isLoading, login, error } = useSuperAdmin();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) addToast("error", error);
  }, [error, addToast]);

  if (isLoading) {
    return (
      <div className="setup-layout">
        <section className="setup-card allow-select" aria-label="Cargando">
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">Panel privado</p>
              <h1 className="setup-title">Cargando...</h1>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <Navigate to={SUPERADMIN_DASHBOARD} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label="Acceso restringido">
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">Acceso restringido</p>
            <h1 className="setup-title">Panel de administración</h1>
            <p className="setup-subtitle">
              Introduce tus credenciales para acceder al panel privado.
            </p>
          </div>
        </header>

        <form className="setup-form" onSubmit={handleSubmit}>
          <label className="setup-label" htmlFor="superadminEmail">
            Email
          </label>
          <input
            id="superadminEmail"
            className="setup-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />

          <label className="setup-label" htmlFor="superadminPassword">
            Contraseña
          </label>
          <input
            id="superadminPassword"
            className="setup-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            required
          />

          <div className="setup-actions">
            <button className="setup-button" type="submit" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
