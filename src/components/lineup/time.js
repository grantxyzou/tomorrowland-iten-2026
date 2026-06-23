// Time helpers shared across the Lineup tab. Festival nights run past midnight,
// so early-AM times are treated as "late" for ordering/overlap maths.
import { PEOPLE } from '../../data/lineup.js';

export const hasTime = (s) => Boolean(s.start && s.end);
export const timeLabel = (s) => (hasTime(s) ? `${s.start} – ${s.end}` : 'Set time TBA');
export function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
export function sortKey(s) { const m = timeToMin(s.start); return m < 360 ? m + 1440 : m; }

export function timesOverlap(a, b) {
  const aS = timeToMin(a.start), bS = timeToMin(b.start);
  let aE = timeToMin(a.end), bE = timeToMin(b.end);
  if (aE <= aS) aE += 1440;
  if (bE <= bS) bE += 1440;
  return aS < bE && bS < aE;
}

// Stage view lists each stage chronologically; sets with no time (hosts,
// unannounced) fall to the end, ties broken alphabetically.
export function stageOrder(a, b) {
  const at = hasTime(a), bt = hasTime(b);
  if (at && bt) return sortKey(a) - sortKey(b) || a.name.localeCompare(b.name);
  if (at !== bt) return at ? -1 : 1;
  return a.name.localeCompare(b.name);
}

// Normalise a timed set's [start, end] to minutes, treating early-AM as "late".
export function normSpan(s) {
  let st = timeToMin(s.start);
  let en = timeToMin(s.end);
  if (en <= st) en += 1440;
  if (st < 360) { st += 1440; en += 1440; }
  return [st, en];
}

// minutes-since-midnight → "HH:MM" (clusters can run past 24:00 → wrap).
export function minToLabel(m) {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
}

export function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Regroup the pairwise `clashes` ({ a, b, shared }) into connected components —
// any sets joined by an overlap edge become one "overlap window". A popular set
// that overlaps several others appears ONCE in its cluster instead of repeating
// across N pairs. Returns each cluster sorted by start time:
//   { sets:[…sorted], window:[startMin,endMin], shared:[…people] }
export function conflictClusters(clashes) {
  if (!clashes.length) return [];
  const setById = new Map();    // id → set object
  const adj = new Map();        // id → Set(neighbour ids)
  const edgeShared = new Map(); // id → Set(people sharing any of its edges)
  const link = (id) => { if (!adj.has(id)) adj.set(id, new Set()); if (!edgeShared.has(id)) edgeShared.set(id, new Set()); };
  for (const { a, b, shared } of clashes) {
    setById.set(a.id, a); setById.set(b.id, b);
    link(a.id); link(b.id);
    adj.get(a.id).add(b.id); adj.get(b.id).add(a.id);
    for (const p of shared) { edgeShared.get(a.id).add(p); edgeShared.get(b.id).add(p); }
  }

  const seen = new Set();
  const clusters = [];
  for (const id of adj.keys()) {
    if (seen.has(id)) continue;
    // BFS the component.
    const queue = [id], comp = [];
    seen.add(id);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const nb of adj.get(cur)) if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
    const compSets = comp.map(cid => setById.get(cid)).sort((x, y) => sortKey(x) - sortKey(y) || x.name.localeCompare(y.name));
    let lo = Infinity, hi = -Infinity;
    const shared = new Set();
    for (const cid of comp) {
      const [st, en] = normSpan(setById.get(cid));
      if (st < lo) lo = st;
      if (en > hi) hi = en;
      for (const p of edgeShared.get(cid)) shared.add(p);
    }
    clusters.push({ sets: compSets, window: [lo, hi], shared: PEOPLE.filter(p => shared.has(p)) });
  }
  // Earliest window first.
  return clusters.sort((c1, c2) => c1.window[0] - c2.window[0]);
}
