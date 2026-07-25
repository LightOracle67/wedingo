import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToast } from "../useToast";

describe("useToast", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => renderHook(() => useToast())).toThrow("useToast debe usarse dentro de ToastProvider");
  });
});
