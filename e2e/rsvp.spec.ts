import { test, expect, type Page } from "@playwright/test";
import { seedTestInvite, cleanupTestInvite, type SeededInvite } from "./test-invite";

/**
 * Flujo de confirmación de asistencia (RSVP): siembra una invitación, abre el
 * sobre de bienvenida y envía un RSVP de asistencia. Verifica el mensaje de
 * confirmación.
 *
 * Requiere WEDINGO_E2E_LIVE=1 (escribe datos de prueba en el backend real).
 */
const LIVE = process.env.WEDINGO_E2E_LIVE === "1";

test.describe("RSVP submission", () => {
  let invite: SeededInvite;
  const guestName = `Invitada E2E ${Date.now()}`;

  test.skip(!LIVE, "WEDINGO_E2E_LIVE=1 no está definido");

  test.beforeAll(async () => {
    invite = await seedTestInvite();
  });

  test.afterAll(async () => {
    await cleanupTestInvite(invite);
  });

  test("submits an attending RSVP and shows confirmation", async ({ page }: { page: Page }) => {
    // Modo invitar (?invitar) muestra todas las secciones incluyendo RSVP.
    await page.goto(`/${invite.inviteToken}?invitar`);

    // El sobre de bienvenida bloquea la página hasta abrirlo.
    const envelope = page.locator(".envelope-overlay");
    await expect(envelope).toBeVisible({ timeout: 30000 });
    await envelope.click();

    // Espera a que el sobre se abra y revele el contenido (animación ~2.5s).
    await expect(page.locator(".rsvp-form")).toBeVisible({ timeout: 15000 });

    // Rellena el formulario: nombre, asistencia y consentimiento de privacidad.
    await page.locator("#rsvpName").fill(guestName);
    await page.locator("#rsvpAttendance").selectOption("yes");

    // Marca TODOS los checkboxes de consentimiento visibles del formulario
    // (para una invitación limpia solo aparece el de privacidad).
    const consentBoxes = page.locator('.rsvp-form input[type="checkbox"]');
    const count = await consentBoxes.count();
    for (let i = 0; i < count; i++) {
      const box = consentBoxes.nth(i);
      if (!(await box.isChecked())) await box.check({ force: true });
    }

    // Envía y espera el mensaje de confirmación.
    await page.locator('.rsvp-form button[type="submit"]').click();
    await expect(page.locator(".rsvp-feedback")).toContainText(guestName, { timeout: 20000 });
    await expect(page.locator(".rsvp-feedback")).toContainText("Nos alegra", { timeout: 20000 });
  });

  test("submits an RSVP whose companion is marked as a child", async ({ page }: { page: Page }) => {
    // Modelo nuevo: el acompañante lleva el flag ¿es niño? (sin fechas de
    // nacimiento ni consentimiento parental: el invitado principal es su
    // responsable durante la celebración).
    const familyName = `Familia E2E ${Date.now()}`;
    await page.goto(`/${invite.inviteToken}?invitar`);

    const envelope = page.locator(".envelope-overlay");
    await expect(envelope).toBeVisible({ timeout: 30000 });
    await envelope.click();
    await expect(page.locator(".rsvp-form")).toBeVisible({ timeout: 15000 });

    await page.locator("#rsvpName").fill(familyName);
    await page.locator("#rsvpAttendance").selectOption("with");

    // Añade un acompañante y márcalo como niño.
    await page.getByRole("button", { name: /Añadir acompañante/i }).click();
    await page.locator("#companion-name-0").fill("Niñe E2E");

    const childBox = page.locator("#companion-child-0");
    await childBox.check();
    await expect(childBox).toBeChecked();

    // GDPR: NUNCA debe existir checkbox de consentimiento parental.
    await expect(page.locator(".rsvp-form")).not.toContainText("rsvp.parentalConsent");

    // Consents visibles (privacidad) marcados antes de enviar.
    const consentBoxes = page.locator('.rsvp-form input[type="checkbox"]');
    const total = await consentBoxes.count();
    for (let i = 0; i < total; i++) {
      const box = consentBoxes.nth(i);
      if (!(await box.isChecked())) await box.check({ force: true });
    }

    await page.locator('.rsvp-form button[type="submit"]').click();
    await expect(page.locator(".rsvp-feedback")).toContainText(familyName, { timeout: 20000 });
  });
});
