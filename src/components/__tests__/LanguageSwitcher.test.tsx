import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

const changeLanguage = vi.fn();

const mockI18n = { language: "en", changeLanguage };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

import LanguageSwitcher from "../LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders language trigger", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByTitle("lang.triggerLabel")).toBeDefined();
  });

  it("opens popup on trigger click", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("calls changeLanguage when a language is selected", () => {
    vi.useFakeTimers();
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    const enBtn = screen.getByText("English");
    fireEvent.click(enBtn);
    expect(changeLanguage).toHaveBeenCalledWith("en");
    vi.useRealTimers();
  });

  it("closes popup after selecting a language", () => {
    vi.useFakeTimers();
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    expect(screen.getByRole("dialog")).toBeDefined();
    const enBtn = screen.getByText("English");
    fireEvent.click(enBtn);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.useRealTimers();
  });

  it("closes popup on overlay click", () => {
    vi.useFakeTimers();
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.useRealTimers();
  });

  it("highlights current language with active class", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    const activeBtn = document.querySelector(".lang-popup__btn--active");
    expect(activeBtn).toBeDefined();
    expect(activeBtn?.textContent).toContain("EN");
  });

  it("renders language groups", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    expect(screen.getByText("langGroups.spain")).toBeDefined();
  });

  it("displays current language label on trigger button", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText(/EN/)).toBeDefined();
  });

  it("handles language with hyphen (e.g., en-US)", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = "en-US";
    render(<LanguageSwitcher />);
    expect(screen.getByText(/EN/)).toBeDefined();
    mockI18n.language = prevLang;
  });

  it("falls back to uppercase code when language not found in groups", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = "xx";
    render(<LanguageSwitcher />);
    expect(screen.getByText(/XX/)).toBeDefined();
    mockI18n.language = prevLang;
  });

  it("renders lang name from label with separator", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTitle("lang.triggerLabel"));
    const allBtns = document.querySelectorAll(".lang-popup__btn");
    expect(allBtns.length).toBeGreaterThan(0);
    allBtns.forEach((btn) => {
      const nameEl = btn.querySelector(".lang-popup__name");
      expect(nameEl?.textContent).toBeTruthy();
    });
  });

  it("falls back to es when i18n.language is undefined", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = undefined as unknown as string;
    render(<LanguageSwitcher />);
    expect(screen.getByText(/ES/)).toBeDefined();
    mockI18n.language = prevLang;
  });

  it("displays lang code as label when currentLang not in groups", () => {
    const prevLang = mockI18n.language;
    mockI18n.language = "zz";
    render(<LanguageSwitcher />);
    expect(screen.getByText(/ZZ/)).toBeDefined();
    mockI18n.language = prevLang;
  });
});
