import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { DonutChart, MiniBar, Legend } from "../AttendanceChart";

afterEach(cleanup);

describe("DonutChart", () => {
  it("renders total and translation key when data is provided", () => {
    render(<DonutChart yes={5} no={2} pending={3} />);
    expect(screen.getByText("chart.total")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
  });
  it("renders empty state when all values are zero", () => {
    render(<DonutChart yes={0} no={0} pending={0} />);
    expect(screen.getByLabelText("chart.noData")).toBeDefined();
  });
});

describe("MiniBar", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<MiniBar items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders bars for items with values", () => {
    const items = [
      { value: 10, label: "A" },
      { value: 5, label: "B" },
      { value: 0, label: "C" },
    ];
    const { container } = render(<MiniBar items={items} />);
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(3);
  });

  it("truncates long labels", () => {
    const items = [{ value: 10, label: "VeryLongLabel" }];
    const { container } = render(<MiniBar items={items} />);
    const text = container.querySelector("text");
    expect(text?.textContent).toBe("VeryL…");
  });
});

describe("Legend", () => {
  it("renders items with labels and values", () => {
    const items = [
      { label: "Yes", value: 10, color: "green" },
      { label: "No", value: 5, color: "red" },
    ];
    const { container } = render(<Legend items={items} />);
    expect(container.textContent).toContain("Yes");
    expect(container.textContent).toContain("No");
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("5");
  });
});
