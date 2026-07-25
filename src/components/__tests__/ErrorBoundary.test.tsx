import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import ErrorBoundary from "../ErrorBoundary";

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><div>child</div></ErrorBoundary>);
    expect(screen.getByText("child")).toBeDefined();
  });
});
