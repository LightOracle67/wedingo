import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../lib/firebase", () => ({
  invitationDocRef: vi.fn(() => "invitation-ref"),
}));

vi.mock("../../lib/utils", () => ({
  normalizeConfig: vi.fn((data) => data),
}));

vi.mock("../../lib/crypto-utils", () => ({
  encrypt: vi.fn((v) => Promise.resolve(v)),
}));

vi.mock("../../lib/error-utils", () => ({
  getFirestoreErrorMessage: vi.fn(() => "Error saving"),
}));

import { useAutoSave } from "../useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports useAutoSave as a function", () => {
    expect(typeof useAutoSave).toBe("function");
  });

  it("returns autoSaveTimerRef and doSave", () => {
    const { result } = renderHook(() =>
      useAutoSave(true, "test-token", {}, {}, vi.fn(), { current: false }),
    );
    expect(result.current).toHaveProperty("autoSaveTimerRef");
    expect(result.current).toHaveProperty("doSave");
  });
});
