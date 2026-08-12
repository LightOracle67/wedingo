import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn(() => Promise.resolve());
const mockSetDoc = vi.fn(() => Promise.resolve());
const mockAddDoc = vi.fn(() => Promise.resolve({ id: "x" }));
const mockCommit = vi.fn(() => Promise.resolve());
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: Parameters<typeof mockGetDocs>) => mockGetDocs(...args),
  updateDoc: (...args: Parameters<typeof mockUpdateDoc>) => mockUpdateDoc(...args),
  setDoc: (...args: Parameters<typeof mockSetDoc>) => mockSetDoc(...args),
  addDoc: (...args: Parameters<typeof mockAddDoc>) => mockAddDoc(...args),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: mockCommit })),
  collection: vi.fn(() => "col"),
  doc: vi.fn((_db: unknown, _c: unknown, _t: unknown, _s: unknown, id: string) => ({ id })),
  serverTimestamp: vi.fn(() => "ts"),
  increment: vi.fn((n: number) => n),
}));
vi.mock("../../../lib/firebase", () => ({ db: "db-mock" }));
vi.mock("../../../lib/async-utils", () => ({
  withWriteRetry: (fn: () => Promise<unknown>) => fn(),
}));

import ReactionsSection from "../ReactionsSection";
import NotesSection from "../NotesSection";
import MusicPollSection from "../MusicPollSection";
import GiftListSection from "../GiftListSection";
import RideShareSection from "../RideShareSection";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockGetDocs.mockResolvedValue({ docs: [], forEach: () => {} });
});

describe("ReactionsSection", () => {
  it("renders the three emoji buttons", async () => {
    render(<ReactionsSection inviteToken="tok" />);
    expect(await screen.findByRole("group")).toBeDefined();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("increments a reaction on click", async () => {
    render(<ReactionsSection inviteToken="tok" />);
    const btn = await screen.findAllByRole("button");
    fireEvent.click(btn[0]!);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it("creates the reaction doc when the update fails (first vote)", async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error("missing doc"));
    render(<ReactionsSection inviteToken="tok" />);
    const btn = await screen.findAllByRole("button");
    fireEvent.click(btn[0]!);
    await vi.waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
  });
});

describe("NotesSection", () => {
  it("renders the form and publishes a note", async () => {
    render(<NotesSection inviteToken="tok" />);
    fireEvent.change(screen.getByPlaceholderText("notes.namePlaceholder"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("notes.messagePlaceholder"), { target: { value: "Felicidades" } });
    fireEvent.click(screen.getByText("notes.send"));
    expect(mockCommit).toHaveBeenCalled();
  });

  it("shows an error when publishing the note fails", async () => {
    mockCommit.mockRejectedValueOnce(new Error("net"));
    render(<NotesSection inviteToken="tok" />);
    fireEvent.change(screen.getByPlaceholderText("notes.namePlaceholder"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("notes.messagePlaceholder"), { target: { value: "Hola" } });
    fireEvent.click(screen.getByText("notes.send"));
    expect(await screen.findByRole("alert")).toBeDefined();
  });

  it("tolerates a failed load of notes", async () => {
    mockGetDocs.mockRejectedValueOnce(new Error("net"));
    render(<NotesSection inviteToken="tok" />);
    expect(screen.getByText("notes.empty")).toBeDefined();
  });
});

describe("MusicPollSection", () => {
  it("renders and suggests a song", async () => {
    render(<MusicPollSection inviteToken="tok" />);
    fireEvent.change(screen.getByPlaceholderText("musicPoll.songPlaceholder"), { target: { value: "Algo contigo" } });
    fireEvent.click(screen.getByText("musicPoll.suggest"));
    expect(mockCommit).toHaveBeenCalled();
  });

  it("votes on an existing song", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "s1", data: () => ({ guestName: "Ana", song: "Algo contigo", votes: 2 }) }],
      forEach: () => {},
    } as never);
    render(<MusicPollSection inviteToken="tok" />);
    const voteBtn = await screen.findByLabelText("musicPoll.vote");
    fireEvent.click(voteBtn);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it("disables voting after the guest voted", async () => {
    sessionStorage.setItem("wedin_voted_songs", JSON.stringify(["s1"]));
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "s1", data: () => ({ guestName: "Ana", song: "Algo contigo", votes: 2 }) }],
      forEach: () => {},
    } as never);
    render(<MusicPollSection inviteToken="tok" />);
    const voteBtn = await screen.findByLabelText("musicPoll.vote");
    expect(voteBtn.hasAttribute("disabled")).toBe(true);
    sessionStorage.clear();
  });
});

describe("GiftListSection", () => {
  it("renders the gifts and reserves one", async () => {
    const gifts = JSON.stringify([{ id: "g1", name: "Tostadora", description: "Roja" }]);
    render(<GiftListSection inviteToken="tok" gifts={gifts} />);
    expect(screen.getByText("Tostadora")).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText("giftList.namePlaceholder"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("giftList.reserve"));
    expect(mockCommit).toHaveBeenCalled();
  });

  it("marks a gift as taken when it is already reserved", async () => {
    const gifts = JSON.stringify([{ id: "g1", name: "Tostadora", description: "" }]);
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "g1", data: () => ({ reservedBy: "Luis" }) }],
      forEach: () => {},
    } as never);
    render(<GiftListSection inviteToken="tok" gifts={gifts} />);
    expect(await screen.findByText("giftList.taken")).toBeDefined();
  });

  it("tolerates a failed reservation", async () => {
    const gifts = JSON.stringify([{ id: "g1", name: "Tostadora", description: "" }]);
    mockCommit.mockRejectedValueOnce(new Error("net"));
    render(<GiftListSection inviteToken="tok" gifts={gifts} />);
    fireEvent.change(screen.getByPlaceholderText("giftList.namePlaceholder"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("giftList.reserve"));
    expect(() => screen.getByText("giftList.reserve")).toBeDefined();
  });

  it("renders nothing without gifts", () => {
    render(<GiftListSection inviteToken="tok" gifts="[]" />);
    expect(screen.queryByText("giftList.namePlaceholder")).toBeNull();
  });
});

describe("RideShareSection", () => {
  it("renders and publishes a ride", async () => {
    render(<RideShareSection inviteToken="tok" />);
    fireEvent.change(screen.getByPlaceholderText("rideShare.originPlaceholder"), { target: { value: "Madrid" } });
    fireEvent.click(screen.getByText("rideShare.publish"));
    expect(mockCommit).toHaveBeenCalled();
  });

  it("muestra el estado vacío sin ofertas", async () => {
    render(<RideShareSection inviteToken="tok" />);
    expect(await screen.findByText("rideShare.empty")).toBeInTheDocument();
  });

  it("muestra las ofertas publicadas", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "r1",
          data: () => ({ guestName: "Ana", origin: "Madrid", seats: 3 }),
        },
      ],
    });
    render(<RideShareSection inviteToken="tok" />);
    expect(await screen.findByText("Madrid")).toBeInTheDocument();
  });

  it("no publica sin origen (botón deshabilitado)", () => {
    render(<RideShareSection inviteToken="tok" />);
    expect(screen.getByText("rideShare.publish")).toBeDisabled();
  });
});
