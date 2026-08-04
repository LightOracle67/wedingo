/**
 * migrate-rsvp-schema.mjs
 * ─────────────────────────────────────────────────────────────
 * Migra las respuestas RSVP al nuevo esquema por invitación:
 *
 *   ANTES:  rsvpResponses/{docId}               (colección raíz, campo inviteToken)
 *   DESPUÉS: rsvpResponses/{inviteToken}        (documento grupo: { count })
 *            rsvpResponses/{inviteToken}/responses/{docId}
 *
 * Usa firebase-admin (ignora las reglas de seguridad), por lo que puede
 * ejecutarse antes o después de desplegar las nuevas reglas.
 *
 * Uso:
 *   npm ci --prefix functions
 *   node scripts/migrate-rsvp-schema.mjs <ruta-a-service-account.json>
 *
 * Ejemplo: node scripts/migrate-rsvp-schema.mjs ~/wedingo-sa.json
 */

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error("Uso: node scripts/migrate-rsvp-schema.mjs <service-account.json>");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch (err) {
  console.error("No se pudo leer el service account:", err.message);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const GROUP = "rsvpResponses";

// 1) Lee todas las respuestas de la colección raíz (esquema antiguo).
const snapshot = await db.collection(GROUP).get();
const byToken = new Map();

for (const doc of snapshot.docs) {
  const data = doc.data();
  const token = typeof data.inviteToken === "string" ? data.inviteToken : "";
  if (!token) {
    // Docs sin inviteToken no son respuestas (puede ser un grupo ya creado).
    if (typeof data.count === "number" && Object.keys(data).length === 1) continue;
    console.warn(`⚠️  rsvpResponses/${doc.id} sin inviteToken: se omite`);
    continue;
  }
  if (!byToken.has(token)) byToken.set(token, []);
  byToken.get(token).push({ id: doc.id, data });
}

let migrated = 0;
let batches = 0;

for (const [token, docs] of byToken.entries()) {
  const batch = db.batch();
  for (const { id, data } of docs) {
    batch.set(db.doc(`${GROUP}/${token}/responses/${id}`), data);
    batch.delete(db.doc(`${GROUP}/${id}`));
    migrated += 1;
  }
  // Documento grupo con el contador (tope anti-spam).
  batch.set(db.doc(`${GROUP}/${token}`), { count: docs.length }, { merge: true });
  batches += 1;
  await batch.commit();
  console.log(`→ ${token}: ${docs.length} respuestas migradas`);
}

console.log(`\n✅ Migración completada: ${migrated} respuestas en ${batches} lotes.`);
process.exit(0);
