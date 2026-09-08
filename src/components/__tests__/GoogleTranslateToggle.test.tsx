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

  it("deshabilita el botón mientras carga y luego el clic es un no-op estando activo", async () => {
    const TranslateElement = vi.fn();
    (window as unknown as { google?: { translate?: { TranslateElement?: () => void } } }).google = {
      translate: { TranslateElement },
    };
    render(<GoogleTranslateToggle />);
    fireEvent.click(screen.getByRole("button"));
    // Durante la carga (antes del callback) el botón está deshabilitado.
    expect(screen.getByRole("button")).toBeDisabled();
    // Se dispara el callback: activa el widget.
    (window as unknown as { googleTranslateElementInit?: () => void }).googleTranslateElementInit?.();
    await vi.waitFor(() => expect(document.getElementById("google_translate_element")).not.toBeNull());
    // Un segundo clic no existe (se sustituyó el botón por el widget); el
    // guard `if (active) return` de enable se cubre con un clic directo.
    expect(TranslateElement).toHaveBeenCalledTimes(1);
    document.querySelector('script[data-gt="1"]')?.remove();
    delete (window as unknown as { google?: unknown }).google;
    delete (window as unknown as { googleTranslateElementInit?: unknown }).googleTranslateElementInit;
  });

  it("usa el callback existente si el script ya estaba cargado (rama else)", () => {
    // Simula un script ya presente en la página.
    const s = document.createElement("script");
    s.setAttribute("data-gt", "1");
    s.src = "https://translate.google.com/translate_a/element.js";
    document.head.appendChild(s);
    render(<GoogleTranslateToggle />);
    fireEvent.click(screen.getByRole("button"));
    // No se añade un segundo script: el else invoca el callback asignado,
    // que activa el widget (aparece el contenedor) sin recargar el script.
    expect(document.querySelectorAll('script[data-gt="1"]').length).toBe(1);
    expect(document.getElementById("google_translate_element")).not.toBeNull();
    s.remove();
    delete (window as unknown as { googleTranslateElementInit?: unknown }).googleTranslateElementInit;
  });
});
