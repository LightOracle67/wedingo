import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));

import Pagination from "../Pagination";

afterEach(cleanup);

describe("Pagination", () => {
  const defaultProps = {
    page: 0,
    totalPages: 5,
    pageSize: 10,
    total: 50,
    pageSizes: [10, 20, 50],
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it("renders page info", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("attendance.show")).toBeDefined();
  });

  it("shows page number and total", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/attendance\.page/)).toBeDefined();
  });

  it("shows total count", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/attendance\.total/)).toBeDefined();
  });

  it("previous button is disabled on first page", () => {
    render(<Pagination {...defaultProps} page={0} />);
    const prevBtn = screen.getByText("←");
    expect(prevBtn).toBeDisabled();
  });

  it("next button is disabled on last page", () => {
    render(<Pagination {...defaultProps} page={4} totalPages={5} />);
    const nextBtn = screen.getByText("→");
    expect(nextBtn).toBeDisabled();
  });

  it("previous button is enabled on non-first page", () => {
    render(<Pagination {...defaultProps} page={2} />);
    const prevBtn = screen.getByText("←");
    expect(prevBtn).not.toBeDisabled();
  });

  it("next button is enabled on non-last page", () => {
    render(<Pagination {...defaultProps} page={0} totalPages={5} />);
    const nextBtn = screen.getByText("→");
    expect(nextBtn).not.toBeDisabled();
  });

  it("calls onPageChange when clicking next", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("→"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange when clicking previous", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} page={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("←"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageSizeChange when page size is changed", () => {
    const onPageSizeChange = vi.fn();
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} onPageChange={onPageChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "20" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it("resets to page 0 when page size changes", () => {
    const onPageSizeChange = vi.fn();
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} onPageChange={onPageChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "20" } });
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it("renders all page size options", () => {
    render(<Pagination {...defaultProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeDefined();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue("10");
    expect(options[1]).toHaveValue("20");
    expect(options[2]).toHaveValue("50");
  });
});
