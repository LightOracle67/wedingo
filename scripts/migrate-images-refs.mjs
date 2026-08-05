/**
 * migrate-images-refs.mjs
 * ─────────────────────────────────────────────────────────────
 * Migra los campos de imagen de un documento de invitación a
 * referencias `__cfgimg:{id}` de la subcolección configImages,
 * eliminando los blobs inline (data URLs / cifrados legacy) que
 * inflan el documento y ralentizan su lectura.
 *
 * Solo convierte campos que YA tienen su copia descifrable en
 * configImages (la subcolección es la fuente de verdad desde v2.33).
 *
 * USO:
 *   node scripts/migrate-images-refs.mjs              # dry-run (solo lectura)
 *   node scripts/migrate-images-refs.mjs <inviteId> --apply
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../functions/node_modules/firebase-admin"));
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const INVITE = args.find((a) => !a.startsWith("--")) || "tzjW9HUaqJ";

const IMAGE_FIELDS = ["couplePhoto", "backgroundImage", "customSeal", "cornerDecoration"];

// ── Credencial: refresh token del CLI ya logueado (ADC) ───────────────
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
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

admin.initializeApp({ projectId: "wedingo-6c26a" });
const db = admin.firestore();

const inv = await db.doc(`invitations/${INVITE}`).get();
if (!inv.exists) { console.error(`❌ invitations/${INVITE} no existe.`); process.exit(1); }
const data = inv.data() || {};

// Comprueba qué imágenes tienen copia válida en configImages (descifrable).
async function hasValidCopy(imageId) {
  const snap = await db.doc(`invitations/${INVITE}/configImages/${imageId}`).get();
  const val = snap.exists ? snap.data()?.data : null;
  return typeof val === "string" && val.length > 24;
}

const updates = {};
for (const field of IMAGE_FIELDS) {
  const current = data[field];
  if (current === undefined) continue;
  if (typeof current === "string" && current.startsWith("__cfgimg:")) {
    console.log(`${field}: ya es ref (sin cambios)`);
    continue;
  }
  const hasCopy = await hasValidCopy(field);
  if (hasCopy) {
    updates[field] = `__cfgimg:${field}`;
    const size = typeof current === "string" ? current.length : "(no string)";
    console.log(`${field}: inline (${size} chars) → __cfgimg:${field} (hay copia válida en configImages)`);
  } else {
    console.log(`${field}: inline (${typeof current === "string" ? current.length : typeof current}) — SIN copia en configImages, se deja como está`);
  }
}

const newSize = JSON.stringify({ ...data, ...updates }).length;
console.log(`\nTamaño del doc: ${JSON.stringify(data).length.toLocaleString()} B → ${newSize.toLocaleString()} B`);

if (Object.keys(updates).length === 0) {
  console.log("Nada que migrar.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\n[dry-run] Aplica con: node scripts/migrate-images-refs.mjs " + INVITE + " --apply");
  process.exit(0);
}

await db.doc(`invitations/${INVITE}`).update(updates);
console.log(`\n✅ Actualizado invitations/${INVITE} con refs __cfgimg (${Object.keys(updates).length} campos).`);
process.exit(0);
