/**
 * probe-leunam.mjs — localiza invitaciones "leunam" y reporta su estado.
 * Uso: node scripts/probe-leunam.mjs [--show-token]
 * El token en claro solo se imprime con --show-token.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(resolve(__dirname, "../functions/node_modules/firebase-admin"));

const SHOW = process.argv.includes("--show-token");

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

const invSnap = await db.collection("invitations").get();
const needle = "leunam";
const matches = invSnap.docs.filter((d) => {
  const data = d.data();
  return [d.id, data.adminUsername, data.firstName, data.secondName]
    .filter(Boolean).join(" ").toLowerCase().includes(needle);
});

if (matches.length === 0) { console.log("No se encontró ninguna invitación que contenga 'leunam'."); process.exit(0); }

for (const d of matches) {
  const data = d.data();
  const legacy = typeof data._activeSetupToken === "string" && data._activeSetupToken ? data._activeSetupToken : "";
  console.log(`\n• ${d.id}`);
  console.log(`  Nombres: ${data.firstName || ""} ${data.secondName || ""}`);
  console.log(`  adminUsername: ${data.adminUsername || ""}`);
  if (legacy) {
    console.log(`  Token (legacy en el doc): ${SHOW ? legacy : "(oculto — usa --show-token)"}`);
  } else {
    console.log("  Token legacy: NO (migrado o inexistente)");
  }
  const st = await db.collection("setupTokens").where("inviteToken", "==", d.id).get();
  console.log(`  setupTokens: ${st.size} registro(s)`);
}
process.exit(0);
