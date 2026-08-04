/**
 * Verifica que el changelog no contenga entradas TODO sin completar.
 * Ejecutar: node scripts/check-changelog.js
 * Falla con exit code != 0 si alguna entrada aún tiene "TODO:".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const changelogPath = path.resolve(__dirname, "../src/lib/changelog.ts");

const content = fs.readFileSync(changelogPath, "utf8");
const todos = content.match(/TODO[^"\n]*/g) ?? [];

if (todos.length > 0) {
  console.error(`❌ El changelog tiene ${todos.length} TODO(s) sin completar:`);
  for (const todo of todos) {
    console.error(`   - ${todo}`);
  }
  console.error("\nEdita src/lib/changelog.ts y describe los cambios antes de hacer push a main.");
  process.exit(1);
}

console.log("✅ Changelog sin TODOs pendientes.");
