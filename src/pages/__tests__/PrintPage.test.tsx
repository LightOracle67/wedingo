import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve(new Set()) },
    writable: true,
  });
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: { firstName: "John", secondName: "Jane", theme: "golden" },
    isConfigLoading: false,
  }),
}));

import PrintPage from "../PrintPage";

describe("PrintPage", () => {
  it("renders couple names", async () => {
    render(<PrintPage />);
    expect(await screen.findByText(/John/)).toBeDefined();
    expect(await screen.findByText(/Jane/)).toBeDefined();
  });
});
