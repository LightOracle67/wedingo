import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const changeLanguage = vi.fn();

const mockI18n = { language: "en", changeLanguage };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }),
}));

afterEach(() => {
  cleanup();
});

import LanguageSwitcher from "../LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders only the two available languages (es, en)", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "Español" })).toBeDefined();
    expect(screen.getByRole("button", { name: "English" })).toBeDefined();
    expect(screen.getAllByRole("button").length).toBe(2);
  });

  it("marks the current language as active", () => {
    render(<LanguageSwitcher />);
    const enBtn = screen.getByRole("button", { name: "English" });
    const esBtn = screen.getByRole("button", { name: "Español" });
    expect(enBtn.getAttribute("aria-pressed")).toBe("true");
    expect(esBtn.getAttribute("aria-pressed")).toBe("false");
    expect(enBtn.className).toContain("lang-trigger--active");
  });

  it("calls changeLanguage when a language is selected", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Español" }));
    expect(changeLanguage).toHaveBeenCalledWith("es");
  });

  it("handles language with region (en-US)", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = "en-US";
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    mockI18n.language = prevLang;
  });

  it("falls back to es when i18n.language is undefined", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = undefined as unknown as string;
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "Español" }).getAttribute("aria-pressed")).toBe("true");
    mockI18n.language = prevLang;
  });
});
