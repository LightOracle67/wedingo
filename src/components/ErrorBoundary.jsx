import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="setup-layout">
          <section className="setup-card" style={{ textAlign: "center" }}>
            <h2 style={{ color: "var(--setup-title)", margin: 0 }}>Algo salió mal</h2>
            <p style={{ color: "var(--setup-muted)", marginTop: "0.5rem" }}>
              {import.meta.env.DEV ? this.state.error.message : "Por favor, recarga la página para intentarlo de nuevo."}
            </p>
            <button className="setup-button" style={{ marginTop: "1rem" }} onClick={() => window.location.reload()}>
              Recargar página
            </button>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
