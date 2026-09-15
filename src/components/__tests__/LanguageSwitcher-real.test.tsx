import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "../../i18n/index";
import LanguageSwitcher from "../LanguageSwitcher";

/**
 * Regresión real (con el i18n de verdad, sin mocks): el <select> debe reflejar
 * SIEMPRE el idioma ACTUAL (i18n), no el último elegido. Regresión: antes
 * quedaba anclado al valor montado aunque i18n ya había cambiado.
 */
describe("LanguageSwitcher (i18n real) — valor actual", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
    await new Promise((r) => setTimeout(r, 60));
  });

  const select = () => screen.getByRole("combobox") as HTMLSelectElement;

  it("refleja el idioma actual tras varias elecciones y marca dir RTL", async () => {
    const { unmount } = render(<LanguageSwitcher />);
    expect(select().value).toBe("es");

    fireEvent.change(select(), { target: { value: "de" } });
    await new Promise((r) => setTimeout(r, 150));
    expect(select().value).toBe("de");

    fireEvent.change(select(), { target: { value: "fr" } });
    await new Promise((r) => setTimeout(r, 150));
    expect(select().value).toBe("fr");

    fireEvent.change(select(), { target: { value: "ar-SA" } });
    await new Promise((r) => setTimeout(r, 200));
    expect(select().value).toBe("ar-SA");
    expect(document.documentElement.dir).toBe("rtl");

    unmount();
  });
});