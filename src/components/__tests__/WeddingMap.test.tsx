import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import WeddingMap from "../WeddingMap";

describe("WeddingMap", () => {
  it("renders without crashing", () => {
    const { container } = render(<WeddingMap t={(key: string) => key} />);
    expect(container.querySelector(".story-map-wrapper")).toBeDefined();
  });
});
