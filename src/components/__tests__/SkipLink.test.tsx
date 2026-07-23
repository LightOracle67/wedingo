import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("SkipLink", () => {
  it("skip-link is rendered with correct href and class", () => {
    render(
      <div>
        <a href="#main-content" className="skip-link" style={{ position: "absolute", top: "-100px", left: "8px", zIndex: 100000 }}>
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1}>
          <h1>Main Content</h1>
        </main>
      </div>
    );
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link).toHaveClass("skip-link");

    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
  });

  it("skip-link can receive focus", () => {
    render(
      <a href="#main-content" className="skip-link" data-testid="skip-link">
        Skip to main content
      </a>
    );
    const link = screen.getByTestId("skip-link") as HTMLAnchorElement;
    link.focus();
    expect(link).toHaveFocus();
  });
});
