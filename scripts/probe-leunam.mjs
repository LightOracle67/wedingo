/**
 * probe-leunam.mjs — localiza invitaciones "leunam" y reporta su estado.
 * Uso: node scripts/probe-leunam.mjs [--show-token]
 * El token en claro solo se imprime con --show-token.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { setupFirebaseAdc } from "./lib/firebase-adc.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const admin = require(resolve(__dirname, "../functions/node_modules/firebase-admin"));

const SHOW = process.argv.includes("--show-token");

setupFirebaseAdc();
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
