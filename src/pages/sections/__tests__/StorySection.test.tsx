import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import StorySection from "../StorySection";

describe("StorySection", () => {
  it("renders without storyText", () => {
    render(<StorySection className="test" style={{}} storyText="" />);
    expect(screen.getByText("story.sectionLabel")).toBeDefined();
    expect(screen.getByText("story.title")).toBeDefined();
    expect(screen.getByText("story.pending")).toBeDefined();
  });

  it("renders with storyText", () => {
    render(<StorySection className="test" style={{}} storyText="Our love story" />);
    expect(screen.getByText("Our love story")).toBeDefined();
    expect(screen.queryByText("story.pending")).toBeNull();
  });
});
