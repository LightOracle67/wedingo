import { describe, it, expect, vi } from "vitest";
import { downloadJson } from "../file-utils";

describe("file-utils", () => {
  it("downloadJson creates a blob URL and triggers download", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();

    Object.defineProperty(global, "URL", { value: { createObjectURL, revokeObjectURL } });

    document.body.appendChild = appendChild;
    document.body.removeChild = removeChild;

    const link = { click, style: {} };
    document.createElement = vi.fn(() => link) as any;

    downloadJson("test-file", { test: true });

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
