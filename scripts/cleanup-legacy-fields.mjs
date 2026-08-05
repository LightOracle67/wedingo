/**
 * cleanup-legacy-fields.mjs — elimina campos legacy sobrantes de las
 * invitaciones (ya no los lee la app). Dry-run por defecto; --apply escribe.
 *
 * Uso: node scripts/cleanup-legacy-fields.mjs [--apply]
 */
import { createRequire } from "node:module";

import { setupFirebaseAdc } from "./lib/firebase-adc.mjs";

const require = createRequire(import.meta.url);
const admin = require(resolve(import.meta.dirname, "../functions/node_modules/firebase-admin"));

const APPLY = process.argv.includes("--apply");
// Campos legacy que la app ya no lee (sustituidos por los editores por platos,
// subcolecciones y el nuevo esquema de transporte/música).
const LEGACY_FIELDS = [
  "transportInfo", "menuTexto", "menuCarne", "menuPescado", "menuVegano",
  "menuPostre", "musicUrl", "accommodationInfo", "menuHeadcounts", "_activeSetupToken",
  "weddingSchedule",
];

setupFirebaseAdc();
admin.initializeApp({ projectId: "wedingo-6c26a" });
const db = admin.firestore();
const Delete = admin.firestore.FieldValue.delete();

const invSnap = await db.collection("invitations").get();
let removed = 0;
for (const doc of invSnap.docs) {
  const data = doc.data();
  const toDelete = LEGACY_FIELDS.filter((f) => data[f] !== undefined);
  if (!toDelete.length) continue;
  if (APPLY) {
    const patch = {};
    for (const f of toDelete) patch[f] = Delete;
    await db.doc(`invitations/${doc.id}`).update(patch);
  }
  removed += toDelete.length;
  console.log(`  ${doc.id}: elimina ${toDelete.join(", ")}`);
}

if (!APPLY) {
  console.log(`\n[MODO DRY-RUN] ${removed} campo(s) legacy a eliminar. Re-ejecuta con --apply.`);
  process.exit(0);
}
console.log(`\n✅ ${removed} campo(s) legacy eliminados.`);
process.exit(0);
