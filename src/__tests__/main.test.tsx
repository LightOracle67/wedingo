import { describe, it, expect, beforeAll } from "vitest";
describe("main", () => {
  beforeAll(() => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  it("imports without error", async () => {
    const mod = await import("../main");
    expect(mod).toBeDefined();
  });
});
