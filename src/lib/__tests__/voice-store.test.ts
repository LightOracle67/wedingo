/**
 * voice-store.test.ts — Cobertura de voice-store: cifrado por chunks,
 * agrupación al listar, concatenación al cargar y borrado en cascada.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEncrypt = vi.fn();
const mockDecrypt = vi.fn();
vi.mock("../crypto-utils", () => ({
  encrypt: (...a: unknown[]) => mockEncrypt(...a),
  decrypt: (...a: unknown[]) => mockDecrypt(...a),
}));

const mockGetDocs = vi.fn();
const mockWriteBatch = vi.fn();
const mockCommit = vi.fn(() => Promise.resolve());
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn(() => "notes-col"),
  writeBatch: () => mockWriteBatch(),
  doc: vi.fn(() => "doc-ref"),
}));
vi.mock("../firebase", () => ({ db: "db-mock" }));

import { addVoiceNote, listVoiceNotes, loadVoiceNote, deleteVoiceNote } from "../voice-store";

/** dataURL real corto (12 chars > CHUNK_SIZE? no: CHUNK_SIZE es ~200KB). */
const DATA_URL = "data:audio/webm;base64,QUJDREVGRw==";

function docData(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEncrypt.mockResolvedValue("ENCRYPTED_VALUE");
  mockDecrypt.mockImplementation(async (v: string) => v);
  mockGetDocs.mockResolvedValue({ docs: [] });
});

describe("voice-store", () => {
  it("cifra y guarda la nota en chunks, devolviendo el noteId", async () => {
    const setSpy = vi.fn();
    mockWriteBatch.mockReturnValue({ set: setSpy, commit: mockCommit });
    const id = await addVoiceNote("tok", "Ana", new Blob([DATA_URL], { type: "audio/webm" }));
    // noteId es un UUID (crypto.randomUUID): 36 caracteres, formato xxxxxxxx-….
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(id.length).toBeLessThanOrEqual(40);
    expect(mockEncrypt).toHaveBeenCalledWith(expect.stringContaining("data:audio/webm"), "tok");
    expect(mockCommit).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledWith("doc-ref", expect.objectContaining({ guestName: "Ana", totalChunks: 1, chunkIndex: 0 }));
  });

  it("agrupa los chunks de una nota al listar", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docData("c1", { noteId: "n1", guestName: "Ana", chunkIndex: 0, data: "parte-a", totalChunks: 2 }),
        docData("c2", { noteId: "n1", guestName: "Ana", chunkIndex: 1, data: "parte-b", totalChunks: 2 }),
      ],
    });
    const list = await listVoiceNotes("tok");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ noteId: "n1", guestName: "Ana", totalChunks: 2 });
  });

  it("concatena los chunks y descifra al cargar una nota", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docData("c1", { noteId: "n1", guestName: "Ana", chunkIndex: 0, data: "A", totalChunks: 2 }),
        docData("c2", { noteId: "n1", guestName: "Ana", chunkIndex: 1, data: "B", totalChunks: 2 }),
      ],
    });
    mockDecrypt.mockImplementation(async (v: string) => `decrypted:${v}`);
    const url = await loadVoiceNote("tok", "n1");
    expect(mockDecrypt).toHaveBeenCalledWith("AB", "tok");
    expect(url).toBe("decrypted:AB");
  });

  it("borra todos los chunks de la nota en un solo batch", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docData("c1", { noteId: "n1", guestName: "Ana", chunkIndex: 0, data: "A", totalChunks: 2 }),
        docData("c2", { noteId: "n1", guestName: "Ana", chunkIndex: 1, data: "B", totalChunks: 2 }),
      ],
    });
    const deleteSpy = vi.fn();
    mockWriteBatch.mockReturnValue({ delete: deleteSpy, commit: mockCommit });
    await deleteVoiceNote("tok", "n1");
    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalled();
  });
});
