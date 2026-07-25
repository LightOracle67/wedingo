import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", changeLanguage: vi.fn() } }),
}));

import LanguageSwitcher from "../LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders language trigger", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTitle("lang.triggerLabel")).toBeDefined();
  });
});
