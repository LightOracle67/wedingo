import { describe, it, expect } from "vitest";

describe("main", () => {
  it("importa sin error y expone mountApp (sin montar la app real en tests)", async () => {
    const mod = await import("../main");
    expect(mod).toBeDefined();
    expect(typeof mod.mountApp).toBe("function");
  });
});
