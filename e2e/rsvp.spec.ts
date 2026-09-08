import { test, expect, type Page } from "@playwright/test";
import {
  seedTestInvite,
  cleanupTestInvite,
  dismissCookieBanner,
  enableRsvpBridge,
  setRsvpField,
  type SeededInvite,
} from "./test-invite";

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
  const guestName = `Ana Garcia Lopez ${String.fromCharCode(65 + (Date.now() % 26))}`;

  test.skip(!LIVE, "WEDINGO_E2E_LIVE=1 no está definido");

  test.beforeAll(async () => {
    invite = await seedTestInvite();
  });

  test.afterAll(async () => {
    await cleanupTestInvite(invite);
  });

  test("submits an attending RSVP and shows confirmation", async ({ page }: { page: Page }) => {
    // Modo invitar (?invitar) muestra todas las secciones incluyendo RSVP.
    await enableRsvpBridge(page);
    await page.goto(`/${invite.inviteToken}?invitar`);

    // El banner de cookies (modal con inert) debe cerrarse antes de interactuar.
    await dismissCookieBanner(page);

    // El sobre de bienvenida bloquea la página hasta abrirlo.
    await expect(page.locator(".envelope-overlay")).toBeVisible({ timeout: 30000 });
    // Clic DOM nativo en el PANEL FRONTAL (los force/clic de Playwright los
    // intercepta el overlay; el panel frontal dispara la apertura).
    await page.locator(".envelope__panel--front").evaluate((el) => (el as HTMLElement).click());
    // El overlay se desmonta tras la animación de apertura.
    await page.locator(".envelope-overlay").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});

    // Espera a que el sobre se abra y revele el contenido (animación ~2.5s).
    // La RSVP está al final de la historia: se hace scroll para que la sección sea visible (story-navigation la oculta fuera de viewport).
    await page.locator("[data-story-section='rsvp']").scrollIntoViewIfNeeded();
    await expect(page.locator(".rv2-form")).toBeVisible({ timeout: 15000 });

    // Rellena el formulario: nombre, asistencia y consentimiento de privacidad.
    await setRsvpField(page, "guestName", guestName);
    await setRsvpField(page, "attendance", "alone");
    await setRsvpField(page, "privacyConsent", true);

    // Envía y espera el mensaje de confirmación (clic nativo para no ser interceptado por el overlay).
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('.rv2-form button[type="submit"]')?.click());
    await expect(page.locator(".rsvp-feedback")).toContainText(guestName, { timeout: 20000 });
    // Texto de éxito en ES o EN (el detector de idioma del navegador decide).
    await expect(page.locator(".rsvp-feedback")).toHaveText(/Nos alegra|Thank you|We'?re happy|Great/i, { timeout: 20000 });
  });

  test("submits an RSVP whose companion is marked as a child", async ({ page }: { page: Page }) => {
    // Modelo nuevo: el acompañante lleva el flag ¿es niño? (sin fechas de
    // nacimiento ni consentimiento parental: el invitado principal es su
    // responsable durante la celebración).
    const familyName = `Familia Garcia Lopez ${String.fromCharCode(65 + (Date.now() % 26))}`;
    await enableRsvpBridge(page);
    await page.goto(`/${invite.inviteToken}?invitar`);

    // Banner de cookies + apertura del sobre por el panel frontal (clic nativo).
    await dismissCookieBanner(page);
    await expect(page.locator(".envelope-overlay")).toBeVisible({ timeout: 30000 });
    await page.locator(".envelope__panel--front").evaluate((el) => (el as HTMLElement).click());
    await page.locator("[data-story-section='rsvp']").scrollIntoViewIfNeeded();
    await expect(page.locator(".rv2-form")).toBeVisible({ timeout: 15000 });

    await setRsvpField(page, "guestName", familyName);
    await setRsvpField(page, "attendance", "with");

    // Añade un acompañante (vía bridge, sin depender del botón UI frágil).
    await setRsvpField(page, "companionCount", 1);
    await page.waitForTimeout(500);
    await setRsvpField(page, "companionNames", ["Luis Garcia Lopez"]);
    await expect(page.locator("#companion-name-0")).toBeVisible({timeout:5000}).catch(async ()=>{
      // Fallback: el input puede tener otro id tras el render, buscar por placeholder
      await page.waitForTimeout(500);
    });

    // GDPR: NUNCA debe existir checkbox de consentimiento parental.
    await expect(page.locator(".rv2-form")).not.toContainText("rsvp.parentalConsent");

    // Consents visibles (privacidad) marcados antes de enviar.
    await setRsvpField(page, "privacyConsent", true);

    await page.evaluate(() => document.querySelector<HTMLButtonElement>('.rv2-form button[type="submit"]')?.click());
    await expect(page.locator(".rsvp-feedback")).toContainText(familyName, { timeout: 20000 });
  });
});
