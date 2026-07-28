import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateFormField = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../contexts", () => ({
  useApp: () => ({
    config: { theme: "golden", menuEnabled: "true" },
    formData: {},
    updateFormField: mockUpdateFormField,
  }),
}));

import StorySectionForm from "../StorySectionForm";

describe("StorySectionForm", () => {
  it("renders without crashing", () => {
    render(<StorySectionForm />);
    expect(screen.getByText("setup.storyLabel")).toBeDefined();
  });

  it("renders story textarea", () => {
    render(<StorySectionForm />);
    expect(screen.getByPlaceholderText("setup.storyPlaceholder")).toBeDefined();
  });

  it("renders help text", () => {
    render(<StorySectionForm />);
    expect(screen.getByText("setup.storyHint")).toBeDefined();
  });

  it("renders with prefix", () => {
    render(<StorySectionForm prefix="admin" />);
    expect(screen.getByText("setup.storyLabel")).toBeDefined();
  });

  it("calls updateFormField on textarea change", () => {
    render(<StorySectionForm />);
    const textarea = screen.getByPlaceholderText("setup.storyPlaceholder");
    fireEvent.change(textarea, { target: { value: "Our story begins" } });
    expect(mockUpdateFormField).toHaveBeenCalled();
  });
});
