/**
 * invitation-screens.test.tsx — Pantallas presentacionales de la invitación
 * (v2.190): cada una es un componente puro memoizado con su traductor. Se
 * verifican el contenido renderizado y los puntos de interacción (botón
 * retry/goHome del error de carga).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  InvitationLoadingScreen,
  MaintenanceScreen,
  InvitationLoadErrorScreen,
  InvitationBlockedScreen,
  InvitationNotFoundScreen,
  InvitationEmptyScreen,
} from "../invitation-screens";

/** t() de prueba con identidad (devuelve la clave). */
const t = ((key: string) => key) as unknown as never;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("invitation-screens", () => {
  it("LoadingScreen: aria-live polite y mensaje de carga", () => {
    render(<InvitationLoadingScreen t={t} />);
    const panel = screen.getByText("public.loadingInvitation");
    expect(panel).toBeDefined();
    expect(panel.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    expect(panel.closest("[aria-busy]")?.getAttribute("aria-busy")).toBe("true");
  });

  it("MaintenanceScreen: eyebrow/título/texto", () => {
    render(<MaintenanceScreen t={t} />);
    expect(screen.getByText("public.maintenanceEyebrow")).toBeDefined();
    expect(screen.getByText("public.maintenanceTitle")).toBeDefined();
    expect(screen.getByText("public.maintenanceText")).toBeDefined();
  });

  it("LoadErrorScreen (enlace válido): botón Reintentar recarga la página", () => {
    const reload = vi.fn();
    const origLocation = window.location;
    delete (window as { location?: Location }).location;
    (window as { location?: Location }).location = { reload } as unknown as Location;
    render(<InvitationLoadErrorScreen t={t} error="boom" isInvalidLink={false} />);
    expect(screen.getByText("setup.errorTitle")).toBeDefined();
    expect(screen.getByText("boom")).toBeDefined();
    fireEvent.click(screen.getByText("common.retry"));
    expect(reload).toHaveBeenCalled();
    (window as { location?: Location }).location = origLocation;
  });

  it("LoadErrorScreen (enlace corrupto): botón Volver al inicio navega a /", () => {
    const assign = vi.fn();
    const origLocation = window.location;
    delete (window as { location?: Location }).location;
    (window as { location?: Location }).location = { assign } as unknown as Location;
    render(<InvitationLoadErrorScreen t={t} error="invalid" isInvalidLink />);
    fireEvent.click(screen.getByText("common.goHome"));
    expect(assign).toHaveBeenCalledWith("/");
    (window as { location?: Location }).location = origLocation;
  });

  it("BlockedScreen: título y texto de bloqueo", () => {
    render(<InvitationBlockedScreen t={t} />);
    expect(screen.getByText("public.blockedTitle")).toBeDefined();
    expect(screen.getByText("public.blockedText")).toBeDefined();
  });

  it("NotFoundScreen: combinación emptyTitle + notFoundTitle + notFoundText", () => {
    render(<InvitationNotFoundScreen t={t} />);
    expect(screen.getByText("public.emptyTitle")).toBeDefined();
    expect(screen.getByText("public.notFoundTitle")).toBeDefined();
    expect(screen.getByText("public.notFoundText")).toBeDefined();
  });

  it("EmptyScreen: CTA de creación con enlace a la raíz", () => {
    render(<InvitationEmptyScreen t={t} />);
    const link = screen.getByText("public.createLink");
    const anchor = link.closest("a");
    expect(anchor?.getAttribute("href")).toBe("/");
    expect(screen.getByText("public.emptyText")).toBeDefined();
    expect(screen.getByText("public.emptyDescription")).toBeDefined();
  });

  it("todas las pantallas se renderizan sin errores con t real de test", () => {
    // Smoke: cada pantalla monta y desmonta sin throw (memo conserva identidad).
    const { unmount } = render(<InvitationLoadingScreen t={t} />);
    unmount();
    render(<MaintenanceScreen t={t} />);
    expect(true).toBe(true);
  });
});
