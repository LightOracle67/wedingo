import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CornerDecorations from "../CornerDecorations";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("CornerDecorations", () => {
  it("renders nothing when src is empty", () => {
    const { container } = render(<CornerDecorations src="" />);
    expect(container.querySelectorAll(".invite-corner")).toHaveLength(0);
  });

  it("renders nothing when src is undefined", () => {
    const { container } = render(<CornerDecorations />);
    expect(container.querySelectorAll(".invite-corner")).toHaveLength(0);
  });

  it("renders 4 corners with the same src", () => {
    const { container } = render(<CornerDecorations src="data:image/png;base64,abc" />);
    const imgs = container.querySelectorAll("img.invite-corner");
    expect(imgs).toHaveLength(4);
    expect(imgs[0].getAttribute("src")).toBe("data:image/png;base64,abc");
    expect(imgs[0].className).toContain("invite-corner--tl");
    expect(imgs[1].className).toContain("invite-corner--tr");
    expect(imgs[2].className).toContain("invite-corner--bl");
    expect(imgs[3].className).toContain("invite-corner--br");
    expect(imgs[0].getAttribute("aria-hidden")).toBe("true");
  });
});
