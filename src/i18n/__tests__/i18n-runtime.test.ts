import { describe, it, expect } from "vitest";
import i18n from "../index";

/**
 * Pruebas de regresión del comportamiento i18n en vivo:
 *  - Los bundles CON REGIÓN (pt-BR, pt-PT, ar-SA) deben cargar su contenido
 *    real (no caer a `es`): regresión del bug nonExplicitSupportedLngs.
 *  - <html dir> debe ponerse rtl para árabe.
 *  - Los idiomas sin región (tl, de) cargan su contenido.
 */
describe("i18n runtime", () => {
  it("pt-BR carga portugués brasileño (no español)", async () => {
    await i18n.loadLanguages(["pt-BR"]);
    await i18n.changeLanguage("pt-BR");
    expect(i18n.resolvedLanguage).toBe("pt-BR");
    expect(i18n.t("rsvp.submitButton")).toBe("Confirmar presença");
  });

  it("pt-PT carga portugués europeo (no español)", async () => {
    await i18n.changeLanguage("pt-PT");
    expect(i18n.t("rsvp.submitButton")).toBe("Confirmar presença");
  });

  it("tl carga tagalo (no inglés)", async () => {
    await i18n.changeLanguage("tl");
    expect(i18n.t("rsvp.submitButton")).toBe("Kumpirmahin ang Pagdalo");
  });

  it("de carga alemán", async () => {
    await i18n.changeLanguage("de");
    expect(i18n.t("hero.sectionLabel")).toBe("Titelseite");
  });

  it("ar-SA carga árabe y marca el dir RTL", async () => {
    await i18n.changeLanguage("ar-SA");
    expect(i18n.resolvedLanguage).toBe("ar-SA");
    expect(document.documentElement.dir).toBe("rtl");
    expect(i18n.t("hero.sectionLabel")).toBe("الغلاف");
  });
});