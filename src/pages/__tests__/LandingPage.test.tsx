import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({
    config: {},
    setIsTokenVerified: vi.fn(),
    setTokenLoginUsername: vi.fn(),
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

import LandingPage from "../LandingPage";

describe("LandingPage", () => {
  it("renders the title", () => {
    render(<LandingPage />);
    expect(screen.getByText("landing.title")).toBeDefined();
  });
});
