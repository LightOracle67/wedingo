import { describe, it, expect, vi } from "vitest";
import { downloadJson, downloadText } from "../file-utils";

describe("file-utils", () => {
  it("downloadJson creates a blob URL and triggers download", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();

    Object.defineProperty(globalThis, "URL", { value: { createObjectURL, revokeObjectURL } });

    document.body.appendChild = appendChild;
    document.body.removeChild = removeChild;

    const link = { click, style: {} };
    document.createElement = vi.fn(() => link) as any;

    downloadJson("test-file", { test: true });

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("downloadText serializa texto plano y limpia el nodo y el URL", () => {
    const createObjectURL = vi.fn(() => "blob:text");
    const revokeObjectURL = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();

    Object.defineProperty(globalThis, "URL", { value: { createObjectURL, revokeObjectURL } });
    document.body.appendChild = appendChild;
    document.body.removeChild = removeChild;
    const link = { click, style: {}, download: "", href: "" };
    document.createElement = vi.fn(() => link) as unknown as typeof document.createElement;

    downloadText("x.ics", "BEGIN:VCALENDAR\nEND:VCALENDAR");

    expect(link.download).toBe("x.ics");
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
