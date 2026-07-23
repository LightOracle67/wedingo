import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFocusTrap, useEscapeKey } from "../useFocusTrap";

describe("useFocusTrap", () => {
  it("returns a ref object", () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toHaveProperty("current");
  });

  it("returns a ref with null current when closed", () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current.current).toBeNull();
  });

  it("accepts open boolean parameter", () => {
    const { result } = renderHook(() => useFocusTrap(true));
    expect(result.current.current).toBeNull();
  });

  it("is a function", () => {
    expect(typeof useFocusTrap).toBe("function");
  });
});

describe("useEscapeKey", () => {
  it("is a function", () => {
    expect(typeof useEscapeKey).toBe("function");
  });

  it("calls callback on Escape keydown when enabled", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, true));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call callback when disabled", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, false));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("does not call callback for non-Escape keys", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, true));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("cleanup removes event listener", () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onEscape, true));
    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).not.toHaveBeenCalled();
  });
});
