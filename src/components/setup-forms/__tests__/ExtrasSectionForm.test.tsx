import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateFormField = vi.fn();
const mockFormData = vi.hoisted(() => ({}) as Record<string, string | undefined>);

vi.mock("../../../contexts", () => ({
  useConfig: () => ({
    config: {},
    formData: mockFormData,
    updateFormField: mockUpdateFormField,
  }),
}));

import ExtrasSectionForm from "../ExtrasSectionForm";

describe("ExtrasSectionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockFormData).forEach((k) => delete mockFormData[k]);
  });

  it("toggles the deadline", () => {
    render(<ExtrasSectionForm />);
    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]!);
    expect(mockUpdateFormField).toHaveBeenCalledWith("rsvpDeadlineEnabled", "true");
  });

  it("places the checkbox before its title", () => {
    render(<ExtrasSectionForm />);
    // Para cada fila de extra, el checkbox es el primer hijo del .setup-toggle-row.
    const rows = document.querySelectorAll(".setup-toggle-row");
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      expect(row.firstElementChild!.tagName).toBe("INPUT");
    });
  });

  it("hides the deadline input until the checkbox is selected", () => {
    render(<ExtrasSectionForm />);
    expect(document.getElementById("rsvpDeadline")).toBeNull();
  });

  it("shows the date input when the deadline is enabled", () => {
    mockFormData.rsvpDeadlineEnabled = "true";
    render(<ExtrasSectionForm />);
    expect(document.getElementById("rsvpDeadline")).toBeDefined();
  });

  it("toggles the gift list and edits its lines to JSON", () => {
    mockFormData.giftsListEnabled = "true";
    mockFormData.giftList = "[]";
    render(<ExtrasSectionForm />);
    fireEvent.change(screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!, { target: { value: "Tostadora | Roja" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("giftList", expect.stringContaining("Tostadora"));
  });

  it("toggles trivia and edits its lines to JSON", () => {
    mockFormData.triviaEnabled = "true";
    mockFormData.trivia = "[]";
    render(<ExtrasSectionForm />);
    fireEvent.change(screen.getAllByRole("textbox").find((el) => el.tagName === "TEXTAREA")!, { target: { value: "Â¿DÃ³nde? | En el parque" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("trivia", expect.stringContaining("En el parque"));
  });

  it("updates the welcome video URL", () => {
    mockFormData.welcomeVideoEnabled = "true";
    render(<ExtrasSectionForm />);
    fireEvent.change(screen.getByPlaceholderText("https://..."), { target: { value: "https://example.com/v.mp4" } });
    expect(mockUpdateFormField).toHaveBeenCalledWith("welcomeVideo", "https://example.com/v.mp4");
  });

  it("hides the welcome video input until its checkbox is selected", () => {
    render(<ExtrasSectionForm />);
    expect(screen.queryByPlaceholderText("https://...")).toBeNull();
    mockFormData.welcomeVideoEnabled = "true";
    render(<ExtrasSectionForm />);
    expect(screen.getByPlaceholderText("https://...")).toBeDefined();
  });
});
