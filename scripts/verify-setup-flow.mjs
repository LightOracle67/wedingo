/**
 * verify-setup-flow.mjs
 * ─────────────────────────────────────────────────────────────
 * Verifica el flujo de creación inicial de una invitación contra
 * el emulador de Firestore y las reglas reales (firestore.rules).
 *
 * Pasos del flujo /setup:
 *  1. Landing crea el registro setupTokens (la invitación aún no existe).
 *  2. Primer guardado: setDoc(merge) crea la invitación con todos los campos.
 *  3. onFirstSave activa la sesión con el hash del token.
 *  4. Se crea el contador de RSVP.
 *  5. Comprobaciones negativas (listar invitaciones / hash incorrecto).
 *
 * Ejecutar: npx firebase-tools emulators:exec --only firestore \
 *   --project demo-wedingo "node scripts/verify-setup-flow.mjs"
 */

import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { createHash } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

const TOKEN = "abcdef1234";
const SETUP_TOKEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789";
const HASH = sha256(SETUP_TOKEN);

const app = initializeApp({ projectId: "demo-wedingo" });
const db = initializeFirestore(app, {});
connectFirestoreEmulator(db, "127.0.0.1", 8080);

let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) { pass += 1; console.log(`✅ ${name}`); }
  else { fail += 1; console.log(`❌ ${name} ${extra}`); }
};

async function expectAllow(name, fn) {
  try { await fn(); check(name, true); }
  catch (e) { check(name, false, `→ ${e.message}`); }
}
async function expectDeny(name, fn) {
  try { await fn(); check(name, false, "→ no se denegó"); }
  catch { check(name, true); }
}

console.log(`Token: ${TOKEN} | Hash: ${HASH.slice(0, 12)}...\n`);

// 1. Registro setupTokens antes de que exista la invitación.
await expectAllow("1. crear setupTokens (invitación aún no existe)", async () => {
  await setDoc(doc(db, "setupTokens", HASH), { inviteToken: TOKEN, createdAt: new Date().toISOString() });
});

// 2. Primer guardado: payload completo (defaultConfig + normalizeConfig).
const payload = {
  adminUsername: "pepe", firstName: "Ana", secondName: "Luis",
  inviteMessage: "", weddingPlace: "", weddingSiteURL: "",
  weddingMapView: "roadmap", weddingMapStatic: "false",
  weddingDay: "15", weddingMonth: "junio", weddingYear: "2026",
  weddingHour: "18", weddingMinute: "30",
  weddingSchedule: "", weddingScheduleEvents: "", weddingDressCode: "",
  theme: "golden", couplePhoto: "", backgroundImage: "", customSeal: "", cornerDecoration: "",
  sectionOrder: "hero,details,transport,info,story,gallery,gifts,accommodation,rsvp",
  hiddenSections: "", storyText: "", giftsInfo: "", bankInfo: "",
  accommodationInfo: "", accommodationURL: "", transportEnabled: "none",
  transportDepartures: "", godparent1: "", godparent2: "",
  musicUrl: "", musicFile: "", kidsPolicy: "",
  menuEnabled: "false", menuTexto: "", menuCarne: "", menuPescado: "",
  menuVegano: "", menuPostre: "", menuTextoDishes: "", menuCarneDishes: "",
  menuPescadoDishes: "", menuVeganoDishes: "", privacyPolicyVersion: "2026-07-08",
};
await expectAllow("2. crear invitación (setDoc merge, primer guardado)", async () => {
  await setDoc(doc(db, "invitations", TOKEN), payload, { merge: true });
});

// 3. Activación con hash INCORRECTO (sin sesión previa) → DENEGADA.
await expectDeny("3. activar sesión con hash incorrecto (sin sesión) → denegado", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 2 * 3600 * 1000),
    setupTokenHash: sha256("TOKEN-INCORRECTO"),
  });
});

// 4. Activación de sesión con el hash correcto (onFirstSave).
await expectAllow("4. activar sesión con hash correcto", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 2 * 3600 * 1000),
    setupTokenHash: HASH,
  });
});

// 5. Contador de RSVP.
await expectAllow("5. crear contador RSVP", async () => {
  await setDoc(doc(db, "rsvpCounters", TOKEN), { count: 0 });
});

// 6. Listar/enumerar invitaciones → DENEGADO.
await expectDeny("6. listar invitaciones → denegado", async () => {
  await getDocs(collection(db, "invitations"));
});

// 7. Todos los campos requeridos presentes en Firestore.
const snap = await getDoc(doc(db, "invitations", TOKEN));
const data = snap.data() ?? {};
const required = [
  "firstName", "secondName", "weddingDay", "weddingMonth", "weddingYear",
  "weddingHour", "weddingMinute", "theme", "adminUsername", "sectionOrder",
  "storyText", "giftsInfo", "bankInfo", "accommodationInfo", "kidsPolicy",
  "menuEnabled", "privacyPolicyVersion", "transportEnabled",
];
const missing = required.filter((k) => typeof data[k] === "undefined");
if (missing.length === 0) {
  check("7. invitación contiene todos los campos requeridos", true, `(${required.length} campos)`);
} else {
  check("7. invitación contiene todos los campos requeridos", false, `faltan: ${missing.join(", ")}`);
}

console.log(`\nResultado: ${pass} ok / ${fail} fail`);
process.exit(fail ? 1 : 0);
