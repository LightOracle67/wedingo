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
  } catch (e) {
    check(name, !expectSuccess);
  }
}

async function run() {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } });
  // Seed con reglas desactivadas (API compat).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection("invitations").doc("AbCdEf1234").set({ firstName: "A", secondName: "B" });
    await db.collection("rsvpResponses").doc("AbCdEf1234").set({ count: 0 });
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

  // 8. El superadmin puede borrar una invitación.
  await t("invitation delete (email)", true, emailDb.collection("invitations").doc("AbCdEf1234").delete());

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
