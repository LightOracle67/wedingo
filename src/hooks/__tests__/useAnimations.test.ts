import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { ConfigContext } from "../../contexts/useConfig";
import { useAnimations } from "../useAnimations";
import { ANIMATIONS } from "../../lib/animations";

const envelopeIds = ANIMATIONS.filter((a) => a.groupId === "envelope").map((a) => a.id);

const mockConfig = vi.hoisted(() => ({ disabledAnimations: "" }));
const mockGuest = vi.hoisted(() => ({ value: new Set<string>() }));

vi.mock("../../contexts/AnimationsContext", () => ({
  useAnimationsContext: () => ({
    guestDisabled: mockGuest.value,
    toggleGuestAnimation: vi.fn(),
    setGuestGroup: vi.fn(),
    setAllGuest: vi.fn(),
    resetGuest: vi.fn(),
  }),
}));

describe("useAnimations", () => {
  it("une admin + invitado sin `all`", () => {
    mockConfig.disabledAnimations = "fireflies";
    mockGuest.value = new Set(["countdown-tick"]);
    const { result } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(result.current.allOff).toBe(false);
    expect(result.current.isDisabled("fireflies")).toBe(true);
    expect(result.current.isDisabled("countdown-tick")).toBe(true);
    expect(result.current.isDisabled("envelope-flap")).toBe(false);
  });

  it("allOff = true cuando el admin o el invitado ponen `all`", () => {
    mockConfig.disabledAnimations = "all";
    mockGuest.value = new Set();
    const { result } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(result.current.allOff).toBe(true);
    expect(result.current.isDisabled("fireflies")).toBe(true);
    expect(result.current.isDisabled("envelope-flap")).toBe(true);

    mockConfig.disabledAnimations = "";
    mockGuest.value = new Set(["all"]);
    const { result: g } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(g.current.allOff).toBe(true);
  });

  it("isGroupFullyDisabled detecta grupos totalmente desactivados", () => {
    mockConfig.disabledAnimations = envelopeIds.join(",");
    mockGuest.value = new Set();
    const { result } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(result.current.isGroupFullyDisabled("envelope")).toBe(true);
    expect(result.current.isGroupFullyDisabled("confetti")).toBe(false);
  });

  it("isGroupFullyDisabled devuelve true con allOff", () => {
    mockConfig.disabledAnimations = "all";
    mockGuest.value = new Set();
    const { result } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(result.current.isGroupFullyDisabled("envelope")).toBe(true);
    expect(result.current.isGroupFullyDisabled("music")).toBe(true);
  });

  it("isGroupFullyDisabled es false si solo algunos ids del grupo están desactivados", () => {
    const first = envelopeIds[0];
    mockConfig.disabledAnimations = first ?? "";
    mockGuest.value = new Set();
    const { result } = renderHook(() => useAnimations(), { wrapper: ({ children }) => createElement(ConfigContext.Provider, { value: { config: mockConfig } as never }, children) });
    expect(result.current.isGroupFullyDisabled("envelope")).toBe(false);
  });
});
