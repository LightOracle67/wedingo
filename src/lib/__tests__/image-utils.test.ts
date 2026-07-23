import { describe, it, expect } from "vitest";

// compressImage is a browser-only function (requires File/Image/Canvas)
// We can only test that it exists and exports correctly
import { compressImage } from "../image-utils";

describe("image-utils", () => {
  it("exports compressImage as a function", () => {
    expect(typeof compressImage).toBe("function");
  });
});
