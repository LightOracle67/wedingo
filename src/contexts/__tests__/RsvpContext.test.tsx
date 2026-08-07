import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../useConfig", () => ({
  useConfig: () => ({ inviteToken: "test", config: { menuEnabled: "true" } }),
}));

vi.mock("../useAppUI", () => ({
  useAppUI: () => ({ setAdminMessage: vi.fn(), setAdminMessageType: vi.fn() }),
}));

vi.mock("../useAuth", () => ({
  useAuth: () => ({ isAdminTokenLoggedIn: true }),
}));

vi.mock("../../hooks/useRsvp", () => ({
  useRsvp: () => ({
    rsvpEntries: [],
    rsvpForm: { attendees: [] },
    rsvpMessage: "",
    isRsvpSubmitting: false,
    hasSubmitted: false,
    alreadySubmittedEntry: null,
    DIETARY_OPTIONS: [],
    updateRsvpField: vi.fn(),
    handleRsvpSubmit: vi.fn(),
    handleDeleteRsvp: vi.fn(),
    computeAge: vi.fn(),
    handleClearRsvpEntries: vi.fn(),
  }),
}));

import { RsvpProvider } from "../RsvpContext";

describe("RsvpProvider", () => {
  it("renders children", () => {
    render(
      <RsvpProvider>
        <div>child</div>
      </RsvpProvider>,
    );
    expect(screen.getByText("child")).toBeDefined();
  });
});
