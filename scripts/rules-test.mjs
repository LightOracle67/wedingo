/**
 * Test de reglas Firestore con el emulador: verifica los flujos del superadmin.
 * Ejecutar con: firebase emulators:exec --only firestore --project demo-wedingo \
 *   "node scripts/rules-test.mjs"
 */
import { assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ID = "demo-wedingo";
const RULES = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
const ADMIN_EMAIL = "adriancl2001@gmail.com";
const SUPER_UID = "super-uid-123";

let testEnv;
const results = [];
function check(name, ok) {
  results.push([name, ok]);
}

const withEmail = () => testEnv.authenticatedContext("super-uid-123", { email: ADMIN_EMAIL }).firestore();
const withoutEmail = () => testEnv.authenticatedContext("super-uid-456", { email: undefined }).firestore();
const byUid = () => testEnv.authenticatedContext(SUPER_UID, { email: undefined }).firestore();
const guest = () => testEnv.unauthenticatedContext().firestore();

async function t(name, expectSuccess, promise) {
  try {
    await assertSucceeds(promise);
    check(name, expectSuccess);
  } catch {
    check(name, !expectSuccess);
  }
}

async function run() {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } });
  // Seed con reglas desactivadas (API compat).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B" });
    await db.collection("rsvpResponses").doc("AbCdEf1234").set({ count: 0, attendingCount: 0 });
    await db.collection("rsvpResponses").doc("AbCdEf1234").collection("responses").doc("r1").set({ guestName: "Ana", inviteToken: "AbCdEf1234" });
    await db.collection("setupTokens").doc("a".repeat(64)).set({ inviteToken: "AbCdEf1234" });
    await db.collection("auditLog").doc("log1").set({ action: "test", createdAt: new Date() });
    await db.collection("platform").doc("settings").set({ superadminUid: SUPER_UID });
    await db.collection("invitations").doc("AbCdEf1234").collection("consentLog").doc("c1").set({ status: "accepted", version: "v", ts: new Date() });
  });

  const emailDb = withEmail();
  const noEmailDb = withoutEmail();
  const uidDb = byUid();
  const guestDb = guest();

  // 1. Login estándar (email en token): lecturas del dashboard.
  await t("invitations list (email)", true, emailDb.collection("invitations").get());
  await t("responses group (email)", true, emailDb.collectionGroup("responses").get());
  await t("setupTokens list (email)", true, emailDb.collection("setupTokens").get());
  await t("auditLog read (email)", true, emailDb.collection("auditLog").get());
  await t("platform read (email)", true, emailDb.collection("platform").get());
  await t("consentLog read (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("consentLog").get());
  await t("accessLog create (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("accessLog").doc("a1").set({ action: "login_success", detail: "x", ts: new Date(), userAgent: "u" }));

  // 2. Token SIN email, UID NO registrado → denegado.
  await t("invitations list (sin email, uid no registrado) → NEGADO", false, noEmailDb.collection("invitations").get());

  // 3. Token sin email PERO UID registrado → permitido.
  await t("invitations list (UID registrado)", true, uidDb.collection("invitations").get());

  // 4. Sin autenticar → denegado.
  await t("invitations list (invitado) → NEGADO", false, guestDb.collection("invitations").get());

  // 5. El superadmin (email) puede escribir platform/settings.
  await t("platform write (email)", true, emailDb.collection("platform").doc("settings").set({ superadminUid: "x" }, { merge: true }));

  // 6. Invitado no puede escribir platform/settings.
  await t("platform write (invitado) → NEGADO", false, guestDb.collection("platform").doc("settings").set({ bannerText: "x" }));

  // 7. Invitado SÍ puede leer una invitación por documento (público).
  await t("invitation get público", true, guestDb.collection("invitations").doc("AbCdEf1234").get());

  // 7b. Historial de visitas por día (F18): incremento público acotado.
  const visitLogRef = () => guestDb.collection("invitations").doc("AbCdEf1234").collection("visitLog").doc("2026-08-17");
  await t("visitLog create count 1 (invitado) SÍ", true, visitLogRef().set({ count: 1 }));
  await t("visitLog update +5 SÍ", true, visitLogRef().update({ count: 6 }));
  await t("visitLog update +25 → NEGADO", false, visitLogRef().update({ count: 31 }));
  await t("visitLog id inválido → NEGADO", false, guestDb.collection("invitations").doc("AbCdEf1234").collection("visitLog").doc("not-a-date").set({ count: 1 }));
  await t("visitLog lectura pública → NEGADO", false, guestDb.collection("invitations").doc("AbCdEf1234").collection("visitLog").get());
  await t("visitLog lectura admin SÍ", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("visitLog").get());

  // 7c. Lista pública de confirmados (prueba social con opt-in).
  const confirmedRef = (name) =>
    guestDb.collection("invitations").doc("AbCdEf1234").collection("confirmedPeople").doc("c_" + name);
  await t("confirmedPeople create (invitado) SÍ", true, confirmedRef("ana").set({ name: "Ana", createdAt: new Date() }));
  await t("confirmedPeople re-create (misma id) → NEGADO", false, confirmedRef("ana").set({ name: "Otro", createdAt: new Date() }));
  await t("confirmedPeople create nombre vacío → NEGADO", false, confirmedRef("x").set({ name: "", createdAt: new Date() }));
  await t("confirmedPeople update → NEGADO", false, confirmedRef("ana").update({ name: "Cambiado" }));
  await t("confirmedPeople lectura pública SÍ", true, guestDb.collection("invitations").doc("AbCdEf1234").collection("confirmedPeople").get());
  await t("confirmedPeople delete invitado → NEGADO", false, confirmedRef("ana").delete());

  // 7b. Invitados esperados: solo 0..1000 (string); se rechazan >1000 y no numéricos.
  await t("expectedGuests 1000 (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B", expectedGuests: "1000" }, { merge: true }));
  await t("expectedGuests 1001 → NEGADO", false, emailDb.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B", expectedGuests: "1001" }, { merge: true }));
  await t("expectedGuests no numérico → NEGADO", false, emailDb.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B", expectedGuests: "abc" }, { merge: true }));
  await t("URL vacía en update (email) SÍ", true, emailDb.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B", weddingSiteURL: "" }, { merge: true }));
  await t("URL inválida en update → NEGADO", false, emailDb.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B", weddingSiteURL: "www.x.com" }, { merge: true }));

  // 8. El superadmin puede borrar una invitación.
  await t("invitation delete (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").delete());

  // 9. Distribución: crear/borrar una sección y una mesa (regresión: el delete
  //    combinado con create/update evaluaba request.resource.data (null en
  //    delete) y denegaba el borrado).
  await t("section create (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("sections").doc("s1").set({ name: "Salón", createdAt: new Date().toISOString() }));
  await t("section delete (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("sections").doc("s1").delete());
  await t("section table create (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("sections").doc("s2").collection("tables").doc("t1").set({ name: "Mesa 1", shape: "square", x: 50, y: 50, w: 90, h: 90, rotation: 0, seats: 8, guests: [] }));
  await t("section table delete (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").collection("sections").doc("s2").collection("tables").doc("t1").delete());
  await t("section table delete (invitado) → NEGADO", false, guestDb.collection("invitations").doc("AbCdEf1234").collection("sections").doc("s2").collection("tables").doc("t1").delete());

  // 10. RSVP: creación por invitado (sin auth) con agregados coherentes.
  //     `companions` es un NÚMERO (recuento de acompañantes) y las familias
  //     companionX son listas paralelas acotadas; las guardas de reglas deben
  //     rechazar tipos incoherentes (string) y cotas desmesuradas (>100).
  const rsvpBase = {
    guestName: "Ana",
    attendance: "no",
    dietaryInfo: "",
    submittedAt: new Date(),
    inviteToken: "AbCdEf1234",
    privacyConsent: true,
    privacyConsentAt: new Date(),
  };
  const responses = guestDb.collection("rsvpResponses").doc("AbCdEf1234").collection("responses");
  await t("rsvp create válido (invitado)", true, responses.doc("r2").set({ ...rsvpBase, companions: 2, companionNames: ["B", "C"] }));
  await t("rsvp create companions:string (invitado) → NEGADO", false, responses.doc("r3").set({ ...rsvpBase, companions: "pwned" }));
  await t("rsvp create companions>100 (invitado) → NEGADO", false, responses.doc("r4").set({ ...rsvpBase, companions: 101 }));
  await t("rsvp create companionNames>100 elems (invitado) → NEGADO", false, responses.doc("r5").set({ ...rsvpBase, companions: 0, companionNames: Array(101).fill("x") }));

  await testEnv.cleanup();

  console.log("\n=== RESULTADOS REGLAS ===");
  let fails = 0;
  for (const [name, ok] of results) {
    console.log(`  ${ok ? "PASS" : "FAIL"} — ${name}`);
    if (!ok) fails++;
  }
  console.log(`\n${results.length - fails}/${results.length} correctos`);
  process.exit(fails ? 1 : 0);
}

run().catch((e) => { console.error("ERROR:", e); process.exit(1); });
