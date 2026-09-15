import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import axe from "axe-core";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn(), on: vi.fn(() => () => {}), off: vi.fn() },
  }),
}));

afterEach(() => cleanup());

import LanguageSwitcher from "../components/LanguageSwitcher";

/**
 * Auditoría de accesibilidad (axe-core) sobre el chrome i18n recién cambiado:
 * el selector de idiomas (select con optgroups, opción Auto, aria-label).
 * Se desactiva "color-contrast" porque jsdom no calcula estilos reales.
 */
describe("a11y: selector de idiomas (axe-core)", () => {
  it("no presenta violaciones de accesibilidad", async () => {
    // <main> para satisfacer la regla de landmarks (en la app real existe);
    // el color-contrast se desactiva porque jsdom no calcula estilos.
    const { container } = render(
      <main>
        <LanguageSwitcher />
      </main>,
    );
    const results = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    const violations = results.violations.map((v) => `${v.id}: ${v.help}`);
    expect(violations).toEqual([]);
    expect(container.querySelector("select")).not.toBeNull();
  });
});