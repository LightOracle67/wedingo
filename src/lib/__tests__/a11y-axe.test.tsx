import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";

// Ensure axe runs after DOM is ready
function runAxe(html: HTMLElement): Promise<axe.AxeResults> {
  return new Promise((resolve) => {
    axe.run(html, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    }, (err, results) => {
      if (err) throw err;
      resolve(results);
    });
  });
}

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
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
      </div>
    );
    const results = await runAxe(container);
    const labelViolations = results.violations.filter(
      (v) => v.id === "label"
    );
    expect(labelViolations.length).toBeGreaterThan(0);
  });

  it("a button with accessible name passes", async () => {
    const { container } = render(
      <button aria-label="Close">✕</button>
    );
    const results = await runAxe(container);
    const buttonNameViolations = results.violations.filter(
      (v) => v.id === "button-name"
    );
    expect(buttonNameViolations).toHaveLength(0);
  });
});
