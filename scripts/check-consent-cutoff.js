/**
 * Verifica que la fecha de corte de consentimiento parental (menores de 14 años)
 * en firestore.rules esté dentro de la ventana correcta respecto a la fecha actual.
 *
 * Ejecutar: node scripts/check-consent-cutoff.js
 * Falla con exit code != 0 si la fecha está desactualizada o fuera de rango.
 *
 * GDPR art. 8 (España): el consentimiento parental es exigible para menores de
 * 14 años. La regla `birthDate < "CUTOFF"` libera del consentimiento a quienes
 * nacieron antes de CUTOFF (ya cumplieron 14). Para que sea correcta HOY, CUTOFF
 * debe cumplir:
 *
 *   today - 14 years < CUTOFF <= today - 14 years + 1 day
 *
 *   - Si CUTOFF <= today-14y  → un invitado que acaba de cumplir 14 (nacido
 *     hoy-14y) tendría birthDate >= CUTOFF y se le pediría consentimiento
 *     indebidamente.
 *   - Si CUTOFF >  today-14y+1d  → un invitado de 13 años (nacido hoy-14y+1d)
 *     quedaría eximido del filtro.
 *
 *   El valor correcto HOY es CUTOFF = (hoy - 14 años + 1 día): exime a los que
 *   ya cumplieron 14 y exige consentimiento a los que aún no.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = path.resolve(__dirname, "../firestore.rules");

const content = fs.readFileSync(rulesPath, "utf8");

const pattern = /birthDate < "(\d{4}-\d{2}-\d{2})"/;
const match = content.match(pattern);

if (!match) {
  console.error('❌ No se encontró la fecha de corte de consentimiento parental en firestore.rules.');
  console.error('   Busca el patrón: birthDate < "YYYY-MM-DD"');
  process.exit(1);
}

const cutoff = match[1];
const cutoffDate = new Date(`${cutoff}T00:00:00Z`);
if (Number.isNaN(cutoffDate.getTime())) {
  console.error(`❌ La fecha de corte "${cutoff}" no es una fecha válida.`);
  process.exit(1);
}

const now = new Date();
const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

const subYears = (utcMs, years) => {
  const d = new Date(utcMs);
  return Date.UTC(d.getUTCFullYear() - years, d.getUTCMonth(), d.getUTCDate());
};

// Ventana válida: (hoy - 14 años, hoy - 14 años + 1 día]
const lowerExclusive = subYears(today, 14); // today - 14y  (exclusive)
const upperInclusive = lowerExclusive + 86_400_000; // today - 14y + 1d (inclusive)

if (cutoffDate.getTime() <= lowerExclusive) {
  console.error(
    `❌ La fecha de corte de consentimiento parental "${cutoff}" está desactualizada.\n` +
      `   Para que la regla sea correcta hoy (${new Date(today).toISOString().slice(0, 10)}), CUTOFF debe ser ` +
      `> ${new Date(lowerExclusive).toISOString().slice(0, 10)} (hoy - 14 años).\n` +
      `   Valor recomendado: ${new Date(lowerExclusive + 86_400_000).toISOString().slice(0, 10)}.`,
  );
  process.exit(1);
}

if (cutoffDate.getTime() > upperInclusive) {
  console.error(
    `❌ La fecha de corte de consentimiento parental "${cutoff}" es demasiado reciente.\n` +
      `   CUTOFF debe ser <= ${new Date(upperInclusive).toISOString().slice(0, 10)} (hoy - 14 años + 1 día) ` +
      `para no eximir a invitados de 13 años.`,
  );
  process.exit(1);
}

console.log(`✅ Fecha de corte de consentimiento parental válida: ${cutoff}.`);
