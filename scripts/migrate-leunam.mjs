/**
 * migrate-leunam.mjs
 * ─────────────────────────────────────────────────────────────
 * Migra la invitación "leunam" (existente en producción) a los nuevos
 * esquemas sin perder datos:
 *
 *   1. Token de setup: crea setupTokens/{hash} y elimina _activeSetupToken
 *      del documento público de la invitación.
 *   2. RSVP: mueve sus respuestas de la colección raíz rsvpResponses a la
 *      subcolección rsvpResponses/leunam/responses y crea el grupo contador.
 *
 * Usa firebase-admin con el refresh token del CLI (firebase login), que
 * administra Firestore sin pasar por las reglas de seguridad.
 *
 * USO (¡ejecuta primero el dry-run!):
 *   node scripts/migrate-leunam.mjs            # dry-run (solo lectura)
 *   node scripts/migrate-leunam.mjs --apply    # aplica la migración
 *
 * El token de setup NUNCA se imprime: solo su longitud/hash.
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

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const INVITE = args.find((a) => !a.startsWith("--")) || "leunam";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ── Credencial: refresh token del CLI ya logueado (ADC) ───────────────
const config = JSON.parse(
  readFileSync(resolve(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
);
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) {
  console.error("❌ No hay refresh token en ~/.config/configstore/firebase-tools.json");
  process.exit(1);
}

// Fichero temporal de Application Default Credentials (se elimina al salir).
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

try {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  admin.initializeApp({ projectId: "wedingo-6c26a" });
} catch (err) {
  console.error("❌ No se pudo inicializar firebase-admin:", err.message);
  try { unlinkSync(adcPath); } catch { /* noop */ }
  process.exit(1);
}
// Limpieza del fichero ADC temporal al salir del proceso.
process.on("exit", () => { try { unlinkSync(adcPath); } catch { /* noop */ } });
const db = admin.firestore();
const Delete = admin.firestore.FieldValue.delete();

// ── 1) Leer la invitación ─────────────────────────────────────────────
const inv = await db.doc(`invitations/${INVITE}`).get();
if (!inv.exists) {
  console.error(`❌ invitations/${INVITE} no existe como documentId en producción.`);
  // Busca invitaciones cuyo adminUsername o nombres coincidan con el término.
  const all = await db.collection("invitations").get();
  const needle = INVITE.toLowerCase();
  const matches = all.docs.filter((d) => {
    const data = d.data();
    const hay = [
      d.id,
      data.adminUsername,
      data.firstName,
      data.secondName,
      data.firstName ? `${data.firstName} ${data.secondName}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle) || hay.includes("manuel");
  });
  if (matches.length === 0) {
    console.error("No se encontró ninguna invitación que contenga 'leunam'/'manuel'.");
    process.exit(1);
  }
  console.log("\nCandidatas encontradas:");
  for (const d of matches) {
    const data = d.data();
    console.log(`  • ${d.id}  (${data.firstName || ""} ${data.secondName || ""} | admin: ${data.adminUsername || ""})`);
  }
  console.error("\nRe-ejecuta con el ID correcto: node scripts/migrate-leunam.mjs <ID> --apply");
  process.exit(1);
}
const invData = inv.data();
const legacyToken = typeof invData._activeSetupToken === "string" ? invData._activeSetupToken : "";

console.log(`Invitación: ${INVITE}`);
console.log(`  Nombres: ${invData.firstName} & ${invData.secondName}`);
console.log(`  _activeSetupToken: ${legacyToken ? `presente (len ${legacyToken.length})` : "NO (ya migrada o sin token)"}`);
console.log(`  Sesión activa: ${!!invData.activeSession}`);

const hash = legacyToken ? sha256(legacyToken) : "";
if (hash) {
  const st = await db.doc(`setupTokens/${hash}`).get();
  console.log(`  setupTokens/${hash.slice(0, 10)}…: ${st.exists ? "ya existe" : "NO"}`);
} else {
  // Ya migrada: comprueba el registro por inviteToken.
  const st = await db.collection("setupTokens").where("inviteToken", "==", INVITE).get();
  console.log(`  setupTokens por inviteToken: ${st.size} registro(s)`);
}

// ── 2) RSVP antiguas de esta invitación ───────────────────────────────
const oldSnap = await db.collection("rsvpResponses").get();
const toMigrate = oldSnap.docs.filter((d) => d.data().inviteToken === INVITE);
console.log(`  RSVP antiguas a migrar: ${toMigrate.length}`);

if (!APPLY) {
  console.log("\n[MODO DRY-RUN] Sin cambios. Re-ejecuta con --apply para migrar.");
  process.exit(0);
}

// ── A) Migrar el token de setup ───────────────────────────────────────
if (legacyToken) {
  if (hash) {
    await db.doc(`setupTokens/${hash}`).set({ inviteToken: INVITE, createdAt: new Date().toISOString() });
    console.log(`✅ setupTokens/${hash.slice(0, 10)}… creado`);
  }
  await db.doc(`invitations/${INVITE}`).update({ _activeSetupToken: Delete });
  console.log("✅ _activeSetupToken eliminado del documento público");
}

// ── B) Migrar las RSVP a la subcolección ──────────────────────────────
const BATCH = 400;
for (let i = 0; i < toMigrate.length; i += BATCH) {
  const batch = db.batch();
  for (const d of toMigrate.slice(i, i + BATCH)) {
    batch.set(db.doc(`rsvpResponses/${INVITE}/responses/${d.id}`), d.data());
    batch.delete(d.ref);
  }
  await batch.commit();
}
await db.doc(`rsvpResponses/${INVITE}`).set({ count: toMigrate.length });
console.log(`✅ ${toMigrate.length} RSVP migradas a rsvpResponses/${INVITE}/responses/ (grupo con count=${toMigrate.length})`);

console.log(`\n✅ Migración completada para "${INVITE}".`);
process.exit(0);
