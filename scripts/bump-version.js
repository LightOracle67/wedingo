#!/usr/bin/env node
/**
 * Version bump automático: package.json + constants.ts + changelog.ts + tag + release.
 *
 * Uso:
 *   node scripts/bump-version.js patch|minor|major|<version-explicita>
 *
 * Ejemplo:
 *   node scripts/bump-version.js minor   → 2.36.0 → 2.37.0
 *   node scripts/bump-version.js patch   → 2.36.0 → 2.36.1
 *   node scripts/bump-version.js 2.40.0  → fuerza versión 2.40.0
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const constantsPath = path.join(root, "src/lib/constants.ts");
const changelogPath = path.join(root, "src/lib/changelog.ts");

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node scripts/bump-version.js patch|minor|major|<version>");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const current = pkg.version;
const [major, minor, patch] = current.split(".").map(Number);

let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  next = arg;
} else if (arg === "major") {
  next = `${major + 1}.0.0`;
} else if (arg === "minor") {
  next = `${major}.${minor + 1}.0`;
} else if (arg === "patch") {
  next = `${major}.${minor}.${patch + 1}`;
} else {
  console.error("Argumento inválido:", arg);
  process.exit(1);
}

// 1. package.json
pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// 2. constants.ts
let constants = fs.readFileSync(constantsPath, "utf8");
constants = constants.replace(/APP_VERSION = "[^"]+"/, `APP_VERSION = "${next}"`);
fs.writeFileSync(constantsPath, constants);

// 3. changelog.ts — inserta nuevo entry al inicio del array
const changelog = fs.readFileSync(changelogPath, "utf8");
const today = new Date().toISOString().slice(0, 10);
const newEntry = `  {
    version: "${next}",
    date: "${today}",
    changes: [
      "TODO: describe los cambios de esta versión",
    ],
  },
`;
const updated = changelog.replace(/export const CHANGELOG = \[/, `export const CHANGELOG = [\n${newEntry}`);
fs.writeFileSync(changelogPath, updated);

console.log(`✅ v${current} → v${next}`);
console.log("   - package.json actualizado");
console.log("   - constants.ts (APP_VERSION) actualizado");
console.log("   - changelog.ts nuevo entry añadido (edita el TODO)");

// 4. commit + tag
try {
  execSync(`git add package.json src/lib/constants.ts src/lib/changelog.ts && git commit -m "chore: bump v${next}"`, { stdio: "inherit", cwd: root });
  execSync(`git tag v${next}`, { stdio: "inherit", cwd: root });
  console.log(`✅ Commit + tag v${next} creados`);
  console.log("   Ejecuta: git push && git push origin v" + next);
} catch (err) {
  console.warn("⚠️ No se pudo crear el commit/tag automáticamente:", err.message);
}
