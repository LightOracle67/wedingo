import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

// El modal ahora carga el changelog desde GitHub (remote-changelog): se mockea
// el cargador para que el test sea determinista y no dependa de red.
vi.mock("../../lib/remote-changelog", () => ({
  loadChangelog: vi.fn(() =>
    Promise.resolve([
      { version: "7.0.0", date: "2026-07-01", changes: ["Seven"] },
      { version: "6.0.0", date: "2026-06-01", changes: ["Six"] },
      { version: "5.0.0", date: "2026-05-01", changes: ["Five"] },
      { version: "4.0.0", date: "2026-04-01", changes: ["Four"] },
      { version: "3.0.0", date: "2026-03-01", changes: ["Three"] },
      { version: "2.0.0", date: "2026-01-01", changes: ["First change"] },
      { version: "1.0.0", date: "2025-06-01", changes: ["Initial release"] },
    ]),
  ),
}));

import ChangelogModal from "../ChangelogModal";

describe("ChangelogModal", () => {
  afterEach(cleanup);

  it("renders version dates", async () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(await screen.findByText("2026-07-01")).toBeDefined();
    expect(screen.getByText("2026-03-01")).toBeDefined();
  });

  it("renders change descriptions", async () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(await screen.findByText("Seven")).toBeDefined();
    expect(screen.getByText("Three")).toBeDefined();
  });

  it("renders as dialog", () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("adds closing class and calls onClose after delay", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<ChangelogModal onClose={onClose} />);

    const closeBtn = screen.getByLabelText("changelog.close");
    fireEvent.click(closeBtn);

    const overlay = screen.getByRole("dialog");
    expect(overlay.className).toContain("modal-overlay--closing");

    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows only the latest versions until the user asks for the full history", async () => {
    render(<ChangelogModal onClose={vi.fn()} />);
    // Las 5 primeras versiones se muestran; el botón "ver todo" aparece.
    expect(await screen.findByText("2026-07-01")).toBeDefined();
    expect(screen.getByText("changelog.showAll")).toBeDefined();
    // La versión 1.0.0 está fuera de las 5 primeras.
    expect(screen.queryByText("2025-06-01")).toBeNull();
    fireEvent.click(screen.getByText("changelog.showAll"));
    expect(screen.getByText("2025-06-01")).toBeDefined();
    expect(screen.queryByText("changelog.showAll")).toBeNull();
  });

  it("caps the full history and offers the GitHub link when it exceeds the limit", async () => {
    // 70 entradas: al abrir "ver todo" solo se renderizan 60 y aparece la nota
    // con enlace a GitHub para el historial completo.
    const many = Array.from({ length: 70 }, (_, i) => ({
      version: `2.${i}.0`,
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      changes: [`Change ${i}`],
    }));
    vi.mocked(await import("../../lib/remote-changelog")).loadChangelog.mockResolvedValue(many);

    render(<ChangelogModal onClose={vi.fn()} />);
    expect(await screen.findByText("changelog.showAll")).toBeDefined();
    fireEvent.click(screen.getByText("changelog.showAll"));
    // El tope recorta: la entrada 2.69.0 no llega a pintarse, la 2.10.0 sí.
    expect(screen.queryByText("Change 69")).toBeNull();
    expect(screen.getByText("Change 10")).toBeDefined();
    // La nota con el enlace al historial completo aparece.
    expect(screen.getByText("changelog.seeMoreInGitHub")).toBeDefined();
    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link.getAttribute("href")).toContain("CHANGELOG.md");
  });
});
