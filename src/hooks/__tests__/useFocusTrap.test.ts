import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFocusTrap, useEscapeKey } from "../useFocusTrap";

function createTrapElements(count = 2) {
  const container = document.createElement("div");
  const buttons: HTMLButtonElement[] = [];
  for (let i = 0; i < count; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Btn${i}`;
    container.appendChild(btn);
    buttons.push(btn);
  }
  document.body.appendChild(container);
  return { container, buttons };
}

describe("useFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

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

  it("focuses first element when opened", () => {
    const { result, rerender } = renderHook((open: boolean) => useFocusTrap<HTMLDivElement>(open), { initialProps: false });
    const { container, buttons } = createTrapElements();
    result.current.current = container;
    rerender(true);
    expect(document.activeElement).toBe(buttons[0]);
    document.body.removeChild(container);
  });

  it("restores focus on cleanup", () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();

    const { result, rerender, unmount } = renderHook((open: boolean) => useFocusTrap<HTMLDivElement>(open), { initialProps: true });
    const { container } = createTrapElements();
    result.current.current = container;

    rerender(false);
    unmount();
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(container);
    document.body.removeChild(outside);
  });

  it("wraps Tab from last to first element", () => {
    const { result, rerender } = renderHook((open: boolean) => useFocusTrap<HTMLDivElement>(open), { initialProps: false });
    const { container, buttons } = createTrapElements();
    result.current.current = container;
    rerender(true);

    act(() => { buttons[1].focus(); container.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect(document.activeElement).toBe(buttons[0]);

    document.body.removeChild(container);
  });

  it("wraps Shift+Tab from first to last element", () => {
    const { result, rerender } = renderHook((open: boolean) => useFocusTrap<HTMLDivElement>(open), { initialProps: false });
    const { container, buttons } = createTrapElements();
    result.current.current = container;
    rerender(true);

    act(() => { buttons[0].focus(); container.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })); });
    expect(document.activeElement).toBe(buttons[1]);

    document.body.removeChild(container);
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
