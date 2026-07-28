import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import GiftsSection from "../GiftsSection";

describe("GiftsSection", () => {
  it("renders without giftsInfo or bankInfo", () => {
    render(<GiftsSection className="test" style={{}} giftsInfo="" bankInfo="" />);
    expect(screen.getByText("gifts.sectionLabel")).toBeDefined();
    expect(screen.getByText("gifts.title")).toBeDefined();
    expect(screen.getByText("gifts.pending")).toBeDefined();
  });

  it("renders with giftsInfo", () => {
    render(<GiftsSection className="test" style={{}} giftsInfo="Cash gifts" bankInfo="" />);
    expect(screen.getByText("Cash gifts")).toBeDefined();
  });

  it("renders with bankInfo", () => {
    render(<GiftsSection className="test" style={{}} giftsInfo="" bankInfo="ES1234" />);
    expect(screen.getByText("gifts.bankInfo")).toBeDefined();
    expect(screen.getByText("ES1234")).toBeDefined();
  });
});
