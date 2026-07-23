import { describe, it, expect } from "vitest";
import { idbSet, idbGet, idbDelete, idbClear } from "../idb-utils";

describe("idb-utils", () => {
  it("exports idbSet as a function", () => expect(typeof idbSet).toBe("function"));
  it("exports idbGet as a function", () => expect(typeof idbGet).toBe("function"));
  it("exports idbDelete as a function", () => expect(typeof idbDelete).toBe("function"));
  it("exports idbClear as a function", () => expect(typeof idbClear).toBe("function"));

  it("stores and retrieves a value", async () => {
    await idbSet("test", { data: 123 });
    const result = await idbGet("test");
    expect(result).toEqual({ data: 123 });
  });

  it("returns null for missing keys", async () => {
    const result = await idbGet("nonexistent");
    expect(result).toBeNull();
  });

  it("deletes a value", async () => {
    await idbSet("temp", "value");
    await idbDelete("temp");
    const result = await idbGet("temp");
    expect(result).toBeNull();
  });

  it("clears all values", async () => {
    await idbSet("a", 1);
    await idbSet("b", 2);
    await idbClear();
    expect(await idbGet("a")).toBeNull();
    expect(await idbGet("b")).toBeNull();
  });
});
