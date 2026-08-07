import { test, expect, type Page } from "@playwright/test";
import { seedTestInvite, cleanupTestInvite, type SeededInvite } from "./test-invite";

/**
 * Flujo de configuración (/setup): smoke test que verifica que la página de
 * setup carga correctamente para una invitación recién sembrada y que el token
 * de acceso se muestra en la sección de acceso.
 *
 * Requiere WEDINGO_E2E_LIVE=1 (escribe datos de prueba en el backend real).
 */
const LIVE = process.env.WEDINGO_E2E_LIVE === "1";

test.describe("Setup flow", () => {
  let invite: SeededInvite;

  test.skip(!LIVE, "WEDINGO_E2E_LIVE=1 no está definido");

  test.beforeAll(async () => {
    invite = await seedTestInvite();
  });

  test.afterAll(async () => {
    await cleanupTestInvite(invite);
  });

  test("setup page loads and shows the access section", async ({ page }: { page: Page }) => {
    // La app guarda el token de setup en sessionStorage (mismo patrón que la
    // landing al crear la invitación).
    await page.addInitScript(
      ({ token, setupToken }) => {
        sessionStorage.setItem(`wedin_invite_token`, token);
        sessionStorage.setItem(`wedin_setup_token_${token}`, setupToken);
      },
      { token: invite.inviteToken, setupToken: invite.setupToken },
    );

    await page.goto(`/${invite.inviteToken}/setup`);

    // El formulario de setup se renderiza.
    const firstName = page.locator("#setupfirstName");
    await expect(firstName).toBeVisible({ timeout: 30000 });

    // La sección de acceso muestra el token (readonly) para copiarlo.
    const tokenField = page.locator("#setupsetupTokenReadonly");
    await expect(tokenField).toHaveValue(invite.setupToken, { timeout: 30000 });
  });
});
