# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> App Shell >> has correct title
- Location: e2e/landing.spec.ts:9:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Wedingo/i
Received string:  ""
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    14 × locator resolved to <html>…</html>
       - unexpected value ""

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("App Shell", () => {
  4  |   test("renders root element", async ({ page }) => {
  5  |     await page.goto("/");
  6  |     await expect(page.locator("#root")).toBeAttached();
  7  |   });
  8  | 
  9  |   test("has correct title", async ({ page }) => {
  10 |     await page.goto("/");
> 11 |     await expect(page).toHaveTitle(/Wedingo/i);
     |                        ^ Error: expect(page).toHaveTitle(expected) failed
  12 |   });
  13 | });
  14 | 
```