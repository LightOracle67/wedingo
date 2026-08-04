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
  deleteField,
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

// 1b. El login DEBE poder leer setupTokens/{hash} SIN sesión activa para
//     localizar la invitación a partir del token (antes de activar sesión).
await expectAllow("1b. leer setupTokens/{hash} sin sesión (paso del login)", async () => {
  const s = await getDoc(doc(db, "setupTokens", HASH));
  if (!s.exists() || s.data().inviteToken !== TOKEN) throw new Error("registro incorrecto");
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

// 5. Documento grupo de RSVP (contador anti-spam).
await expectAllow("5. crear grupo rsvpResponses/{token} (contador)", async () => {
  await setDoc(doc(db, "rsvpResponses", TOKEN), { count: 0 });
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

// 8. El token de setup SÍ queda persistido en Firebase (colección setupTokens),
//    aunque NO en el documento público de la invitación (por seguridad).
const tokenSnap = await getDoc(doc(db, "setupTokens", HASH));
if (tokenSnap.exists() && tokenSnap.data().inviteToken === TOKEN) {
  check("8. token persistido en setupTokens (hash) apuntando a la invitación", true);
} else {
  check("8. token persistido en setupTokens (hash) apuntando a la invitación", false);
}

// 9. Una respuesta RSVP se guarda en la subcolección de su invitación:
//    rsvpResponses/{inviteToken}/responses/{id}, con sesión activa.
const RESP_ID = "resp-1";
const responsePayload = {
  guestName: "Maria Lopez",
  attendance: "yes",
  dietaryInfo: "",
  submittedAt: new Date().toISOString(),
  inviteToken: TOKEN,
  privacyConsent: true,
};
await expectAllow("9. crear respuesta en rsvpResponses/{token}/responses", async () => {
  await setDoc(doc(db, "rsvpResponses", TOKEN, "responses", RESP_ID), responsePayload);
});
const respSnap = await getDoc(doc(db, "rsvpResponses", TOKEN, "responses", RESP_ID));
if (respSnap.exists() && respSnap.data().guestName === "Maria Lopez") {
  check("10. respuesta legible desde su subcolección por invitación", true);
} else {
  check("10. respuesta legible desde su subcolección por invitación", false);
}

// ── Invitación LEGACY (creada antes del esquema de tokens hash) ──────────
const LEGACY_TOKEN = "legacyInv99";
const LEGACY_SETUP = "LEGACY-SETUP-TOKEN-0001";
const legacyBase = { ...payload, firstName: "Old", secondName: "Couple", adminUsername: "oldadmin" };
await expectAllow("11. invitación legacy sigue guardando (con _activeSetupToken)", async () => {
  await setDoc(doc(db, "invitations", LEGACY_TOKEN), { ...legacyBase, _activeSetupToken: LEGACY_SETUP });
});
await expectDeny("12. activar sesión legacy con token INCORRECTO → denegado", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 2 * 3600 * 1000),
    setupTokenHash: sha256("hash-de-algo"),
    legacyToken: "TOKEN-INCORRECTO",
  });
});
await expectAllow("13. activar sesión legacy con el token correcto (legacyToken)", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 2 * 3600 * 1000),
    setupTokenHash: sha256("placeholder"),
    legacyToken: LEGACY_SETUP,
  });
});
// Migración automática: registrar el token en setupTokens y limpiar el campo público.
await expectAllow("14. migración legacy: setupTokens + limpieza de _activeSetupToken", async () => {
  await setDoc(doc(db, "setupTokens", sha256(LEGACY_SETUP)), { inviteToken: LEGACY_TOKEN, createdAt: new Date().toISOString() });
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), { _activeSetupToken: deleteField(), legacyToken: deleteField() });
});
const legacyAfter = await getDoc(doc(db, "invitations", LEGACY_TOKEN));
if (legacyAfter.exists() && typeof legacyAfter.data()._activeSetupToken === "undefined") {
  check("15. _activeSetupToken eliminado del doc público tras migrar", true);
} else {
  check("15. _activeSetupToken eliminado del doc público tras migrar", false);
}

console.log(`\nResultado: ${pass} ok / ${fail} fail`);
process.exit(fail ? 1 : 0);
