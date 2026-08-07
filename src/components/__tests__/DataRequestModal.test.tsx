import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockAddToast = vi.hoisted(() => vi.fn());
const mockErase = vi.hoisted(() => vi.fn(() => ({ erasedKeys: ["a", "b"] })));
const mockExport = vi.hoisted(() => vi.fn(() => ({ exported: { k: "v" } })));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("../../contexts", () => ({
  useApp: () => ({ rsvpEntries: [{ id: "r1", guestName: "Ana" }] }),
}));

vi.mock("../../lib/data-request", () => ({
  eraseGuestLocalData: mockErase,
  exportGuestLocalData: mockExport,
}));

import DataRequestModal from "../DataRequestModal";

describe("DataRequestModal", () => {
  it("renders as a dialog with the expected title", () => {
    render(<DataRequestModal inviteToken="abc" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("dataRequest.title")).toBeDefined();
    expect(screen.getByText("dataRequest.intro")).toBeDefined();
  });

  it("exports data and shows a success toast", () => {
    const create = vi.fn(() => ({ toString: () => "blob:url" }));
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
    render(<DataRequestModal inviteToken="abc" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("data-request-export"));
    expect(mockExport).toHaveBeenCalledWith("abc");
    expect(mockAddToast).toHaveBeenCalledWith("success", "dataRequest.exportDone");
    vi.unstubAllGlobals();
  });

  it("exports even when the local export returns no data", () => {
    const create = vi.fn(() => ({ toString: () => "blob:url" }));
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
    mockExport.mockReturnValueOnce({ exported: undefined } as never);
    render(<DataRequestModal inviteToken="abc" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("data-request-export"));
    expect(mockAddToast).toHaveBeenCalledWith("success", "dataRequest.exportDone");
    vi.unstubAllGlobals();
  });

  it("does not erase data when the user cancels the confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = vi.fn();
    render(<DataRequestModal inviteToken="abc" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("data-request-erase"));
    expect(mockErase).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("erases local data, shows toast and closes after confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onClose = vi.fn();
    render(<DataRequestModal inviteToken="abc" onClose={onClose} />);
    fireEvent.click(screen.getByTestId("data-request-erase"));
    expect(mockErase).toHaveBeenCalledWith("abc");
    expect(mockAddToast).toHaveBeenCalledWith("success", "dataRequest.eraseDone");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast when the export fails", () => {
    mockExport.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    render(<DataRequestModal inviteToken="abc" onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("data-request-export"));
    expect(mockAddToast).toHaveBeenCalledWith("error", "dataRequest.exportFail");
  });

  it("closes via the close button", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<DataRequestModal inviteToken="abc" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("common.close"));
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
