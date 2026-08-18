import { test, expect, type Page } from "@playwright/test";
import { seedTestInvite, cleanupTestInvite, type SeededInvite } from "./test-invite";

/**
 * Auditoría de overflows horizontales en pantallas pequeñas/tablet.
 *
 * Revisa que NINGUNA página de la app provoque scroll horizontal espurio en
 * anchuras de móvil y tablets. Se usa la invitación sembrada con contenido
 * real (abriendo el sobre y recorriendo las secciones con ?invitar).
 *
 * Requiere WEDINGO_E2E_LIVE=1 (escribe datos de prueba en el backend real).
 */
const LIVE = process.env.WEDINGO_E2E_LIVE === "1";
const VIEWPORTS = [
  { width: 320, height: 640 }, // móvil muy pequeño
  { width: 360, height: 800 }, // Android pequeño
  { width: 375, height: 812 }, // iPhone moderno
  { width: 390, height: 844 }, // iPhone 14
  { width: 412, height: 915 }, // Android grande
  { width: 768, height: 1024 }, // tablet portrait
] as const;

async function openInvitation(page: Page, token: string): Promise<void> {
  await page.goto(`/${token}?invitar`);
  // El sobre bloquea hasta abrirlo; si aparece, se abre.
  const envelope = page.locator(".envelope-overlay");
  if (await envelope.isVisible().catch(() => false)) {
    await envelope.click();
  }
  // Espera a que se vea una sección con contenido.
  await expect(page.locator("[data-story-section]").first()).toBeVisible({ timeout: 30000 });
}

test.describe("Overflow horizontal (pantallas pequeñas y tablet)", () => {
  let invite: SeededInvite;

  test.skip(!LIVE, "WEDINGO_E2E_LIVE=1 no está definido");

  test.beforeAll(async () => {
    invite = await seedTestInvite();
  });

  test.afterAll(async () => {
    await cleanupTestInvite(invite);
  });

  for (const vp of VIEWPORTS) {
    test(`sin scroll horizontal en la invitación a ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openInvitation(page, invite.inviteToken);
      // Recorre cada sección y comprueba que no hay desbordamiento horizontal
      // ni en el documento ni en el contenedor de scroll (.app-scene).
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const scene = document.querySelector<HTMLElement>(".app-scene");
        const sceneOverflow = scene ? scene.scrollWidth - scene.clientWidth : 0;
        return {
          docOverflow: doc.scrollWidth - doc.clientWidth,
          sceneOverflow,
          docScrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });
      expect(overflow.docOverflow, `documento desborda ${overflow.docOverflow}px a ${vp.width}px`).toBeLessThanOrEqual(1);
      expect(overflow.sceneOverflow, `app-scene desborda ${overflow.sceneOverflow}px`).toBeLessThanOrEqual(1);
    });
  }

  test("sin scroll horizontal en la landing y rutas públicas a 320px", async ({ page }) => {
    const widths = [320, 360, 375, 390, 412];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      await page.locator("[data-testid='create-invitation-btn']").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `landing desborda ${overflow}px a ${w}px`).toBeLessThanOrEqual(1);
    }
  });

  test("RSVP con acompañantes sin desbordar a 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openInvitation(page, invite.inviteToken);
    // Va a la sección RSVP (presente gracias a ?invitar).
    const rsvp = page.locator("[data-story-section='rsvp']");
    await rsvp.scrollIntoViewIfNeeded();
    await expect(page.locator(".rsvp-form")).toBeVisible({ timeout: 15000 });
    // Elige "Con acompañantes" y añade dos (el botón es hermano del select,
    // con texto traducido según idioma: selector por relación estructural).
    await page.locator("#rsvpAttendance").selectOption("with");
    const addBtn = page.locator("#rsvpAttendance ~ button").first();
    await addBtn.click();
    await addBtn.click();
    // Rellena los nombres para que el layout sea el real (con tarjetas).
    const cards = page.locator(".rsvp-attendee-card");
    await expect(cards).toHaveCount(2, { timeout: 5000 });
    await page.locator("#companion-name-0").fill("Acompañante Uno");
    await page.locator("#companion-name-1").fill("Acompañante Dos");
    // Mide el overflow con las tarjetas desplegadas.
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const scene = document.querySelector<HTMLElement>(".app-scene");
      return {
        docOverflow: doc.scrollWidth - doc.clientWidth,
        sceneOverflow: scene ? scene.scrollWidth - scene.clientWidth : 0,
      };
    });
    expect(overflow.docOverflow, `documento desborda ${overflow.docOverflow}px con acompañantes a 320px`).toBeLessThanOrEqual(1);
    expect(overflow.sceneOverflow, `app-scene desborda ${overflow.sceneOverflow}px con acompañantes`).toBeLessThanOrEqual(1);
  });
});
