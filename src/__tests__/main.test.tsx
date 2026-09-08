import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const renderMock = vi.fn();
const createRootMock = vi.fn((..._args: unknown[]) => ({ render: renderMock }));
vi.mock("react-dom/client", () => ({ createRoot: (...a: unknown[]) => createRootMock(...a) }));
vi.mock("react-router", () => ({
  BrowserRouter: ({ children }: { children?: ReactNode }) => <div data-testid="browser-router">{children}</div>,
}));
vi.mock("./App", () => ({ default: () => <div data-testid="app" /> }));
vi.mock("./lib/vitals", () => ({ reportWebVitals: vi.fn() }));
vi.mock("./lib/sentry", () => ({}));
vi.mock("./i18n", () => ({}));
// Los estilos/estructura no aplican en jsdom; los side-effect imports quedan vacíos.
vi.mock("./index.css", () => ({}));
vi.mock("./styles/animations.css", () => ({}));
vi.mock("./styles/public-shell.css", () => ({}));

import { mountApp } from "../main";

describe("mountApp (main.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta la app en el contenedor dado con BrowserRouter", () => {
    const container = document.createElement("div");
    mountApp(container);
    expect(createRootMock).toHaveBeenCalledWith(container);
    // El render recibe un elemento React (el árbol envuelto en BrowserRouter).
    expect(renderMock).toHaveBeenCalledOnce();
    const node = renderMock.mock.calls[0]![0] as { props?: { children?: unknown } };
    expect(node).not.toBeNull();
  });
});