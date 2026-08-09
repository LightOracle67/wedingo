import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseConfig = vi.fn(() => ({
  config: { theme: "golden", menuEnabled: "true" },
  formData: {},
  updateFormField: vi.fn(),
  inviteToken: "test-token",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockFormData = vi.hoisted(() => ({}) as Record<string, string | undefined>);

vi.mock("../../../contexts", () => ({
  useFormField: (field: string) => mockFormData[field] ?? "",
  useFormStore: () => ({ getField: (field: string) => mockFormData[field] ?? "" }),
  useConfig: () => mockUseConfig(),
}));

const mockGalleryEditor = vi.fn((_props: Record<string, unknown>) => (
  <div data-testid="gallery-editor">GalleryArrayEditor</div>
));

vi.mock("../../GalleryArrayEditor", () => ({
  default: (props: Record<string, unknown>) => mockGalleryEditor(props),
}));

import GallerySectionForm from "../GallerySectionForm";

describe("GallerySectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<GallerySectionForm />);
    expect(screen.getByTestId("gallery-editor")).toBeDefined();
  });

  it("renders the gallery editor", () => {
    render(<GallerySectionForm />);
    expect(screen.getByText("GalleryArrayEditor")).toBeDefined();
  });

  it("passes inviteToken to GalleryArrayEditor", () => {
    render(<GallerySectionForm />);
    expect(mockGalleryEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteToken: "test-token",
      }),
    );
  });
});
