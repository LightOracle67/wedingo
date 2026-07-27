import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseApp = vi.fn(() => ({
  config: { theme: "golden", menuEnabled: "true" },
  formData: {},
  updateFormField: vi.fn(),
  inviteToken: "test-token",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => mockUseApp(),
}));

const mockGalleryEditor = vi.fn(() => <div data-testid="gallery-editor">GalleryArrayEditor</div>);

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

  it("passes inviteToken and t props to GalleryArrayEditor", () => {
    render(<GallerySectionForm />);
    expect(mockGalleryEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteToken: "test-token",
        t: expect.any(Function),
      })
    );
  });
});
