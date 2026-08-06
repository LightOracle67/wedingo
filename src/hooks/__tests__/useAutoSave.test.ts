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

const mockSaveConfigImage = vi.hoisted(() => vi.fn((_t: string, id: string, _v: string) => Promise.resolve(`__cfgimg:${id}`)));
vi.mock("../../lib/image-store", () => ({
  saveConfigImage: mockSaveConfigImage,
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
  instagramUrl: "",
  facebookUrl: "",
  weddingMapView: "roadmap",
  weddingMapStatic: "false",
  detailsMapMode: "iframe",
  transportMapMode: "iframe",
  accommodationMapMode: "iframe",
  transportEnabled: "none",
  transportDepartures: "",
  
  weddingScheduleEvents: "",
  weddingDressCode: "",
  weddingDressCodeCustom: "",
  couplePhoto: "",
  musicFile: "",
  musicUrl: "",
  sectionOrder: "",
  hiddenSections: "",
  storyText: "",
  giftsInfo: "",
  bankInfo: "",
  accommodationInfo: "",
  accommodationURL: "",
  godparent1: "",
  godparent2: "",
  kidsPolicy: "",
  menuEnabled: "false",
  menuTexto: "",
  menuCarne: "",
  menuPescado: "",
  menuVegano: "",
  menuPostre: "",
  menuTextoDishes: "",
  menuCarneDishes: "",
  menuPescadoDishes: "",
  menuVeganoDishes: "",
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

  it("does not report saved when the debounced save fails", async () => {
    const differentData = { ...sampleConfig, firstName: "Changed" };
    const onSaveMessage = vi.fn();
    const onSaveError = vi.fn();
    mockSetDoc.mockRejectedValueOnce(new Error("net"));    renderHook(() =>
      useAutoSave(true, "test-token", differentData, sampleConfig, onSaveMessage, { current: false }, undefined, onSaveError),
    );

    await vi.advanceTimersByTimeAsync(1500);

    expect(onSaveMessage).not.toHaveBeenCalledWith("autosave.saved");
    expect(onSaveError).toHaveBeenCalledWith("Error saving");
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

  it("retries once after a failed debounced save", async () => {
    // Tras un fallo de red se reprograma un único reintento a los 2 s.
    const differentData = { ...sampleConfig, firstName: "Changed" };
    const onSaveMessage = vi.fn();
    mockSetDoc.mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce(undefined);
    renderHook(() =>
      useAutoSave(true, "test-token", differentData, sampleConfig, onSaveMessage, { current: false }),
    );

    await vi.advanceTimersByTimeAsync(1500);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(onSaveMessage).toHaveBeenCalledWith("autosave.saved");
  });

  it("does not report saved when the retry also fails", async () => {
    const differentData = { ...sampleConfig, firstName: "Changed" };
    const onSaveMessage = vi.fn();
    const onSaveError = vi.fn();
    mockSetDoc.mockRejectedValueOnce(new Error("net")).mockRejectedValueOnce(new Error("net"));
    renderHook(() =>
      useAutoSave(true, "test-token", differentData, sampleConfig, onSaveMessage, { current: false }, undefined, onSaveError),
    );

    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(2000);

    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(onSaveMessage).not.toHaveBeenCalled();
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

    it("does not save a dress code 'Otro' without custom text", async () => {
      const data = { ...sampleConfig, weddingDressCode: "Otro", weddingDressCodeCustom: "" };
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", data, data, vi.fn(), { current: false }, undefined, onSaveError),
      );
      await act(async () => {
        await result.current.doSave(data);
      });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(onSaveError).toHaveBeenCalled();
    });

    it("does not save when the second name is missing", async () => {
      const data = { ...sampleConfig, secondName: "" };
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", data, data, vi.fn(), { current: false }, undefined, onSaveError),
      );
      await act(async () => {
        await result.current.doSave(data);
      });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(onSaveError).toHaveBeenCalled();
    });

    it("does not save a transport departure with an invalid time", async () => {
      const data = {
        ...sampleConfig,
        transportDepartures: JSON.stringify([{ type: "bus", time: "25:00", url: "" }]),
      };
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", data, data, vi.fn(), { current: false }, undefined, onSaveError),
      );
      await act(async () => {
        await result.current.doSave(data);
      });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(onSaveError).toHaveBeenCalledWith("errors.transportTimeInvalid");
    });

    it("rejects a departure with an invalid map URL", async () => {
      const data = {
        ...sampleConfig,
        transportDepartures: JSON.stringify([{ type: "bus", time: "10:30", url: "https://example.com" }]),
      };
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", data, data, vi.fn(), { current: false }, undefined, onSaveError),
      );
      await act(async () => {
        await result.current.doSave(data);
      });
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(onSaveError).toHaveBeenCalledWith("errors.transportUrlInvalid");
    });

    it("saves valid departures without error", async () => {
      const data = {
        ...sampleConfig,
        transportDepartures: JSON.stringify([{ type: "bus", time: "10:30", url: "" }]),
      };
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", data, data, vi.fn(), { current: false }, undefined, onSaveError),
      );
      await act(async () => {
        await result.current.doSave(data);
      });
      expect(mockSetDoc).toHaveBeenCalled();
      expect(onSaveError).not.toHaveBeenCalled();
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

    it("migrates a data-URI couplePhoto to the configImages subcollection", async () => {
      const dataWithPhoto = { ...sampleConfig, couplePhoto: "data:image/png;base64,abc" };
      // El payload se restaura en memoria tras setDoc; capturamos una copia
      // en el momento de la llamada para comprobar el __cfgimg: escrito.
      let written: Record<string, unknown> = {};
      mockSetDoc.mockImplementationOnce(((_ref: unknown, data: Record<string, unknown>) => {
        written = { ...data };
        return Promise.resolve();
      }) as never);
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithPhoto, dataWithPhoto, vi.fn(), { current: false }),
      );

      await act(async () => {
        const output = await result.current.doSave(dataWithPhoto) as InvitationConfig;
        expect(output?.couplePhoto).toBe("data:image/png;base64,abc");
      });

      expect(mockSaveConfigImage).toHaveBeenCalledWith("test-token", "couplePhoto", "data:image/png;base64,abc");
      expect(written.couplePhoto).toBe("__cfgimg:couplePhoto");
    });

    it("does not encrypt couplePhoto when it is a URL (not data URI)", async () => {
      const dataWithPhotoUrl = { ...sampleConfig, couplePhoto: "https://example.com/photo.jpg" };
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", dataWithPhotoUrl, dataWithPhotoUrl, vi.fn(), { current: false }),
      );

      await act(async () => {
        await result.current.doSave(dataWithPhotoUrl);
      });

      expect(mockSaveConfigImage).not.toHaveBeenCalledWith("test-token", "couplePhoto", "https://example.com/photo.jpg");
    });

    it("handles doSave error and calls onSaveError", async () => {
      mockSetDoc.mockRejectedValueOnce(new Error("Firestore error"));
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }, undefined, onSaveError),
      );

      let output: unknown;
      await act(async () => {
        output = await result.current.doSave(sampleConfig);
      });

      expect(output).toBeNull();
      expect(onSaveError).toHaveBeenCalledWith("Error saving");
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

    it("saves successfully when isSavingRef is null", async () => {
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), null),
      );

      await act(async () => {
        const output = await result.current.doSave(sampleConfig);
        expect(output).toBeTruthy();
      });
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it("handles doSave error without onSaveMessage", async () => {
      mockSetDoc.mockRejectedValueOnce(new Error("Firestore error"));
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, null, { current: false }),
      );

      await act(async () => {
        const output = await result.current.doSave(sampleConfig);
        expect(output).toBeNull();
      });
    });

    it("does not persist when names are empty", async () => {
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }, undefined, onSaveError),
      );
      const empty = { ...sampleConfig, firstName: "", secondName: "" };

      await act(async () => {
        const output = await result.current.doSave(empty);
        expect(output).toBeNull();
      });
      expect(onSaveError).toHaveBeenCalledWith("errors.bothNamesRequired");
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("does not persist an invalid map URL", async () => {
      const onSaveError = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }, undefined, onSaveError),
      );
      const bad = { ...sampleConfig, weddingSiteURL: "https://example.com/not-a-map" };

      await act(async () => {
        const output = await result.current.doSave(bad);
        expect(output).toBeNull();
      });
      expect(onSaveError).toHaveBeenCalledWith("errors.mapUrlInvalid");
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("notifies onAutoSaved after a successful save", async () => {
      const onAutoSaved = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave(true, "test-token", sampleConfig, sampleConfig, vi.fn(), { current: false }, onAutoSaved),
      );

      await act(async () => {
        await result.current.doSave({ ...sampleConfig, firstName: "Alice2" });
      });
      expect(onAutoSaved).toHaveBeenCalled();
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
