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
  weddingScheduleEvents: "", weddingDressCode: "", weddingDressCodeCustom: "",
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
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    setupTokenHash: sha256("TOKEN-INCORRECTO"),
  });
});

// 4. Activación de sesión con el hash correcto (onFirstSave).
await expectAllow("4. activar sesión con hash correcto", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    setupTokenHash: HASH,
  });
});

// 2b. Código de vestimenta "Otro" con mensaje personalizado → permitido.
await expectAllow("2b. dress code 'Otro' con mensaje personalizado", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    weddingDressCode: "Otro",
    weddingDressCodeCustom: "Vestimenta vintage",
  });
});

// 2c. Mensaje personalizado del dress code excesivo (>500) → DENEGADO.
await expectDeny("2c. dress code 'Otro' con mensaje >500 → denegado", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    weddingDressCode: "Otro",
    weddingDressCodeCustom: "x".repeat(501),
  });
});

// 2d. Se restaura el dress code predefinido y se descarta el texto custom.
await expectAllow("2d. dress code predefinido (descarta custom)", async () => {
  await updateDoc(doc(db, "invitations", TOKEN), {
    weddingDressCode: "Vestimenta formal",
    weddingDressCodeCustom: "",
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
// Desde la v2.63.0 el token legacy `_activeSetupToken` ya NO activa sesión
// (era legible públicamente y permitía forjar sesiones de admin). Solo el
// hash con registro en setupTokens concede acceso.
const LEGACY_TOKEN = "legacyInv99";
const LEGACY_SETUP = "LEGACY-SETUP-TOKEN-0001";
const legacyBase = { ...payload, firstName: "Old", secondName: "Couple", adminUsername: "oldadmin" };
await expectAllow("11. invitación legacy sigue guardando (con _activeSetupToken)", async () => {
  await setDoc(doc(db, "invitations", LEGACY_TOKEN), { ...legacyBase, _activeSetupToken: LEGACY_SETUP });
});
await expectDeny("12. activar sesión legacy con token INCORRECTO → denegado", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    setupTokenHash: sha256("hash-de-algo"),
    legacyToken: "TOKEN-INCORRECTO",
  });
});
await expectDeny("13. activar sesión legacy con el token correcto → DENEGADO (legacy ya no vale)", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    setupTokenHash: sha256("placeholder"),
    legacyToken: LEGACY_SETUP,
  });
});
// El hash debe tener registro en setupTokens: sin él, se deniega incluso
// conociendo el token legacy (que además es legible públicamente).
await expectDeny("14. activar sesión con hash sin registro en setupTokens → denegado", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), {
    activeSession: serverTimestamp(),
    sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    setupTokenHash: sha256(LEGACY_SETUP),
  });
});
// La limpieza de los campos legacy queda reservada al superadmin (denegado sin auth).
await expectDeny("15. limpieza de _activeSetupToken/legacyToken sin superadmin → denegado", async () => {
  await updateDoc(doc(db, "invitations", LEGACY_TOKEN), { _activeSetupToken: deleteField(), legacyToken: deleteField() });
});

console.log(`\nResultado: ${pass} ok / ${fail} fail`);
process.exit(fail ? 1 : 0);
