/**
 * reset-token.mjs — genera un NUEVO token de setup para una invitación,
 * reemplaza el registro en setupTokens y lo muestra (solo una vez).
 *
 * Uso: node scripts/reset-token.mjs <inviteId>
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createHash, randomInt } from "node:crypto";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(resolve(__dirname, "../functions/node_modules/firebase-admin"));

const INVITE = process.argv[2];
if (!INVITE) { console.error("Uso: node scripts/reset-token.mjs <inviteId>"); process.exit(1); }

// Generador idéntico a src/lib/token-utils.ts (alfabeto de 31, 32 chars).
function generateSetupToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  while (raw.length < 32) raw += alphabet[randomInt(alphabet.length)];
  return raw.match(/.{1,4}/g).join("-");
}
const normalize = (v) => String(v).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

const config = JSON.parse(readFileSync(resolve(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) { console.error("❌ sin refresh token"); process.exit(1); }
const adcPath = resolve(os.tmpdir(), `wedingo-adc-${process.pid}.json`);
writeFileSync(adcPath, JSON.stringify({
  type: "authorized_user",
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
  refresh_token: refreshToken,
}));
process.on("exit", () => { try { unlinkSync(adcPath); } catch { /* noop */ } });
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
admin.initializeApp({ projectId: "wedingo-6c26a" });
const db = admin.firestore();

const inv = await db.doc(`invitations/${INVITE}`).get();
if (!inv.exists) { console.error(`❌ invitations/${INVITE} no existe.`); process.exit(1); }

// Nuevo token.
const raw = generateSetupToken();
const normalized = normalize(raw);
const hash = sha256(normalized);

// Reemplaza los registros setupTokens antiguos de esta invitación.
const old = await db.collection("setupTokens").where("inviteToken", "==", INVITE).get();
for (const d of old.docs) {
  await db.doc(`setupTokens/${d.id}`).delete();
  console.log(`  removed setupTokens/${d.id.slice(0, 10)}…`);
}
await db.doc(`setupTokens/${hash}`).set({ inviteToken: INVITE, createdAt: new Date().toISOString() });
console.log(`  created setupTokens/${hash.slice(0, 10)}…`);

console.log(`\nNUEVO TOKEN para ${INVITE} (guárdalo, no se vuelve a mostrar):`);
console.log(`\n  ${raw}\n`);
process.exit(0);
