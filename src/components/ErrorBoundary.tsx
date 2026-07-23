import { Component } from "react";
import { useTranslation } from "react-i18next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ErrorBoundaryInner extends Component<{ t: (key: string) => string; children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { t: (key: string) => string; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { t } = this.props;
    if (this.state.error) {
      return (
        <div className="setup-layout">
          <section className="setup-card" style={{ textAlign: "center" }}>
            <h2 style={{ color: "var(--setup-title)", margin: 0 }}>{t("common.errorBoundary.title")}</h2>
            <p style={{ color: "var(--setup-muted)", marginTop: "0.5rem" }}>
              {import.meta.env.DEV ? this.state.error.message : t("common.errorBoundary.message")}
            </p>
            <button className="setup-button" style={{ marginTop: "1rem" }} onClick={() => window.location.reload()}>
              {t("common.errorBoundary.reload")}
            </button>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
}