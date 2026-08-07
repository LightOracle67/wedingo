/**
 * e2e/test-invite.ts
 * ─────────────────────────────────────────────────────────────
 * Helper para sembrar y limpiar una invitación de pruebas en el
 * backend real (producción) durante los E2E del flujo de setup y RSVP.
 *
 * Usa el mismo enfoque que scripts/create-test-invite.mjs: crea primero
 * el registro setupTokens (antes de que exista la invitación, permitido por
 * reglas), después la invitación y el contador de RSVP.
 *
 * IMPORTANTE: estos tests se ejecutan solo si WEDINGO_E2E_LIVE=1 (guard
 * en las specs) para no escribir datos de prueba en cada ejecución de CI.
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SETUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(alphabet: string, length: number): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (const b of bytes) {
    if (out.length >= length) break;
    out += alphabet[b % alphabet.length];
  }
  return out;
}

export interface SeededInvite {
  inviteToken: string;
  setupToken: string;
  setupHash: string;
  username: string;
}

/** Genera tokens con el mismo formato que la app. */
export function generateSeededTokens(): { inviteToken: string; rawSetup: string; setupToken: string } {
  const inviteToken = randomString(INVITE_ALPHABET, 10);
  const rawSetup = randomString(SETUP_ALPHABET, 32);
  const setupToken = rawSetup.match(/.{1,4}/g)?.join("-") ?? rawSetup;
  return { inviteToken, rawSetup, setupToken };
}

function loadFirebaseConfig() {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const env = Object.fromEntries(
    readFileSync(new URL("../.env", `file://${here}`), "utf8").split("\n")
      .map((l) => l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

/** Crea en Firestore una invitación de prueba completa y devuelve sus tokens. */
export async function seedTestInvite(): Promise<SeededInvite> {
  const app = initializeApp(loadFirebaseConfig(), "wedingo-e2e-" + Date.now());
  const db = getFirestore(app);

  const { inviteToken, rawSetup, setupToken } = generateSeededTokens();
  const hash = createHash("sha256").update(rawSetup).digest("hex");
  const username = "testadmin";

  // 1. setupTokens antes de que exista la invitación (permitido por reglas).
  await setDoc(doc(db, "setupTokens", hash), {
    inviteToken,
    createdAt: new Date().toISOString(),
  });

  // 2. La invitación con configuración mínima válida.
  await setDoc(doc(db, "invitations", inviteToken), {
    adminUsername: username,
    firstName: "NovioTest",
    secondName: "NoviaTest",
    inviteMessage: "¡Nos casamos!",
    weddingPlace: "",
    weddingSiteURL: "",
    weddingMapView: "roadmap",
    weddingMapStatic: "false",
    weddingDay: "15",
    weddingMonth: "agosto",
    weddingYear: "2026",
    weddingHour: "18",
    weddingMinute: "30",
    weddingScheduleEvents: "",
    weddingDressCode: "",
    weddingDressCodeCustom: "",
    theme: "golden",
    couplePhoto: "",
    backgroundImage: "",
    customSeal: "",
    cornerDecoration: "",
    sectionOrder: "hero,details,transport,info,story,gallery,gifts,accommodation,rsvp",
    hiddenSections: "",
    storyText: "",
    giftsInfo: "",
    bankInfo: "",
    accommodationInfo: "",
    accommodationURL: "",
    transportEnabled: "none",
    transportDepartures: "",
    godparent1: "",
    godparent2: "",
    musicUrl: "",
    musicFile: "",
    kidsPolicy: "",
    menuEnabled: "false",
    menuTexto: "",
    menuCarne: "",
    menuPescado: "",
    menuVegano: "",
    menuPostre: "",
    menuTextoDishes: "",
    menuCarneDishes: "",
    menuPescadoDishes: "",
    menuVeganoDishes: "",
    privacyPolicyVersion: "2026-07-08",
    inviteMessageEnabled: "true",
    weddingSiteURLEnabled: "false",
    instagramEnabled: "false",
    facebookEnabled: "false",
    couplePhotoEnabled: "false",
    backgroundImageEnabled: "false",
    customSealEnabled: "false",
    cornerDecorationEnabled: "false",
    godparentsEnabled: "false",
    musicFileEnabled: "false",
    storyTextEnabled: "false",
    giftsInfoEnabled: "false",
    bankInfoEnabled: "false",
    accommodationURLEnabled: "false",
    weddingDressCodeEnabled: "false",
    kidsPolicyEnabled: "false",
    detailsMapMode: "iframe",
    transportMapMode: "iframe",
    accommodationMapMode: "iframe",
    rsvpDeadline: "",
    welcomeVideo: "",
    welcomeVideoEnabled: "false",
    giftList: "",
    trivia: "",
  });

  // 3. Contador de RSVP (requerido por las reglas para poder confirmar).
  await setDoc(doc(db, "rsvpResponses", inviteToken), { count: 0 });

  return { inviteToken, setupToken, setupHash: hash, username };
}

/** Elimina todos los datos de prueba asociados a la invitación. */
export async function cleanupTestInvite(invite: SeededInvite): Promise<void> {
  const app = initializeApp(loadFirebaseConfig(), "wedingo-e2e-cleanup-" + Date.now());
  const db = getFirestore(app);

  const responses = await getDocs(collection(db, "rsvpResponses", invite.inviteToken, "responses"));
  for (const d of responses.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, "rsvpResponses", invite.inviteToken));
  await deleteDoc(doc(db, "invitations", invite.inviteToken));
  await deleteDoc(doc(db, "setupTokens", invite.setupHash));
}
