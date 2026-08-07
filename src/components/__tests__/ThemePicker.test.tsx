import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
  const defaultProps = { value: "golden", onChange: vi.fn() };

  it("renders theme options", () => {
    render(<ThemePicker {...defaultProps} />);
    expect(screen.getByText("themeNames.golden")).toBeDefined();
  });

  it("calls onChange with theme value on click", () => {
    const onChange = vi.fn();
    render(<ThemePicker {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("themeNames.golden"));
    expect(onChange).toHaveBeenCalledWith("golden");
  });
});
