import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AccommodationSection from "../AccommodationSection";

describe("AccommodationSection", () => {
  it("renders without accommodationInfo", () => {
    render(<AccommodationSection className="test-class" style={{}} accommodationInfo="" />);
    expect(screen.getByText("accommodation.sectionLabel")).toBeDefined();
    expect(screen.getByText("accommodation.title")).toBeDefined();
    expect(screen.getByText("accommodation.pending")).toBeDefined();
  });

  it("renders with accommodationInfo", () => {
    render(<AccommodationSection className="test-class" style={{}} accommodationInfo="Hotel XYZ" />);
    expect(screen.getByText("accommodation.sectionLabel")).toBeDefined();
    expect(screen.getByText("accommodation.title")).toBeDefined();
    expect(screen.getByText("Hotel XYZ")).toBeDefined();
  });
});
