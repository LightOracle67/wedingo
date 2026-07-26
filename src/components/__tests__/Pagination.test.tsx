import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import Pagination from "../Pagination";

afterEach(cleanup);

describe("Pagination", () => {
  const defaultProps = {
    page: 0, totalPages: 5, pageSize: 10, total: 50,
    pageSizes: [10, 20, 50],
    onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
  };

  it("renders page info", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("attendance.show")).toBeDefined();
  });
});
