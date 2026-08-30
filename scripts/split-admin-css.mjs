/**
 * split-admin-css.mjs (v2.186, uso único)
 * ─────────────────────────────────────────────────────────────
 * Divide src/styles/admin.css en dos:
 *  - public-shell.css: reglas cuyos selectores mencionan clases usadas por
 *    la ruta PÚBLICA (App.tsx, PublicInvitation, secciones, landing…).
 *  - admin.css: el resto (paneles admin, setup, superadmin).
 *
 * La lista de clases públicas se extrae de los ficheros TSX públicos
 * (mismo cálculo que en la auditoría), y cada regla de nivel superior se
 * clasifica por la INTERSECCIÓN entre sus selectores y esa lista.
 * @media se conserva como bloque y se clasifica igual.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const cssPath = resolve(root, "src/styles/admin.css");
const src = readFileSync(cssPath, "utf8");

// ── Clases usadas por componentes públicos ──────────────────────────────
const publicFiles = [
  "src/App.tsx", "src/pages/PublicInvitation.tsx", "src/pages/LandingPage.tsx",
  "src/pages/sections/HeroSection.tsx", "src/pages/sections/DetailsSection.tsx",
  "src/pages/sections/InfoSection.tsx", "src/pages/sections/StorySection.tsx",
  "src/pages/sections/GiftsSection.tsx", "src/pages/sections/AccommodationSection.tsx",
  "src/pages/sections/TransportSection.tsx", "src/pages/sections/RsvpSection.tsx",
  "src/pages/sections/VenueMapSection.tsx", "src/pages/sections/TableSeatingSection.tsx",
  "src/components/MusicPlayer.tsx", "src/components/EnvelopeOverlay.tsx",
  "src/components/Confetti.tsx", "src/components/FloatingRsvpCta.tsx",
  "src/components/WeddingDecorations.tsx", "src/components/WelcomeVideoModal.tsx",
  "src/components/CookieConsent.tsx", "src/components/GoogleTranslateToggle.tsx",
  "src/components/LanguageSwitcher.tsx", "src/components/Fireflies.tsx",
  "src/components/AnimationPrefsApplier.tsx", "src/components/ErrorBoundary.tsx",
];
const classRe = /class(?:Name)?=\{?["'`]([^"'`{}]+)["'`]/g;
const publicClasses = new Set();
for (const f of publicFiles) {
  const s = readFileSync(resolve(root, f), "utf8");
  for (const m of s.matchAll(classRe)) {
    for (const c of m[1].split(/\s+/)) {
      if (c && /^[a-zA-Z]/.test(c) && !c.includes("${")) publicClasses.add(c.trim());
    }
  }
}

// ── Parseo de reglas de nivel superior (con soporte @media) ─────────────
function topLevelRules(source) {
  const rules = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    // saltar espacios/comentarios
    while (i < source.length && /\s/.test(source[i])) i++;
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i) + 2;
      rules.push({ raw: source.slice(start, end), selectors: [], comment: true });
      i = end;
      continue;
    }
    const pre = source.slice(i);
    if (pre.startsWith("@media")) {
      // bloque @media → capturar hasta su cierre balanceado
      const open = source.indexOf("{", i);
      let depth = 0, j = open;
      for (; j < source.length; j++) {
        if (source[j] === "{") depth++;
        else if (source[j] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      const raw = source.slice(start, j + 1);
      const selectors = [...raw.matchAll(/(?:^|,)\s*\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      rules.push({ raw, selectors: new Set(selectors), media: true });
      i = j + 1;
      continue;
    }
    // regla normal
    const open = source.indexOf("{", i);
    if (open === -1) {
      rules.push({ raw: source.slice(start), selectors: [], comment: true });
      break;
    }
    const close = source.indexOf("}", open);
    if (close === -1) {
      rules.push({ raw: source.slice(start), selectors: [], comment: true });
      break;
    }
    const raw = source.slice(start, close + 1);
    const selectors = [...raw.matchAll(/(?:^|,|,)\s*\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
    rules.push({ raw, selectors: new Set(selectors) });
    i = close + 1;
  }
  return rules;
}

const rules = topLevelRules(src);

let publicOut = "",
  adminOut = "";
let pubCount = 0,
  adminCount = 0;
for (const r of rules) {
  const isPublic = [...r.selectors].some((c) => publicClasses.has(c) || c.startsWith("story-") || c.startsWith("app-") || c.startsWith("envelope-") || c.includes("setup-button"));
  if (isPublic && !r.comment) {
    publicOut += (publicOut ? "\n" : "") + r.raw;
    pubCount++;
  } else {
    adminOut += (adminOut ? "\n" : "") + r.raw;
    adminCount++;
  }
}

writeFileSync(resolve(root, "src/styles/public-shell.css"), publicOut + "\n");
writeFileSync(resolve(root, "src/styles/admin.css"), adminOut + "\n");
console.log(`split ok: public=${pubCount} rules (${publicOut.length} bytes), admin=${adminCount} rules (${adminOut.length} bytes)`);
