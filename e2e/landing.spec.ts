import { test, expect } from "@playwright/test";

test.describe("App Shell", () => {
  // El banner de consentimiento es un modal que intercepta los clics en CI de
  // forma intermitente (carrera con su render). Pre-aceptar cookies en
  // localStorage (mismo formato que guarda CookieConsent: status/ts/version
  // + preferencias) hace las pruebas deterministas; addInitScript corre antes
  // de cada navegación, igual que en setup.spec.ts.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "wedin_cookie_consent",
        JSON.stringify({ status: "accepted", ts: Date.now(), version: "test" }),
      );
      window.localStorage.setItem(
        "wedin_cookie_prefs",
        JSON.stringify({ necessary: true, analytics: false }),
      );
    });
  });

  test("renders root element", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeAttached();
  });

  test("has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Wedingo/i);
  });

  test("navigates to an unknown invitation without crashing", async ({ page }) => {
    await page.goto("/token-inexistente-12345");
    await expect(page.locator("#root")).toBeAttached();
    await expect(page).toHaveTitle(/Wedingo/i);
  });

  test("shows the 404 page for unknown multi-segment paths", async ({ page }) => {
    await page.goto("/random/test");
    await expect(page.locator('[data-testid="not-found-page"]')).toBeVisible();
  });

  test("landing shows the create CTA button", async ({ page }) => {
    await page.goto("/");
    // Identificado por testid: el texto traducido varía por idioma y el regex
    // casaba también con "Ya tengo una invitación".
    await expect(page.getByTestId("create-invitation-btn")).toBeVisible();
  });

  test("opens the login modal from 'Ya tengo una invitación'", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("have-invitation-btn").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("keeps the login button disabled until the token is long enough", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("have-invitation-btn").click();
    // El botón se habilita con usuario + token ≥20 caracteres.
    await page.locator("#loginUsernameInput").fill("admin");
    await page.getByTestId("login-token-input").fill("abcd");
    await expect(page.getByTestId("login-submit-btn")).toBeDisabled();
    await page.getByTestId("login-token-input").fill("a".repeat(24));
    await expect(page.getByTestId("login-submit-btn")).toBeEnabled();
  });
});
