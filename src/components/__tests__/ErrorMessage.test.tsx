import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/error-utils", () => ({
  getFirestoreErrorMessage: vi.fn(() => "Error message"),
}));

import { ErrorMessage } from "../ErrorMessage";

describe("ErrorMessage", () => {
  it("renders null when no error", () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders error message", () => {
    render(<ErrorMessage error={new Error("test")} />);
    expect(screen.getByRole("alert")).toBeDefined();
  });
});
