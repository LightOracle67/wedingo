import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../lib/firebase", () => ({
  db: {},
  auth: { onAuthStateChanged: vi.fn((_authOrNext: unknown, maybeObserver?: (u: null) => void) => {
    const cb = typeof _authOrNext === "function" ? _authOrNext : maybeObserver;
    if (cb) setTimeout(() => cb(null), 0);
    return () => {};
  }) },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/superadmin" }),
}));

vi.mock("../../lib/sessionVars", () => ({
  saveSession: vi.fn(), clearSession: vi.fn(), getSession: vi.fn(() => null),
}));

vi.mock("../../lib/storage", () => ({
  safeGetItem: vi.fn(() => null), safeSetItem: vi.fn(), safeRemoveItem: vi.fn(),
}));

import { SuperAdminProvider } from "../SuperAdminContext";

describe("SuperAdminProvider", () => {
  it("renders children", () => {
    render(<SuperAdminProvider><div>child</div></SuperAdminProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });
});
