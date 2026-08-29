import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WelcomeVideoModal from "../WelcomeVideoModal";

// El representante del modal usa i18next real en la app; en tests se sustituye
// por el mock que devuelve la clave tal cual (los tests son por clave, no por
// texto traducido).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("WelcomeVideoModal", () => {
  it("no renderiza nada cuando no está visible", () => {
    const { container } = render(<WelcomeVideoModal show={false} closing={false} src="" onClose={vi.fn()} />);
    expect(container.querySelector(".welcome-video-overlay")).toBeNull();
  });

  it("renderiza el diálogo accesible con el vídeo cuando está visible", () => {
    render(<WelcomeVideoModal show={true} closing={false} src="https://x.test/v.mp4" onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "welcomeVideo.title" });
    expect(dialog).toBeDefined();
    expect(dialog.className).toContain("welcome-video-overlay");
    const video = dialog.querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("src")).toBe("https://x.test/v.mp4");
    expect(video!.hasAttribute("autoplay")).toBe(true);
    expect(video!.hasAttribute("controls")).toBe(true);
  });

  it("aplica la clase de salida cuando está cerrando", () => {
    render(<WelcomeVideoModal show={true} closing={true} src="https://x.test/v.mp4" onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("welcome-video-overlay--closing");
  });

  it("cierra al pulsar el botón de cerrar o al hacer clic en el overlay", () => {
    const onClose = vi.fn();
    render(<WelcomeVideoModal show={true} closing={false} src="https://x.test/v.mp4" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // El segundo clic se hace sobre el overlay (el card hace stopPropagation, así
    // que se prueba el clic fuera de la tarjeta).
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
