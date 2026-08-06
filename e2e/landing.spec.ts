import { test, expect } from "@playwright/test";

test.describe("App Shell", () => {
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
});
