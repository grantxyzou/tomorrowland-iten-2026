// Time-relative agenda for the Itinerary tab (spec §4). Given the current day and
// the effective minute (live or scrubbed), split the day's activities into what's
// HAPPENING NOW (in progress) and COMING UP (starts within 120 min). Derived from
// the existing day data via dayActivities() — no separate event model.

import { dayActivities } from './printDoc.js';
import { timeToMin, minToLabel } from '../lineup/time.js';

const SEP = /[–—→]/; // en-dash / em-dash / arrow separate "start <sep> end"
const COMING_UP_WINDOW = 120;
const POINT_DURATION_CAP = 60; // a point event lasts until the next, capped at 60m

function startMin(t) {
  const m = timeToMin(String(t).slice(0, 5));
  return Number.isFinite(m) ? m : null;
}
function explicitEnd(t) {
  const s = String(t);
  const i = s.search(SEP);
  if (i === -1) return null;
  const m = timeToMin(s.slice(i + 1).trim().slice(0, 5));
  return Number.isFinite(m) ? m : null;
}

// Clamp a day index into [0, len-1] (used by the day selector's prev/next).
export function clampDay(idx, len) {
  if (!len) return 0;
  return Math.max(0, Math.min(len - 1, idx | 0));
}

export function agendaAt(day, minute) {
  const acts = dayActivities(day)
    .map((a) => ({ time: a.time, label: a.label, start: startMin(a.time), end: explicitEnd(a.time) }))
    .filter((a) => a.start != null)
    .sort((a, b) => a.start - b.start);

  // Infer ends for point events: until the next event's start, capped at +60m.
  for (let i = 0; i < acts.length; i++) {
    if (acts[i].end == null) {
      const next = acts[i + 1]?.start;
      acts[i].end = Math.min(next ?? acts[i].start + POINT_DURATION_CAP, acts[i].start + POINT_DURATION_CAP);
    }
  }

  const now = acts
    .filter((a) => a.start <= minute && minute < a.end)
    .map((a) => ({ time: a.time, label: a.label, remaining: a.end - minute }));
  const soon = acts
    .filter((a) => a.start > minute && a.start <= minute + COMING_UP_WINDOW)
    .slice(0, 4)
    .map((a) => ({ time: a.time, label: a.label, inMin: a.start - minute }));
  const nextUp = acts.find((a) => a.start > minute);
  const nextAt = nextUp ? minToLabel(nextUp.start) : null;

  return { now, soon, nextAt };
}
