import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AccessibilityPanel from "../AccessibilityPanel";

describe("AccessibilityPanel", () => {
  it("renders without crashing when open", () => {
    render(<AccessibilityPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("a11y.title")).toBeDefined();
  });
});
