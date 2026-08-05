/**
 * firebase-adc.mjs
 * ─────────────────────────────────────────────────────────────
 * Genera un Application Default Credentials (ADC) temporal para scripts
 * administrativos de Firebase, leyendo el refresh_token del CLI de
 * firebase-tools y las credenciales OAuth de variables de entorno
 * (WEDINGO_OAUTH_CLIENT_ID / WEDINGO_OAUTH_CLIENT_SECRET) en lugar de
 * versionarlas en el repositorio.
 *
 * @module scripts/lib/firebase-adc
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import os from "node:os";

/**
 * Configura GOOGLE_APPLICATION_CREDENTIALS con un ADC temporal válido.
 * Sale del proceso (exit 1) si faltan las credenciales OAuth o el token.
 */
export function setupFirebaseAdc() {
  const config = JSON.parse(
    readFileSync(resolve(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
  );
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) {
    console.error("❌ sin refresh token de firebase-tools");
    process.exit(1);
  }

  const clientId = process.env.WEDINGO_OAUTH_CLIENT_ID;
  const clientSecret = process.env.WEDINGO_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "❌ Define WEDINGO_OAUTH_CLIENT_ID y WEDINGO_OAUTH_CLIENT_SECRET como variables de entorno.",
    );
    process.exit(1);
  }

  const adcPath = resolve(os.tmpdir(), `wedingo-adc-${process.pid}.json`);
  writeFileSync(
    adcPath,
    JSON.stringify({
      type: "authorized_user",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    { mode: 0o600 },
  );
  process.on("exit", () => {
    try {
      unlinkSync(adcPath);
    } catch { /* noop */ }
  });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
}
