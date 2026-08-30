import { useState, useEffect } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSuperAdmin } from "../contexts/SuperAdminContext";
import { useToast } from "../hooks/useToast";
import "../styles/admin.css";
import "../styles/public-shell.css";
import { SUPERADMIN_DASHBOARD } from "../lib/superadmin";

export default function SuperAdminLogin() {
  const { t } = useTranslation();
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
        <section className="setup-card allow-select" aria-label={t("common.loading")}>
          <header className="setup-header">
            <div>
              <p className="setup-eyebrow">{t("superadmin.superadmin")}</p>
              <h1 className="setup-title">{t("common.loading")}</h1>
            </div>
          </header>
        </section>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <Navigate to={SUPERADMIN_DASHBOARD} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  return (
    <div className="setup-layout">
      <section className="setup-card allow-select" aria-label={t("superadmin.controlPanel")}>
        <header className="setup-header">
          <div>
            <p className="setup-eyebrow">{t("superadmin.superadmin")}</p>
            <h1 className="setup-title">{t("superadmin.controlPanel")}</h1>
            <p className="setup-subtitle">{t("superadmin.managePlatform")}</p>
          </div>
        </header>

        <form className="setup-form" action="#" onSubmit={handleSubmit} aria-busy={submitting}>
          <label className="setup-label" htmlFor="superadminEmail">
            {t("superadmin.emailLabel")}
          </label>
          <input
            id="superadminEmail"
            name="email"
            className="setup-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("superadmin.emailPlaceholder")}
            autoComplete="email"
            required
          />

          <label className="setup-label" htmlFor="superadminPassword">
            {t("superadmin.passwordLabel")}
          </label>
          <input
            id="superadminPassword"
            name="password"
            className="setup-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("superadmin.passwordPlaceholder")}
            autoComplete="current-password"
            required
          />

          <div className="setup-actions">
            <button className="setup-button" type="submit" disabled={submitting}>
              {submitting ? t("common.loading") : t("superadmin.login")}
            </button>
          </div>
          {/* Error persistente inline (no solo toast efímero): legible y accesible. */}
          {error ? (
            <p
              role="alert"
              id="sadm-login-error"
              className="setup-error"
              style={{ marginTop: "0.75rem", textAlign: "center" }}
            >
              {error}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
