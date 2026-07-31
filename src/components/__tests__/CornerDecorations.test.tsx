import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
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
    const [tl, tr, bl, br] = [...imgs];
    expect(tl!.getAttribute("src")).toBe("data:image/png;base64,abc");
    expect(tl!.className).toContain("invite-corner--tl");
    expect(tr!.className).toContain("invite-corner--tr");
    expect(bl!.className).toContain("invite-corner--bl");
    expect(br!.className).toContain("invite-corner--br");
    expect(tl!.getAttribute("aria-hidden")).toBe("true");
  });
});
