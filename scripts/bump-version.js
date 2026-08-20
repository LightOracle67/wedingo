/**
 * Version bump automático: package.json + constants.ts + changelog.ts + tag + release.
 *
 * Uso:
 *   node scripts/bump-version.js patch|minor|major|<version-explicita>
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { execSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = resolve(root, "package.json");
const pkgLockPath = resolve(root, "package-lock.json");
const constantsPath = resolve(root, "src/lib/constants.ts");
const changelogPath = resolve(root, "src/lib/changelog.ts");

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node scripts/bump-version.js patch|minor|major|<version>");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
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
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// 1b. package-lock.json (versión raíz y la del paquete raíz) para que no
// quede desincronizado del package.json (el lock sí se versiona).
const pkgLock = JSON.parse(readFileSync(pkgLockPath, "utf8"));
pkgLock.version = next;
if (pkgLock.packages?.[""]) {
  pkgLock.packages[""].version = next;
}
writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + "\n");

// 2. constants.ts
let constants = readFileSync(constantsPath, "utf8");
constants = constants.replace(/APP_VERSION = "[^"]+"/, `APP_VERSION = "${next}"`);
writeFileSync(constantsPath, constants);

// 3. changelog.ts — inserta nuevo entry al inicio del array
const changelog = readFileSync(changelogPath, "utf8");
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
writeFileSync(changelogPath, updated);

console.log(`✅ v${current} → v${next}`);
console.log("   - package.json + package-lock.json actualizados");
console.log("   - constants.ts (APP_VERSION) actualizado");
console.log("   - changelog.ts nuevo entry añadido (edita el TODO)");

// 4. commit + tag
try {
  execSync(
    `git add package.json package-lock.json src/lib/constants.ts src/lib/changelog.ts && git commit -m "chore: bump v${next}"`,
    { stdio: "inherit", cwd: root },
  );
  execSync(`git tag v${next}`, { stdio: "inherit", cwd: root });
  console.log(`✅ Commit + tag v${next} creados`);
  console.log("   Ejecuta: git push && git push origin v" + next);
} catch (err) {
  console.warn("⚠️ No se pudo crear el commit/tag automáticamente:", err.message);
}
