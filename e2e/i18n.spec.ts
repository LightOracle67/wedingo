import { test, expect } from "@playwright/test";

/**
 * E2E multilingüe: selector de idiomas, `?lang=`, y RTL (dir).
 * Corre contra el preview local (vite preview) con localStorage preparado
 * (sin consentimiento no se carga Sentry/analytics y evita el banner modal).
 */
test.describe("i18n / idiomas", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Limpiar el idioma cacheado para que cada test parta de detección limpia.
      window.localStorage.clear();
      window.localStorage.setItem(
        "wedin_cookie_consent",
        JSON.stringify({ status: "accepted", ts: Date.now(), version: "2026-08-10" }),
      );
      window.localStorage.setItem("wedin_cookie_prefs", JSON.stringify({ necessary: true, analytics: false }));
    });
  });

  test("?lang=de muestra alemán (html lang y selector)", async ({ page }) => {
    await page.goto("/?lang=de");
    await expect(page.locator("html")).toHaveAttribute("lang", /^de/);
    const select = page.locator(".lang-select__control:visible");
    await expect(select).toHaveValue("de");
    await expect(page.getByTestId("create-invitation-btn")).toBeVisible();
  });

  test("cambiar idioma en el selector re-renderiza la UI", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByTestId("create-invitation-btn");
    const esText = (await btn.textContent()) || "";

    const select = page.locator(".lang-select__control:visible");
    await select.selectOption("de");
    await expect(page.locator("html")).toHaveAttribute("lang", /^de/);
    await expect(select).toHaveValue("de");
    // El texto del CTA debe cambiar (ya no es el texto en español).
    await expect(btn).not.toHaveText(esText);
    await expect(btn).not.toHaveText("");
  });

  test("árabe (ar-SA) activa dir=rtl y ?lang=ar funciona", async ({ page }) => {
    await page.goto("/?lang=ar-SA");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", /^ar/);
    const select = page.locator(".lang-select__control:visible");
    await expect(select).toHaveValue("ar-SA");
    // Hebreo también es RTL vía selector.
    await select.selectOption("he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});