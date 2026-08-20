import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";

function runAxe(html: HTMLElement): Promise<axe.AxeResults> {
  return new Promise((resolve) => {
    axe.run(
      html,
      {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
      (err, results) => {
        if (err) throw err;
        resolve(results);
      },
    );
  });
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../lib/firebase", () => ({ db: {} }));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), startUploadToast: vi.fn() }),
}));

vi.mock("../../lib/error-utils", () => ({
  getFirestoreErrorMessage: () => "Something went wrong",
}));

describe("a11y-axe", () => {
  it("axe-core is loaded", () => {
    expect(typeof axe.run).toBe("function");
  });

  it("a simple heading has no violations", async () => {
    const { container } = render(<h1>Test Heading</h1>);
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("a missing form label is detected", async () => {
    const { container } = render(
      <div>
        <input type="text" />
      </div>,
    );
    const results = await runAxe(container);
    const labelViolations = results.violations.filter((v) => v.id === "label");
    expect(labelViolations.length).toBeGreaterThan(0);
  });

  it("a button with accessible name passes", async () => {
    const { container } = render(<button aria-label="Close">✕</button>);
    const results = await runAxe(container);
    const buttonNameViolations = results.violations.filter((v) => v.id === "button-name");
    expect(buttonNameViolations).toHaveLength(0);
  });

  it("ErrorBoundary wrapper has no a11y violations", async () => {
    const ErrorBoundary = (await import("../../components/ErrorBoundary")).default;
    const { container } = render(
      <ErrorBoundary>
        <h2>Child content</h2>
        <p>Some text here</p>
      </ErrorBoundary>,
    );
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("LoadingOverlay has no a11y violations", async () => {
    const LoadingOverlay = (await import("../../components/LoadingOverlay")).default;
    const { container } = render(<LoadingOverlay visible />);
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("Modal es accesible (dialog + focus + label) y sin violaciones", async () => {
    const Modal = (await import("../../components/Modal")).default;
    const { container } = render(
      <Modal title="Diálogo accesible" onClose={() => {}} closeLabel="Cerrar">
        <button type="button">Aceptar</button>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Diálogo accesible" })).toHaveAttribute("aria-modal", "true");
    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("CollapsibleSection no contiene un heading dentro del botón (HTML válido)", async () => {
    const CollapsibleSection = (await import("../../components/CollapsibleSection")).default;
    const { container } = render(<CollapsibleSection title="Mi sección" />);
    // No debe haber heading anidado dentro del button (violación de HTML semántico).
    const headingInButton = container.querySelector("button h2, button h1, button h3");
    expect(headingInButton).toBeNull();
  });
});
