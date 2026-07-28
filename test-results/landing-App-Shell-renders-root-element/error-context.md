# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> App Shell >> renders root element
- Location: e2e/landing.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeAttached() failed

Locator: locator('#root')
Expected: attached
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeAttached" with timeout 5000ms
  - waiting for locator('#root')

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("App Shell", () => {
  4  |   test("renders root element", async ({ page }) => {
  5  |     await page.goto("/");
> 6  |     await expect(page.locator("#root")).toBeAttached();
     |                                         ^ Error: expect(locator).toBeAttached() failed
  7  |   });
  8  | 
  9  |   test("has correct title", async ({ page }) => {
  10 |     await page.goto("/");
  11 |     await expect(page).toHaveTitle(/Wedingo/i);
  12 |   });
  13 | });
  14 | 
```