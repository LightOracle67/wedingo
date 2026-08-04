/**
 * migrate-all-legacy.mjs
 * ─────────────────────────────────────────────────────────────
 * Migra TODAS las invitaciones legacy al nuevo esquema (idempotente):
 *
 *   1. Tokens: por cada invitación con _activeSetupToken crea
 *      setupTokens/{hash} y elimina el campo del documento público.
 *   2. RSVP: mueve las respuestas de la colección raíz rsvpResponses a
 *      rsvpResponses/{inviteToken}/responses y crea el documento grupo
 *      rsvpResponses/{inviteToken} con el contador.
 *
 * Usa firebase-admin (ADC del refresh token de `firebase login`), que
 * administra Firestore sin pasar por las reglas de seguridad.
 *
 * USO:
 *   node scripts/migrate-all-legacy.mjs            # dry-run (solo lectura)
 *   node scripts/migrate-all-legacy.mjs --apply    # aplica
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(resolve(__dirname, "../functions/node_modules/firebase-admin"));

const APPLY = process.argv.includes("--apply");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ── Credencial (ADC temporal a partir del refresh token del CLI) ───────
const config = JSON.parse(
  readFileSync(resolve(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
);
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) {
  console.error("❌ No hay refresh token en ~/.config/configstore/firebase-tools.json");
  process.exit(1);
}
const adcPath = resolve(os.tmpdir(), `wedingo-adc-${process.pid}.json`);
writeFileSync(
  adcPath,
  JSON.stringify({
    type: "authorized_user",
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: refreshToken,
  }),
);
process.on("exit", () => { try { unlinkSync(adcPath); } catch { /* noop */ } });

try {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  admin.initializeApp({ projectId: "wedingo-6c26a" });
} catch (err) {
  console.error("❌ No se pudo inicializar firebase-admin:", err.message);
  try { unlinkSync(adcPath); } catch { /* noop */ }
  process.exit(1);
}
const db = admin.firestore();
const Delete = admin.firestore.FieldValue.delete();

// ── 1) Migración de tokens legacy ──────────────────────────────────────
const invSnap = await db.collection("invitations").get();
let tokenCount = 0;
let invWithLegacy = 0;
for (const inv of invSnap.docs) {
  const data = inv.data();
  const legacyToken = typeof data._activeSetupToken === "string" ? data._activeSetupToken : "";
  if (!legacyToken) continue;
  invWithLegacy += 1;
  const hash = sha256(legacyToken);
  if (APPLY) {
    await db.doc(`setupTokens/${hash}`).set({ inviteToken: inv.id, createdAt: new Date().toISOString() });
    await db.doc(`invitations/${inv.id}`).update({ _activeSetupToken: Delete });
  }
  tokenCount += 1;
  console.log(`  Token: ${inv.id} → setupTokens/${hash.slice(0, 10)}…`);
}

// ── 2) Migración de RSVP (colección raíz → subcolección por invitación) ─
const oldSnap = await db.collection("rsvpResponses").get();
const byToken = new Map();
for (const d of oldSnap.docs) {
  const data = d.data();
  const token = typeof data.inviteToken === "string" ? data.inviteToken : "";
  if (!token) continue; // Los documentos grupo ({count}) no son respuestas.
  if (!byToken.has(token)) byToken.set(token, []);
  byToken.get(token).push({ id: d.id, data });
}

if (!APPLY) {
  console.log(`[CONTEXTO] Total invitaciones: ${invSnap.size} | con _activeSetupToken: ${invWithLegacy}`);
  console.log(`[CONTEXTO] Total docs en rsvpResponses (raíz): ${oldSnap.size} | respuestas legacy: ${[...byToken.values()].reduce((n, d) => n + d.length, 0)}`);
}

let rsvpCount = 0;
for (const [token, docs] of byToken.entries()) {
  if (APPLY) {
    const BATCH = 400;
    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = db.batch();
      for (const { id, data } of docs.slice(i, i + BATCH)) {
        batch.set(db.doc(`rsvpResponses/${token}/responses/${id}`), data);
        batch.delete(db.doc(`rsvpResponses/${id}`));
      }
      await batch.commit();
    }
    await db.doc(`rsvpResponses/${token}`).set({ count: docs.length }, { merge: true });
  }
  rsvpCount += docs.length;
  console.log(`  RSVP: ${token} → ${docs.length} respuesta(s)`);
}

if (!APPLY) {
  console.log(`\n[MODO DRY-RUN] ${tokenCount} token(s) y ${rsvpCount} RSVP(s) a migrar.`);
  console.log("Re-ejecuta con --apply para aplicar.");
  process.exit(0);
}

console.log(`\n✅ Migración completada: ${tokenCount} token(s) y ${rsvpCount} RSVP(s).`);
process.exit(0);
