/**
 * Tests de useInviteSubcollection — Lectura/escrita genérica de subcolecciones
 * de la invitación (`invitations/{token}/{sub}`).
 *
 * Cubre: carga al montar (y no-carga sin token), map con filtrado de nulls,
 * sort/limit, add() con batch + contador atómico y reintentos, guardas de
 * busy/token y el camino de error (devuelve null sin lanzar).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { DocumentData } from "firebase/firestore";

// ── Mocks hoisted de Firestore (fakes mínimos con registro de llamadas) ──
const mockGetDocs = vi.hoisted(() => vi.fn());
const mockBatchSet = vi.hoisted(() => vi.fn());
const mockCommit = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("firebase/firestore", () => ({
  // Fakes que devuelven tokens simples; solo importa el flujo del hook.
  collection: (...args: unknown[]) => ({ __coll: args }),
  doc: (_db: unknown, ...args: unknown[]) => ({ __doc: args, id: "new-doc-1" }),
  getDocs: mockGetDocs,
  increment: (v: number) => ({ __inc: v }),
  serverTimestamp: () => "SERVER_TIMESTAMP",
  writeBatch: () => ({ set: mockBatchSet, commit: mockCommit }),
}));

// Instancia db ficticia: el hook solo la pasa através.
vi.mock("../../lib/firebase", () => ({ db: { __fakeDb: true } }));

import { useInviteSubcollection } from "../useInviteSubcollection";

/** Snapshot fake de getDocs con dos documentos de ejemplo. */
function fakeSnap(): { docs: Array<{ id: string; data: () => DocumentData }> } {
  return {
    docs: [
      { id: "doc-a", data: () => ({ name: "A" }) },
      { id: "doc-b", data: () => ({ name: "B" }) },
    ],
  };
}

describe("useInviteSubcollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockResolvedValue(fakeSnap());
    mockCommit.mockResolvedValue(undefined);
  });

  it("carga los documentos al montar aplicando el map por defecto (spread + id)", async () => {
    const { result } = renderHook(() => useInviteSubcollection<{ id: string; name: string }>("TOK1", "songs"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    // El map por defecto mezcla el id del doc con sus datos.
    expect(result.current.items[0]).toEqual({ id: "doc-a", name: "A" });
    // La consulta apunta a la subcolección correcta.
    expect(mockGetDocs).toHaveBeenCalledWith(expect.objectContaining({ __coll: expect.any(Array) }));
  });

  it("no consulta Firestore si falta el token", () => {
    renderHook(() => useInviteSubcollection(undefined, "notes"));
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("aplica map personalizado y descarta los elementos mapeados a null", async () => {
    const { result } = renderHook(() =>
      // Solo conserva docs cuyo name sea 'B' (map devuelve null para el resto).
      useInviteSubcollection<{ label: string }>("TOK1", "gifts", {
        map: ({ id, data }) => (data.name === "B" ? { label: `${id}:${data.name as string}` } : null),
      }),
    );
    await waitFor(() => expect(result.current.items).toEqual([{ label: "doc-b:B" }]));
  });

  it("ordena y limita la lista según las opciones", async () => {
    const { result } = renderHook(() =>
      useInviteSubcollection<{ id: string }>("TOK1", "reactions", {
        // Orden descendente por id: doc-b antes que doc-a; limit deja 1.
        sort: (a, b) => (a.id < b.id ? 1 : -1),
        limit: 1,
      }),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]?.id).toBe("doc-b");
  });

  it("add() escribe payload+createdAt y contador en un batch, recarga y devuelve el id", async () => {
    const { result } = renderHook(() => useInviteSubcollection("TOK1", "notes"));
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalledTimes(1));

    let returnedId: string | null = null;
    await act(async () => {
      returnedId = await result.current.add({ text: "hola" });
    });
    expect(returnedId).toBe("new-doc-1");
    // Dos sets: documento nuevo (con createdAt server) y contador merge.
    expect(mockBatchSet).toHaveBeenNthCalledWith(1, expect.objectContaining({ __doc: expect.any(Array) }), {
      text: "hola",
      createdAt: "SERVER_TIMESTAMP",
    });
    // Segundo set: contador atómico con merge (3 argumentos).
    expect(mockBatchSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ __doc: expect.any(Array) }),
      { count: { __inc: 1 } },
      { merge: true },
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
    // Tras escribir, se re-consulta la subcolección.
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });

  it("add() devuelve null si falta el token sin tocar Firestore", async () => {
    const { result } = renderHook(() => useInviteSubcollection(undefined, "rides"));
    let out: string | null | undefined;
    await act(async () => {
      out = await result.current.add({ x: 1 });
    });
    expect(out).toBeNull();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("add() devuelve null cuando el commit falla (error permanente)", async () => {
    const { result } = renderHook(() => useInviteSubcollection("TOK1", "songs"));
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    // permission-denied NO es reintentable → falla rápido sin esperas.
    mockCommit.mockRejectedValue({ code: "permission-denied" });
    let out: string | null | undefined;
    await act(async () => {
      out = await result.current.add({ text: "fallido" });
    });
    expect(out).toBeNull();
  });

  it("bloquea una segunda escritura mientras hay una en curso (busy)", async () => {
    const { result } = renderHook(() => useInviteSubcollection("TOK1", "notes"));
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());

    // Commit colgado: controlamos cuándo resuelve para mantener busy=true.
    let resolveCommit!: (v: void) => void;
    mockCommit.mockReturnValue(new Promise<void>((r) => (resolveCommit = r)));

    let first!: Promise<string | null>;
    act(() => {
      first = result.current.add({ n: 1 }) as Promise<string | null>;
    });
    // Segunda llamada concurrente: la guarda de busy la rechaza al instante.
    let second!: Promise<string | null>;
    act(() => {
      second = result.current.add({ n: 2 }) as Promise<string | null>;
    });
    await act(async () => {
      await expect(second).resolves.toBeNull();
    });
    resolveCommit();
    await act(async () => {
      await expect(first).resolves.toBe("new-doc-1");
    });
  });
});
