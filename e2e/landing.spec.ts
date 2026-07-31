import { test, expect } from "@playwright/test";

test.describe("App Shell", () => {
  test("renders root element", async ({ page }) => {
    const resp = await page.goto("/");
    console.log("DEBUG status:", resp?.status());
    console.log("DEBUG url:", page.url());
    console.log("DEBUG title:", await page.title());
    const html = await page.content();
    console.log("DEBUG html head:", html.slice(0, 400));
    await expect(page.locator("#root")).toBeAttached();
  });
});
