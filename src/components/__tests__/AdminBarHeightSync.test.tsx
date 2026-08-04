import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AdminBarHeightSync from "../AdminBarHeightSync";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty("--navbar-height");
  document.querySelectorAll(".admin-bar").forEach((el) => el.remove());
});

describe("AdminBarHeightSync", () => {
  it("renders nothing", () => {
    const { container } = render(<AdminBarHeightSync show={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("does nothing when hidden", () => {
    render(<AdminBarHeightSync show={false} />);
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("");
  });

  it("sets --navbar-height from the admin bar when shown", () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.getBoundingClientRect = vi.fn(() => ({ height: 72, width: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
    document.body.appendChild(bar);

    render(<AdminBarHeightSync show={true} />);
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("72px");
  });

  it("does not set the variable when the bar has no height", () => {
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.getBoundingClientRect = vi.fn(() => ({ height: 0, width: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
    document.body.appendChild(bar);

    render(<AdminBarHeightSync show={true} />);
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("");
  });

  it("does nothing when the admin bar is missing", () => {
    render(<AdminBarHeightSync show={true} />);
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("");
  });

  it("cleans up the variable on unmount", () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.getBoundingClientRect = vi.fn(() => ({ height: 50, width: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
    document.body.appendChild(bar);

    const { unmount } = render(<AdminBarHeightSync show={true} />);
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("50px");
    unmount();
    expect(document.documentElement.style.getPropertyValue("--navbar-height")).toBe("");
  });
});
