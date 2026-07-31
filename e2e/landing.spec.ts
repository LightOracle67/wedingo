import { test, expect } from "@playwright/test";

test.describe("App Shell", () => {
  test("renders root element", async ({ page }) => {
    let status = 0;
    let body = "";
    const resp = await page.goto("/");
    status = resp?.status() ?? 0;
    if (resp) {
      const text = await resp.text();
      body = text.slice(0, 300);
    }
    console.log("DEBUG status:", status);
    console.log("DEBUG contentType:", await resp?.headerValue("content-type"));
    console.log("DEBUG body:", JSON.stringify(body));
    await expect(page.locator("#root")).toBeAttached();
  });
});
