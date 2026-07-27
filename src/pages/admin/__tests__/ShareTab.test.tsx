import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("../../../lib/invite-messages", () => ({
  randomMessage: () => "Test invite message",
}));

import ShareTab from "../ShareTab";

const baseProps = {
  inviteToken: "test-token",
  addToast: vi.fn(),
};

describe("ShareTab", () => {
  it("renders share section title", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.message")).toBeDefined();
  });

  it("shows invite link with token", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByDisplayValue(/test-token/)).toBeDefined();
  });

  it("renders published at label", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.publishedAt")).toBeDefined();
  });

  it("renders copy button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("common.copy")).toBeDefined();
  });

  it("renders share via section", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.shareVia")).toBeDefined();
  });

  it("renders print pdf button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.printPdf")).toBeDefined();
  });

  it("renders message textarea", () => {
    render(<ShareTab {...baseProps} />);
    const textarea = screen.getByDisplayValue(/Test invite message/);
    expect(textarea).toBeDefined();
  });

  it("renders generate message button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.generateMessage")).toBeDefined();
  });

  it("renders copy message button", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.copyMessage")).toBeDefined();
  });

  it("renders share app buttons", () => {
    render(<ShareTab {...baseProps} />);
    expect(screen.getByText("share.whatsapp")).toBeDefined();
    expect(screen.getByText("share.telegram")).toBeDefined();
    expect(screen.getByText("share.sms")).toBeDefined();
  });

  it("generates invite URL with ?invitar", () => {
    render(<ShareTab inviteToken="abc" addToast={vi.fn()} />);
    const link = screen.getByRole("link", { name: /abc\?invitar/ });
    expect(link).toBeDefined();
  });
});
