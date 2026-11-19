// Vice Lights entrypoint (Node 22, standard library only): hands the app in.
// It copies this repository's app/ and screenshots/ into /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored make.fun
// library. The app itself is plain static files under app/ — index.html plus its
// scripts, styles, fonts and sample photos — and runs offline in a desktop browser.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (kit reference/gate.json): text_max_bytes is the only one
// that shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse anyway (more than 4 screenshots or one over 256 KiB; app/ over 993 files
// or 48 MiB in all, or a path under app/ over 1000 bytes; /output's own cap is
// 1000 entries and 64 MiB, shared by app/, screenshots/ and dossier.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) total += countFiles(path);
    else if (entry.isFile()) total += 1;
  }
  return total;
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');

const shotFiles = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  fail(`screenshots/ holds ${shotFiles.length} images, the gate wants 3 or 4`);
}
for (const name of shotFiles) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > DOSSIER_CAPS.screenshots.max_bytes) {
    fail(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}
if (countFiles(appDir) > DOSSIER_CAPS.app_max_files) {
  fail('app/ holds more than 993 files and directories');
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, DOSSIER_CAPS);
if (dossier.length > 1572864) fail(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(
  `wrote ${join(outDir, 'app')} (${countFiles(appDir)} files), ` +
    `${shotFiles.length} screenshots (${shotFiles.sort().join(', ')}) ` +
    `and dossier.json (${dossier.length} bytes)`,
);
