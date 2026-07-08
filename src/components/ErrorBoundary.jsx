import { Component } from "react";
import { withTranslation } from "react-i18next";

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
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

const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
export default ErrorBoundary;
