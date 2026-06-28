// Post-build: stamp dist/sw.js's VERSION with a per-deploy id so the service
// worker's bytes change every deploy. The browser only treats a SW as "updated"
// when its bytes differ — without this, a static sw.js never updates and the
// installed PWA serves a stale build until a force-quit. Run after `vite build`.

import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../dist/sw.js', import.meta.url);
// Vercel sets VERCEL_GIT_COMMIT_SHA on every deploy; fall back to a timestamp
// for local/preview builds so the id is still unique.
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || String(Date.now());

try {
  const src = await readFile(FILE, 'utf8');
  if (!src.includes('__BUILD_ID__')) {
    console.warn('[stamp-sw] __BUILD_ID__ placeholder not found in dist/sw.js — skipping');
    process.exit(0);
  }
  await writeFile(FILE, src.replaceAll('__BUILD_ID__', buildId));
  console.log(`[stamp-sw] stamped dist/sw.js VERSION = ${buildId}`);
} catch (err) {
  // Don't fail the build if dist/sw.js is missing for some reason.
  console.warn('[stamp-sw] could not stamp dist/sw.js:', err.message);
}
