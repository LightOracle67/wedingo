/**
 * voice-store — Caja de recuerdos de voz (diferencial).
 *
 * Los invitados graban una nota de voz corta para la pareja. Cada nota se
 * cifra (AES-GCM con el token) y se trocea en chunks en la subcolección
 * `voicenotes` (mismo patrón que el audio de música), con un `noteId` aleatorio
 * para agrupar los chunks de cada grabación. La reproducción reensambla y
 * descifra los chunks de una nota.
 */
import { getDocs, collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import { encrypt, decrypt } from "./crypto-utils";
import { AUDIO_CHUNK_SIZE_BYTES } from "./constants";

const CHUNK_SIZE = AUDIO_CHUNK_SIZE_BYTES;

function notesCol(token: string) {
  return collection(db, "invitations", token, "voicenotes");
}

interface VoiceChunk {
  id: string;
  noteId: string;
  guestName: string;
  chunkIndex: number;
  data: string;
  totalChunks: number;
  createdAt?: string;
}

/** Sube una nota de voz (blob webm/ogg) de un invitado. */
export async function addVoiceNote(inviteToken: string, guestName: string, blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
  const encrypted = await encrypt(dataUrl, inviteToken);
  if (!encrypted) throw new Error("Encryption failed");

  const noteId = crypto.randomUUID();
  const chunks: string[] = [];
  for (let i = 0; i < encrypted.length; i += CHUNK_SIZE) chunks.push(encrypted.slice(i, i + CHUNK_SIZE));
  if (chunks.length === 0) throw new Error("Empty note");

  const BATCH_LIMIT = 40;
  for (let batchIdx = 0; batchIdx < chunks.length; batchIdx += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const end = Math.min(batchIdx + BATCH_LIMIT, chunks.length);
    for (let i = batchIdx; i < end; i++) {
      batch.set(doc(notesCol(inviteToken)), {
        noteId,
        guestName,
        chunkIndex: i,
        data: chunks[i],
        totalChunks: chunks.length,
        attempt: Date.now(),
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }
  return noteId;
}

/** Lista las notas de voz (agrupadas por noteId, ordenadas por creación). */
export async function listVoiceNotes(inviteToken: string): Promise<VoiceChunk[]> {
  try {
    const snap = await getDocs(notesCol(inviteToken));
    const all: VoiceChunk[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VoiceChunk, "id">) }));
    const byNote = new Map<string, VoiceChunk[]>();
    for (const c of all) {
      if (!byNote.has(c.noteId)) byNote.set(c.noteId, []);
      byNote.get(c.noteId)!.push(c);
    }
    const out: VoiceChunk[] = [];
    for (const group of byNote.values()) {
      group.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const full = group[0];
      if (!full) continue;
      out.push({ ...full, id: full.id });
    }
    return out.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  } catch {
    return [];
  }
}

/** Reensambla y descifra los chunks de una nota para reproducirla. */
export async function loadVoiceNote(inviteToken: string, noteId: string): Promise<string> {
  const snap = await getDocs(notesCol(inviteToken));
  const chunks = snap.docs
    .map((d) => d.data() as Omit<VoiceChunk, "id">)
    .filter((c) => c.noteId === noteId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
  if (chunks.length === 0) return "";
  const encrypted = chunks.map((c) => c.data).join("");
  const dataUrl = await decrypt(encrypted, inviteToken);
  return dataUrl || "";
}

/** Borra todos los chunks de una nota (solo admin/superadmin por reglas). */
export async function deleteVoiceNote(inviteToken: string, noteId: string): Promise<void> {
  const snap = await getDocs(notesCol(inviteToken));
  const toDelete = snap.docs.filter((d) => d.data().noteId === noteId);
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = writeBatch(db);
    toDelete.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
