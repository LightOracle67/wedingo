import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { InvitationConfig } from "../../types";

const mockT = vi.hoisted(() => vi.fn((key: string) => key));
const mockSetDoc = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockNormalizeConfig = vi.hoisted(() => vi.fn((data: InvitationConfig) => data));
const mockEncrypt = vi.hoisted(() => vi.fn((v: string) => Promise.resolve(v)));
const mockGetFirestoreErrorMessage = vi.hoisted(() => vi.fn(() => "Error saving"));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock("firebase/firestore", () => ({
  setDoc: mockSetDoc,
}));

vi.mock("../../lib/firebase", () => ({
  invitationDocRef: vi.fn(() => "invitation-ref"),
}));

vi.mock("../../lib/utils", () => ({
  normalizeConfig: mockNormalizeConfig,
}));

vi.mock("../../lib/crypto-utils", () => ({
  encrypt: mockEncrypt,
}));

vi.mock("../../lib/error-utils", () => ({
  getFirestoreErrorMessage: mockGetFirestoreErrorMessage,
}));

import { useAutoSave } from "../useAutoSave";

const sampleConfig: InvitationConfig = {
  adminUsername: "",
  firstName: "Alice",
  secondName: "Bob",
  inviteMessage: "Welcome",
  theme: "default",
  weddingDay: "15",
  weddingMonth: "junio",
  weddingYear: "2026",
  weddingHour: "17",
  weddingMinute: "00",
  weddingPlace: "Church",
  weddingSiteURL: "",
  weddingMapView: "roadmap",
  weddingMapStatic: "false",
  transportEnabled: "none",
  transportDepartures: "",
  
  weddingSchedule: "",
  weddingScheduleEvents: "",
  weddingDressCode: "",
  couplePhoto: "",
  musicFile: "",
  musicUrl: "",
  sectionOrder: "",
  hiddenSections: "",
  storyText: "",
  giftsInfo: "",
  bankInfo: "",
  accommodationInfo: "",
  transportInfo: "",
  godparent1: "",
  godparent2: "",
  kidsPolicy: "",
  menuEnabled: "false",
  menuTexto: "",
  menuCarne: "",
  menuPescado: "",
  menuVegano: "",
  menuPostre: "",
};

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      useAutoSave(true, "test-token", {} as InvitationConfig, {} as InvitationConfig, vi.fn(), { current: false }),
    );
    expect(result.current).toHaveProperty("autoSaveTimerRef");
    expect(result.current).toHaveProperty("doSave");
  });

  it("triggers save after debounce when formData differs from config", async () => {
    const differentData = { ...sampleConfig, firstName: "Changed" };
    renderHook(() =>
      useAutoSave(true, "test-token", differentData, sampleConfig, vi.fn(), { current: false }),
    );

    await vi.advanceTimersByTimeAsync(1500);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it("does not save when formData equals config", () => {
    renderHook(() =>
      useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }),
    );

    vi.advanceTimersByTime(1500);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("does not save when hasStoredConfig is false", () => {
    const differentData = { ...sampleConfig, firstName: "Changed" };
    renderHook(() =>
      useAutoSave(false, "test-token", differentData, sampleConfig, vi.fn(), { current: false }),
    );

    vi.advanceTimersByTime(1500);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("does not save when inviteToken is empty", () => {
    const differentData = { ...sampleConfig, firstName: "Changed" };
    renderHook(() =>
      useAutoSave(true, "", differentData, sampleConfig, vi.fn(), { current: false }),
    );

    vi.advanceTimersByTime(1500);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("calls onSaveMessage with autosave.saved after successful save", async () => {
    const onSaveMessage = vi.fn();
    const differentData = { ...sampleConfig, firstName: "Changed" };
    renderHook(() =>
      useAutoSave(true, "test-token", differentData, sampleConfig, onSaveMessage, { current: false }),
    );

    await vi.advanceTimersByTimeAsync(1500);

    expect(onSaveMessage).toHaveBeenCalledWith("autosave.saved");
  });

  it("restarts debounce timer when formData changes again", async () => {
    const { rerender } = renderHook(
      ({ formData }) =>
        useAutoSave(true, "test-token", formData, sampleConfig, vi.fn(), { current: false }),
      { initialProps: { formData: { ...sampleConfig, firstName: "Change1" } } },
    );

    vi.advanceTimersByTime(1000);

    rerender({ formData: { ...sampleConfig, firstName: "Change2" } });

    vi.advanceTimersByTime(1000);

    expect(mockSetDoc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  describe("doSave", () => {
    it("returns null when already saving via autoSavingRef", async () => {
      let resolveDeferred: (v: unknown) => void = () => {};
      const deferredPromise = new Promise((resolve) => { resolveDeferred = resolve; });
      mockSetDoc.mockReturnValueOnce(deferredPromise as Promise<void>);

      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }),
      );

      const firstPromise = result.current.doSave(sampleConfig);

      const secondOutput = await result.current.doSave(sampleConfig);
      expect(secondOutput).toBeNull();

      resolveDeferred(sampleConfig);
      await firstPromise;
    });

    it("returns null when isSavingRef.current is true", async () => {
      const isSavingRef = { current: true };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), isSavingRef),
      );

      let output: unknown;
      await act(async () => {
        output = await result.current.doSave(sampleConfig);
      });

      expect(output).toBeNull();
    });

    it("encrypts bankInfo when present", async () => {
      const dataWithBank = { ...sampleConfig, bankInfo: "ES1234567890" };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithBank, dataWithBank, vi.fn(), { current: false }),
      );

      await act(async () => {
        await result.current.doSave(dataWithBank);
      });

      expect(mockEncrypt).toHaveBeenCalledWith("ES1234567890", "test-token");
    });

    it("encrypts couplePhoto when it is a data URI", async () => {
      const dataWithPhoto = { ...sampleConfig, couplePhoto: "data:image/png;base64,abc" };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithPhoto, dataWithPhoto, vi.fn(), { current: false }),
      );

      await act(async () => {
        const output = await result.current.doSave(dataWithPhoto) as InvitationConfig;
        expect(output?.couplePhoto).toBe("data:image/png;base64,abc");
      });

      expect(mockEncrypt).toHaveBeenCalledWith("data:image/png;base64,abc", "test-token");
    });

    it("does not encrypt couplePhoto when it is a URL (not data URI)", async () => {
      const dataWithPhotoUrl = { ...sampleConfig, couplePhoto: "https://example.com/photo.jpg" };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithPhotoUrl, dataWithPhotoUrl, vi.fn(), { current: false }),
      );

      await act(async () => {
        await result.current.doSave(dataWithPhotoUrl);
      });

      expect(mockEncrypt).not.toHaveBeenCalledWith("https://example.com/photo.jpg", "test-token");
    });

    it("handles doSave error and calls onSaveMessage", async () => {
      mockSetDoc.mockRejectedValueOnce(new Error("Firestore error"));
      const onSaveMessage = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, onSaveMessage, { current: false }),
      );

      let output: unknown;
      await act(async () => {
        output = await result.current.doSave(sampleConfig);
      });

      expect(output).toBeNull();
      expect(onSaveMessage).toHaveBeenCalledWith("Error saving");
    });

    it("deletes musicFile from payload before saving", async () => {
      const dataWithMusic = { ...sampleConfig, musicFile: "some-audio.mp3" };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithMusic, dataWithMusic, vi.fn(), { current: false }),
      );

      await act(async () => {
        await result.current.doSave(dataWithMusic);
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        "invitation-ref",
        expect.not.objectContaining({ musicFile: expect.anything() }),
        { merge: true },
      );
    });
  });

  describe("cleanup", () => {
    it("clears timer on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const differentData = { ...sampleConfig, firstName: "Changed" };
      const { unmount } = renderHook(() =>
        useAutoSave(true, "test-token", differentData, sampleConfig, vi.fn(), { current: false }),
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it("clears timer ref in second cleanup effect", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const differentData = { ...sampleConfig, firstName: "Changed" };
      const { result, unmount } = renderHook(() =>
        useAutoSave(true, "test-token", differentData, sampleConfig, vi.fn(), { current: false }),
      );

      expect(result.current.autoSaveTimerRef.current).not.toBeNull();
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(result.current.autoSaveTimerRef.current).toBeNull();
      clearTimeoutSpy.mockRestore();
    });

    it("clears timer from second effect when first effect returns early", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const differentData = { ...sampleConfig, firstName: "Changed" };
      const { rerender, unmount } = renderHook(
        ({ hasStoredConfig, formData }) =>
          useAutoSave(hasStoredConfig, "test-token", formData, sampleConfig, vi.fn(), { current: false }),
        { initialProps: { hasStoredConfig: true, formData: differentData } },
      );

      rerender({ hasStoredConfig: false, formData: differentData });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
