import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRsvpSubmit } from "../useRsvpSubmit";

describe("useRsvpSubmit", () => {
  const mockOnSubmit = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with idle state", () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  it("sets submitting during async operation", async () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    act(() => {
      result.current.handleSubmit({});
    });
    expect(result.current.submitting).toBe(true);
  });

  it("resets error on new submit", async () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit({});
    });
    expect(result.current.submitError).toBeNull();
  });

  it("handles validation errors", async () => {
    const validate = vi.fn(() => "Validation failed");
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit, validate }),
    );
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.handleSubmit({});
    });
    expect(ok).toBe(false);
    expect(result.current.submitError).toBe("Validation failed");
  });

  it("handles submission errors", async () => {
    const failingSubmit = vi.fn(() => Promise.reject(new Error("Network error")));
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: failingSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit({});
    });
    expect(result.current.submitError).toBe("Network error");
  });

  it("handles non-Error rejection with default message", async () => {
    const failingSubmit = vi.fn(() => Promise.reject("string error"));
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: failingSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit({});
    });
    expect(result.current.submitError).toBe("Error submitting RSVP");
  });

  it("resets error via resetError", () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    act(() => {
      result.current.resetError();
    });
    expect(result.current.submitError).toBeNull();
  });

  it("returns false on validation error", async () => {
    const validate = vi.fn(() => "Error");
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit, validate }),
    );
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.handleSubmit({});
    });
    expect(ok).toBe(false);
  });

  it("returns true on successful submit", async () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.handleSubmit({});
    });
    expect(ok).toBe(true);
  });

  it("sets submitting to false after completion", async () => {
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: mockOnSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit({});
    });
    expect(result.current.submitting).toBe(false);
  });

  it("sets submitting to false after error", async () => {
    const failingSubmit = vi.fn(() => Promise.reject(new Error("Error")));
    const { result } = renderHook(() =>
      useRsvpSubmit({ token: "test", onSubmit: failingSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit({});
    });
    expect(result.current.submitting).toBe(false);
  });
});
