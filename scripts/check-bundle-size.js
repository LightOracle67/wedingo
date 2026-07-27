import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist", "assets");

const LIMITS = {
  "vendor-firebase": 650,
  "vendor-react": 250,
  "vendor-sentry": 150,
};

let failed = false;

for (const file of readdirSync(distDir)) {
  const full = join(distDir, file);
  if (!statSync(full).isFile()) continue;

  const content = readFileSync(full);
  const gzipped = gzipSync(content);
  const sizeKB = Math.round(gzipped.length / 1024);

  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (file.startsWith(prefix) && sizeKB > limit) {
      console.error(`FAIL: ${file} is ${sizeKB}KB gzip (limit ${limit}KB)`);
      failed = true;
    } else if (file.startsWith(prefix)) {
      console.log(`OK:   ${file} ${sizeKB}KB gzip (limit ${limit}KB)`);
    }
  }
}

if (failed) {
  process.exit(1);
}
