/**
 * lazy-pages.ts (v2.192): lazy() de las páginas en un módulo SIN componentes
 * para no romper el fast refresh de los bundles de ruta (regla
 * react-refresh/only-export-components).
 */
import { lazy } from "react";

export const LazyLandingPage = lazy(() => import("../pages/LandingPage"));
export const LazyPublicInvitation = lazy(() => import("../pages/PublicInvitation"));
export const LazySetupPage = lazy(() => import("../pages/SetupPage"));
export const LazyAdminPage = lazy(() => import("../pages/AdminPage"));
export const LazyPrintPage = lazy(() => import("../pages/PrintPage"));
export const LazySuperAdminLogin = lazy(() => import("../pages/SuperAdminLogin"));
export const LazySuperAdminPanel = lazy(() => import("../pages/SuperAdminPanel"));
