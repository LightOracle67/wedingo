import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, Fragment } from "react";

const mockProvider = vi.hoisted(() => ({
  Provider: function Provider(props: { value?: unknown; children: unknown }) {
    return createElement(Fragment, null, props.children);
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock("../useAppUI", () => ({ UIContext: mockProvider, useAppUI: () => ({}) }));
vi.mock("../useConfig", () => ({ ConfigContext: mockProvider, useConfig: () => ({}) }));
vi.mock("../useAuth", () => ({ AuthContext: mockProvider, useAuth: () => ({}) }));
vi.mock("../useRsvpContext", () => ({ RsvpContext: mockProvider, useRsvpContext: () => ({}) }));
vi.mock("../UIContext", () => ({ UIProvider: mockProvider.Provider }));
vi.mock("../ConfigContext", () => ({ ConfigProvider: mockProvider.Provider }));
vi.mock("../AuthContext", () => ({ AuthProvider: mockProvider.Provider }));
vi.mock("../RsvpContext", () => ({ RsvpProvider: mockProvider.Provider }));

import { AppProvider } from "../AppContext";

describe("AppProvider", () => {
  it("renders children", () => {
    render(<AppProvider><div>child</div></AppProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });
});
