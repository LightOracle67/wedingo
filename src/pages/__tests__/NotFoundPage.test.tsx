import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import NotFoundPage from "../NotFoundPage";

describe("NotFoundPage", () => {
  it("renders the 404 code, title and a home link", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("notFound.code")).toBeDefined();
    expect(screen.getByText("notFound.title")).toBeDefined();
    expect(screen.getByText("notFound.homeLink")).toBeDefined();
  });
});
