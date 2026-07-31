import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import AdminTabs from "../AdminTabs";

describe("AdminTabs", () => {
  const defaultProps = { activeTab: "panel", onTabChange: vi.fn(), t: (key: string) => key };

  afterEach(cleanup);

  it("renders all tabs", () => {
    render(<AdminTabs {...defaultProps} />);
    expect(screen.getByText("admin.tabs.panel")).toBeDefined();
    expect(screen.getByText("admin.tabs.invitation")).toBeDefined();
  });

  it("calls onTabChange when clicked", () => {
    const onTabChange = vi.fn();
    render(<AdminTabs {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getAllByText("admin.tabs.invitation")[0]!);
    expect(onTabChange).toHaveBeenCalledWith("invitacion");
  });
});
