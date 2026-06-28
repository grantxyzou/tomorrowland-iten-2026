// Pure formatting for the printable itinerary. Flattens a trip day into a single
// time-sorted activity list, merging scheduled events with travel legs (flights /
// car drives) so travel days aren't blank in the PDF.

import { timeToMin } from '../lineup/time.js';

// Start minute for sorting; "HH:MM" or "HH:MM – HH:MM" / "HH:MM → …" → first 5
// chars. Anything unparseable sorts last.
function startMin(time) {
  const m = timeToMin(String(time ?? '').slice(0, 5));
  return Number.isFinite(m) ? m : Infinity;
}

// day → [{ time, label }] sorted by start time.
export function dayActivities(day) {
  const fromEvents = (day?.events || []).map((e) => ({ time: e.time, label: e.label }));
  const fromTravel = (day?.travel?.legs || []).map((leg) => ({
    time: leg.time,
    label: [leg.label, [leg.from, leg.to].filter(Boolean).join(' → ')].filter(Boolean).join(' · '),
  }));
  return [...fromEvents, ...fromTravel].sort((a, b) => startMin(a.time) - startMin(b.time));
}
