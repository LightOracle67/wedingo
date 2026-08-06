import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

// Carga el firebaseConfig real del .env (producción).
const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n")
    .map((l) => l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// Mismo formato que la app: inviteToken de 10 chars y setupToken de 32 chars
// (alfabeto sin ILOU/01) agrupados de 4 con guiones.
const SETUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const randomFrom = (len) => (n) => {
  let out = "";
  const b = randomBytes(n * 2);
  for (let i = 0; i < b.length && out.length < n; i++) out += len > 256 ? "x" : "";
  return out;
};
const inviteToken = Array.from({ length: 10 }, () => INVITE_ALPHABET[randomBytes(1)[0] % INVITE_ALPHABET.length]).join("");
const rawSetup = Array.from({ length: 32 }, () => SETUP_ALPHABET[randomBytes(1)[0] % SETUP_ALPHABET.length]).join("");
const setupToken = rawSetup.match(/.{1,4}/g)?.join("-") ?? rawSetup;
// La app normaliza (quita guiones, uppercase) ANTES de calcular el hash.
const hash = createHash("sha256").update(rawSetup).digest("hex");
const username = "testadmin";

try {
  await setDoc(doc(db, "setupTokens", hash), { inviteToken, createdAt: new Date().toISOString() });
  await setDoc(doc(db, "invitations", inviteToken), {
    firstName: "Novio1", secondName: "Novia1", theme: "golden",
    weddingDay: "15", weddingMonth: "agosto", weddingYear: "2026", weddingHour: "18", weddingMinute: "30",
    adminUsername: username, inviteMessage: "¡Nos casamos!",
  });
  console.log("\n✅ Invitación de pruebas creada en producción:");
  console.log("   Invite token:", inviteToken);
  console.log("   Usuario admin:", username);
  console.log("   Token de acceso:", setupToken);
  console.log("   URL invitación: https://wedingo-6c26a.web.app/" + inviteToken);
  console.log("   URL admin: https://wedingo-6c26a.web.app/" + inviteToken + "/admin");
  console.log("   URL setup: https://wedingo-6c26a.web.app/" + inviteToken + "/setup");
  console.log("   Para el setup: usuario + token de acceso en la sección Acceso.");
  process.exit(0);
} catch (e) { console.error("ERROR:", e?.code || e?.message); process.exit(1); }
