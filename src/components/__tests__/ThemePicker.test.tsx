import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/constants", () => ({
  THEME_GROUPS: [{ value: "claros", label: "Temas claros" }],
  THEME_OPTIONS: [{ value: "golden", label: "Dorado clásico", hint: "Elegante", group: "claros" }],
  THEME_PREVIEW_COLORS: { golden: { accent: "#d8b24a", bg: "#2a2418" } },
}));

import ThemePicker from "../ThemePicker";

describe("ThemePicker", () => {
  const defaultProps = { value: "golden", onChange: vi.fn(), t: (key: string) => key };

  it("renders theme options", () => {
    render(<ThemePicker {...defaultProps} />);
    expect(screen.getByText("themeNames.golden")).toBeDefined();
  });
});
