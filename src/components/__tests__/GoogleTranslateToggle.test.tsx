import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import GoogleTranslateToggle from "../GoogleTranslateToggle";

describe("GoogleTranslateToggle", () => {
  it("does not load the script before the user clicks (ePrivacy)", () => {
    render(<GoogleTranslateToggle />);
    expect(document.querySelector('script[data-gt="1"]')).toBeNull();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("injects the Google Translate script on demand", () => {
    render(<GoogleTranslateToggle />);
    fireEvent.click(screen.getByRole("button"));
    const s = document.querySelector('script[data-gt="1"]');
    expect(s).not.toBeNull();
    expect(s?.getAttribute("src")).toContain("translate.google.com");
    // Limpieza para no contaminar otros tests.
    s?.remove();
    delete (window as unknown as { googleTranslateElementInit?: unknown }).googleTranslateElementInit;
  });
});
