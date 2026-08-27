#!/usr/bin/env node
/**
 * Verificación de enlace formulario ↔ reglas Firestore.
 *
 * Regla de oro del proyecto: los campos que la aplicación escribe en
 * rsvpResponses/{token}/responses/{id} DEBEN ser un subconjunto de la
 * whitelist hasOnly de firestore.rules. Si se añade un campo a un formulario
 * sin añadirlo a las reglas, el guardado devuelve permission-denied (403);
 * si se quita un campo y ALGUNA vista sigue escribiéndolo, el flujo se rompe.
 *
 * Uso: node scripts/check-fields-vs-rules.mjs
 * Salida: exit 0 si todo campo escrito está en la whitelist; exit 1 si no.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Extraer la whitelist hasOnly de las reglas de respuestas RSVP.
const rules = readFileSync(join(root, "firestore.rules"), "utf8");
const whitelistMatch = rules.match(
  /match \/rsvpResponses\/\{inviteToken\}\/responses\/\{responseId\}[\s\S]*?hasOnly\(\[(.+?)\]\)/,
);
if (!whitelistMatch) {
  console.error("No se encontró el bloque match /rsvpResponses/{inviteToken}/responses/{responseId}");
  process.exit(1);
}
const whitelist = new Set(
  [...whitelistMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]),
);

// 2. Extraer campos escritos por los constructores de payloads: las claves de
// los literales de objeto mainGuestData/companionData (lo único que viaja a
// Firestore) más asignaciones dinámicas (p.ej. nombre de plato condicional).
const payloads = readFileSync(join(root, "src/hooks/rsvp-payloads.ts"), "utf8");
const written = new Set();
for (const m of payloads.matchAll(/mainGuestData\.(\w+)|companionData\.(\w+)/g)) {
  written.add(m[1]);
}
for (const block of payloads.matchAll(/(?:mainGuestData|companionData)\s*=\s*\{([\s\S]*?)\};/g)) {
  for (const k of block[1].matchAll(/"(\w+)"/g)) written.add(k[1]);
}

// 3. Extraer campos escritos por el guardado manual de la tabla de asistencias.
const attendance = readFileSync(join(root, "src/pages/admin/AttendanceTab.tsx"), "utf8");
for (const m of attendance.matchAll(/payload\.(\w+)|compPayload\.(\w+)/g)) {
  written.add(m[1]);
}

// 4. Cruzar.
const missing = [...written].filter((f) => f && !whitelist.has(f));
if (missing.length > 0) {
  console.error(`Campos escritos por la app AUSENTES del whitelist de rules: ${JSON.stringify(missing)}`);
  process.exit(1);
}
console.log(`OK: ${written.size} campos escritos por la app están todos en la whitelist de rules (${whitelist.size} permitidos).`);
