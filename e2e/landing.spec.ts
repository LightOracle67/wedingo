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
});
