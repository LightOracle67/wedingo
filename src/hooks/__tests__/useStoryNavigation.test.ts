import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryNavigation } from "../useStoryNavigation";

const SAMPLE_ORDER = ["hero", "details", "info", "story", "gifts", "rsvp"];

describe("useStoryNavigation", () => {
  it("returns expected object shape", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current).toHaveProperty("activeSection");
    expect(result.current).toHaveProperty("transition");
    expect(result.current).toHaveProperty("isTransitioning");
    expect(result.current).toHaveProperty("getSectionStyle");
    expect(result.current).toHaveProperty("getSectionClassName");
    expect(result.current).toHaveProperty("startTransition");
  });

  it("sets activeSection to the first item in visibleOrder", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.activeSection).toBe("hero");
  });

  it("falls back to 'hero' when visibleOrder is empty", () => {
    const { result } = renderHook(() => useStoryNavigation([]));
    expect(result.current.activeSection).toBe("hero");
  });

  it("handles a single section", () => {
    const { result } = renderHook(() => useStoryNavigation(["rsvp"]));
    expect(result.current.activeSection).toBe("rsvp");
    expect(result.current.getSectionClassName("rsvp")).toContain("story-section--rsvp");
  });

  it("is not transitioning initially", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.transition.toIndex).toBeNull();
    expect(result.current.transition.fromIndex).toBe(0);
    expect(result.current.transition.direction).toBe(1);
  });

  it("getSectionStyle returns empty object for any key", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    expect(result.current.getSectionStyle("hero")).toEqual({});
    expect(result.current.getSectionStyle("details")).toEqual({});
    expect(result.current.getSectionStyle("unknown")).toEqual({});
    expect(result.current.getSectionStyle()).toEqual({});
  });

  it("getSectionClassName returns story-section and story-section--{key}", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    const cls = result.current.getSectionClassName("hero");
    expect(cls).toContain("story-section");
    expect(cls).toContain("story-section--hero");
  });

  it("getSectionClassName handles empty key gracefully", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    const cls = result.current.getSectionClassName("");
    expect(cls).toContain("story-section");
    expect(cls).toContain("story-section--");
  });

  it("startTransition is a no-op", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    result.current.startTransition(1);
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.activeSection).toBe("hero");
  });

  it("startTransition ignores undefined index", () => {
    const { result } = renderHook(() => useStoryNavigation(SAMPLE_ORDER));
    result.current.startTransition();
    expect(result.current.isTransitioning).toBe(false);
  });
});
