import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({
    addToast: vi.fn(),
    startUploadToast: () => ({
      update: vi.fn(),
      complete: vi.fn(),
      error: vi.fn(),
    }),
  }),
}));

vi.mock("../../../lib/image-store", () => ({
  uploadImage: vi.fn(),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: vi.fn(),
    inviteToken: "test-token",
  }),
}));

vi.mock("../../ThemePicker", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="theme-picker">ThemePicker {value}</div>
  ),
}));

vi.mock("../../MusicArrayEditor", () => ({
  default: () => <div data-testid="music-editor">MusicArrayEditor</div>,
}));

import CoverSectionForm from "../CoverSectionForm";

describe("CoverSectionForm", () => {
  it("renders without crashing", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.namesLegend")).toBeDefined();
  });

  it("renders name fields", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.firstNameLabel")).toBeDefined();
    expect(screen.getByText("setup.secondNameLabel")).toBeDefined();
  });

  it("renders godparent fields", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.godparent1Label")).toBeDefined();
    expect(screen.getByText("setup.godparent2Label")).toBeDefined();
  });

  it("renders invite message textarea", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.messageLabel")).toBeDefined();
    expect(screen.getByPlaceholderText("setup.messagePlaceholder")).toBeDefined();
  });

  it("renders theme picker", () => {
    render(<CoverSectionForm />);
    expect(screen.getByTestId("theme-picker")).toBeDefined();
  });

  it("renders music editor", () => {
    render(<CoverSectionForm />);
    expect(screen.getByTestId("music-editor")).toBeDefined();
  });

  it("renders photo upload section", () => {
    render(<CoverSectionForm />);
    expect(screen.getByText("setup.couplePhotoLabel")).toBeDefined();
  });

  it("renders with prefix", () => {
    render(<CoverSectionForm prefix="admin" />);
    expect(screen.getByText("setup.namesLegend")).toBeDefined();
  });
});
