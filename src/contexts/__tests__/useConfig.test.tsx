import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConfig, ConfigContext } from "../useConfig";

describe("useConfig", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useConfig())).toThrow("useConfig debe usarse dentro de AppProvider");
  });

  it("returns context value when provided", () => {
    const value = {
      config: {} as never,
      formData: {} as never,
      hasStoredConfig: false,
      isConfigLoading: false,
      configLoadError: "",
      inviteToken: "",
      maxAllowedYear: 2036,
      previewBackgrounds: [],
      isPreviewLoading: false,
      formattedDate: "",
      formattedTime: "",
      calendarLink: null,
      visitCount: 0,
      updateFormField: () => {},
      reloadConfig: async () => {},
      handleSaveSetup: async () => {},
      handleDayChange: () => {},
      handleTimeChange: () => {},
      handleTimeBlur: () => {},
      handleYearChange: () => {},
      handleCoordinateChange: () => {},
      handleDeleteInvitation: async () => {},
      setHasStoredConfig: () => {},
      registerOnFirstSave: () => {},
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
    );
    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current).toEqual(value);
  });
});
