import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "es" } }),
}));
// Passthrough del árbol de la app: cubrimos las funciones de montaje por ruta
// sin arrastrar Firebase (los providers reales ya tienen sus propias suites).
vi.mock("../contexts/AppContext", () => ({
  AppProvidersTree: ({ children }: { children?: ReactNode }) => <div data-testid="app-tree">{children}</div>,
}));
vi.mock("../contexts/SuperAdminContext", () => ({
  SuperAdminProvider: ({ children }: { children?: ReactNode }) => <div data-testid="super-tree">{children}</div>,
}));

import { AppProviders, SuperAdminProviders } from "../providers";

describe("providers por ruta (wrappers)", () => {
  it("AppProviders envuelve el contenido en el árbol de providers", () => {
    render(
      <AppProviders>
        <p>contenido</p>
      </AppProviders>,
    );
    expect(screen.getByTestId("app-tree")).toBeDefined();
    expect(screen.getByText("contenido")).toBeDefined();
  });

  it("SuperAdminProviders envuelve el contenido en el provider del superadmin", () => {
    render(
      <SuperAdminProviders>
        <p>consola</p>
      </SuperAdminProviders>,
    );
    expect(screen.getByTestId("super-tree")).toBeDefined();
    expect(screen.getByText("consola")).toBeDefined();
  });
});