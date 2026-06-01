// One-off recovery: restore Desmond's 26 picks that were lost when the set-id
// scheme changed from index-based to content-based (and a test reset wiped them).
//
// The old IDs were captured from the live store before the reset; this remaps
// each to the artist (lineup order is unchanged) and re-files it under the new
// content-based ID. Nothing is fabricated — it restores exactly what was there.
//
// Run from the project root:  node scripts/recover-desmond-picks.mjs

import { LINEUP } from '../src/data/lineup.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const URL = 'https://tomorrowland-iten-2026.vercel.app/api/picks';

// Build old-index-id -> new-content-id from the (unchanged) lineup order.
const oldToNew = {};
for (const [day, stages] of Object.entries(LINEUP)) {
  for (const [stage, entries] of Object.entries(stages)) {
    const stageSlug = slug(stage);
    const seen = {};
    entries.forEach((entry, i) => {
      const name = typeof entry === 'string' ? entry : entry.name;
      const base = `${day}-${stageSlug}-${slug(name)}`;
      seen[base] = (seen[base] || 0) + 1;
      const newId = seen[base] > 1 ? `${base}-${seen[base]}` : base;
      oldToNew[`${day}-${stageSlug}-${i}`] = newId;
    });
  }
}

// Desmond's picks, by their original (old) ids — captured from the live store.
const DESMOND_OLD = [
  'sun-the-great-library-10', 'sat-freedom-by-bud-3', 'sun-mainstage-2',
  'sun-the-great-library-3', 'sun-planaxis-9', 'fri-mainstage-4',
  'sun-planaxis-0', 'sun-the-rose-garden-6', 'sat-planaxis-3',
  'sat-planaxis-0', 'sat-the-great-library-0', 'sun-planaxis-10',
  'sat-mainstage-2', 'sat-the-great-library-5', 'sun-mainstage-0',
  'fri-mainstage-8', 'fri-the-rose-garden-1', 'fri-the-great-library-3',
  'sat-celestia-by-kucoin-6', 'sun-mainstage-3', 'sun-freedom-by-bud-0',
  'sat-mainstage-1', 'fri-the-great-library-1', 'sat-freedom-by-bud-0',
  'sun-the-great-library-0', 'sun-the-great-library-1',
];

let ok = 0;
for (const oldId of DESMOND_OLD) {
  const setId = oldToNew[oldId];
  if (!setId) { console.log('UNMAPPED', oldId); continue; }
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setId, person: 'Desmond', picked: true }),
  });
  if (res.ok) ok++; else console.log('FAILED', setId, res.status);
}
console.log(`Restored ${ok}/${DESMOND_OLD.length} Desmond picks.`);

const after = await (await fetch(URL, { cache: 'no-store' })).json();
const count = Object.values(after.picks).filter((p) => p.Desmond).length;
console.log('Desmond picks now in store:', count);
