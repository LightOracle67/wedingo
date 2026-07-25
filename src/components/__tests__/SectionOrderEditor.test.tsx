import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import SectionOrderEditor from "../SectionOrderEditor";

describe("SectionOrderEditor", () => {
  const defaultProps = {
    value: "hero,details,info,story,gifts,gallery,rsvp,accommodation",
    onChange: vi.fn(),
    hiddenValue: "",
    onHiddenChange: vi.fn(),
  };

  it("renders section order editor", () => {
    render(<SectionOrderEditor {...defaultProps} />);
    expect(screen.getByText("sectionOrder.title")).toBeDefined();
  });
});
