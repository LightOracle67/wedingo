import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: vi.fn(),
    inviteToken: "test-token",
  }),
}));

vi.mock("../../GalleryArrayEditor", () => ({
  default: () => <div data-testid="gallery-editor">GalleryArrayEditor</div>,
}));

import GallerySectionForm from "../GallerySectionForm";

describe("GallerySectionForm", () => {
  it("renders without crashing", () => {
    render(<GallerySectionForm />);
    expect(screen.getByTestId("gallery-editor")).toBeDefined();
  });

  it("renders the gallery editor", () => {
    render(<GallerySectionForm />);
    expect(screen.getByText("GalleryArrayEditor")).toBeDefined();
  });
});
