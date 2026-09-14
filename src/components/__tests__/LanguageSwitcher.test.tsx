import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const changeLanguage = vi.fn();
const mockI18n = {
  language: "es",
  resolvedLanguage: "es",
  changeLanguage,
  on: vi.fn(() => () => {}),
  off: vi.fn(),
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockI18n.language = "es";
  mockI18n.resolvedLanguage = "es";
});
afterEach(() => {
  cleanup();
});

import LanguageSwitcher from "../LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders un desplegable con Auto y los idiomas del registro agrupados", () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeDefined();
    const opts = Array.from(select.options).map((o) => o.textContent);
    // Auto + grupo Default (es, en) + los 33 continentales = 36.
    expect(opts).toContain("🌐 Auto");
    expect(opts).toContain("Español");
    expect(opts).toContain("Deutsch");
    expect(opts).toContain("中文（简体）");
    expect(opts).toContain("العربية");
    expect(opts).toContain("Português (Brasil)");
    expect(select.options.length).toBeGreaterThanOrEqual(36);
  });

  it("muestra como valor actual el idioma resuelto", () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("es");
  });

  it("llama a changeLanguage al elegir un idioma", () => {
    render(<LanguageSwitcher />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "de" } });
    expect(changeLanguage).toHaveBeenCalledWith("de");
  });

  it("resuelve regional (en-US) a su base cuando no está en el registro", () => {
    mockI18n.language = "en-US";
    mockI18n.resolvedLanguage = "en-US";
    render(<LanguageSwitcher />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("en");
  });
});