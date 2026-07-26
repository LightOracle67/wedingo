import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import ErrorBoundary from "../ErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Kaboom!");
  return <div>safe child</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", () => {
    render(<ErrorBoundary><div>child</div></ErrorBoundary>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("renders error state when a child throws", () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText("common.errorBoundary.title")).toBeDefined();
  });

  it("shows error message", () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText("Kaboom!")).toBeDefined();
  });

  it("renders reload button", () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText("common.errorBoundary.reload")).toBeDefined();
  });

  it("reloads the page when reload button is clicked", () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadSpy },
      writable: true,
    });
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    fireEvent.click(screen.getByText("common.errorBoundary.reload"));
    expect(reloadSpy).toHaveBeenCalled();
  });
});
