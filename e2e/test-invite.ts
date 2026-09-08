/**
 * e2e/test-invite.ts
 * ─────────────────────────────────────────────────────────────
 * Helper para sembrar y limpiar una invitación de pruebas en el
 * backend real (producción) durante los E2E del flujo de setup y RSVP.
 *
 * Crea primero el registro setupTokens (antes de que exista la invitación,
 * permitido por reglas), después la invitación y el contador de RSVP.
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
function generateSeededTokens(): { inviteToken: string; rawSetup: string; setupToken: string } {
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
    VITE_ADMIN_EMAILS: env.VITE_ADMIN_EMAILS,
    VITE_SUPERADMIN_PASSWORD: env.VITE_SUPERADMIN_PASSWORD,
  };
}

/** Crea en Firestore una invitación de prueba completa y devuelve sus tokens. */
const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
] as const;

/** Fecha de boda FUTURA estable en el tiempo (hoy + 366 días). */
function futureWeddingDate(): Date {
  return new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);
}

export async function seedTestInvite(): Promise<SeededInvite> {
  const app = initializeApp(loadFirebaseConfig(), "wedingo-e2e-" + Date.now());
  const db = getFirestore(app);

  const futureDate = futureWeddingDate();
  const { inviteToken, rawSetup, setupToken } = generateSeededTokens();
  const hash = createHash("sha256").update(rawSetup).digest("hex");
  const username = "testadmin";

  // 1. setupTokens antes de que exista la invitación (permitido por reglas).
  await setDoc(doc(db, "setupTokens", hash), {
    inviteToken,
    createdAt: new Date().toISOString(),
  });

  // 2. La invitación con configuración mínima válida.
  // Clave en reglas actuales: el create exige la PRUEBA DE CONOCIMIENTO del
  // token de setup (setupTokenValid → setupTokens/{hash} → inviteToken),
  // por lo que el documento de invitación debe incluir el hash del TOKEN
  // CRUDO (sin guiones), igual que hace la app al guardar por primera vez.
  await setDoc(doc(db, "invitations", inviteToken), {
    setupTokenHash: hash,
    adminUsername: username,
    firstName: "NovioTest",
    secondName: "NoviaTest",
    inviteMessage: "¡Nos casamos!",
    weddingPlace: "",
    weddingSiteURL: "",
    weddingMapView: "roadmap",
    weddingMapStatic: "false",
    // Fecha DINÁMICA futura (hoy + 1 año): una fecha fija caducaba y
    // `weddingPassed` congelaba el formulario RSVP (inputs disabled).
    weddingDay: String(futureDate.getDate()),
    weddingMonth: MONTHS_ES[futureDate.getMonth()]!,
    weddingYear: String(futureDate.getFullYear()),
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
  // La regla create exige AMBOS campos (count <= 1, attendingCount int).
  await setDoc(doc(db, "rsvpResponses", inviteToken), { count: 0, attendingCount: 0 });

  return { inviteToken, setupToken, setupHash: hash, username };
}

/**
 * Elimina todos los datos de prueba asociados a la invitación.
 *
 * IMPORTANTE (alineado con las reglas actuales): `allow delete` de
 * invitations/{id} y setupTokens/{hash} exige `isSuperAdmin()` — la sesión
 * admin de la invitación NO es suficiente. El cleanup se autentica con el
 * SUPERADMIN vía REST (Identity Toolkit → idToken → Firestore REST con
 * Bearer). Requiere en .env: VITE_ADMIN_EMAILS + VITE_SUPERADMIN_PASSWORD.
 */
/**
 * Siembra una invitación SIN documentar (solo el registro de setupTokens):
 * el flujo /setup de ALTA (invitación nueva) — ConfigProvider hidrata con
 * defaultConfig + hasStoredConfig=false y el formulario muestra la sección
 * de acceso con el token. El primer guardado del alta crea el doc completo
 * (reglas: prueba de conocimiento del token).
 */
export async function seedFreshInvite(): Promise<SeededInvite> {
  const app = initializeApp(loadFirebaseConfig(), "wedingo-e2e-fresh-" + Date.now());
  const db = getFirestore(app);

  const { inviteToken, rawSetup, setupToken } = generateSeededTokens();
  const hash = createHash("sha256").update(rawSetup).digest("hex");
  const username = "testadmin";

  await setDoc(doc(db, "setupTokens", hash), {
    inviteToken,
    createdAt: new Date().toISOString(),
  });

  return { inviteToken, setupToken, setupHash: hash, username };
}

export async function cleanupTestInvite(invite: SeededInvite): Promise<void> {
  const env = loadFirebaseConfig();
  const email = process.env.VITE_ADMIN_EMAILS || env.VITE_ADMIN_EMAILS?.split(",")[0]?.trim();
  const password = process.env.VITE_SUPERADMIN_PASSWORD || env.VITE_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("cleanup e2e: faltan VITE_ADMIN_EMAILS / VITE_SUPERADMIN_PASSWORD en .env");
  }

  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const authJson = (await authRes.json()) as { idToken?: string; error?: { message?: string } };
  if (!authJson.idToken) {
    throw new Error(
      `cleanup e2e: signInWithPassword falló ${authJson.error?.message ?? authRes.status}`.slice(0, 200),
    );
  }

  const base = `https://firestore.googleapis.com/v1/projects/${env.projectId}/databases/(default)/documents`;
  const restDelete = async (path: string) => {
    const res = await fetch(`${base}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authJson.idToken}` },
    });
    if (res.status >= 400) {
      const text = (await res.text()).slice(0, 160);
      throw new Error(`cleanup e2e: DELETE ${path} → ${res.status} ${text}`);
    }
  };

  // Listar respuestas con el token superadmin (allow list: isSuperAdmin) y
  // borrarlas una a una. El SDK no sirve aquí: list DENIED sin credenciales.
  const listUrl = `${base}/rsvpResponses/${invite.inviteToken}/responses?key=${env.apiKey}`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${authJson.idToken}` },
  });
  if (listRes.status < 400) {
    const listJson = (await listRes.json()) as { documents?: Array<{ name: string }> };
    for (const d of listJson.documents ?? []) {
      await restDelete(d.name.split("/documents/")[1]!);
    }
  }
  await restDelete(`rsvpResponses/${invite.inviteToken}`);
  await restDelete(`invitations/${invite.inviteToken}`);
  await restDelete(`setupTokens/${invite.setupHash}`);
}

/* Cierra el banner de cookies (modal con inert detrás): la primera visita con
 * localStorage vacío lo muestra y bloquea la interacción con la página. El
 * banner es un chunk lazy: hay que esperar a que monte antes de rechazarlo. */
export async function dismissCookieBanner(page: import("@playwright/test").Page): Promise<void> {
  const accept = page.getByRole("button", { name: /accept|aceptar/i });
  try {
    await accept.waitFor({ state: "visible", timeout: 10000 });
    await accept.click();
  } catch {
    /* sin banner (visita con consentimiento ya guardado): nada que hacer */
  }
}

/**
 * Activa la SESIÓN ADMIN de la invitación de prueba (doc `_private/session`
 * con la prueba de conocimiento del token + `sessionStorage` en el browser).
 * Sin esto, /setup y /admin de una invitación YA configurada redirigen a la
 * vista pública (flujo real de la app: sesión inexistente → pública).
 */
export async function seedAdminSession(
  page: import("@playwright/test").Page,
  invite: SeededInvite,
): Promise<void> {
  const app = initializeApp(loadFirebaseConfig(), "wedingo-e2e-session-" + Date.now());
  const db = getFirestore(app);
  const now = Date.now();
  await setDoc(doc(db, "invitations", invite.inviteToken, "_private", "session"), {
    activeSession: new Date(now),
    sessionExpiresAt: new Date(now + 60 * 60 * 1000),
    setupTokenHash: invite.setupHash,
    createdAt: new Date(now),
  });
  await page.addInitScript(
    ({ token, setupToken, identifier }) => {
      sessionStorage.setItem("wedin_invite_token", token);
      sessionStorage.setItem(`wedin_setup_token_${token}`, setupToken);
      sessionStorage.setItem(
        "wedin_session",
        JSON.stringify({
          type: "admin",
          identifier,
          inviteToken: token,
          createdAt: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000,
        }),
      );
    },
    { token: invite.inviteToken, setupToken: invite.setupToken, identifier: invite.username },
  );
}

/**
 * Puente e2e con el formulario RSVP.
 *
 * RsvpSection expone `window.__updateRsvpField` (SOLO cuando `window.__e2e`
 * es true) para que los tests live puedan escribir campos del formulario por
 * el contexto React directamente. La UI estilizada rv2-* es frágil para
 * Playwright (inputs controlados que se re-renderizan, checkboxes con switch
 * accesible), así que el puente hace el test determinista sin tocar la app.
 */
interface RsvpBridge {
  /** Escribe un campo del formulario RSVP vía el contexto React (no el DOM). */
  __updateRsvpField?: (field: string, value: unknown) => void;
}

/**
 * Activa el puente e2e ANTES de navegar: el flag debe existir cuando monte
 * RsvpSection (su useEffect solo registra el puente si `window.__e2e`).
 */
export async function enableRsvpBridge(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __e2e?: boolean }).__e2e = true;
  });
}

/**
 * Escribe un campo del formulario RSVP por el puente React
 * (p. ej. "guestName", "attendance", "privacyConsent", "companionCount").
 */
export async function setRsvpField(
  page: import("@playwright/test").Page,
  field: string,
  value: unknown,
): Promise<void> {
  await page.evaluate(
    ({ f, v }) => {
      (window as unknown as RsvpBridge).__updateRsvpField?.(f, v);
    },
    { f: field, v: value },
  );
}
