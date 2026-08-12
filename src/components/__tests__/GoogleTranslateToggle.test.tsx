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

  it("instancia el widget cuando el script notifica (callback)", async () => {
    const TranslateElement = vi.fn(function (_a: unknown, _b: unknown) {
      // no-op
    });
    (window as unknown as { google?: { translate?: { TranslateElement?: unknown } } }).google = {
      translate: { TranslateElement },
    };
    render(<GoogleTranslateToggle />);
    fireEvent.click(screen.getByRole("button"));
    // El callback global lo invoca Google al cargar el script.
    (window as unknown as { googleTranslateElementInit?: () => void }).googleTranslateElementInit?.();
    expect(TranslateElement).toHaveBeenCalledWith({ pageLanguage: "es" }, "google_translate_element");
    // Al activarse se muestra el contenedor del widget.
    await vi.waitFor(() => expect(document.getElementById("google_translate_element")).not.toBeNull());
    // Limpieza.
    document.querySelector('script[data-gt="1"]')?.remove();
    delete (window as unknown as { google?: unknown }).google;
    delete (window as unknown as { googleTranslateElementInit?: unknown }).googleTranslateElementInit;
  });
});
