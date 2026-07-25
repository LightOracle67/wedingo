import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../../lib/image-store", () => ({}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden" },
    formData: {},
    updateFormField: vi.fn(),
    maxAllowedYear: 2099,
    previewBackgrounds: [],
    isPreviewLoading: false,
    formattedDate: "",
    formattedTime: "",
    calendarLink: null,
    handleSaveSetup: vi.fn(),
    handleDayChange: vi.fn(),
    handleHourChange: vi.fn(),
    handleMinuteChange: vi.fn(),
    handleMinuteBlur: vi.fn(),
    handleYearChange: vi.fn(),
    handleCoordinateChange: vi.fn(),
  }),
}));

import SetupForm from "../SetupForm";

describe("SetupForm", () => {
  it("renders setup form", () => {
    render(<SetupForm prefix="admin" />);
    expect(screen.getByText("setup.coverSectionTitle")).toBeDefined();
  });
});
